import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * HMRC Integration Edge Function
 *
 * Provides stubs for:
 * 1. MTD VAT — pull obligations, submit returns
 * 2. RTI Payroll — submit FPS/EPS
 *
 * To connect to the real HMRC APIs you need:
 * - HMRC_CLIENT_ID / HMRC_CLIENT_SECRET (OAuth2 credentials from HMRC Developer Hub)
 * - Per-client OAuth tokens stored in client_credentials table
 * - HMRC sandbox or production base URL
 *
 * HMRC Developer Hub: https://developer.service.hmrc.gov.uk
 */

const HMRC_BASE_URL = Deno.env.get("HMRC_BASE_URL") || "https://test-api.service.hmrc.gov.uk";

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

    // ── MTD VAT: Pull Obligations ────────────────────
    if (path === "vat/obligations" && req.method === "POST") {
      const { clientId, vrn } = body;
      // Stub: In production, call HMRC GET /organisations/vat/{vrn}/obligations
      // with OAuth2 bearer token from client_credentials table
      return new Response(
        JSON.stringify({
          stub: true,
          message: "Wire to HMRC MTD VAT Obligations API",
          endpoint: `${HMRC_BASE_URL}/organisations/vat/${vrn}/obligations`,
          requiredHeaders: {
            Authorization: "Bearer {client_oauth_token}",
            Accept: "application/vnd.hmrc.1.0+json",
          },
          notes: [
            "Register as software vendor at developer.service.hmrc.gov.uk",
            "Implement OAuth2 authorization code flow per client",
            "Store tokens in client_credentials with provider='hmrc_mtd_vat'",
            "Pull obligations and create vat_returns records",
          ],
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── MTD VAT: Submit Return ───────────────────────
    if (path === "vat/submit" && req.method === "POST") {
      const { clientId, vrn, periodKey, returnData } = body;
      return new Response(
        JSON.stringify({
          stub: true,
          message: "Wire to HMRC MTD VAT Submit Return API",
          endpoint: `${HMRC_BASE_URL}/organisations/vat/${vrn}/returns`,
          method: "POST",
          requiredBody: {
            periodKey,
            vatDueSales: returnData?.box1,
            vatDueAcquisitions: returnData?.box2,
            totalVatDue: returnData?.box3,
            vatReclaimedCurrPeriod: returnData?.box4,
            netVatDue: returnData?.box5,
            totalValueSalesExVAT: returnData?.box6,
            totalValuePurchasesExVAT: returnData?.box7,
            totalValueGoodsSuppliedExVAT: returnData?.box8,
            totalAcquisitionsExVAT: returnData?.box9,
            finalised: true,
          },
          notes: [
            "Requires fraud prevention headers (Gov-Client-* headers)",
            "Use idempotency key via submission_jobs table",
            "Store HMRC receipt/correlation ID in submission_jobs.response_json",
          ],
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── RTI: Submit FPS ──────────────────────────────
    if (path === "rti/fps" && req.method === "POST") {
      const { employerId, payRunId } = body;
      return new Response(
        JSON.stringify({
          stub: true,
          message: "Wire to HMRC RTI FPS submission",
          endpoint: `${HMRC_BASE_URL}/organisations/rti/fps`,
          format: "XML",
          notes: [
            "RTI uses XML payloads, not JSON",
            "Requires HMRC Government Gateway credentials per employer",
            "Build IRenvelope XML with employee payment details",
            "Store credentials in client_credentials with provider='hmrc_rti'",
            "FPS must be submitted on or before pay date",
            "Parse HMRC XML response for acceptance/rejection",
          ],
          xmlStructure: {
            IRenvelope: {
              IRheader: "Sender, authentication, tax year",
              FullPaymentSubmission: {
                EmpRefs: "PAYE reference, accounts office ref",
                Employee: "NI number, name, address, payment details",
              },
            },
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── RTI: Submit EPS ──────────────────────────────
    if (path === "rti/eps" && req.method === "POST") {
      const { employerId, taxMonth } = body;
      return new Response(
        JSON.stringify({
          stub: true,
          message: "Wire to HMRC RTI EPS submission",
          endpoint: `${HMRC_BASE_URL}/organisations/rti/eps`,
          format: "XML",
          notes: [
            "EPS for no-payment periods, statutory pay recovery, CIS deductions",
            "Same authentication as FPS",
            "Must be submitted by 19th of following tax month",
          ],
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
