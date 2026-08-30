-- Persistent regulatory readiness controls.
CREATE TABLE public.regulatory_capability_controls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  capability_key text NOT NULL,
  control_status text NOT NULL DEFAULT 'not_started'
    CHECK (control_status IN ('not_started', 'building', 'sandbox_testing', 'acceptance_submitted', 'recognised', 'blocked')),
  owner_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  owner_name text,
  application_reference text,
  target_date date,
  next_review_date date,
  notes text,
  production_enabled boolean NOT NULL DEFAULT false,
  production_enabled_at timestamptz,
  production_enabled_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  production_gate_reason text,
  created_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, capability_key)
);

CREATE TABLE public.regulatory_readiness_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  capability_key text NOT NULL,
  environment text NOT NULL DEFAULT 'sandbox'
    CHECK (environment IN ('sandbox', 'production')),
  evidence_kind text NOT NULL
    CHECK (evidence_kind IN ('sandbox_test', 'fraud_header_test', 'schema_validation', 'security_review', 'accessibility_review', 'provider_correspondence', 'recognition_confirmation', 'incident_runbook', 'other')),
  result text NOT NULL DEFAULT 'pending'
    CHECK (result IN ('pending', 'passed', 'failed', 'expired')),
  title text NOT NULL,
  reference text,
  evidence_url text,
  document_id uuid REFERENCES public.documents(id) ON DELETE SET NULL,
  tested_at timestamptz,
  valid_until date,
  notes text,
  recorded_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ix_regulatory_controls_status
  ON public.regulatory_capability_controls (tenant_id, control_status);
CREATE INDEX ix_regulatory_evidence_capability
  ON public.regulatory_readiness_evidence (tenant_id, capability_key, created_at DESC);
CREATE INDEX ix_regulatory_evidence_expiry
  ON public.regulatory_readiness_evidence (tenant_id, valid_until)
  WHERE valid_until IS NOT NULL;

ALTER TABLE public.regulatory_capability_controls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regulatory_readiness_evidence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant staff manage regulatory controls"
  ON public.regulatory_capability_controls FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Tenant staff manage regulatory evidence"
  ON public.regulatory_readiness_evidence FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE OR REPLACE FUNCTION public.protect_regulatory_production_gate()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF (
    (TG_OP = 'INSERT' AND NEW.production_enabled)
    OR (TG_OP = 'UPDATE' AND NEW.production_enabled IS DISTINCT FROM OLD.production_enabled)
    OR (TG_OP = 'UPDATE' AND NEW.production_enabled_at IS DISTINCT FROM OLD.production_enabled_at)
    OR (TG_OP = 'UPDATE' AND NEW.production_enabled_by_user_id IS DISTINCT FROM OLD.production_enabled_by_user_id)
    OR (TG_OP = 'UPDATE' AND OLD.production_enabled AND NEW.production_gate_reason IS DISTINCT FROM OLD.production_gate_reason)
  ) AND current_user NOT IN ('postgres', 'service_role')
    AND coalesce(auth.role(), '') <> 'service_role'
  THEN
    RAISE EXCEPTION 'Production filing gates can only be changed by a server-side acceptance workflow';
  END IF;

  IF NEW.production_enabled AND (NEW.production_enabled_at IS NULL OR NEW.production_gate_reason IS NULL) THEN
    RAISE EXCEPTION 'Production filing requires an enablement timestamp and acceptance reason';
  END IF;

  IF NEW.control_status = 'recognised'
    AND (TG_OP = 'INSERT' OR OLD.control_status IS DISTINCT FROM NEW.control_status)
    AND NOT EXISTS (
      SELECT 1
      FROM public.regulatory_readiness_evidence evidence
      WHERE evidence.tenant_id = NEW.tenant_id
        AND evidence.capability_key = NEW.capability_key
        AND evidence.evidence_kind = 'recognition_confirmation'
        AND evidence.result = 'passed'
        AND evidence.environment = 'production'
    )
  THEN
    RAISE EXCEPTION 'Recognition status requires passed production recognition evidence';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER protect_regulatory_production_gate
  BEFORE INSERT OR UPDATE ON public.regulatory_capability_controls
  FOR EACH ROW EXECUTE FUNCTION public.protect_regulatory_production_gate();

CREATE TRIGGER update_regulatory_controls_updated_at
  BEFORE UPDATE ON public.regulatory_capability_controls
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_regulatory_evidence_updated_at
  BEFORE UPDATE ON public.regulatory_readiness_evidence
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.regulatory_capability_controls TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.regulatory_readiness_evidence TO authenticated;
GRANT ALL ON public.regulatory_capability_controls, public.regulatory_readiness_evidence TO service_role;

COMMENT ON TABLE public.regulatory_capability_controls IS
  'Tenant regulatory programme status. production_enabled is a server-controlled kill switch, not a user attestation.';
COMMENT ON COLUMN public.regulatory_capability_controls.application_reference IS
  'Non-secret provider application, vendor or case reference. Never store passwords, client secrets, auth codes or access tokens here.';
COMMENT ON TABLE public.regulatory_readiness_evidence IS
  'Test, security and recognition evidence. Provider filing receipts remain in the immutable submission ledger.';