import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { AccessError, requireStaff, requirePermissions, requireClient } from "../_shared/access.ts";
import {
  SANDBOX_AUTH_ORIGIN, SANDBOX_API_ORIGIN, CONSENT_SCOPE, INTENT_TTL_MS,
  parseBankingAction, getSandboxConfig, validateOAuthState, validateProviderCode,
  validateConsentId, generateOpaqueState, generatePkceVerifier, digestSha256,
  pkceChallenge, encryptBankSecret, decryptBankSecret, buildSandboxAuthUrl,
  requireSandboxToken, requireAuthorisedAccountResults,
} from "../_shared/bankOAuth.ts";

// This is an opt-in, sandbox-only development integration: never create live
// bank_connections or import/modify bank_transactions from provider results.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Cache-Control": "no-store",
  "Referrer-Policy": "no-referrer",
};
function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
const env = (key: string) => Deno.env.get(key) ?? undefined;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = /^Bearer\s+(\S+)$/i.exec(authHeader)?.[1];
    if (!token) throw new AccessError("Authentication required", 401);
    const url = env("SUPABASE_URL");
    const publishableKey = env("SUPABASE_ANON_KEY") ?? env("SUPABASE_PUBLISHABLE_KEY");
    if (!url || !publishableKey) throw new AccessError("Bank service configuration unavailable", 503);

    const caller = createClient(url, publishableKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const actor = await requireStaff(caller, token);
    await requirePermissions(caller, actor, ["ledger.view"]);

    const raw = await req.text();
    if (raw.length > 4096) throw new AccessError("Bank request is too large", 413);
    let body: Record<string, unknown>;
    try {
      const decoded: unknown = JSON.parse(raw);
      if (!decoded || typeof decoded !== "object" || Array.isArray(decoded)) throw Error("invalid");
      body = decoded as Record<string, unknown>;
    } catch { throw new AccessError("Invalid bank request", 400); }
    const action = parseBankingAction(body);
    let config: ReturnType<typeof getSandboxConfig> = null;
    try { config = getSandboxConfig(env); } catch { /* default to disabled */ }

    if (action === "connection_status") {
      return json({
        enabled: !!config,
        mode: config ? "sandbox_mock_consent" : "manual_csv_only",
        live_provider_enabled: false,
        transaction_import_enabled: false,
        message: config
          ? "TrueLayer mock-bank consent testing is available; no live bank account or transactions will be connected."
          : "Live Open Banking remains unavailable. Continue with manual CSV statements.",
      });
    }

    if (action === "list_consents") {
      const clientId = body.client_id;
      if (clientId != null) await requireClient(caller, actor.tenantId, clientId);
      let query = caller.from("bank_oauth_consents")
        .select("id,client_id,initiated_by,provider,status,scopes,account_count,token_expires_at,created_at,disconnected_at")
        .eq("tenant_id", actor.tenantId)
        .order("created_at", { ascending: false }).limit(30);
      if (typeof clientId === "string") query = query.eq("client_id", clientId);
      const { data, error } = await query;
      if (error) throw new AccessError("Sandbox consent history is unavailable", 503);
      return json({ consents: data ?? [], live_provider_enabled: false });
    }

    // Everything below requires additional integration control permissions.
    await requirePermissions(caller, actor, ["ledger.edit", "integrations.edit"]);
    if (!config) throw new AccessError("The mock-bank sandbox has not been enabled by an administrator", 503);
    const serviceKey = env("SUPABASE_SERVICE_ROLE_KEY");
    if (!serviceKey) throw new AccessError("Bank service is not configured", 503);
    const server = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    if (action === "start_consent") {
      const clientId = await requireClient(caller, actor.tenantId, body.client_id);
      const { count, error: limitError } = await server.from("bank_oauth_intents")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", actor.tenantId).eq("initiated_by", actor.userId)
        .eq("status", "pending")
        .gte("created_at", new Date(Date.now() - 10 * 60 * 1000).toISOString());
      if (limitError) throw new AccessError("Consent session limits could not be checked", 503);
      if ((count ?? 0) >= 3) throw new AccessError("Too many pending sandbox sessions; retry after ten minutes", 429);

      const intentId = crypto.randomUUID();
      const state = generateOpaqueState();
      const verifier = generatePkceVerifier();
      const challenge = await pkceChallenge(verifier);
      const stateDigest = await digestSha256(state);
      const ciphertext = await encryptBankSecret(verifier, config.encryptionKey,
        `${actor.tenantId}:${clientId}:${intentId}:pkce`);
      const { error } = await server.from("bank_oauth_intents").insert({
        id: intentId, tenant_id: actor.tenantId, client_id: clientId,
        initiated_by: actor.userId, state_digest: stateDigest,
        verifier_ciphertext: ciphertext,
        redirect_uri: config.redirectUri,
        requested_scopes: CONSENT_SCOPE,
        expires_at: new Date(Date.now() + INTENT_TTL_MS).toISOString(),
      });
      if (error) throw new AccessError("Could not create an authorised sandbox consent session", 503);
      const authUrl = buildSandboxAuthUrl(config, state, challenge);
      return json({
        auth_url: authUrl, mode: "sandbox_mock_consent",
        expires_in_seconds: INTENT_TTL_MS / 1000,
        disclaimer: "Fictitious mock bank only. No live bank account will be connected.",
      });
    }

    if (action === "complete_consent") {
      const state = validateOAuthState(body.state);
      const code = validateProviderCode(body.code);
      const stateDigest = await digestSha256(state);
      const now = new Date().toISOString();
      // PostgreSQL UPDATE status='pending' is an atomic single-use compare and
      // swap: replay, tenant change, actor change and expiry yield zero rows.
      const { data: intent, error: consumeError } = await server.from("bank_oauth_intents")
        .update({ status: "consuming", consumed_at: now })
        .eq("state_digest", stateDigest)
        .eq("tenant_id", actor.tenantId)
        .eq("initiated_by", actor.userId)
        .eq("status", "pending")
        .gt("expires_at", now)
        .select("id,tenant_id,client_id,redirect_uri,verifier_ciphertext")
        .maybeSingle();
      if (consumeError || !intent) throw new AccessError("Sandbox callback expired or has already been used", 409);
      const fail = async () => {
        await server.from("bank_oauth_intents")
          .update({ status: "failed", verifier_ciphertext: null })
          .eq("id", intent.id).eq("tenant_id", actor.tenantId).eq("status", "consuming");
      };
      try {
        await requireClient(caller, actor.tenantId, intent.client_id);
        if (!intent.verifier_ciphertext || intent.redirect_uri !== config.redirectUri) {
          throw new AccessError("Sandbox callback configuration changed", 409);
        }
        const verifier = await decryptBankSecret(intent.verifier_ciphertext, config.encryptionKey,
          `${actor.tenantId}:${intent.client_id}:${intent.id}:pkce`);
        const tokenResponse = await fetch(`${SANDBOX_AUTH_ORIGIN}/connect/token`, {
          method: "POST", redirect: "error", signal: AbortSignal.timeout(15000),
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            grant_type: "authorization_code",
            client_id: config.clientId, client_secret: config.clientSecret,
            redirect_uri: config.redirectUri, code, code_verifier: verifier,
          }),
        });
        if (!tokenResponse.ok) throw new AccessError("Sandbox provider code exchange failed; start a new session", 502);
        const providerToken = requireSandboxToken(await tokenResponse.json());
        const accountsResponse = await fetch(`${SANDBOX_API_ORIGIN}/data/v1/accounts`, {
          method: "GET", redirect: "error", signal: AbortSignal.timeout(12000),
          headers: { Authorization: `Bearer ${providerToken.accessToken}` },
        });
        if (!accountsResponse.ok) throw new AccessError("Sandbox provider account access could not be verified", 502);
        const count = requireAuthorisedAccountResults(await accountsResponse.json());
        const encryptedToken = await encryptBankSecret(providerToken.accessToken, config.encryptionKey,
          `${actor.tenantId}:${intent.client_id}:${intent.id}:access`);
        const { data: consentId, error: saveError } = await server.rpc("taxlounge_save_sandbox_consent", {
          p_intent_id: intent.id,
          p_tenant_id: actor.tenantId,
          p_client_id: intent.client_id,
          p_actor_id: actor.userId,
          p_encrypted_access_token: encryptedToken,
          p_token_expires_at: new Date(Date.now() + providerToken.expiresIn * 1000).toISOString(),
          p_account_count: count,
        });
        if (saveError || !consentId) throw new AccessError("Sandbox consent could not be saved", 503);
        // No access tokens, refresh tokens, account numbers or verifier returned.
        return json({
          consent_id: consentId,
          status: "authorised_unlinked",
          accounts_available: count,
          bank_connections_created: 0,
          imported_transactions: 0,
          live_provider_enabled: false,
          message: "Sandbox consent verified and secured. No bank account was connected or imported.",
        });
      } catch (error) {
        await fail();
        if (error instanceof AccessError) throw error;
        throw new AccessError("Sandbox bank authorisation could not be completed; start again", 503);
      }
    }

    if (action === "disconnect_consent") {
      const consentId = validateConsentId(body.consent_id);
      const { data: consent, error } = await caller.from("bank_oauth_consents")
        .select("id,tenant_id,client_id,initiated_by")
        .eq("id", consentId).eq("tenant_id", actor.tenantId).maybeSingle();
      if (error || !consent || consent.initiated_by !== actor.userId) {
        throw new AccessError("Sandbox consent unavailable or not owned by this staff member", 404);
      }
      await requireClient(caller, actor.tenantId, consent.client_id);
      const { error: revokeError } = await server.rpc("taxlounge_disconnect_sandbox_consent", {
        p_consent_id: consentId, p_tenant_id: actor.tenantId, p_actor_id: actor.userId,
      });
      if (revokeError) throw new AccessError("Could not remove the saved sandbox credential", 503);
      return json({
        locally_disconnected: true, saved_credential_deleted: true,
        message: "Stored sandbox credential removed. This does not revoke consent in a bank app.",
      });
    }
    throw new AccessError("Unsupported sandbox action", 503);
  } catch (error) {
    // Never log OAuth code, state, PKCE verifier, provider tokens or bank data.
    if (error instanceof AccessError) return json({ error: error.message }, error.status);
    return json({ error: "Banking request unavailable; no data was imported" }, 503);
  }
});
