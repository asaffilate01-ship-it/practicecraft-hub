-- TaxLounge controlled receipt posting: saved AI extracts are drafts, never authority.
-- This is a new workflow. Existing receipt_extractions and historic journals are
-- preserved; no automatic backfill, deletion or financial reposting.

CREATE OR REPLACE FUNCTION public.taxlounge_receipt_permission(p_tenant_id uuid, p_action text)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public, pg_temp AS $$
 SELECT auth.uid() IS NOT NULL
   AND p_tenant_id = public.get_user_tenant_id(auth.uid())
   AND p_action IN ('view','approve')
   AND EXISTS (
     SELECT 1 FROM public.user_roles ur
     LEFT JOIN public.roles r ON r.tenant_id = ur.tenant_id
      AND r.name = CASE ur.role::text
        WHEN 'super_admin' THEN 'Firm Owner'
        WHEN 'firm_owner' THEN 'Firm Owner'
        WHEN 'manager' THEN 'Manager'
        WHEN 'staff' THEN 'Staff Accountant'
        WHEN 'payroll_officer' THEN 'Payroll Officer'
        ELSE '' END
     WHERE ur.user_id = auth.uid() AND ur.tenant_id = p_tenant_id
       AND ur.role::text IN ('super_admin','firm_owner','manager','staff','payroll_officer')
       AND (ur.role::text IN ('super_admin','firm_owner') OR
         (CASE WHEN p_action='view' THEN
            coalesce((r.permissions_json->'ledger'->>'view')::boolean,false)
            AND coalesce((r.permissions_json->'ocr'->>'view')::boolean,false)
          ELSE
            coalesce((r.permissions_json->'ledger'->>'edit')::boolean,false)
            AND coalesce((r.permissions_json->'ocr'->>'approve')::boolean,false)
          END))
   );
$$;
REVOKE ALL ON FUNCTION public.taxlounge_receipt_permission(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.taxlounge_receipt_permission(uuid,text) TO authenticated;

CREATE UNIQUE INDEX IF NOT EXISTS taxlounge_document_tenant_client_id_idx
 ON public.documents(tenant_id,client_id,id);
CREATE UNIQUE INDEX IF NOT EXISTS taxlounge_extraction_tenant_client_document_id_idx
 ON public.receipt_extractions(tenant_id,client_id,document_id,id);

CREATE TABLE public.receipt_posting_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  client_id uuid NOT NULL REFERENCES public.clients(id),
  document_id uuid NOT NULL,
  extraction_id uuid NOT NULL,
  expense_account_id uuid NOT NULL REFERENCES public.chart_of_accounts(id),
  payment_account_id uuid NOT NULL REFERENCES public.chart_of_accounts(id),
  gross_pence bigint NOT NULL CHECK (gross_pence > 0),
  net_pence bigint NOT NULL CHECK (net_pence > 0),
  vat_pence bigint NOT NULL CHECK (vat_pence >= 0),
  journal_entry_id uuid NOT NULL REFERENCES public.journal_entries(id),
  reviewer_user_id uuid NOT NULL REFERENCES auth.users(id),
  review_note text NOT NULL CHECK (length(btrim(review_note)) BETWEEN 12 AND 1000),
  source_snapshot jsonb NOT NULL,
  reviewed_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT taxlounge_receipt_review_balance CHECK (gross_pence = net_pence + vat_pence),
  CONSTRAINT taxlounge_receipt_review_unique_document UNIQUE(tenant_id,document_id),
  CONSTRAINT taxlounge_receipt_review_document_fk
    FOREIGN KEY (tenant_id,client_id,document_id)
    REFERENCES public.documents(tenant_id,client_id,id),
  CONSTRAINT taxlounge_receipt_review_extraction_fk
    FOREIGN KEY (tenant_id,client_id,document_id,extraction_id)
    REFERENCES public.receipt_extractions(tenant_id,client_id,document_id,id)
);
CREATE INDEX taxlounge_receipt_review_tenant_client_time_idx
 ON public.receipt_posting_reviews(tenant_id,client_id,reviewed_at DESC);
ALTER TABLE public.receipt_posting_reviews ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.receipt_posting_reviews FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.receipt_posting_reviews TO authenticated;
CREATE POLICY "Authorised reviewers read receipt posting receipts"
 ON public.receipt_posting_reviews FOR SELECT TO authenticated
 USING (public.taxlounge_receipt_permission(tenant_id,'view'));

CREATE OR REPLACE FUNCTION public.post_receipt_review(
  p_document_id uuid, p_expense_account_id uuid,
  p_payment_account_id uuid, p_review_note text
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_tenant_id uuid := public.get_user_tenant_id(auth.uid());
  v_extraction public.receipt_extractions%ROWTYPE;
  v_document public.documents%ROWTYPE;
  v_existing public.receipt_posting_reviews%ROWTYPE;
  v_vat_account_id uuid;
  v_journal_id uuid;
  v_reference text;
BEGIN
  IF auth.uid() IS NULL OR v_tenant_id IS NULL
     OR NOT public.taxlounge_receipt_permission(v_tenant_id,'approve') THEN
     RAISE EXCEPTION 'Receipt approval requires ledger.edit and ocr.approve'
       USING ERRCODE = '42501';
  END IF;
  IF length(btrim(coalesce(p_review_note,''))) NOT BETWEEN 12 AND 1000 THEN
    RAISE EXCEPTION 'Provide a reviewer note (12 to 1000 characters)';
  END IF;
  IF p_expense_account_id IS NULL OR p_payment_account_id IS NULL
     OR p_expense_account_id = p_payment_account_id THEN
    RAISE EXCEPTION 'Choose distinct expense and bank/cash accounts';
  END IF;

  SELECT * INTO v_extraction FROM public.receipt_extractions
  WHERE tenant_id=v_tenant_id AND document_id=p_document_id FOR UPDATE;
  IF NOT FOUND OR v_extraction.client_id IS NULL THEN
    RAISE EXCEPTION 'Receipt extraction unavailable' USING ERRCODE='42501';
  END IF;
  SELECT * INTO v_document FROM public.documents
  WHERE id=p_document_id AND tenant_id=v_tenant_id
    AND client_id=v_extraction.client_id AND document_type='receipt'
    AND status <> 'archived';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Matching client receipt document unavailable' USING ERRCODE='42501';
  END IF;

  SELECT * INTO v_existing FROM public.receipt_posting_reviews
  WHERE tenant_id=v_tenant_id AND document_id=p_document_id FOR UPDATE;
  IF FOUND THEN
    IF v_existing.expense_account_id = p_expense_account_id
      AND v_existing.payment_account_id = p_payment_account_id THEN
      RETURN v_existing.journal_entry_id;
    END IF;
    RAISE EXCEPTION 'Receipt already posted using different accounts; manual reconciliation required';
  END IF;

  v_reference := 'RCT-' || left(p_document_id::text,8);
  IF EXISTS (SELECT 1 FROM public.journal_entries j
     WHERE j.tenant_id=v_tenant_id AND j.client_id=v_extraction.client_id
       AND j.reference=v_reference AND j.is_posted) THEN
     RAISE EXCEPTION 'Existing receipt journal requires reconciliation; duplicate posting blocked';
  END IF;

  IF v_extraction.currency IS DISTINCT FROM 'GBP'
     OR v_extraction.receipt_date IS NULL
     OR nullif(btrim(v_extraction.supplier_name),'') IS NULL
     OR v_extraction.total_gross_pence IS NULL
     OR v_extraction.total_net_pence IS NULL
     OR v_extraction.total_vat_pence IS NULL
     OR v_extraction.total_gross_pence <= 0
     OR v_extraction.total_gross_pence > 100000000000
     OR v_extraction.total_net_pence <= 0
     OR v_extraction.total_vat_pence < 0
     OR v_extraction.total_net_pence + v_extraction.total_vat_pence
          <> v_extraction.total_gross_pence THEN
    RAISE EXCEPTION 'Receipt amounts, date or currency require manual correction before posting';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.chart_of_accounts a
     WHERE a.id=p_expense_account_id AND a.tenant_id=v_tenant_id
       AND a.account_type='expense' AND a.is_active) THEN
    RAISE EXCEPTION 'Choose an active expense account in this practice';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.chart_of_accounts a
     WHERE a.id=p_payment_account_id AND a.tenant_id=v_tenant_id
       AND a.code LIKE '10%' AND a.is_active) THEN
    RAISE EXCEPTION 'Choose an active bank/cash account in this practice';
  END IF;

  IF v_extraction.total_vat_pence > 0 THEN
    SELECT a.id INTO v_vat_account_id FROM public.chart_of_accounts a
      WHERE a.tenant_id=v_tenant_id AND a.code='1300' AND a.is_active;
    IF v_vat_account_id IS NULL OR
      v_vat_account_id IN (p_expense_account_id,p_payment_account_id) THEN
      RAISE EXCEPTION 'VAT control account 1300 is required for this receipt; verify recoverability';
    END IF;
  END IF;

  INSERT INTO public.journal_entries (
    tenant_id,client_id,entry_date,reference,narration,is_posted,created_by
  ) VALUES (
    v_tenant_id,v_extraction.client_id,v_extraction.receipt_date,v_reference,
    'Reviewed receipt: ' || left(v_extraction.supplier_name,170),false,auth.uid()
  ) RETURNING id INTO v_journal_id;

  INSERT INTO public.journal_lines(journal_entry_id,account_id,debit,credit,description)
  VALUES (v_journal_id,p_expense_account_id,
          v_extraction.total_net_pence::numeric/100,0,'Reviewed receipt expense');
  IF v_extraction.total_vat_pence > 0 THEN
    INSERT INTO public.journal_lines(journal_entry_id,account_id,debit,credit,description)
    VALUES (v_journal_id,v_vat_account_id,
            v_extraction.total_vat_pence::numeric/100,0,'Input VAT – verify eligibility');
  END IF;
  INSERT INTO public.journal_lines(journal_entry_id,account_id,debit,credit,description)
  VALUES (v_journal_id,p_payment_account_id,0,
          v_extraction.total_gross_pence::numeric/100,'Reviewed receipt payment');

  UPDATE public.journal_entries SET is_posted=true WHERE id=v_journal_id;

  INSERT INTO public.receipt_posting_reviews (
    tenant_id,client_id,document_id,extraction_id,expense_account_id,
    payment_account_id,gross_pence,net_pence,vat_pence,journal_entry_id,
    reviewer_user_id,review_note,source_snapshot
  ) VALUES (
    v_tenant_id,v_extraction.client_id,p_document_id,v_extraction.id,
    p_expense_account_id,p_payment_account_id,v_extraction.total_gross_pence,
    v_extraction.total_net_pence,v_extraction.total_vat_pence,
    v_journal_id,auth.uid(),btrim(p_review_note),
    jsonb_build_object('supplier_name',v_extraction.supplier_name,
       'invoice_number',v_extraction.invoice_number,
       'receipt_date',v_extraction.receipt_date,
       'currency',v_extraction.currency,
       'gross_pence',v_extraction.total_gross_pence,
       'net_pence',v_extraction.total_net_pence,
       'vat_pence',v_extraction.total_vat_pence)
  );

  INSERT INTO public.event_logs(tenant_id,client_id,actor_user_id,event_type,source,payload_json)
  VALUES (v_tenant_id,v_extraction.client_id,auth.uid(),'receipt.review_posted',
    'taxlounge_receipt_review',
    jsonb_build_object('document_id',p_document_id,'journal_id',v_journal_id));
  RETURN v_journal_id;
END;
$$;
REVOKE ALL ON FUNCTION public.post_receipt_review(uuid,uuid,uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.post_receipt_review(uuid,uuid,uuid,text) TO authenticated;


-- The OCR Edge Function alone creates validated extraction drafts. Browser
-- callers may read authorised drafts but cannot forge raw totals or rewrite
-- posted source values using a direct REST update.
DROP POLICY IF EXISTS "Users can view tenant receipt extractions" ON public.receipt_extractions;
DROP POLICY IF EXISTS "Users can insert tenant receipt extractions" ON public.receipt_extractions;
DROP POLICY IF EXISTS "Users can update tenant receipt extractions" ON public.receipt_extractions;
REVOKE INSERT,UPDATE,DELETE ON public.receipt_extractions FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.receipt_extractions TO authenticated;
CREATE POLICY "TaxLounge authorised receipt evidence readers"
 ON public.receipt_extractions FOR SELECT TO authenticated
 USING (public.taxlounge_receipt_permission(tenant_id,'view'));
