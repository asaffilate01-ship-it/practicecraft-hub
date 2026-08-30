-- Deterministic accounts-preparation controls for the first FRS 105 / FRS 102
-- Section 1A production slice. This is a preparation and approval lock; it is
-- not an iXBRL validator or a Companies House filing acceptance.

CREATE TABLE public.accounts_compliance_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  period_id uuid NOT NULL REFERENCES public.accounts_periods(id) ON DELETE CASCADE,
  framework text NOT NULL DEFAULT 'frs102_1a'
    CHECK (framework IN ('frs105', 'frs102_1a')),
  entity_size text NOT NULL DEFAULT 'small'
    CHECK (entity_size IN ('micro', 'small')),
  rounding_basis text NOT NULL DEFAULT 'pounds'
    CHECK (rounding_basis IN ('pounds', 'thousands')),
  framework_eligibility_confirmed boolean NOT NULL DEFAULT false,
  comparatives_required boolean NOT NULL DEFAULT true,
  comparatives_complete boolean NOT NULL DEFAULT false,
  policy_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  disclosure_checks jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'drafting'
    CHECK (status IN ('drafting', 'prepared', 'locked', 'reopened')),
  prepared_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  prepared_at timestamptz,
  reviewed_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  review_statement text,
  locked_snapshot jsonb,
  reopened_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reopened_at timestamptz,
  reopen_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (period_id),
  UNIQUE (tenant_id, period_id)
);

CREATE TABLE public.accounts_compliance_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  period_id uuid NOT NULL REFERENCES public.accounts_periods(id) ON DELETE CASCADE,
  event_type text NOT NULL
    CHECK (event_type IN ('prepared', 'locked', 'reopened')),
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reason text,
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ix_accounts_compliance_status
  ON public.accounts_compliance_profiles (tenant_id, status, updated_at DESC);
CREATE INDEX ix_accounts_compliance_events_period
  ON public.accounts_compliance_events (tenant_id, period_id, created_at DESC);

ALTER TABLE public.accounts_compliance_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts_compliance_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant staff manage accounts compliance profiles"
  ON public.accounts_compliance_profiles FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Tenant staff view accounts compliance events"
  ON public.accounts_compliance_events FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

-- There is intentionally no authenticated INSERT/UPDATE/DELETE policy for the
-- event ledger. Events are written only by the SECURITY DEFINER workflows.

CREATE OR REPLACE FUNCTION public.accounts_required_policy_keys(p_framework text)
RETURNS text[]
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE p_framework
    WHEN 'frs105' THEN ARRAY['basis_of_preparation', 'going_concern', 'turnover', 'tangible_fixed_assets']::text[]
    WHEN 'frs102_1a' THEN ARRAY['basis_of_preparation', 'going_concern', 'turnover', 'tangible_fixed_assets', 'financial_instruments']::text[]
    ELSE ARRAY[]::text[]
  END
$$;

CREATE OR REPLACE FUNCTION public.accounts_required_disclosure_keys(
  p_framework text,
  p_entity_type public.entity_type
)
RETURNS text[]
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT ARRAY[
    'entity_eligibility',
    'related_parties',
    'commitments_contingencies',
    'post_balance_events',
    'average_employees'
  ]::text[]
  || CASE WHEN p_framework = 'frs102_1a' THEN ARRAY['material_judgements']::text[] ELSE ARRAY[]::text[] END
  || CASE WHEN p_entity_type IN ('ltd', 'llp') THEN ARRAY['director_or_member_advances']::text[] ELSE ARRAY[]::text[] END
$$;

CREATE OR REPLACE FUNCTION public.accounts_preparation_checks(p_period_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id uuid := public.get_user_tenant_id(auth.uid());
  v_period public.accounts_periods%ROWTYPE;
  v_profile public.accounts_compliance_profiles%ROWTYPE;
  v_entity_type public.entity_type;
  v_entry_count integer := 0;
  v_adjusted_debits bigint := 0;
  v_adjusted_credits bigint := 0;
  v_statement_net_assets bigint := 0;
  v_statement_equity_and_profit bigint := 0;
  v_missing_policies text[] := ARRAY[]::text[];
  v_missing_disclosures text[] := ARRAY[]::text[];
  v_blockers jsonb := '[]'::jsonb;
BEGIN
  SELECT * INTO v_period
  FROM public.accounts_periods
  WHERE id = p_period_id AND tenant_id = v_tenant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Accounting period was not found for this tenant';
  END IF;

  SELECT clients.entity_type INTO v_entity_type
  FROM public.clients
  WHERE clients.id = v_period.client_id AND clients.tenant_id = v_tenant_id;

  SELECT * INTO v_profile
  FROM public.accounts_compliance_profiles
  WHERE period_id = p_period_id AND tenant_id = v_tenant_id;

  IF NOT FOUND THEN
    v_blockers := v_blockers || jsonb_build_array('Complete and save the compliance setup.');
  ELSE
    IF NOT v_profile.framework_eligibility_confirmed THEN
      v_blockers := v_blockers || jsonb_build_array('Confirm the entity is eligible for the selected reporting framework.');
    END IF;

    IF v_profile.comparatives_required AND NOT v_profile.comparatives_complete THEN
      v_blockers := v_blockers || jsonb_build_array('Complete and reconcile the comparative figures.');
    END IF;

    SELECT coalesce(array_agg(required_key), ARRAY[]::text[])
      INTO v_missing_policies
    FROM unnest(public.accounts_required_policy_keys(v_profile.framework)) required_key
    WHERE nullif(btrim(v_profile.policy_data ->> required_key), '') IS NULL;

    IF cardinality(v_missing_policies) > 0 THEN
      v_blockers := v_blockers || jsonb_build_array('Complete every required accounting policy.');
    END IF;

    SELECT coalesce(array_agg(required_key), ARRAY[]::text[])
      INTO v_missing_disclosures
    FROM unnest(public.accounts_required_disclosure_keys(v_profile.framework, v_entity_type)) required_key
    WHERE coalesce((v_profile.disclosure_checks ->> required_key)::boolean, false) = false;

    IF cardinality(v_missing_disclosures) > 0 THEN
      v_blockers := v_blockers || jsonb_build_array('Complete every required disclosure control.');
    END IF;
  END IF;

  SELECT count(*),
         coalesce(sum(debit_pence + adjustment_debit_pence), 0),
         coalesce(sum(credit_pence + adjustment_credit_pence), 0),
         coalesce(sum(CASE
           WHEN account_type = 'asset' THEN debit_pence + adjustment_debit_pence - credit_pence - adjustment_credit_pence
           WHEN account_type = 'liability' THEN -abs(debit_pence + adjustment_debit_pence - credit_pence - adjustment_credit_pence)
           ELSE 0
         END), 0),
         coalesce(sum(CASE
           WHEN account_type = 'equity' THEN abs(debit_pence + adjustment_debit_pence - credit_pence - adjustment_credit_pence)
           WHEN account_type = 'income' THEN abs(debit_pence + adjustment_debit_pence - credit_pence - adjustment_credit_pence)
           WHEN account_type = 'expense' THEN -(debit_pence + adjustment_debit_pence - credit_pence - adjustment_credit_pence)
           ELSE 0
         END), 0)
    INTO v_entry_count, v_adjusted_debits, v_adjusted_credits, v_statement_net_assets, v_statement_equity_and_profit
  FROM public.trial_balance_entries
  WHERE period_id = p_period_id AND tenant_id = v_tenant_id;

  IF v_entry_count = 0 THEN
    v_blockers := v_blockers || jsonb_build_array('Import or enter a trial balance.');
  ELSIF v_adjusted_debits <> v_adjusted_credits THEN
    v_blockers := v_blockers || jsonb_build_array('The adjusted trial balance is not balanced.');
  ELSIF v_statement_net_assets <> v_statement_equity_and_profit THEN
    v_blockers := v_blockers || jsonb_build_array('The financial-statement classifications do not reconcile net assets to equity and profit.');
  END IF;

  RETURN jsonb_build_object(
    'ready', jsonb_array_length(v_blockers) = 0,
    'blockers', v_blockers,
    'entry_count', v_entry_count,
    'adjusted_debits_pence', v_adjusted_debits,
    'adjusted_credits_pence', v_adjusted_credits,
    'statement_net_assets_pence', v_statement_net_assets,
    'statement_equity_and_profit_pence', v_statement_equity_and_profit,
    'missing_policy_keys', to_jsonb(v_missing_policies),
    'missing_disclosure_keys', to_jsonb(v_missing_disclosures),
    'framework', v_profile.framework,
    'entity_type', v_entity_type
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_accounts_prepared(p_period_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id uuid := public.get_user_tenant_id(auth.uid());
  v_checks jsonb;
  v_snapshot jsonb;
BEGIN
  v_checks := public.accounts_preparation_checks(p_period_id);
  IF NOT coalesce((v_checks ->> 'ready')::boolean, false) THEN
    RAISE EXCEPTION 'Accounts preparation is blocked: %', v_checks -> 'blockers';
  END IF;

  UPDATE public.accounts_compliance_profiles
  SET status = 'prepared',
      prepared_by_user_id = auth.uid(),
      prepared_at = now(),
      reviewed_by_user_id = NULL,
      reviewed_at = NULL,
      review_statement = NULL,
      locked_snapshot = NULL,
      updated_at = now()
  WHERE period_id = p_period_id AND tenant_id = v_tenant_id;

  UPDATE public.accounts_periods
  SET status = 'review', updated_at = now()
  WHERE id = p_period_id AND tenant_id = v_tenant_id;

  SELECT jsonb_build_object(
    'controls', to_jsonb(profile),
    'checks', v_checks
  ) INTO v_snapshot
  FROM public.accounts_compliance_profiles profile
  WHERE profile.period_id = p_period_id AND profile.tenant_id = v_tenant_id;

  INSERT INTO public.accounts_compliance_events
    (tenant_id, period_id, event_type, actor_user_id, snapshot)
  VALUES (v_tenant_id, p_period_id, 'prepared', auth.uid(), v_snapshot);

  RETURN v_checks;
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_accounts_period(
  p_period_id uuid,
  p_review_statement text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id uuid := public.get_user_tenant_id(auth.uid());
  v_profile public.accounts_compliance_profiles%ROWTYPE;
  v_checks jsonb;
  v_snapshot jsonb;
  v_is_reviewer boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND tenant_id = v_tenant_id
      AND role IN ('super_admin', 'firm_owner', 'manager')
  ) INTO v_is_reviewer;

  IF NOT v_is_reviewer THEN
    RAISE EXCEPTION 'Manager, firm owner or super admin role is required to lock final accounts';
  END IF;

  IF nullif(btrim(p_review_statement), '') IS NULL THEN
    RAISE EXCEPTION 'A reviewer approval statement is required';
  END IF;

  SELECT * INTO v_profile
  FROM public.accounts_compliance_profiles
  WHERE period_id = p_period_id AND tenant_id = v_tenant_id
  FOR UPDATE;

  IF NOT FOUND OR v_profile.status <> 'prepared' THEN
    RAISE EXCEPTION 'Accounts must be marked prepared before reviewer approval';
  END IF;

  IF v_profile.prepared_by_user_id = auth.uid() THEN
    RAISE EXCEPTION 'The reviewer must be different from the preparer';
  END IF;

  v_checks := public.accounts_preparation_checks(p_period_id);
  IF NOT coalesce((v_checks ->> 'ready')::boolean, false) THEN
    RAISE EXCEPTION 'Accounts approval is blocked: %', v_checks -> 'blockers';
  END IF;

  SELECT jsonb_build_object(
    'controls', to_jsonb(profile),
    'checks', v_checks,
    'trial_balance', coalesce((
      SELECT jsonb_agg(to_jsonb(entry) ORDER BY entry.sort_order, entry.account_code)
      FROM public.trial_balance_entries entry
      WHERE entry.period_id = p_period_id AND entry.tenant_id = v_tenant_id
    ), '[]'::jsonb),
    'tax_computations', coalesce((
      SELECT jsonb_agg(to_jsonb(computation) ORDER BY computation.computation_type)
      FROM public.tax_computations computation
      WHERE computation.period_id = p_period_id AND computation.tenant_id = v_tenant_id
    ), '[]'::jsonb)
  ) INTO v_snapshot
  FROM public.accounts_compliance_profiles profile
  WHERE profile.period_id = p_period_id AND profile.tenant_id = v_tenant_id;

  UPDATE public.accounts_compliance_profiles
  SET status = 'locked',
      reviewed_by_user_id = auth.uid(),
      reviewed_at = now(),
      review_statement = btrim(p_review_statement),
      locked_snapshot = v_snapshot,
      reopened_by_user_id = NULL,
      reopened_at = NULL,
      reopen_reason = NULL,
      updated_at = now()
  WHERE period_id = p_period_id AND tenant_id = v_tenant_id;

  INSERT INTO public.accounts_compliance_events
    (tenant_id, period_id, event_type, actor_user_id, reason, snapshot)
  VALUES (v_tenant_id, p_period_id, 'locked', auth.uid(), btrim(p_review_statement), v_snapshot);

  RETURN jsonb_build_object('locked', true, 'reviewed_at', now(), 'checks', v_checks);
END;
$$;

CREATE OR REPLACE FUNCTION public.reopen_accounts_period(
  p_period_id uuid,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id uuid := public.get_user_tenant_id(auth.uid());
  v_previous_snapshot jsonb;
  v_is_reviewer boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND tenant_id = v_tenant_id
      AND role IN ('super_admin', 'firm_owner', 'manager')
  ) INTO v_is_reviewer;

  IF NOT v_is_reviewer THEN
    RAISE EXCEPTION 'Manager, firm owner or super admin role is required to reopen final accounts';
  END IF;

  IF nullif(btrim(p_reason), '') IS NULL THEN
    RAISE EXCEPTION 'A reopen reason is required';
  END IF;

  SELECT locked_snapshot INTO v_previous_snapshot
  FROM public.accounts_compliance_profiles
  WHERE period_id = p_period_id AND tenant_id = v_tenant_id AND status = 'locked'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Only locked accounts can be reopened';
  END IF;

  UPDATE public.accounts_compliance_profiles
  SET status = 'reopened',
      reopened_by_user_id = auth.uid(),
      reopened_at = now(),
      reopen_reason = btrim(p_reason),
      updated_at = now()
  WHERE period_id = p_period_id AND tenant_id = v_tenant_id;

  UPDATE public.accounts_periods
  SET status = 'in_progress', updated_at = now()
  WHERE id = p_period_id AND tenant_id = v_tenant_id;

  INSERT INTO public.accounts_compliance_events
    (tenant_id, period_id, event_type, actor_user_id, reason, snapshot)
  VALUES (v_tenant_id, p_period_id, 'reopened', auth.uid(), btrim(p_reason), coalesce(v_previous_snapshot, '{}'::jsonb));

  RETURN jsonb_build_object('reopened', true, 'reopened_at', now());
END;
$$;

CREATE OR REPLACE FUNCTION public.protect_locked_accounts_profile()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND current_user NOT IN ('postgres', 'service_role')
    AND (
      NEW.status <> 'drafting'
      OR NEW.prepared_by_user_id IS NOT NULL
      OR NEW.prepared_at IS NOT NULL
      OR NEW.reviewed_by_user_id IS NOT NULL
      OR NEW.reviewed_at IS NOT NULL
      OR NEW.locked_snapshot IS NOT NULL
    ) THEN
    RAISE EXCEPTION 'Preparation and review status can only be set by the controlled sign-off workflows';
  END IF;

  IF TG_OP = 'DELETE' AND OLD.status = 'locked'
    AND current_user NOT IN ('postgres', 'service_role') THEN
    RAISE EXCEPTION 'Locked accounts must be reopened before deletion';
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status = 'locked'
    AND current_user NOT IN ('postgres', 'service_role') THEN
    RAISE EXCEPTION 'Locked accounts must be reopened through the controlled reviewer workflow';
  END IF;

  IF TG_OP = 'UPDATE' AND current_user NOT IN ('postgres', 'service_role')
    AND (
      (NEW.status IS DISTINCT FROM OLD.status AND NEW.status <> 'drafting')
      OR NEW.prepared_by_user_id IS DISTINCT FROM OLD.prepared_by_user_id
      OR NEW.prepared_at IS DISTINCT FROM OLD.prepared_at
      OR NEW.reviewed_by_user_id IS DISTINCT FROM OLD.reviewed_by_user_id
      OR NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at
      OR NEW.review_statement IS DISTINCT FROM OLD.review_statement
      OR NEW.locked_snapshot IS DISTINCT FROM OLD.locked_snapshot
      OR NEW.reopened_by_user_id IS DISTINCT FROM OLD.reopened_by_user_id
      OR NEW.reopened_at IS DISTINCT FROM OLD.reopened_at
      OR NEW.reopen_reason IS DISTINCT FROM OLD.reopen_reason
    ) THEN
    RAISE EXCEPTION 'Preparation and review evidence can only be changed by the controlled sign-off workflows';
  END IF;

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

CREATE TRIGGER protect_locked_accounts_profile
  BEFORE INSERT OR UPDATE OR DELETE ON public.accounts_compliance_profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_locked_accounts_profile();

CREATE OR REPLACE FUNCTION public.protect_locked_accounts_source()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_period_id uuid;
BEGIN
  v_period_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.period_id ELSE NEW.period_id END;
  IF current_user NOT IN ('postgres', 'service_role') AND EXISTS (
    SELECT 1 FROM public.accounts_compliance_profiles
    WHERE period_id = v_period_id AND status = 'locked'
  ) THEN
    RAISE EXCEPTION 'Final accounts are locked; a manager must reopen them before source data can change';
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

CREATE TRIGGER protect_locked_trial_balance
  BEFORE INSERT OR UPDATE OR DELETE ON public.trial_balance_entries
  FOR EACH ROW EXECUTE FUNCTION public.protect_locked_accounts_source();
CREATE TRIGGER protect_locked_tax_computation
  BEFORE INSERT OR UPDATE OR DELETE ON public.tax_computations
  FOR EACH ROW EXECUTE FUNCTION public.protect_locked_accounts_source();

CREATE OR REPLACE FUNCTION public.protect_locked_accounts_period()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_user NOT IN ('postgres', 'service_role') AND EXISTS (
    SELECT 1 FROM public.accounts_compliance_profiles
    WHERE period_id = OLD.id AND status = 'locked'
  ) THEN
    IF TG_OP = 'DELETE' OR NEW.client_id IS DISTINCT FROM OLD.client_id
      OR NEW.period_start IS DISTINCT FROM OLD.period_start
      OR NEW.period_end IS DISTINCT FROM OLD.period_end
      OR NEW.accounts_standard IS DISTINCT FROM OLD.accounts_standard THEN
      RAISE EXCEPTION 'Final accounts are locked; a manager must reopen them before core period data can change';
    END IF;
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

CREATE TRIGGER protect_locked_accounts_period
  BEFORE UPDATE OR DELETE ON public.accounts_periods
  FOR EACH ROW EXECUTE FUNCTION public.protect_locked_accounts_period();

CREATE OR REPLACE FUNCTION public.invalidate_accounts_preparation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period_id uuid;
BEGIN
  v_period_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.period_id ELSE NEW.period_id END;
  UPDATE public.accounts_compliance_profiles
  SET status = 'drafting', prepared_by_user_id = NULL, prepared_at = NULL, updated_at = now()
  WHERE period_id = v_period_id AND status = 'prepared';
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

CREATE TRIGGER invalidate_prepared_from_trial_balance
  AFTER INSERT OR UPDATE OR DELETE ON public.trial_balance_entries
  FOR EACH ROW EXECUTE FUNCTION public.invalidate_accounts_preparation();
CREATE TRIGGER invalidate_prepared_from_tax_computation
  AFTER INSERT OR UPDATE OR DELETE ON public.tax_computations
  FOR EACH ROW EXECUTE FUNCTION public.invalidate_accounts_preparation();

CREATE TRIGGER update_accounts_compliance_profiles_updated_at
  BEFORE UPDATE ON public.accounts_compliance_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

REVOKE ALL ON FUNCTION public.accounts_preparation_checks(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mark_accounts_prepared(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.approve_accounts_period(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reopen_accounts_period(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accounts_preparation_checks(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_accounts_prepared(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_accounts_period(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reopen_accounts_period(uuid, text) TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.accounts_compliance_profiles TO authenticated;
GRANT SELECT ON public.accounts_compliance_events TO authenticated;
GRANT ALL ON public.accounts_compliance_profiles, public.accounts_compliance_events TO service_role;

COMMENT ON TABLE public.accounts_compliance_profiles IS
  'FRS preparation controls and two-person approval state. A locked record is not Companies House or HMRC acceptance.';
COMMENT ON COLUMN public.accounts_compliance_profiles.framework_eligibility_confirmed IS
  'Human confirmation after checking current law and FRC eligibility; the product does not infer eligibility from entity type alone.';
COMMENT ON TABLE public.accounts_compliance_events IS
  'Append-only evidence ledger for prepared, locked and reopened accounts events.';
