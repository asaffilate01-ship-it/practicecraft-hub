-- Auditable AI operations without storing prompts or raw client financial data.
CREATE TABLE IF NOT EXISTS public.ai_operation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  action text NOT NULL,
  status text NOT NULL CHECK (status IN ('succeeded','failed')),
  provider text,
  model text,
  prompt_version text NOT NULL,
  input_count integer NOT NULL DEFAULT 0 CHECK (input_count >= 0),
  output_count integer NOT NULL DEFAULT 0 CHECK (output_count >= 0),
  duration_ms integer NOT NULL DEFAULT 0 CHECK (duration_ms >= 0),
  error_code text,
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_ai_operation_runs_tenant_created
  ON public.ai_operation_runs(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_ai_operation_runs_client_created
  ON public.ai_operation_runs(client_id, created_at DESC)
  WHERE client_id IS NOT NULL;

ALTER TABLE public.ai_operation_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant staff can view AI operation audit"
  ON public.ai_operation_runs FOR SELECT TO authenticated
  USING (
    tenant_id = public.get_user_tenant_id(auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.user_roles role_grant
      WHERE role_grant.user_id = auth.uid()
        AND role_grant.tenant_id = ai_operation_runs.tenant_id
        AND role_grant.role::text IN ('super_admin','firm_owner','manager','staff','payroll_officer')
    )
  );

COMMENT ON TABLE public.ai_operation_runs IS
  'Metadata-only audit of AI-assisted operations. Prompts, document bytes and raw financial data must not be stored here.';
