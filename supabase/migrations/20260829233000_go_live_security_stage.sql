-- Go-live security stage: payments, credential isolation and data-subject rights.

-- Stripe events are claimed atomically so retries cannot apply the same payment twice.
CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  event_id text PRIMARY KEY,
  event_type text NOT NULL,
  livemode boolean NOT NULL,
  status text NOT NULL DEFAULT 'processing'
    CHECK (status IN ('processing', 'processed', 'failed')),
  attempts integer NOT NULL DEFAULT 1,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);

ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.stripe_webhook_events FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.claim_stripe_webhook_event(
  p_event_id text,
  p_event_type text,
  p_livemode boolean
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  claimed boolean := false;
BEGIN
  INSERT INTO public.stripe_webhook_events (event_id, event_type, livemode)
  VALUES (p_event_id, p_event_type, p_livemode)
  ON CONFLICT (event_id) DO UPDATE
    SET status = 'processing',
        attempts = public.stripe_webhook_events.attempts + 1,
        last_error = NULL,
        updated_at = now()
    WHERE public.stripe_webhook_events.status = 'failed'
       OR (
         public.stripe_webhook_events.status = 'processing'
         AND public.stripe_webhook_events.updated_at < now() - interval '5 minutes'
       )
  RETURNING true INTO claimed;

  RETURN coalesce(claimed, false);
END;
$$;

REVOKE ALL ON FUNCTION public.claim_stripe_webhook_event(text, text, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_stripe_webhook_event(text, text, boolean) TO service_role;

ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS paid_at timestamptz;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS payment_method text;

-- Data-subject requests are reviewed before deletion because statutory records
-- may need to be retained even when the account itself can be closed.
CREATE TABLE IF NOT EXISTS public.data_subject_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  subject_user_id uuid NOT NULL,
  request_type text NOT NULL CHECK (request_type IN ('access', 'erasure')),
  status text NOT NULL DEFAULT 'received'
    CHECK (status IN ('received', 'identity_check', 'in_review', 'partially_fulfilled', 'fulfilled', 'refused', 'cancelled')),
  requested_at timestamptz NOT NULL DEFAULT now(),
  acknowledged_at timestamptz,
  completed_at timestamptz,
  decision_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_open_data_subject_request
  ON public.data_subject_requests(subject_user_id, request_type)
  WHERE status IN ('received', 'identity_check', 'in_review');

ALTER TABLE public.data_subject_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Subjects can view their own requests"
  ON public.data_subject_requests FOR SELECT
  TO authenticated
  USING (subject_user_id = auth.uid());
REVOKE INSERT, UPDATE, DELETE ON public.data_subject_requests FROM anon, authenticated;

-- Credential values are server-only. Authenticated users may inspect metadata
-- and existence, but can no longer read, insert, update or delete ciphertext.
DROP POLICY IF EXISTS "Users can view tenant credentials" ON public.client_credentials;
DROP POLICY IF EXISTS "Users can insert tenant credentials" ON public.client_credentials;
DROP POLICY IF EXISTS "Users can update tenant credentials" ON public.client_credentials;
DROP POLICY IF EXISTS "Users can delete tenant credentials" ON public.client_credentials;

CREATE POLICY "Users can view tenant credential metadata"
  ON public.client_credentials FOR SELECT
  TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

REVOKE ALL ON public.client_credentials FROM anon, authenticated;
GRANT SELECT (
  id,
  tenant_id,
  client_id,
  provider,
  credential_type,
  expires_at,
  metadata_json,
  created_at,
  updated_at
) ON public.client_credentials TO authenticated;

COMMENT ON COLUMN public.client_credentials.ciphertext IS
  'Encrypted application credential. Service-role access only; never expose through PostgREST.';
