import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// TrueLayer sandbox/live endpoints
const TL_AUTH_URL = "https://auth.truelayer.com";
const TL_API_URL = "https://api.truelayer.com";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const TL_CLIENT_ID = Deno.env.get("TRUELAYER_CLIENT_ID");
    const TL_CLIENT_SECRET = Deno.env.get("TRUELAYER_CLIENT_SECRET");
    if (!TL_CLIENT_ID || !TL_CLIENT_SECRET) {
      throw new Error("TrueLayer credentials not configured");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !userData.user) throw new Error("Authentication failed");

    const { action, ...params } = await req.json();

    switch (action) {
      case "create_auth_link": {
        // Generate TrueLayer auth link for Open Banking consent
        const { redirect_uri, client_id: bankClientId } = params;
        const scopes = "info accounts balance transactions";
        const state = JSON.stringify({ client_id: bankClientId, user_id: userData.user.id });
        const authUrl = `${TL_AUTH_URL}/?response_type=code&client_id=${TL_CLIENT_ID}&scope=${encodeURIComponent(scopes)}&redirect_uri=${encodeURIComponent(redirect_uri)}&state=${encodeURIComponent(btoa(state))}&providers=uk-ob-all`;
        return json({ auth_url: authUrl });
      }

      case "exchange_code": {
        // Exchange auth code for access token
        const { code, redirect_uri } = params;
        const tokenRes = await fetch(`${TL_AUTH_URL}/connect/token`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            grant_type: "authorization_code",
            client_id: TL_CLIENT_ID,
            client_secret: TL_CLIENT_SECRET,
            redirect_uri,
            code,
          }),
        });
        if (!tokenRes.ok) throw new Error(`Token exchange failed: ${tokenRes.status}`);
        const tokenData = await tokenRes.json();
        return json({ access_token: tokenData.access_token, expires_in: tokenData.expires_in });
      }

      case "list_accounts": {
        // List connected bank accounts
        const { access_token } = params;
        const res = await fetch(`${TL_API_URL}/data/v1/accounts`, {
          headers: { Authorization: `Bearer ${access_token}` },
        });
        if (!res.ok) throw new Error(`Accounts fetch failed: ${res.status}`);
        const data = await res.json();
        return json(data);
      }

      case "fetch_transactions": {
        // Fetch transactions for an account
        const { access_token, account_id, from_date, to_date } = params;
        let url = `${TL_API_URL}/data/v1/accounts/${account_id}/transactions`;
        const qs = [];
        if (from_date) qs.push(`from=${from_date}`);
        if (to_date) qs.push(`to=${to_date}`);
        if (qs.length) url += `?${qs.join("&")}`;

        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${access_token}` },
        });
        if (!res.ok) throw new Error(`Transactions fetch failed: ${res.status}`);
        const data = await res.json();
        return json(data);
      }

      case "fetch_balance": {
        const { access_token, account_id } = params;
        const res = await fetch(`${TL_API_URL}/data/v1/accounts/${account_id}/balance`, {
          headers: { Authorization: `Bearer ${access_token}` },
        });
        if (!res.ok) throw new Error(`Balance fetch failed: ${res.status}`);
        const data = await res.json();
        return json(data);
      }

      case "import_transactions": {
        // Import TrueLayer transactions into bank_transactions table
        const { access_token, account_id, bank_connection_id, client_id } = params;
        const { data: profile } = await supabase
          .from("profiles")
          .select("tenant_id")
          .eq("id", userData.user.id)
          .single();
        if (!profile) throw new Error("Profile not found");

        // Fetch transactions
        const res = await fetch(`${TL_API_URL}/data/v1/accounts/${account_id}/transactions`, {
          headers: { Authorization: `Bearer ${access_token}` },
        });
        if (!res.ok) throw new Error(`Transactions fetch failed: ${res.status}`);
        const { results: txns } = await res.json();

        if (!txns?.length) return json({ imported: 0 });

        const rows = txns.map((t: any) => ({
          tenant_id: profile.tenant_id,
          client_id,
          bank_connection_id,
          transaction_date: t.timestamp?.slice(0, 10) || new Date().toISOString().slice(0, 10),
          description: t.description || "Unknown",
          amount_pence: Math.round((t.amount || 0) * 100) * (t.transaction_type === "DEBIT" ? -1 : 1),
          reference: t.transaction_id || null,
          transaction_type: (t.transaction_type || "debit").toLowerCase(),
          provider_transaction_id: t.transaction_id || null,
          categorisation_status: "uncategorised",
        }));

        const { error } = await supabase.from("bank_transactions").upsert(rows, {
          onConflict: "provider_transaction_id,bank_connection_id",
          ignoreDuplicates: true,
        });
        if (error) throw error;

        return json({ imported: rows.length });
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (e) {
    console.error("open-banking error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
      "Content-Type": "application/json",
    },
  });
}
