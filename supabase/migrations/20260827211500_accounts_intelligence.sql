-- Accounts Intelligence: evidence matching, duplicate control and year-end review.
-- This extends the existing PracticeCraft tenant/client/period ledger; it does
-- not introduce a second accounting system of record.

-- A full unique index still permits multiple NULL provider IDs while allowing
-- CSV imports to use idempotent upserts against the same bank account.
DROP INDEX IF EXISTS public.idx_bank_txn_provider_dedup;
CREATE UNIQUE INDEX idx_bank_txn_provider_dedup
  ON public.bank_transactions(bank_connection_id, provider_transaction_id);

ALTER TABLE public.bank_connections
  ADD COLUMN IF NOT EXISTS ledger_account_id uuid REFERENCES public.chart_of_accounts(id) ON DELETE SET NULL;

CREATE TABLE public.document_fingerprints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  document_id uuid NOT NULL UNIQUE REFERENCES public.documents(id) ON DELETE CASCADE,
  sha256 text NOT NULL,
  size_bytes bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT document_fingerprints_sha256_format CHECK (sha256 ~ '^[0-9a-f]{64}$')
);

CREATE UNIQUE INDEX document_fingerprints_client_sha256_uidx
  ON public.document_fingerprints (
    tenant_id,
    COALESCE(client_id, '00000000-0000-0000-0000-000000000000'::uuid),
    sha256
  );
CREATE INDEX document_fingerprints_document_idx
  ON public.document_fingerprints(document_id);

CREATE TABLE public.evidence_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  period_id uuid NOT NULL REFERENCES public.accounts_periods(id) ON DELETE CASCADE,
  bank_transaction_id uuid NOT NULL REFERENCES public.bank_transactions(id) ON DELETE CASCADE,
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  extraction_id uuid REFERENCES public.receipt_extractions(id) ON DELETE SET NULL,
  match_type text NOT NULL DEFAULT 'amount_date',
  confidence smallint NOT NULL DEFAULT 0,
  factors_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'suggested',
  reviewed_by_user_id uuid,
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT evidence_matches_confidence_range CHECK (confidence BETWEEN 0 AND 100),
  CONSTRAINT evidence_matches_status_check CHECK (status IN ('suggested', 'confirmed', 'rejected')),
  UNIQUE (bank_transaction_id, document_id)
);

CREATE INDEX evidence_matches_review_idx
  ON public.evidence_matches(tenant_id, client_id, period_id, status, confidence DESC);

CREATE TABLE public.duplicate_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  period_id uuid REFERENCES public.accounts_periods(id) ON DELETE CASCADE,
  primary_document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  candidate_document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  detection_method text NOT NULL,
  confidence smallint NOT NULL DEFAULT 0,
  reasons_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'open',
  reviewed_by_user_id uuid,
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT duplicate_candidates_distinct_documents CHECK (primary_document_id <> candidate_document_id),
  CONSTRAINT duplicate_candidates_confidence_range CHECK (confidence BETWEEN 0 AND 100),
  CONSTRAINT duplicate_candidates_status_check CHECK (status IN ('open', 'confirmed_duplicate', 'not_duplicate')),
  UNIQUE (primary_document_id, candidate_document_id)
);

CREATE INDEX duplicate_candidates_review_idx
  ON public.duplicate_candidates(tenant_id, client_id, period_id, status, confidence DESC);

CREATE TABLE public.accounting_judgements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  period_id uuid NOT NULL REFERENCES public.accounts_periods(id) ON DELETE CASCADE,
  judgement_type text NOT NULL,
  title text NOT NULL,
  description text,
  amount_pence bigint,
  document_id uuid REFERENCES public.documents(id) ON DELETE SET NULL,
  bank_transaction_id uuid REFERENCES public.bank_transactions(id) ON DELETE SET NULL,
  proposed_account_id uuid REFERENCES public.chart_of_accounts(id) ON DELETE SET NULL,
  posted_journal_id uuid REFERENCES public.journal_entries(id) ON DELETE SET NULL,
  effective_from date,
  effective_to date,
  data_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'proposed',
  created_by_user_id uuid,
  reviewed_by_user_id uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT accounting_judgements_type_check CHECK (
    judgement_type IN (
      'capex', 'cash_expense', 'accrual', 'prepayment', 'depreciation',
      'opening_balance', 'closing_balance', 'missing_evidence', 'other'
    )
  ),
  CONSTRAINT accounting_judgements_status_check CHECK (status IN ('proposed', 'approved', 'rejected', 'posted'))
);

CREATE INDEX accounting_judgements_period_idx
  ON public.accounting_judgements(tenant_id, client_id, period_id, status);
CREATE UNIQUE INDEX accounting_judgements_document_proposal_uidx
  ON public.accounting_judgements(period_id, judgement_type, document_id)
  WHERE document_id IS NOT NULL;

CREATE TABLE public.year_end_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  period_id uuid NOT NULL REFERENCES public.accounts_periods(id) ON DELETE CASCADE,
  check_key text NOT NULL,
  title text NOT NULL,
  category text NOT NULL,
  status text NOT NULL DEFAULT 'not_started',
  notes text,
  completed_by_user_id uuid,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT year_end_checks_status_check CHECK (status IN ('not_started', 'in_progress', 'complete', 'not_applicable', 'blocked')),
  UNIQUE(period_id, check_key)
);

CREATE INDEX year_end_checks_period_idx
  ON public.year_end_checks(tenant_id, client_id, period_id, category, status);

ALTER TABLE public.document_fingerprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.duplicate_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_judgements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.year_end_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation - document fingerprints"
  ON public.document_fingerprints FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Tenant isolation - evidence matches"
  ON public.evidence_matches FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Tenant isolation - duplicate candidates"
  ON public.duplicate_candidates FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Tenant isolation - accounting judgements"
  ON public.accounting_judgements FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Tenant isolation - year end checks"
  ON public.year_end_checks FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE TRIGGER update_evidence_matches_updated_at
  BEFORE UPDATE ON public.evidence_matches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_duplicate_candidates_updated_at
  BEFORE UPDATE ON public.duplicate_candidates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_accounting_judgements_updated_at
  BEFORE UPDATE ON public.accounting_judgements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_year_end_checks_updated_at
  BEFORE UPDATE ON public.year_end_checks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE OR REPLACE FUNCTION public.log_accounts_intelligence_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.event_logs (
    tenant_id,
    client_id,
    actor_user_id,
    event_type,
    source,
    payload_json
  ) VALUES (
    NEW.tenant_id,
    NEW.client_id,
    auth.uid(),
    TG_TABLE_NAME || CASE WHEN TG_OP = 'INSERT' THEN '.created' ELSE '.updated' END,
    'accounts_intelligence',
    jsonb_build_object(
      'record_id', NEW.id,
      'period_id', NEW.period_id,
      'new_status', to_jsonb(NEW)->>'status',
      'previous_status', CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD)->>'status' ELSE NULL END
    )
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER audit_evidence_matches
  AFTER INSERT OR UPDATE ON public.evidence_matches
  FOR EACH ROW EXECUTE FUNCTION public.log_accounts_intelligence_change();
CREATE TRIGGER audit_duplicate_candidates
  AFTER INSERT OR UPDATE ON public.duplicate_candidates
  FOR EACH ROW EXECUTE FUNCTION public.log_accounts_intelligence_change();
CREATE TRIGGER audit_accounting_judgements
  AFTER INSERT OR UPDATE ON public.accounting_judgements
  FOR EACH ROW EXECUTE FUNCTION public.log_accounts_intelligence_change();
CREATE TRIGGER audit_year_end_checks
  AFTER INSERT OR UPDATE ON public.year_end_checks
  FOR EACH ROW EXECUTE FUNCTION public.log_accounts_intelligence_change();

CREATE OR REPLACE FUNCTION public.seed_year_end_checks(p_period_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_tenant_id uuid;
  v_client_id uuid;
  v_inserted integer;
BEGIN
  SELECT tenant_id, client_id INTO v_tenant_id, v_client_id
  FROM public.accounts_periods
  WHERE id = p_period_id
    AND tenant_id = public.get_user_tenant_id(auth.uid());

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Accounting period not found or access denied';
  END IF;

  INSERT INTO public.year_end_checks (tenant_id, client_id, period_id, check_key, title, category)
  SELECT v_tenant_id, v_client_id, p_period_id, seed.check_key, seed.title, seed.category
  FROM (VALUES
    ('bank_reconciled', 'All bank accounts reconciled to closing statements', 'Evidence'),
    ('sales_evidence', 'Sales invoices and other income evidence reviewed', 'Evidence'),
    ('purchase_evidence', 'Purchase invoices and receipts reviewed', 'Evidence'),
    ('duplicates_resolved', 'Duplicate documents and transactions resolved', 'Evidence'),
    ('unexplained_cash', 'Cash items without evidence reviewed', 'Evidence'),
    ('opening_balances', 'Opening balances agree to prior signed accounts', 'Balances'),
    ('fixed_assets', 'Capital expenditure and fixed asset register reviewed', 'Adjustments'),
    ('depreciation', 'Depreciation policies and charge reviewed', 'Adjustments'),
    ('accruals', 'Accruals and outstanding liabilities reviewed', 'Adjustments'),
    ('prepayments', 'Prepayments reviewed', 'Adjustments'),
    ('tax_bridge', 'Corporation Tax reconciliation and allowances reviewed', 'Tax'),
    ('disclosures', 'FRS disclosures and final accounts presentation reviewed', 'Accounts')
  ) AS seed(check_key, title, category)
  ON CONFLICT (period_id, check_key) DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  RETURN v_inserted;
END;
$$;

CREATE OR REPLACE FUNCTION public.run_accounts_intelligence(
  p_client_id uuid,
  p_period_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_tenant_id uuid;
  v_matches integer := 0;
  v_duplicates integer := 0;
  v_judgements integer := 0;
BEGIN
  SELECT tenant_id INTO v_tenant_id
  FROM public.accounts_periods
  WHERE id = p_period_id
    AND client_id = p_client_id
    AND tenant_id = public.get_user_tenant_id(auth.uid());

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Accounting period not found or access denied';
  END IF;

  INSERT INTO public.evidence_matches (
    tenant_id, client_id, period_id, bank_transaction_id, document_id,
    extraction_id, match_type, confidence, factors_json
  )
  SELECT
    v_tenant_id,
    p_client_id,
    p_period_id,
    bt.id,
    re.document_id,
    re.id,
    CASE
      WHEN lower(COALESCE(bt.description, '')) LIKE '%' || lower(COALESCE(re.supplier_name, '')) || '%'
        THEN 'amount_date_supplier'
      ELSE 'amount_date'
    END,
    LEAST(100,
      60
      + CASE
          WHEN abs(bt.transaction_date - re.receipt_date) <= 2 THEN 25
          WHEN abs(bt.transaction_date - re.receipt_date) <= 7 THEN 15
          ELSE 5
        END
      + CASE
          WHEN length(COALESCE(re.supplier_name, '')) >= 3
           AND lower(COALESCE(bt.description, '')) LIKE '%' || lower(re.supplier_name) || '%'
          THEN 15 ELSE 0
        END
    )::smallint,
    jsonb_build_object(
      'amount_exact', true,
      'date_difference_days', abs(bt.transaction_date - re.receipt_date),
      'supplier_in_description',
        length(COALESCE(re.supplier_name, '')) >= 3
        AND lower(COALESCE(bt.description, '')) LIKE '%' || lower(re.supplier_name) || '%'
    )
  FROM public.receipt_extractions re
  JOIN public.documents d
    ON d.id = re.document_id
   AND d.tenant_id = v_tenant_id
   AND d.client_id = p_client_id
  JOIN public.bank_transactions bt
    ON bt.tenant_id = v_tenant_id
   AND bt.client_id = p_client_id
   AND abs(bt.amount_pence) = re.total_gross_pence
   AND abs(bt.transaction_date - re.receipt_date) <= 14
  WHERE re.tenant_id = v_tenant_id
    AND re.client_id = p_client_id
    AND re.receipt_date BETWEEN (
      SELECT period_start - 14 FROM public.accounts_periods WHERE id = p_period_id
    ) AND (
      SELECT period_end + 14 FROM public.accounts_periods WHERE id = p_period_id
    )
  ON CONFLICT (bank_transaction_id, document_id) DO UPDATE
    SET confidence = EXCLUDED.confidence,
        match_type = EXCLUDED.match_type,
        factors_json = EXCLUDED.factors_json,
        updated_at = now()
    WHERE public.evidence_matches.status = 'suggested';

  GET DIAGNOSTICS v_matches = ROW_COUNT;

  INSERT INTO public.duplicate_candidates (
    tenant_id, client_id, period_id, primary_document_id,
    candidate_document_id, detection_method, confidence, reasons_json
  )
  SELECT
    v_tenant_id,
    p_client_id,
    p_period_id,
    LEAST(a.document_id, b.document_id),
    GREATEST(a.document_id, b.document_id),
    CASE
      WHEN NULLIF(lower(trim(a.invoice_number)), '') = NULLIF(lower(trim(b.invoice_number)), '')
        THEN 'invoice_number_amount'
      ELSE 'supplier_amount_date'
    END,
    CASE
      WHEN NULLIF(lower(trim(a.invoice_number)), '') = NULLIF(lower(trim(b.invoice_number)), '') THEN 98
      WHEN a.receipt_date = b.receipt_date THEN 92
      ELSE 82
    END,
    jsonb_build_array(
      'Same gross amount',
      CASE
        WHEN NULLIF(lower(trim(a.invoice_number)), '') = NULLIF(lower(trim(b.invoice_number)), '')
          THEN 'Same invoice number'
        ELSE 'Same supplier and nearby date'
      END
    )
  FROM public.receipt_extractions a
  JOIN public.receipt_extractions b
    ON b.tenant_id = a.tenant_id
   AND b.client_id = a.client_id
   AND b.document_id > a.document_id
   AND b.total_gross_pence = a.total_gross_pence
   AND (
     NULLIF(lower(trim(a.invoice_number)), '') = NULLIF(lower(trim(b.invoice_number)), '')
     OR (
       NULLIF(lower(trim(a.supplier_name)), '') = NULLIF(lower(trim(b.supplier_name)), '')
       AND abs(a.receipt_date - b.receipt_date) <= 7
     )
   )
  WHERE a.tenant_id = v_tenant_id
    AND a.client_id = p_client_id
  ON CONFLICT (primary_document_id, candidate_document_id) DO UPDATE
    SET confidence = EXCLUDED.confidence,
        detection_method = EXCLUDED.detection_method,
        reasons_json = EXCLUDED.reasons_json,
        period_id = EXCLUDED.period_id,
        updated_at = now()
    WHERE public.duplicate_candidates.status = 'open';

  GET DIAGNOSTICS v_duplicates = ROW_COUNT;

  INSERT INTO public.accounting_judgements (
    tenant_id,
    client_id,
    period_id,
    judgement_type,
    title,
    description,
    amount_pence,
    document_id,
    data_json
  )
  SELECT
    v_tenant_id,
    p_client_id,
    p_period_id,
    'capex',
    'Possible capital expenditure: ' || d.filename,
    'Flagged for review because the extracted document contains an asset or equipment keyword. Confirm useful life, ownership, business use and the applicable accounting policy before posting.',
    re.total_gross_pence,
    d.id,
    jsonb_build_object(
      'source', 'keyword_heuristic',
      'supplier', re.supplier_name,
      'confidence', CASE WHEN re.total_gross_pence >= 50000 THEN 75 ELSE 65 END
    )
  FROM public.documents d
  JOIN public.receipt_extractions re
    ON re.document_id = d.id
   AND re.tenant_id = d.tenant_id
  WHERE d.tenant_id = v_tenant_id
    AND d.client_id = p_client_id
    AND re.receipt_date BETWEEN (
      SELECT period_start FROM public.accounts_periods WHERE id = p_period_id
    ) AND (
      SELECT period_end FROM public.accounts_periods WHERE id = p_period_id
    )
    AND re.total_gross_pence >= 10000
    AND lower(concat_ws(' ', d.filename, d.ocr_text, re.supplier_name, re.raw_json::text)) LIKE ANY (
      ARRAY[
        '%laptop%', '%computer%', '%equipment%', '%machinery%', '%vehicle%',
        '%furniture%', '%fixture%', '%camera%', '%printer%', '%server%',
        '%telephone%', '%mobile phone%', '%tooling%'
      ]
    )
  ON CONFLICT (period_id, judgement_type, document_id)
    WHERE document_id IS NOT NULL
    DO NOTHING;

  GET DIAGNOSTICS v_judgements = ROW_COUNT;
  PERFORM public.seed_year_end_checks(p_period_id);

  RETURN jsonb_build_object(
    'match_candidates_processed', v_matches,
    'duplicate_candidates_processed', v_duplicates,
    'judgement_candidates_created', v_judgements
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.seed_year_end_checks(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.run_accounts_intelligence(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.post_bank_transaction(p_transaction_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_transaction public.bank_transactions%ROWTYPE;
  v_bank_account_id uuid;
  v_journal_id uuid;
  v_amount numeric(15,2);
BEGIN
  SELECT bt.*
  INTO v_transaction
  FROM public.bank_transactions bt
  WHERE bt.id = p_transaction_id
    AND bt.tenant_id = public.get_user_tenant_id(auth.uid())
  FOR UPDATE;

  IF v_transaction.id IS NULL THEN
    RAISE EXCEPTION 'Bank transaction not found or access denied';
  END IF;
  IF v_transaction.categorisation_status = 'posted' AND v_transaction.journal_entry_id IS NOT NULL THEN
    RETURN v_transaction.journal_entry_id;
  END IF;
  IF v_transaction.categorisation_status <> 'confirmed' OR v_transaction.confirmed_account_id IS NULL THEN
    RAISE EXCEPTION 'The transaction must have a confirmed ledger category before posting';
  END IF;
  SELECT ledger_account_id INTO v_bank_account_id
  FROM public.bank_connections
  WHERE id = v_transaction.bank_connection_id
    AND tenant_id = v_transaction.tenant_id;
  IF v_bank_account_id IS NULL THEN
    RAISE EXCEPTION 'Map this bank connection to a ledger bank account before posting';
  END IF;
  IF v_bank_account_id = v_transaction.confirmed_account_id THEN
    RAISE EXCEPTION 'The category and bank control account cannot be the same';
  END IF;

  v_amount := round(abs(v_transaction.amount_pence)::numeric / 100, 2);
  IF v_amount <= 0 THEN RAISE EXCEPTION 'A zero value transaction cannot be posted'; END IF;

  INSERT INTO public.journal_entries (
    tenant_id, client_id, entry_date, reference, narration, is_posted, created_by
  ) VALUES (
    v_transaction.tenant_id,
    v_transaction.client_id,
    v_transaction.transaction_date,
    'BF-' || left(v_transaction.id::text, 8),
    v_transaction.description,
    false,
    auth.uid()
  ) RETURNING id INTO v_journal_id;

  IF v_transaction.amount_pence >= 0 THEN
    INSERT INTO public.journal_lines (journal_entry_id, account_id, debit, credit, description)
    VALUES
      (v_journal_id, v_bank_account_id, v_amount, 0, v_transaction.description),
      (v_journal_id, v_transaction.confirmed_account_id, 0, v_amount, v_transaction.description);
  ELSE
    INSERT INTO public.journal_lines (journal_entry_id, account_id, debit, credit, description)
    VALUES
      (v_journal_id, v_transaction.confirmed_account_id, v_amount, 0, v_transaction.description),
      (v_journal_id, v_bank_account_id, 0, v_amount, v_transaction.description);
  END IF;

  UPDATE public.journal_entries SET is_posted = true WHERE id = v_journal_id;
  UPDATE public.bank_transactions
  SET categorisation_status = 'posted', journal_entry_id = v_journal_id
  WHERE id = v_transaction.id;

  INSERT INTO public.event_logs (tenant_id, client_id, actor_user_id, event_type, source, payload_json)
  VALUES (
    v_transaction.tenant_id,
    v_transaction.client_id,
    auth.uid(),
    'bank_transaction.posted',
    'accounts_intelligence',
    jsonb_build_object('transaction_id', v_transaction.id, 'journal_id', v_journal_id)
  );

  RETURN v_journal_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.post_bank_transaction(uuid) TO authenticated;
