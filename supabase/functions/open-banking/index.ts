import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { AccessError, requireStaff, requirePermissions } from "../_shared/access.ts";
import { requireSafeBankAction } from "../_shared/bankGuard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authorization = req.headers.get("Authorization") ?? "";
    const token = /^Bearer\s+(\S+)$/i.exec(authorization)?.[1];
    if (!token) throw new AccessError("Authentication required", 401);

    const url = Deno.env.get("SUPABASE_URL");
    const publishableKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
    if (!url || !publishableKey) throw new AccessError("Bank service configuration unavailable", 503);

    // Authenticated caller's RLS context: no service-role bypass and no browser tokens.
    const db = createClient(url, publishableKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const actor = await requireStaff(db, token);
    await requirePermissions(db, actor, ["ledger.view"]);

    const body: unknown = await req.json().catch(() => null);
    requireSafeBankAction(body);
    return json({
      enabled: false,
      mode: "manual_csv_only",
      message: "Automatic Open Banking is unavailable until secure consent and server-managed account connections are implemented.",
    });
  } catch (error) {
    // Never log request parameters, provider tokens or bank data.
    if (error instanceof AccessError) {
      return json({ error: error.message }, error.status);
    }
    return json({ error: "Bank service unavailable" }, 500);
  }
});
