-- Preparation reviews are evidence of human checks, not a live payroll release gate.
CREATE OR REPLACE FUNCTION public.payroll_review_permission(p_action text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT EXISTS (
  SELECT 1 FROM public.user_roles ur
  LEFT JOIN public.roles r ON r.tenant_id = ur.tenant_id AND r.name = CASE ur.role::text
   WHEN 'super_admin' THEN 'Firm Owner' WHEN 'firm_owner' THEN 'Firm Owner'
   WHEN 'manager' THEN 'Manager' WHEN 'payroll_officer' THEN 'Payroll Officer'
   WHEN 'staff' THEN 'Staff Accountant' ELSE '' END
  WHERE ur.user_id = auth.uid() AND ur.tenant_id = public.get_user_tenant_id(auth.uid())
   AND ur.role::text IN ('super_admin','firm_owner','manager','payroll_officer','staff')
   AND (ur.role::text IN ('super_admin','firm_owner') OR coalesce((r.permissions_json -> 'payroll' ->> p_action)::boolean, false))
 );
$$;
REVOKE ALL ON FUNCTION public.payroll_review_permission(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.payroll_review_permission(text) TO authenticated;

CREATE TABLE public.payroll_preparation_reviews (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES public.tenants(id),
 pay_run_id uuid NOT NULL REFERENCES public.pay_runs(id),
 status text NOT NULL CHECK (status IN ('requested','approved','changes_requested')),
 checks jsonb NOT NULL,
 evidence_reference text NOT NULL CHECK (length(btrim(evidence_reference)) BETWEEN 5 AND 1000),
 source_snapshot jsonb NOT NULL,
 requested_by uuid NOT NULL REFERENCES auth.users(id),
 requested_at timestamptz NOT NULL DEFAULT now(),
 reviewed_by uuid REFERENCES auth.users(id),
 reviewed_at timestamptz,
 review_note text,
 CHECK (reviewed_by IS NULL OR reviewed_by <> requested_by)
);
CREATE UNIQUE INDEX payroll_one_pending_review ON public.payroll_preparation_reviews(pay_run_id) WHERE status = 'requested';
CREATE INDEX payroll_reviews_run ON public.payroll_preparation_reviews(tenant_id,pay_run_id,requested_at DESC);
ALTER TABLE public.payroll_preparation_reviews ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.payroll_preparation_reviews TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.payroll_preparation_reviews FROM authenticated, anon;
CREATE POLICY "Payroll reviewers read authorised tenant history" ON public.payroll_preparation_reviews FOR SELECT TO authenticated
 USING (tenant_id = public.get_user_tenant_id(auth.uid()) AND public.payroll_review_permission('view'));

CREATE OR REPLACE FUNCTION public.payroll_review_snapshot(p_run_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_snapshot jsonb;
BEGIN
 IF NOT public.payroll_review_permission('view') THEN RAISE EXCEPTION 'Payroll view permission required'; END IF;
 SELECT jsonb_build_object('run',to_jsonb(r) - 'updated_at' - 'status' - 'fps_submission_job_id' - 'eps_submission_job_id',
   'employer', jsonb_build_object('id', e.id,'paye_reference', e.paye_reference,'accounts_office_ref', e.accounts_office_ref),
   'payslips', coalesce((SELECT jsonb_agg(to_jsonb(p) - 'updated_at' - 'document_id' ORDER BY p.id) FROM public.payslips p WHERE p.pay_run_id=r.id AND p.tenant_id=r.tenant_id),'[]'::jsonb))
 INTO v_snapshot FROM public.pay_runs r JOIN public.payroll_employers e ON e.id=r.employer_id AND e.tenant_id=r.tenant_id
 WHERE r.id=p_run_id AND r.tenant_id=public.get_user_tenant_id(auth.uid());
 IF v_snapshot IS NULL THEN RAISE EXCEPTION 'Payroll run unavailable'; END IF;
 RETURN v_snapshot;
END;
$$;
REVOKE ALL ON FUNCTION public.payroll_review_snapshot(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.payroll_review_snapshot(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.request_payroll_preparation_review(p_run_id uuid, p_checks jsonb, p_evidence_reference text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_run public.pay_runs%ROWTYPE; v_snapshot jsonb; v_id uuid; v_key text; v_sum numeric;
BEGIN
 IF NOT public.payroll_review_permission('run') OR NOT public.payroll_review_permission('view') THEN RAISE EXCEPTION 'Payroll run and view permissions required'; END IF;
 SELECT * INTO v_run FROM public.pay_runs WHERE id=p_run_id AND tenant_id=public.get_user_tenant_id(auth.uid()) FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Payroll run unavailable'; END IF;
 IF nullif(btrim(p_evidence_reference),'') IS NULL OR length(btrim(p_evidence_reference)) NOT BETWEEN 5 AND 1000 THEN RAISE EXCEPTION 'Provide a validation evidence reference (5–1000 characters)'; END IF;
 FOREACH v_key IN ARRAY ARRAY['inputs_checked','changes_checked','independent_calculation_checked','funding_checked'] LOOP
  IF p_checks -> v_key IS DISTINCT FROM 'true'::jsonb THEN RAISE EXCEPTION 'Complete all four preparation checks'; END IF;
 END LOOP;
 v_snapshot := public.payroll_review_snapshot(p_run_id);
 IF jsonb_array_length(v_snapshot->'payslips')=0 THEN RAISE EXCEPTION 'Generate payslips before requesting review'; END IF;
 IF nullif(btrim(v_snapshot->'employer'->>'paye_reference'),'') IS NULL OR nullif(btrim(v_snapshot->'employer'->>'accounts_office_ref'),'') IS NULL THEN RAISE EXCEPTION 'Employer filing references are missing'; END IF;
 FOREACH v_key IN ARRAY ARRAY['gross_pence','net_pence','tax_pence','ni_employee_pence','ni_employer_pence','pension_employee_pence','pension_employer_pence','student_loan_pence'] LOOP
  SELECT sum((value->>v_key)::numeric) INTO v_sum FROM jsonb_array_elements(v_snapshot->'payslips');
  IF (to_jsonb(v_run)->>('total_'||v_key)) IS NULL OR (to_jsonb(v_run)->>('total_'||v_key))::numeric IS DISTINCT FROM v_sum THEN RAISE EXCEPTION 'Run does not reconcile: %',v_key; END IF;
 END LOOP;
 IF EXISTS (SELECT 1 FROM jsonb_array_elements(v_snapshot->'payslips') p WHERE (p->>'net_pence')::numeric<0) THEN RAISE EXCEPTION 'Resolve negative net pay before review'; END IF;
 INSERT INTO public.payroll_preparation_reviews(tenant_id,pay_run_id,status,checks,evidence_reference,source_snapshot,requested_by)
 VALUES(v_run.tenant_id,p_run_id,'requested',p_checks,btrim(p_evidence_reference),v_snapshot,auth.uid()) RETURNING id INTO v_id;
 RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.request_payroll_preparation_review(uuid,jsonb,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_payroll_preparation_review(uuid,jsonb,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.decide_payroll_preparation_review(p_review_id uuid,p_decision text,p_note text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_review public.payroll_preparation_reviews%ROWTYPE;
BEGIN
 IF NOT public.payroll_review_permission('approve') OR NOT public.payroll_review_permission('view') THEN RAISE EXCEPTION 'Payroll approval and view permissions required'; END IF;
 IF p_decision NOT IN ('approved','changes_requested') OR p_decision IS NULL THEN RAISE EXCEPTION 'Invalid decision'; END IF;
 IF coalesce(length(btrim(p_note)),0) NOT BETWEEN 5 AND 2000 THEN RAISE EXCEPTION 'Provide a review note (5–2000 characters)'; END IF;
 SELECT * INTO v_review FROM public.payroll_preparation_reviews WHERE id=p_review_id AND tenant_id=public.get_user_tenant_id(auth.uid()) FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Review unavailable'; END IF;
 IF v_review.status <> 'requested' THEN RAISE EXCEPTION 'Review already decided'; END IF;
 IF v_review.requested_by=auth.uid() THEN RAISE EXCEPTION 'A different reviewer must decide'; END IF;
 IF p_decision='approved' AND v_review.source_snapshot IS DISTINCT FROM public.payroll_review_snapshot(v_review.pay_run_id) THEN RAISE EXCEPTION 'Payroll changed. Request changes and prepare a fresh review'; END IF;
 UPDATE public.payroll_preparation_reviews SET status=p_decision, reviewed_by=auth.uid(), reviewed_at=now(),review_note=btrim(p_note) WHERE id=p_review_id;
END;
$$;
REVOKE ALL ON FUNCTION public.decide_payroll_preparation_review(uuid,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.decide_payroll_preparation_review(uuid,text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_payroll_preparation_reviews(p_run_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE v_snapshot jsonb; v_result jsonb;
BEGIN
 v_snapshot:=public.payroll_review_snapshot(p_run_id);
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',r.id,'status',r.status,'checks',r.checks,'evidence_reference',r.evidence_reference,'requested_by',r.requested_by,'requested_at',r.requested_at,'reviewed_at',r.reviewed_at,'review_note',r.review_note,'is_current',r.source_snapshot=v_snapshot) ORDER BY r.requested_at DESC),'[]'::jsonb)
 INTO v_result FROM public.payroll_preparation_reviews r WHERE r.pay_run_id=p_run_id AND r.tenant_id=public.get_user_tenant_id(auth.uid());
 RETURN v_result;
END;
$$;
REVOKE ALL ON FUNCTION public.get_payroll_preparation_reviews(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_payroll_preparation_reviews(uuid) TO authenticated;
