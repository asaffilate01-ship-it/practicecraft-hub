-- TaxLounge sandbox-only Open Banking consent records.
-- No permission to import transactions, create a bank connection or spend money.
-- Provider credentials reside in a PRIVATE schema and are encrypted by the Edge
-- Function with an external AES-GCM key. They are not decryptable via REST.

CREATE TABLE public.bank_oauth_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  client_id uuid NOT NULL,
  initiated_by uuid NOT NULL REFERENCES auth.users(id),
  provider text NOT NULL DEFAULT 'truelayer_sandbox'
    CHECK (provider='truelayer_sandbox'),
  state_digest text NOT NULL UNIQUE
    CHECK (state_digest ~ '^[a-f0-9]{64}$'),
  verifier_ciphertext text,
  redirect_uri text NOT NULL
    CHECK (redirect_uri LIKE 'https://%/banking/callback'),
  requested_scopes text NOT NULL DEFAULT 'info accounts'
    CHECK (requested_scopes='info accounts'),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','consuming','complete','failed','cancelled')),
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT taxlounge_oauth_intent_client_fk FOREIGN KEY (tenant_id,client_id)
    REFERENCES public.clients(tenant_id,id),
  CONSTRAINT taxlounge_oauth_intent_lifetime CHECK (
    expires_at > created_at AND expires_at <= created_at + interval '10 minutes'
  ),
  CONSTRAINT taxlounge_oauth_intent_consumed_once CHECK (
    (status='pending' AND consumed_at IS NULL)
    OR (status<>'pending' AND consumed_at IS NOT NULL)
  )
);
CREATE UNIQUE INDEX taxlounge_oauth_intent_scope_idx
  ON public.bank_oauth_intents(id,tenant_id,client_id);
CREATE INDEX taxlounge_oauth_intent_expiration_idx
  ON public.bank_oauth_intents(tenant_id,initiated_by,expires_at)
  WHERE status='pending';

ALTER TABLE public.bank_oauth_intents ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.bank_oauth_intents FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.bank_oauth_intents TO service_role;
-- Deliberately no authenticated policy: the browser never sees state hashes
-- or encrypted PKCE verifiers.

CREATE TABLE public.bank_oauth_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intent_id uuid NOT NULL UNIQUE,
  tenant_id uuid NOT NULL,
  client_id uuid NOT NULL,
  initiated_by uuid NOT NULL REFERENCES auth.users(id),
  provider text NOT NULL DEFAULT 'truelayer_sandbox' CHECK (provider='truelayer_sandbox'),
  status text NOT NULL DEFAULT 'authorised_unlinked'
    CHECK (status IN ('authorised_unlinked','disconnected')),
  account_count integer NOT NULL DEFAULT 0 CHECK (account_count BETWEEN 0 AND 100),
  scopes text NOT NULL DEFAULT 'info accounts' CHECK (scopes='info accounts'),
  token_expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  disconnected_at timestamptz,
  CONSTRAINT taxlounge_oauth_consent_intent_fk
    FOREIGN KEY (intent_id,tenant_id,client_id)
    REFERENCES public.bank_oauth_intents(id,tenant_id,client_id),
  CONSTRAINT taxlounge_oauth_consent_client_fk
    FOREIGN KEY (tenant_id,client_id) REFERENCES public.clients(tenant_id,id),
  CONSTRAINT taxlounge_oauth_consent_disconnected_check CHECK (
    (status='disconnected' AND disconnected_at IS NOT NULL)
    OR (status='authorised_unlinked' AND disconnected_at IS NULL)
  )
);
CREATE UNIQUE INDEX taxlounge_oauth_consent_scope_idx
  ON public.bank_oauth_consents(id,tenant_id,client_id);
CREATE INDEX taxlounge_oauth_consent_list_idx
  ON public.bank_oauth_consents(tenant_id,client_id,created_at DESC);

ALTER TABLE public.bank_oauth_consents ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.bank_oauth_consents FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.bank_oauth_consents TO authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.bank_oauth_consents TO service_role;
CREATE POLICY "TaxLounge ledger staff see their own practice sandbox consent metadata"
 ON public.bank_oauth_consents FOR SELECT TO authenticated
 USING (public.taxlounge_bank_permission(tenant_id,'view'));

CREATE SCHEMA IF NOT EXISTS bank_private;
REVOKE ALL ON SCHEMA bank_private FROM PUBLIC,anon,authenticated;
GRANT USAGE ON SCHEMA bank_private TO service_role;
CREATE TABLE bank_private.bank_sandbox_credentials (
  consent_id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL,
  client_id uuid NOT NULL,
  encrypted_access_token text NOT NULL CHECK (length(encrypted_access_token) > 40),
  access_expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT taxlounge_sandbox_token_consent_fk
    FOREIGN KEY (consent_id,tenant_id,client_id)
    REFERENCES public.bank_oauth_consents(id,tenant_id,client_id) ON DELETE CASCADE
);
ALTER TABLE bank_private.bank_sandbox_credentials ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON bank_private.bank_sandbox_credentials FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON bank_private.bank_sandbox_credentials TO service_role;
-- No public views, no authenticated token policies, and no refresh tokens.

CREATE OR REPLACE FUNCTION public.taxlounge_save_sandbox_consent(
  p_intent_id uuid, p_tenant_id uuid, p_client_id uuid, p_actor_id uuid,
  p_encrypted_access_token text, p_token_expires_at timestamptz,
  p_account_count integer
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_intent public.bank_oauth_intents%ROWTYPE; v_consent_id uuid;
BEGIN
  SELECT * INTO v_intent FROM public.bank_oauth_intents
  WHERE id=p_intent_id AND tenant_id=p_tenant_id AND client_id=p_client_id
    AND initiated_by=p_actor_id AND status='consuming'
    AND consumed_at >= now()-interval '2 minutes'
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sandbox authorisation session is unavailable'
      USING ERRCODE='42501';
  END IF;
  IF length(coalesce(p_encrypted_access_token,'')) < 41
     OR p_token_expires_at <= now()
     OR p_token_expires_at > now()+interval '2 hours'
     OR p_account_count NOT BETWEEN 0 AND 100 THEN
    RAISE EXCEPTION 'Invalid sandbox provider consent proof';
  END IF;
  INSERT INTO public.bank_oauth_consents (
    intent_id,tenant_id,client_id,initiated_by,token_expires_at,account_count
  ) VALUES (
    p_intent_id,p_tenant_id,p_client_id,p_actor_id,p_token_expires_at,p_account_count
  ) RETURNING id INTO v_consent_id;
  INSERT INTO bank_private.bank_sandbox_credentials (
    consent_id,tenant_id,client_id,encrypted_access_token,access_expires_at
  ) VALUES (
    v_consent_id,p_tenant_id,p_client_id,p_encrypted_access_token,p_token_expires_at
  );
  UPDATE public.bank_oauth_intents
    SET status='complete', verifier_ciphertext=NULL
    WHERE id=p_intent_id;
  RETURN v_consent_id;
END;
$$;
REVOKE ALL ON FUNCTION public.taxlounge_save_sandbox_consent(uuid,uuid,uuid,uuid,text,timestamptz,integer)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.taxlounge_save_sandbox_consent(uuid,uuid,uuid,uuid,text,timestamptz,integer)
  TO service_role;

CREATE OR REPLACE FUNCTION public.taxlounge_disconnect_sandbox_consent(
  p_consent_id uuid, p_tenant_id uuid, p_actor_id uuid
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_consent public.bank_oauth_consents%ROWTYPE;
BEGIN
  SELECT * INTO v_consent FROM public.bank_oauth_consents
  WHERE id=p_consent_id AND tenant_id=p_tenant_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Sandbox consent unavailable' USING ERRCODE='42501'; END IF;
  IF v_consent.initiated_by <> p_actor_id THEN
    RAISE EXCEPTION 'Only the initiating staff member may clear this sandbox credential'
      USING ERRCODE='42501';
  END IF;
  UPDATE public.bank_oauth_consents SET status='disconnected',disconnected_at=now()
    WHERE id=v_consent.id AND status<>'disconnected';
  DELETE FROM bank_private.bank_sandbox_credentials
    WHERE consent_id=v_consent.id AND tenant_id=p_tenant_id;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.taxlounge_disconnect_sandbox_consent(uuid,uuid,uuid)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.taxlounge_disconnect_sandbox_consent(uuid,uuid,uuid)
  TO service_role;
