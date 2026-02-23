import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Companies House Integration Edge Function
 *
 * Provides stubs for:
 * 1. REST API — company search, profile, officers, PSC, filing history
 * 2. XML Gateway — file CS01, AP01, TM01, SH01 etc.
 *
 * To connect to real APIs you need:
 * - CH_API_KEY (from developer.company-information.service.gov.uk)
 * - CH_PRESENTER_ID + CH_PRESENTER_AUTH (for XML Gateway filing)
 * - Per-client auth codes stored in client_credentials table
 */

const CH_REST_BASE = "https://api.company-information.service.gov.uk";
const CH_XML_BASE = "https://xmlgw.companieshouse.gov.uk/v1-0/xmlgw/Gateway";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const chApiKey = Deno.env.get("CH_API_KEY");

    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/companies-house\/?/, "");
    const body = req.method !== "GET" ? await req.json() : {};

    // ── Search Companies ─────────────────────────────
    if (path === "search" && req.method === "POST") {
      const { query } = body;

      if (chApiKey) {
        // Real API call
        const res = await fetch(
          `${CH_REST_BASE}/search/companies?q=${encodeURIComponent(query)}&items_per_page=10`,
          {
            headers: {
              Authorization: `Basic ${btoa(chApiKey + ":")}`,
            },
          }
        );
        const data = await res.json();
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({
          stub: true,
          message: "Set CH_API_KEY secret to enable live company search",
          endpoint: `${CH_REST_BASE}/search/companies?q=${query}`,
          auth: "Basic auth with API key",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Get Company Profile ──────────────────────────
    if (path === "profile" && req.method === "POST") {
      const { companyNumber } = body;

      if (chApiKey) {
        const res = await fetch(`${CH_REST_BASE}/company/${companyNumber}`, {
          headers: { Authorization: `Basic ${btoa(chApiKey + ":")}` },
        });
        const data = await res.json();
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({
          stub: true,
          message: "Set CH_API_KEY secret to enable company profile lookup",
          endpoint: `${CH_REST_BASE}/company/${companyNumber}`,
          returns: {
            company_name: "string",
            company_number: "string",
            company_status: "active|dissolved|...",
            registered_office_address: "object",
            sic_codes: "string[]",
            confirmation_statement: { next_due: "date", last_made_up_to: "date" },
            accounts: { next_due: "date", last_accounts: "object" },
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Get Officers ─────────────────────────────────
    if (path === "officers" && req.method === "POST") {
      const { companyNumber } = body;

      if (chApiKey) {
        const res = await fetch(`${CH_REST_BASE}/company/${companyNumber}/officers`, {
          headers: { Authorization: `Basic ${btoa(chApiKey + ":")}` },
        });
        const data = await res.json();
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({
          stub: true,
          message: "Set CH_API_KEY secret to enable officers lookup",
          endpoint: `${CH_REST_BASE}/company/${companyNumber}/officers`,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Get PSCs ─────────────────────────────────────
    if (path === "psc" && req.method === "POST") {
      const { companyNumber } = body;

      if (chApiKey) {
        const res = await fetch(
          `${CH_REST_BASE}/company/${companyNumber}/persons-with-significant-control`,
          { headers: { Authorization: `Basic ${btoa(chApiKey + ":")}` } }
        );
        const data = await res.json();
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({
          stub: true,
          message: "Set CH_API_KEY to enable PSC lookup",
          endpoint: `${CH_REST_BASE}/company/${companyNumber}/persons-with-significant-control`,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── XML Gateway Filing ───────────────────────────
    if (path === "file" && req.method === "POST") {
      const { filingType, companyNumber, authCode, payload } = body;
      return new Response(
        JSON.stringify({
          stub: true,
          message: "Wire to Companies House XML Gateway",
          endpoint: CH_XML_BASE,
          filingType,
          notes: [
            "Requires CH_PRESENTER_ID and CH_PRESENTER_AUTH secrets",
            "Build XML envelope with GovTalkMessage structure",
            "Auth code required for most filings (stored in client_credentials)",
            "Supported filing types: ConfirmationStatement, ChangeOfAddress, AP01, TM01, SH01, etc.",
            "Parse XML response for SuccessResponse or ErrorResponse",
            "Store transaction ID and barcode in ch_filings table",
          ],
          xmlStructure: {
            GovTalkMessage: {
              Header: {
                MessageDetails: { Class: filingType, Qualifier: "request" },
                SenderDetails: { IDAuthentication: "Presenter credentials" },
              },
              Body: {
                CompanyNumber: companyNumber,
                AuthCode: "From client_credentials",
                FormPayload: "Filing-specific XML",
              },
            },
          },
          supportedFilings: [
            "ConfirmationStatement (CS01)",
            "ChangeOfRegisteredOffice (AD01)",
            "AppointDirector (AP01)",
            "TerminateDirector (TM01)",
            "ReturnOfAllotment (SH01)",
            "ChangeOfAccountingReferenceDate (AA01)",
            "PSCNotification (PSC01-PSC09)",
          ],
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Filing History ───────────────────────────────
    if (path === "filing-history" && req.method === "POST") {
      const { companyNumber } = body;

      if (chApiKey) {
        const res = await fetch(
          `${CH_REST_BASE}/company/${companyNumber}/filing-history?items_per_page=25`,
          { headers: { Authorization: `Basic ${btoa(chApiKey + ":")}` } }
        );
        const data = await res.json();
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({
          stub: true,
          message: "Set CH_API_KEY to enable filing history",
          endpoint: `${CH_REST_BASE}/company/${companyNumber}/filing-history`,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Unknown Companies House endpoint", path }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Companies House function error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
