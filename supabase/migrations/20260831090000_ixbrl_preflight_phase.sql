-- Controlled iXBRL preparation and Companies House test-pack workflow.
-- This migration deliberately stops before live filing. Internal preflight is
-- not presented as FRC/HMRC/Companies House validation or acceptance.

ALTER TABLE public.ixbrl_taxonomies
  ADD COLUMN IF NOT EXISTS release_date date,
  ADD COLUMN IF NOT EXISTS accepted_period_start date,
  ADD COLUMN IF NOT EXISTS accepted_period_end date,
  ADD COLUMN IF NOT EXISTS authority_url text,
  ADD COLUMN IF NOT EXISTS reference_status text NOT NULL DEFAULT 'legacy'
    CHECK (reference_status IN ('legacy', 'verified', 'superseded')),
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS validation_profile text;

UPDATE public.ixbrl_taxonomies
SET is_active = false,
    reference_status = 'superseded'
WHERE version = '2024';

INSERT INTO public.ixbrl_taxonomies (
  name,
  version,
  taxonomy_type,
  schema_url,
  is_active,
  release_date,
  accepted_period_start,
  accepted_period_end,
  authority_url,
  reference_status,
  verified_at,
  validation_profile
) VALUES
  (
    'FRC Taxonomy Suite',
    '2026 v1.0.0',
    'uk-gaap',
    NULL,
    true,
    DATE '2025-11-18',
    DATE '2015-04-01',
    NULL,
    'https://www.frc.org.uk/library/standards-codes-policy/accounting-and-reporting/frc-taxonomies/current-uk-and-irish-digital-reporting-taxonomies/2026-uk-and-irish-digital-reporting-taxonomies/',
    'verified',
    now(),
    'hmrc-joint-filing-2026'
  ),
  (
    'Charities Taxonomy',
    '2026',
    'uk-charity',
    NULL,
    true,
    DATE '2025-11-18',
    DATE '2015-04-01',
    NULL,
    'https://www.frc.org.uk/library/standards-codes-policy/accounting-and-reporting/frc-taxonomies/current-uk-and-irish-digital-reporting-taxonomies/2026-uk-and-irish-digital-reporting-taxonomies/',
    'verified',
    now(),
    'hmrc-joint-filing-2026'
  ),
  (
    'Corporation Tax computational',
    '2025',
    'hmrc-ct',
    NULL,
    true,
    NULL,
    DATE '2015-04-01',
    NULL,
    'https://www.gov.uk/government/publications/taxonomies-accepted-by-hm-revenue-and-customs/taxonomies-accepted-by-hmrc',
    'verified',
    now(),
    'hmrc-ct-2025'
  )
ON CONFLICT (name, version) DO UPDATE SET
  taxonomy_type = EXCLUDED.taxonomy_type,
  is_active = EXCLUDED.is_active,
  release_date = EXCLUDED.release_date,
  accepted_period_start = EXCLUDED.accepted_period_start,
  accepted_period_end = EXCLUDED.accepted_period_end,
  authority_url = EXCLUDED.authority_url,
  reference_status = EXCLUDED.reference_status,
  verified_at = EXCLUDED.verified_at,
  validation_profile = EXCLUDED.validation_profile;

ALTER TABLE public.ixbrl_filing_instances
  ADD COLUMN IF NOT EXISTS package_kind text NOT NULL DEFAULT 'companies_house_accounts'
    CHECK (package_kind IN ('companies_house_accounts', 'hmrc_accounts', 'hmrc_computation')),
  ADD COLUMN IF NOT EXISTS package_version integer NOT NULL DEFAULT 1 CHECK (package_version > 0),
  ADD COLUMN IF NOT EXISTS preflight_status text NOT NULL DEFAULT 'not_run'
    CHECK (preflight_status IN ('not_run', 'failed', 'passed')),
  ADD COLUMN IF NOT EXISTS mapping_coverage numeric(5,2) NOT NULL DEFAULT 0
    CHECK (mapping_coverage >= 0 AND mapping_coverage <= 100),
  ADD COLUMN IF NOT EXISTS blocking_issue_count integer NOT NULL DEFAULT 0 CHECK (blocking_issue_count >= 0),
  ADD COLUMN IF NOT EXISTS warning_issue_count integer NOT NULL DEFAULT 0 CHECK (warning_issue_count >= 0),
  ADD COLUMN IF NOT EXISTS facts_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS source_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS prepared_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS facts_reviewed_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS facts_reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS facts_review_statement text,
  ADD COLUMN IF NOT EXISTS external_validation_status text NOT NULL DEFAULT 'not_run'
    CHECK (external_validation_status IN ('not_run', 'passed', 'failed')),
  ADD COLUMN IF NOT EXISTS external_validation_evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS test_package_status text NOT NULL DEFAULT 'not_ready'
    CHECK (test_package_status IN ('not_ready', 'ready', 'submitted', 'accepted', 'rejected')),
  ADD COLUMN IF NOT EXISTS test_package_evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS renderer_version text,
  ADD COLUMN IF NOT EXISTS content_sha256 text,
  ADD COLUMN IF NOT EXISTS live_filing_enabled boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS ux_ixbrl_instance_period_kind_version
  ON public.ixbrl_filing_instances (tenant_id, accounts_period_id, package_kind, package_version)
  WHERE accounts_period_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_ixbrl_instances_preflight
  ON public.ixbrl_filing_instances (tenant_id, preflight_status, created_at DESC);

CREATE TABLE public.ixbrl_filing_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  filing_instance_id uuid NOT NULL REFERENCES public.ixbrl_filing_instances(id) ON DELETE CASCADE,
  event_type text NOT NULL
    CHECK (event_type IN (
      'draft_built',
      'preflight_failed',
      'preflight_passed',
      'facts_reviewed',
      'external_validation_passed',
      'external_validation_failed',
      'test_ready',
      'test_submitted',
      'test_accepted',
      'test_rejected'
    )),
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ix_ixbrl_filing_events_instance
  ON public.ixbrl_filing_events (tenant_id, filing_instance_id, created_at DESC);

ALTER TABLE public.ixbrl_filing_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant staff view iXBRL filing events"
  ON public.ixbrl_filing_events FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE OR REPLACE FUNCTION public.build_ixbrl_preflight(
  p_period_id uuid,
  p_taxonomy_id uuid,
  p_package_kind text DEFAULT 'companies_house_accounts'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id uuid := public.get_user_tenant_id(auth.uid());
  v_period public.accounts_periods%ROWTYPE;
  v_client public.clients%ROWTYPE;
  v_profile public.accounts_compliance_profiles%ROWTYPE;
  v_taxonomy public.ixbrl_taxonomies%ROWTYPE;
  v_instance_id uuid;
  v_version integer;
  v_nonzero_count integer := 0;
  v_mapped_count integer := 0;
  v_coverage numeric(5,2) := 0;
  v_facts jsonb := '[]'::jsonb;
  v_issues jsonb := '[]'::jsonb;
  v_blocker_count integer := 0;
  v_warning_count integer := 0;
  v_preflight_status text;
BEGIN
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Authenticated tenant context is required';
  END IF;

  IF p_package_kind NOT IN ('companies_house_accounts', 'hmrc_accounts') THEN
    RAISE EXCEPTION 'Unsupported iXBRL package kind';
  END IF;

  SELECT * INTO v_period
  FROM public.accounts_periods
  WHERE id = p_period_id AND tenant_id = v_tenant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Accounting period was not found for this tenant';
  END IF;

  SELECT * INTO v_client
  FROM public.clients
  WHERE id = v_period.client_id AND tenant_id = v_tenant_id;

  SELECT * INTO v_profile
  FROM public.accounts_compliance_profiles
  WHERE period_id = p_period_id AND tenant_id = v_tenant_id;

  IF NOT FOUND OR v_profile.status <> 'locked' OR v_profile.locked_snapshot IS NULL THEN
    RAISE EXCEPTION 'Final accounts must be reviewer-approved and locked before iXBRL preflight';
  END IF;

  SELECT * INTO v_taxonomy
  FROM public.ixbrl_taxonomies
  WHERE id = p_taxonomy_id
    AND is_active = true
    AND reference_status = 'verified';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Select an active, authority-verified taxonomy release';
  END IF;

  IF p_package_kind IN ('companies_house_accounts', 'hmrc_accounts')
     AND v_taxonomy.taxonomy_type NOT IN ('uk-gaap', 'uk-charity') THEN
    RAISE EXCEPTION 'Accounts packages require an FRC accounts taxonomy';
  END IF;

  IF v_taxonomy.accepted_period_start IS NOT NULL
     AND v_period.period_start < v_taxonomy.accepted_period_start THEN
    v_issues := v_issues || jsonb_build_array(jsonb_build_object(
      'code', 'TAXONOMY_PERIOD_START',
      'severity', 'blocking',
      'message', 'The selected taxonomy is not accepted for this accounting period start date.'
    ));
  END IF;

  IF v_taxonomy.accepted_period_end IS NOT NULL
     AND v_period.period_end > v_taxonomy.accepted_period_end THEN
    v_issues := v_issues || jsonb_build_array(jsonb_build_object(
      'code', 'TAXONOMY_PERIOD_END',
      'severity', 'blocking',
      'message', 'The selected taxonomy is no longer accepted for this accounting period end date.'
    ));
  END IF;

  IF p_package_kind = 'companies_house_accounts'
     AND nullif(regexp_replace(coalesce(v_client.company_number, ''), '[^A-Za-z0-9]', '', 'g'), '') IS NULL THEN
    v_issues := v_issues || jsonb_build_array(jsonb_build_object(
      'code', 'COMPANY_NUMBER_REQUIRED',
      'severity', 'blocking',
      'message', 'A Companies House company number is required.'
    ));
  END IF;

  IF p_package_kind = 'companies_house_accounts'
     AND v_client.entity_type::text NOT IN ('ltd', 'llp', 'charity') THEN
    v_issues := v_issues || jsonb_build_array(jsonb_build_object(
      'code', 'ENTITY_NOT_COMPANIES_HOUSE',
      'severity', 'blocking',
      'message', 'This entity type does not file annual accounts with Companies House.'
    ));
  END IF;

  IF v_taxonomy.taxonomy_type = 'uk-charity' AND v_client.entity_type::text <> 'charity' THEN
    v_issues := v_issues || jsonb_build_array(jsonb_build_object(
      'code', 'CHARITY_TAXONOMY_MISMATCH',
      'severity', 'blocking',
      'message', 'The Charities Taxonomy can only be used for a charity client.'
    ));
  ELSIF v_taxonomy.taxonomy_type = 'uk-gaap' AND v_client.entity_type::text = 'charity' THEN
    v_issues := v_issues || jsonb_build_array(jsonb_build_object(
      'code', 'CHARITY_TAXONOMY_REQUIRED',
      'severity', 'blocking',
      'message', 'Select the current Charities Taxonomy for this charity client.'
    ));
  END IF;

  IF p_package_kind = 'hmrc_accounts' AND nullif(btrim(coalesce(v_client.utr, '')), '') IS NULL THEN
    v_issues := v_issues || jsonb_build_array(jsonb_build_object(
      'code', 'UTR_REQUIRED',
      'severity', 'blocking',
      'message', 'A company UTR is required for an HMRC package.'
    ));
  END IF;

  SELECT count(*) INTO v_nonzero_count
  FROM public.trial_balance_entries entry
  WHERE entry.tenant_id = v_tenant_id
    AND entry.period_id = p_period_id
    AND (
      entry.debit_pence + entry.adjustment_debit_pence <> entry.credit_pence + entry.adjustment_credit_pence
      OR entry.comparative_debit_pence <> entry.comparative_credit_pence
    );

  SELECT count(*) INTO v_mapped_count
  FROM public.trial_balance_entries entry
  JOIN public.ixbrl_tag_mappings mapping
    ON mapping.tenant_id = entry.tenant_id
   AND mapping.taxonomy_id = p_taxonomy_id
   AND mapping.account_code = entry.account_code
  WHERE entry.tenant_id = v_tenant_id
    AND entry.period_id = p_period_id
    AND (
      entry.debit_pence + entry.adjustment_debit_pence <> entry.credit_pence + entry.adjustment_credit_pence
      OR entry.comparative_debit_pence <> entry.comparative_credit_pence
    );

  IF v_nonzero_count > 0 THEN
    v_coverage := round((v_mapped_count::numeric / v_nonzero_count::numeric) * 100, 2);
  END IF;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'account_code', entry.account_code,
    'account_name', entry.account_name,
    'account_type', entry.account_type,
    'concept', mapping.tag_name,
    'namespace', mapping.tag_namespace,
    'context_ref', coalesce(mapping.context_ref, 'CurrentPeriod'),
    'unit_ref', coalesce(mapping.unit_ref, 'GBP'),
    'decimals', coalesce(mapping.decimals, 0),
    'current_value_pence', entry.debit_pence + entry.adjustment_debit_pence - entry.credit_pence - entry.adjustment_credit_pence,
    'comparative_value_pence', entry.comparative_debit_pence - entry.comparative_credit_pence
  ) ORDER BY entry.sort_order, entry.account_code), '[]'::jsonb)
  INTO v_facts
  FROM public.trial_balance_entries entry
  JOIN public.ixbrl_tag_mappings mapping
    ON mapping.tenant_id = entry.tenant_id
   AND mapping.taxonomy_id = p_taxonomy_id
   AND mapping.account_code = entry.account_code
  WHERE entry.tenant_id = v_tenant_id
    AND entry.period_id = p_period_id
    AND (
      entry.debit_pence + entry.adjustment_debit_pence <> entry.credit_pence + entry.adjustment_credit_pence
      OR entry.comparative_debit_pence <> entry.comparative_credit_pence
    );

  IF v_nonzero_count = 0 THEN
    v_issues := v_issues || jsonb_build_array(jsonb_build_object(
      'code', 'NO_REPORTABLE_FACTS',
      'severity', 'blocking',
      'message', 'The locked trial balance has no non-zero facts to tag.'
    ));
  ELSIF v_mapped_count < v_nonzero_count THEN
    v_issues := v_issues || jsonb_build_array(jsonb_build_object(
      'code', 'UNMAPPED_ACCOUNTS',
      'severity', 'blocking',
      'message', format('%s non-zero account(s) do not have a taxonomy mapping.', v_nonzero_count - v_mapped_count)
    ));
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.ixbrl_tag_mappings mapping
    JOIN public.trial_balance_entries entry
      ON entry.tenant_id = mapping.tenant_id
     AND entry.account_code = mapping.account_code
     AND entry.period_id = p_period_id
    WHERE mapping.tenant_id = v_tenant_id
      AND mapping.taxonomy_id = p_taxonomy_id
    GROUP BY mapping.tag_namespace, mapping.tag_name, coalesce(mapping.context_ref, 'CurrentPeriod')
    HAVING count(*) > 1
  ) THEN
    v_issues := v_issues || jsonb_build_array(jsonb_build_object(
      'code', 'DUPLICATE_CONCEPT_CONTEXT',
      'severity', 'warning',
      'message', 'Multiple accounts map to the same concept and context; review aggregation before rendering.'
    ));
  END IF;

  SELECT count(*) FILTER (WHERE issue ->> 'severity' = 'blocking'),
         count(*) FILTER (WHERE issue ->> 'severity' = 'warning')
    INTO v_blocker_count, v_warning_count
  FROM jsonb_array_elements(v_issues) issue;

  v_preflight_status := CASE WHEN v_blocker_count = 0 THEN 'passed' ELSE 'failed' END;

  SELECT coalesce(max(package_version), 0) + 1 INTO v_version
  FROM public.ixbrl_filing_instances
  WHERE tenant_id = v_tenant_id
    AND accounts_period_id = p_period_id
    AND package_kind = p_package_kind;

  INSERT INTO public.ixbrl_filing_instances (
    tenant_id,
    client_id,
    accounts_period_id,
    taxonomy_id,
    status,
    validation_errors_json,
    package_kind,
    package_version,
    preflight_status,
    mapping_coverage,
    blocking_issue_count,
    warning_issue_count,
    facts_json,
    source_snapshot,
    prepared_by_user_id,
    generated_at
  ) VALUES (
    v_tenant_id,
    v_period.client_id,
    p_period_id,
    p_taxonomy_id,
    CASE WHEN v_preflight_status = 'passed' THEN 'preflight_passed' ELSE 'preflight_failed' END,
    v_issues,
    p_package_kind,
    v_version,
    v_preflight_status,
    v_coverage,
    v_blocker_count,
    v_warning_count,
    v_facts,
    jsonb_build_object(
      'client', jsonb_build_object(
        'id', v_client.id,
        'legal_name', v_client.legal_name,
        'company_number', v_client.company_number,
        'utr', v_client.utr,
        'entity_type', v_client.entity_type
      ),
      'period', jsonb_build_object(
        'id', v_period.id,
        'period_start', v_period.period_start,
        'period_end', v_period.period_end
      ),
      'accounts_lock', v_profile.locked_snapshot,
      'taxonomy', jsonb_build_object(
        'id', v_taxonomy.id,
        'name', v_taxonomy.name,
        'version', v_taxonomy.version,
        'authority_url', v_taxonomy.authority_url,
        'validation_profile', v_taxonomy.validation_profile
      )
    ),
    auth.uid(),
    now()
  ) RETURNING id INTO v_instance_id;

  INSERT INTO public.ixbrl_filing_events (
    tenant_id,
    filing_instance_id,
    event_type,
    actor_user_id,
    evidence
  ) VALUES (
    v_tenant_id,
    v_instance_id,
    CASE WHEN v_preflight_status = 'passed' THEN 'preflight_passed' ELSE 'preflight_failed' END,
    auth.uid(),
    jsonb_build_object(
      'internal_preflight_only', true,
      'mapping_coverage', v_coverage,
      'blocking_issue_count', v_blocker_count,
      'warning_issue_count', v_warning_count,
      'issues', v_issues
    )
  );

  RETURN jsonb_build_object(
    'filing_instance_id', v_instance_id,
    'package_version', v_version,
    'preflight_status', v_preflight_status,
    'mapping_coverage', v_coverage,
    'blocking_issue_count', v_blocker_count,
    'warning_issue_count', v_warning_count,
    'issues', v_issues
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_ixbrl_facts_review(
  p_filing_instance_id uuid,
  p_review_statement text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id uuid := public.get_user_tenant_id(auth.uid());
  v_instance public.ixbrl_filing_instances%ROWTYPE;
  v_is_reviewer boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND tenant_id = v_tenant_id
      AND role IN ('super_admin', 'firm_owner', 'manager')
  ) INTO v_is_reviewer;

  IF NOT v_is_reviewer THEN
    RAISE EXCEPTION 'Manager, firm owner or super admin role is required for tagged-facts review';
  END IF;

  IF nullif(btrim(p_review_statement), '') IS NULL THEN
    RAISE EXCEPTION 'A tagged-facts review statement is required';
  END IF;

  SELECT * INTO v_instance
  FROM public.ixbrl_filing_instances
  WHERE id = p_filing_instance_id AND tenant_id = v_tenant_id
  FOR UPDATE;

  IF NOT FOUND OR v_instance.preflight_status <> 'passed' THEN
    RAISE EXCEPTION 'Internal preflight must pass before tagged-facts review';
  END IF;

  IF v_instance.prepared_by_user_id = auth.uid() THEN
    RAISE EXCEPTION 'The tagged-facts reviewer must be different from the package preparer';
  END IF;

  IF v_instance.facts_reviewed_at IS NOT NULL THEN
    RAISE EXCEPTION 'This package version has already had tagged-facts review';
  END IF;

  UPDATE public.ixbrl_filing_instances
  SET status = 'reviewed',
      facts_reviewed_by_user_id = auth.uid(),
      facts_reviewed_at = now(),
      facts_review_statement = btrim(p_review_statement),
      updated_at = now()
  WHERE id = p_filing_instance_id;

  INSERT INTO public.ixbrl_filing_events
    (tenant_id, filing_instance_id, event_type, actor_user_id, evidence)
  VALUES (
    v_tenant_id,
    p_filing_instance_id,
    'facts_reviewed',
    auth.uid(),
    jsonb_build_object('statement', btrim(p_review_statement))
  );

  RETURN jsonb_build_object('reviewed', true, 'reviewed_at', now());
END;
$$;

CREATE OR REPLACE FUNCTION public.request_ixbrl_test_package(p_filing_instance_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id uuid := public.get_user_tenant_id(auth.uid());
  v_instance public.ixbrl_filing_instances%ROWTYPE;
  v_is_reviewer boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND tenant_id = v_tenant_id
      AND role IN ('super_admin', 'firm_owner', 'manager')
  ) INTO v_is_reviewer;

  IF NOT v_is_reviewer THEN
    RAISE EXCEPTION 'Manager, firm owner or super admin role is required';
  END IF;

  SELECT * INTO v_instance
  FROM public.ixbrl_filing_instances
  WHERE id = p_filing_instance_id AND tenant_id = v_tenant_id
  FOR UPDATE;

  IF NOT FOUND OR v_instance.facts_reviewed_at IS NULL THEN
    RAISE EXCEPTION 'Two-person tagged-facts review is required before a test package can be prepared';
  END IF;

  IF v_instance.external_validation_status <> 'passed' THEN
    RAISE EXCEPTION 'External iXBRL validation evidence is required before a test package can be prepared';
  END IF;

  UPDATE public.ixbrl_filing_instances
  SET status = 'test_ready',
      test_package_status = 'ready',
      updated_at = now()
  WHERE id = p_filing_instance_id;

  INSERT INTO public.ixbrl_filing_events
    (tenant_id, filing_instance_id, event_type, actor_user_id, evidence)
  VALUES (
    v_tenant_id,
    p_filing_instance_id,
    'test_ready',
    auth.uid(),
    jsonb_build_object('live_filing_enabled', false)
  );

  RETURN jsonb_build_object('test_package_status', 'ready', 'live_filing_enabled', false);
END;
$$;

-- Deployment services call this after a real validator returns. It is not
-- granted to browser-authenticated users.
CREATE OR REPLACE FUNCTION public.record_ixbrl_external_validation(
  p_tenant_id uuid,
  p_filing_instance_id uuid,
  p_status text,
  p_evidence jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_status NOT IN ('passed', 'failed') THEN
    RAISE EXCEPTION 'External validation status must be passed or failed';
  END IF;

  UPDATE public.ixbrl_filing_instances
  SET external_validation_status = p_status,
      external_validation_evidence = coalesce(p_evidence, '{}'::jsonb),
      updated_at = now()
  WHERE id = p_filing_instance_id AND tenant_id = p_tenant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'iXBRL filing instance was not found';
  END IF;

  INSERT INTO public.ixbrl_filing_events
    (tenant_id, filing_instance_id, event_type, evidence)
  VALUES (
    p_tenant_id,
    p_filing_instance_id,
    CASE WHEN p_status = 'passed' THEN 'external_validation_passed' ELSE 'external_validation_failed' END,
    coalesce(p_evidence, '{}'::jsonb)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.record_ixbrl_test_result(
  p_tenant_id uuid,
  p_filing_instance_id uuid,
  p_status text,
  p_evidence jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_status NOT IN ('submitted', 'accepted', 'rejected') THEN
    RAISE EXCEPTION 'Unsupported test package result';
  END IF;

  UPDATE public.ixbrl_filing_instances
  SET status = 'test_' || p_status,
      test_package_status = p_status,
      test_package_evidence = coalesce(p_evidence, '{}'::jsonb),
      updated_at = now()
  WHERE id = p_filing_instance_id
    AND tenant_id = p_tenant_id
    AND test_package_status IN ('ready', 'submitted');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'A test-ready iXBRL filing instance was not found';
  END IF;

  INSERT INTO public.ixbrl_filing_events
    (tenant_id, filing_instance_id, event_type, evidence)
  VALUES (
    p_tenant_id,
    p_filing_instance_id,
    'test_' || p_status,
    coalesce(p_evidence, '{}'::jsonb)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.protect_ixbrl_authoritative_state()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_user IN ('service_role', 'postgres') THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP IN ('INSERT', 'DELETE') THEN
    RAISE EXCEPTION 'Use the controlled iXBRL workflow';
  END IF;

  IF NEW.tenant_id IS DISTINCT FROM OLD.tenant_id
     OR NEW.client_id IS DISTINCT FROM OLD.client_id
     OR NEW.accounts_period_id IS DISTINCT FROM OLD.accounts_period_id
     OR NEW.taxonomy_id IS DISTINCT FROM OLD.taxonomy_id
     OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.validation_errors_json IS DISTINCT FROM OLD.validation_errors_json
     OR NEW.generated_xbrl IS DISTINCT FROM OLD.generated_xbrl
     OR NEW.submitted_at IS DISTINCT FROM OLD.submitted_at
     OR NEW.submission_job_id IS DISTINCT FROM OLD.submission_job_id
     OR NEW.package_kind IS DISTINCT FROM OLD.package_kind
     OR NEW.package_version IS DISTINCT FROM OLD.package_version
     OR NEW.preflight_status IS DISTINCT FROM OLD.preflight_status
     OR NEW.mapping_coverage IS DISTINCT FROM OLD.mapping_coverage
     OR NEW.blocking_issue_count IS DISTINCT FROM OLD.blocking_issue_count
     OR NEW.warning_issue_count IS DISTINCT FROM OLD.warning_issue_count
     OR NEW.facts_json IS DISTINCT FROM OLD.facts_json
     OR NEW.source_snapshot IS DISTINCT FROM OLD.source_snapshot
     OR NEW.prepared_by_user_id IS DISTINCT FROM OLD.prepared_by_user_id
     OR NEW.facts_reviewed_by_user_id IS DISTINCT FROM OLD.facts_reviewed_by_user_id
     OR NEW.facts_reviewed_at IS DISTINCT FROM OLD.facts_reviewed_at
     OR NEW.facts_review_statement IS DISTINCT FROM OLD.facts_review_statement
     OR NEW.external_validation_status IS DISTINCT FROM OLD.external_validation_status
     OR NEW.external_validation_evidence IS DISTINCT FROM OLD.external_validation_evidence
     OR NEW.test_package_status IS DISTINCT FROM OLD.test_package_status
     OR NEW.test_package_evidence IS DISTINCT FROM OLD.test_package_evidence
     OR NEW.renderer_version IS DISTINCT FROM OLD.renderer_version
     OR NEW.content_sha256 IS DISTINCT FROM OLD.content_sha256
     OR NEW.live_filing_enabled IS DISTINCT FROM OLD.live_filing_enabled THEN
    RAISE EXCEPTION 'Authoritative iXBRL state can only change through controlled workflows';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_ixbrl_authoritative_state ON public.ixbrl_filing_instances;
CREATE TRIGGER protect_ixbrl_authoritative_state
  BEFORE INSERT OR UPDATE OR DELETE ON public.ixbrl_filing_instances
  FOR EACH ROW EXECUTE FUNCTION public.protect_ixbrl_authoritative_state();

REVOKE ALL ON FUNCTION public.build_ixbrl_preflight(uuid, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.approve_ixbrl_facts_review(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.request_ixbrl_test_package(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_ixbrl_external_validation(uuid, uuid, text, jsonb) FROM PUBLIC, authenticated;
REVOKE ALL ON FUNCTION public.record_ixbrl_test_result(uuid, uuid, text, jsonb) FROM PUBLIC, authenticated;

GRANT EXECUTE ON FUNCTION public.build_ixbrl_preflight(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_ixbrl_facts_review(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_ixbrl_test_package(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_ixbrl_external_validation(uuid, uuid, text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_ixbrl_test_result(uuid, uuid, text, jsonb) TO service_role;

REVOKE INSERT, UPDATE, DELETE ON public.ixbrl_filing_instances FROM authenticated;
GRANT SELECT ON public.ixbrl_filing_instances TO authenticated;
GRANT SELECT ON public.ixbrl_filing_events TO authenticated;
GRANT ALL ON public.ixbrl_filing_instances, public.ixbrl_filing_events TO service_role;

COMMENT ON TABLE public.ixbrl_filing_events IS
  'Append-only iXBRL preparation evidence. Internal preflight and tagged-facts review are not regulator acceptance.';
COMMENT ON COLUMN public.ixbrl_filing_instances.preflight_status IS
  'Deterministic internal checks only; never represents FRC, HMRC or Companies House validation.';
COMMENT ON COLUMN public.ixbrl_filing_instances.live_filing_enabled IS
  'Server-controlled production gate. This phase always leaves live accounts filing disabled.';
