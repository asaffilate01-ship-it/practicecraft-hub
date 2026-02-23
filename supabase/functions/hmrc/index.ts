import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * HMRC Integration Edge Function
 *
 * Sandbox OAuth2 + MTD VAT + RTI stubs
 * Uses HMRC_CLIENT_ID and HMRC_CLIENT_SECRET secrets
 */

const HMRC_BASE_URL = Deno.env.get("HMRC_BASE_URL") || "https://test-api.service.hmrc.gov.uk";
const HMRC_AUTH_URL = Deno.env.get("HMRC_AUTH_URL") || "https://test-api.service.hmrc.gov.uk";

async function getClientCredentialsToken(): Promise<string> {
  const clientId = Deno.env.get("HMRC_CLIENT_ID");
  const clientSecret = Deno.env.get("HMRC_CLIENT_SECRET");

  if (!clientId || !clientSecret) {
    throw new Error("HMRC_CLIENT_ID or HMRC_CLIENT_SECRET not configured");
  }

  const res = await fetch(`${HMRC_AUTH_URL}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HMRC OAuth error ${res.status}: ${text}`);
  }

  const data = await res.json();
  return data.access_token;
}

// Build the OAuth2 authorization URL for user-delegated access (MTD VAT per-client)
function buildAuthorizeUrl(redirectUri: string, state: string, scopes: string[]): string {
  const clientId = Deno.env.get("HMRC_CLIENT_ID")!;
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    scope: scopes.join(" "),
    redirect_uri: redirectUri,
    state,
  });
  return `${HMRC_AUTH_URL}/oauth/authorize?${params.toString()}`;
}

// Exchange authorization code for access + refresh tokens
async function exchangeCode(code: string, redirectUri: string) {
  const clientId = Deno.env.get("HMRC_CLIENT_ID")!;
  const clientSecret = Deno.env.get("HMRC_CLIENT_SECRET")!;

  const res = await fetch(`${HMRC_AUTH_URL}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HMRC token exchange error ${res.status}: ${text}`);
  }

  return await res.json();
}

// Refresh an existing token
async function refreshToken(refresh_token: string) {
  const clientId = Deno.env.get("HMRC_CLIENT_ID")!;
  const clientSecret = Deno.env.get("HMRC_CLIENT_SECRET")!;

  const res = await fetch(`${HMRC_AUTH_URL}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HMRC token refresh error ${res.status}: ${text}`);
  }

  return await res.json();
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/hmrc\/?/, "");
    const body = req.method !== "GET" ? await req.json() : {};

    // ── OAuth2: Get authorize URL ────────────────────
    if (path === "oauth/authorize-url" && req.method === "POST") {
      const { redirectUri, state, scopes } = body;
      const authorizeUrl = buildAuthorizeUrl(
        redirectUri || `${supabaseUrl}/functions/v1/hmrc/oauth/callback`,
        state || crypto.randomUUID(),
        scopes || ["read:vat", "write:vat"]
      );
      return new Response(
        JSON.stringify({ authorizeUrl }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── OAuth2: Exchange code for tokens ─────────────
    if (path === "oauth/token" && req.method === "POST") {
      const { code, redirectUri } = body;
      const tokens = await exchangeCode(code, redirectUri);
      return new Response(
        JSON.stringify(tokens),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── OAuth2: Refresh token ────────────────────────
    if (path === "oauth/refresh" && req.method === "POST") {
      const { refresh_token } = body;
      const tokens = await refreshToken(refresh_token);
      return new Response(
        JSON.stringify(tokens),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── OAuth2: Test client credentials ──────────────
    if (path === "oauth/test" && req.method === "POST") {
      const token = await getClientCredentialsToken();
      return new Response(
        JSON.stringify({ ok: true, token_prefix: token.substring(0, 8) + "..." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── MTD VAT: Pull Obligations ────────────────────
    if (path === "vat/obligations" && req.method === "POST") {
      const { vrn, accessToken, from, to } = body;
      if (!accessToken) {
        return new Response(
          JSON.stringify({ error: "accessToken required (from per-client OAuth)" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);

      const hmrcRes = await fetch(
        `${HMRC_BASE_URL}/organisations/vat/${vrn}/obligations?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/vnd.hmrc.1.0+json",
          },
        }
      );

      const hmrcData = await hmrcRes.json();
      return new Response(
        JSON.stringify({ status: hmrcRes.status, data: hmrcData }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── MTD VAT: Submit Return ───────────────────────
    if (path === "vat/submit" && req.method === "POST") {
      const { vrn, accessToken, periodKey, returnData } = body;
      if (!accessToken) {
        return new Response(
          JSON.stringify({ error: "accessToken required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const hmrcRes = await fetch(
        `${HMRC_BASE_URL}/organisations/vat/${vrn}/returns`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
            Accept: "application/vnd.hmrc.1.0+json",
          },
          body: JSON.stringify({
            periodKey,
            vatDueSales: returnData?.box1 ?? 0,
            vatDueAcquisitions: returnData?.box2 ?? 0,
            totalVatDue: returnData?.box3 ?? 0,
            vatReclaimedCurrPeriod: returnData?.box4 ?? 0,
            netVatDue: returnData?.box5 ?? 0,
            totalValueSalesExVAT: returnData?.box6 ?? 0,
            totalValuePurchasesExVAT: returnData?.box7 ?? 0,
            totalValueGoodsSuppliedExVAT: returnData?.box8 ?? 0,
            totalAcquisitionsExVAT: returnData?.box9 ?? 0,
            finalised: true,
          }),
        }
      );

      const hmrcData = await hmrcRes.json();
      return new Response(
        JSON.stringify({ status: hmrcRes.status, data: hmrcData }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── RTI: Submit FPS (stub — RTI uses XML) ────────
    if (path === "rti/fps" && req.method === "POST") {
      return new Response(
        JSON.stringify({
          stub: true,
          message: "RTI FPS requires XML submission via Government Gateway — not OAuth2. Wire XML builder + GG credentials here.",
          endpoint: `${HMRC_BASE_URL}/organisations/rti/fps`,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── RTI: Submit EPS (stub) ───────────────────────
    if (path === "rti/eps" && req.method === "POST") {
      return new Response(
        JSON.stringify({
          stub: true,
          message: "RTI EPS requires XML submission via Government Gateway.",
          endpoint: `${HMRC_BASE_URL}/organisations/rti/eps`,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Unknown HMRC endpoint", path }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("HMRC function error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
