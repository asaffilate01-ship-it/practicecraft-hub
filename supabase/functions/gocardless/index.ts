import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GC_BASE = "https://api.gocardless.com";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const GC_ACCESS_TOKEN = Deno.env.get("GOCARDLESS_ACCESS_TOKEN");
    if (!GC_ACCESS_TOKEN) throw new Error("GOCARDLESS_ACCESS_TOKEN not configured");

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

    const gcFetch = async (path: string, method = "GET", body?: any) => {
      const res = await fetch(`${GC_BASE}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${GC_ACCESS_TOKEN}`,
          "GoCardless-Version": "2015-07-06",
          "Content-Type": "application/json",
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(`GoCardless API error ${res.status}: ${err}`);
      }
      return res.json();
    };

    let result;
    switch (action) {
      case "create_redirect_flow": {
        // Create a mandate setup flow for a client
        const { description, session_token, success_redirect_url } = params;
        result = await gcFetch("/redirect_flows", "POST", {
          redirect_flows: {
            description: description || "Direct Debit Mandate Setup",
            session_token,
            success_redirect_url,
            scheme: "bacs",
          },
        });
        break;
      }
      case "complete_redirect_flow": {
        const { redirect_flow_id, session_token } = params;
        result = await gcFetch(`/redirect_flows/${redirect_flow_id}/actions/complete`, "POST", {
          data: { session_token },
        });
        break;
      }
      case "create_payment": {
        const { amount_pence, currency, description, mandate_id, metadata } = params;
        result = await gcFetch("/payments", "POST", {
          payments: {
            amount: amount_pence,
            currency: currency || "GBP",
            description,
            links: { mandate: mandate_id },
            metadata: metadata || {},
          },
        });
        break;
      }
      case "list_payments": {
        const { mandate_id } = params;
        const qs = mandate_id ? `?mandate=${mandate_id}` : "";
        result = await gcFetch(`/payments${qs}`);
        break;
      }
      case "list_mandates": {
        result = await gcFetch("/mandates");
        break;
      }
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("gocardless error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
