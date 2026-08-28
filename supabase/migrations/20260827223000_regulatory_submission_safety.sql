-- Regulatory submission safety foundation.
-- Keeps provider-issued period identifiers and immutable submission evidence,
-- and moves OAuth state validation to a server-only table.

ALTER TABLE public.vat_returns
  ADD COLUMN IF NOT EXISTS period_key text,
  ADD COLUMN IF NOT EXISTS due_date date,
  ADD COLUMN IF NOT EXISTS hmrc_response_json jsonb,
  ADD COLUMN IF NOT EXISTS submission_job_id uuid REFERENCES public.submission_jobs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS finalised_at timestamptz,
  ADD COLUMN IF NOT EXISTS finalised_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_vat_returns_hmrc_period
  ON public.vat_returns (tenant_id, client_id, period_key)
  WHERE period_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_vat_returns_due
  ON public.vat_returns (tenant_id, due_date)
  WHERE status <> 'submitted';

CREATE TABLE IF NOT EXISTS public.oauth_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  state_hash text NOT NULL UNIQUE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  provider text NOT NULL,
  scopes text[] NOT NULL DEFAULT '{}',
  redirect_uri text NOT NULL,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_by_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_oauth_states_expiry
  ON public.oauth_states (expires_at)
  WHERE consumed_at IS NULL;

ALTER TABLE public.oauth_states ENABLE ROW LEVEL SECURITY;
-- Deliberately no browser policies. OAuth state is created and consumed only by
-- authenticated Edge Functions using the service role.

COMMENT ON TABLE public.oauth_states IS
  'Short-lived, single-use OAuth state records. Service-role access only.';
COMMENT ON COLUMN public.vat_returns.period_key IS
  'Opaque HMRC obligation periodKey; never derive this value from dates.';
COMMENT ON COLUMN public.vat_returns.hmrc_response_json IS
  'Provider response retained as filing evidence; must not contain access tokens.';

ALTER TABLE public.ch_filings
  ADD COLUMN IF NOT EXISTS environment text NOT NULL DEFAULT 'test'
  CHECK (environment IN ('test', 'production'));
