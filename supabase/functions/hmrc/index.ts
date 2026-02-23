import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as base64Encode } from "https://deno.land/std@0.208.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * HMRC Integration Edge Function
 *
 * 1. OAuth2 for MTD VAT (sandbox credentials configured)
 * 2. RTI FPS/EPS XML builder for Government Gateway submission
 */

const HMRC_BASE_URL = Deno.env.get("HMRC_BASE_URL") || "https://test-api.service.hmrc.gov.uk";
const HMRC_AUTH_URL = Deno.env.get("HMRC_AUTH_URL") || "https://test-api.service.hmrc.gov.uk";
const RTI_SUBMISSION_URL = Deno.env.get("HMRC_RTI_URL") || "https://test-transaction-engine.tax.service.gov.uk/submission";

// ═══════════════════════════════════════════════
// OAuth2 helpers (MTD VAT)
// ═══════════════════════════════════════════════

async function getClientCredentialsToken(): Promise<string> {
  const clientId = Deno.env.get("HMRC_CLIENT_ID");
  const clientSecret = Deno.env.get("HMRC_CLIENT_SECRET");
  if (!clientId || !clientSecret) throw new Error("HMRC_CLIENT_ID or HMRC_CLIENT_SECRET not configured");

  const res = await fetch(`${HMRC_AUTH_URL}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "client_credentials", client_id: clientId, client_secret: clientSecret }),
  });
  if (!res.ok) throw new Error(`HMRC OAuth error ${res.status}: ${await res.text()}`);
  return (await res.json()).access_token;
}

function buildAuthorizeUrl(redirectUri: string, state: string, scopes: string[]): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: Deno.env.get("HMRC_CLIENT_ID")!,
    scope: scopes.join(" "),
    redirect_uri: redirectUri,
    state,
  });
  return `${HMRC_AUTH_URL}/oauth/authorize?${params.toString()}`;
}

async function exchangeCode(code: string, redirectUri: string) {
  const res = await fetch(`${HMRC_AUTH_URL}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: Deno.env.get("HMRC_CLIENT_ID")!,
      client_secret: Deno.env.get("HMRC_CLIENT_SECRET")!,
      code,
      redirect_uri: redirectUri,
    }),
  });
  if (!res.ok) throw new Error(`HMRC token exchange error ${res.status}: ${await res.text()}`);
  return await res.json();
}

async function refreshToken(refresh_token: string) {
  const res = await fetch(`${HMRC_AUTH_URL}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: Deno.env.get("HMRC_CLIENT_ID")!,
      client_secret: Deno.env.get("HMRC_CLIENT_SECRET")!,
      refresh_token,
    }),
  });
  if (!res.ok) throw new Error(`HMRC token refresh error ${res.status}: ${await res.text()}`);
  return await res.json();
}

// ═══════════════════════════════════════════════
// RTI XML Builder
// ═══════════════════════════════════════════════

/**
 * Compute IRmark: SHA-512 hash of the XML body (everything inside <IRenvelope>
 * excluding the IRmark element itself), base64 encoded.
 *
 * In production the IRmark is computed over a canonicalised subset of the XML.
 * This implementation hashes the body content which works for the test gateway.
 */
async function computeIRmark(xmlBody: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(xmlBody);
  const hashBuffer = await crypto.subtle.digest("SHA-512", data);
  return base64Encode(new Uint8Array(hashBuffer));
}

function escapeXml(s: string | number | undefined | null): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

interface FPSEmployee {
  niNumber: string;        // e.g. "AB123456C"
  title?: string;
  forename: string;
  surname: string;
  dateOfBirth: string;     // YYYY-MM-DD
  gender: "M" | "F";
  addressLine1?: string;
  addressLine2?: string;
  addressLine3?: string;
  postcode?: string;
  payFrequency: "W1" | "W2" | "W4" | "M1" | "MA";  // Weekly, fortnightly, 4-weekly, monthly, annually
  paymentDate: string;     // YYYY-MM-DD
  taxCode: string;         // e.g. "1257L"
  taxBasis?: "cumulative" | "non-cumulative";
  taxablePayToDate: number;
  totalTaxToDate: number;
  taxablePayInPeriod: number;
  taxInPeriod: number;
  niCategory: string;      // e.g. "A"
  niableEarningsInPeriod: number;
  employeeNicInPeriod: number;
  employerNicInPeriod: number;
  grossPayForNicYtd: number;
  employeeNicYtd: number;
  employerNicYtd: number;
  starterDeclaration?: "A" | "B" | "C";
  isLeaver?: boolean;
  leavingDate?: string;
}

interface FPSPayload {
  // Government Gateway auth
  senderId: string;           // HMRC sender ID (agent enrolment)
  senderAuth: string;         // Authentication value
  taxYear: string;            // e.g. "25-26"
  // Employer
  payeRef: string;            // e.g. "123/AB456"
  accountsOfficeRef: string;  // e.g. "123PA00012345"
  // Employees
  employees: FPSEmployee[];
  // Metadata
  relatedTaxYear?: string;
  lateReason?: "A" | "B" | "C" | "D" | "F" | "G" | "H";
}

function buildFPSXml(payload: FPSPayload): { envelope: string; bodyForIRmark: string } {
  const { senderId, senderAuth, taxYear, payeRef, accountsOfficeRef, employees } = payload;
  const [officeNumber, employerRef] = payeRef.split("/");
  const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, "");

  // Build employee XML blocks
  const employeeBlocks = employees.map((emp) => `
      <Employee>
        <EmployeeDetails>
          <NINO>${escapeXml(emp.niNumber)}</NINO>
          <Name>
            ${emp.title ? `<Ttl>${escapeXml(emp.title)}</Ttl>` : ""}
            <Fore>${escapeXml(emp.forename)}</Fore>
            <Sur>${escapeXml(emp.surname)}</Sur>
          </Name>
          <BirthDate>${escapeXml(emp.dateOfBirth)}</BirthDate>
          <Gender>${escapeXml(emp.gender)}</Gender>
          ${emp.addressLine1 ? `<Address>
            <Line>${escapeXml(emp.addressLine1)}</Line>
            ${emp.addressLine2 ? `<Line>${escapeXml(emp.addressLine2)}</Line>` : ""}
            ${emp.postcode ? `<Postcode>${escapeXml(emp.postcode)}</Postcode>` : ""}
          </Address>` : ""}
        </EmployeeDetails>
        <Employment>
          <PayFrequency>${escapeXml(emp.payFrequency)}</PayFrequency>
          <PaymentDate>${escapeXml(emp.paymentDate)}</PaymentDate>
          ${emp.lateReason ? `<LateReason>${escapeXml(payload.lateReason)}</LateReason>` : ""}
          <PayId>
            <PayeRef>${escapeXml(payeRef)}</PayeRef>
          </PayId>
          <FiguresToDate>
            <TaxablePay>${emp.taxablePayToDate.toFixed(2)}</TaxablePay>
            <TotalTax>${emp.totalTaxToDate.toFixed(2)}</TotalTax>
          </FiguresToDate>
          <Payment>
            <TaxCode>${escapeXml(emp.taxCode)}</TaxCode>
            <TaxBasis>${emp.taxBasis === "non-cumulative" ? "1" : "0"}</TaxBasis>
            <TaxablePay>${emp.taxablePayInPeriod.toFixed(2)}</TaxablePay>
            <TaxDeducted>${emp.taxInPeriod.toFixed(2)}</TaxDeducted>
          </Payment>
          <NIlettersAndValues>
            <NIletter>${escapeXml(emp.niCategory)}</NIletter>
            <InPd>
              <Earnings>${emp.niableEarningsInPeriod.toFixed(2)}</Earnings>
              <Employee>${emp.employeeNicInPeriod.toFixed(2)}</Employee>
              <Employer>${emp.employerNicInPeriod.toFixed(2)}</Employer>
            </InPd>
            <ToDate>
              <Earnings>${emp.grossPayForNicYtd.toFixed(2)}</Earnings>
              <Employee>${emp.employeeNicYtd.toFixed(2)}</Employee>
              <Employer>${emp.employerNicYtd.toFixed(2)}</Employer>
            </ToDate>
          </NIlettersAndValues>
          ${emp.starterDeclaration ? `<StarterDeclaration>${escapeXml(emp.starterDeclaration)}</StarterDeclaration>` : ""}
          ${emp.isLeaver ? `<LeavingDate>${escapeXml(emp.leavingDate)}</LeavingDate>` : ""}
        </Employment>
      </Employee>`).join("\n");

  // The body content (used for IRmark calculation)
  const bodyContent = `
    <FullPaymentSubmission xmlns="http://www.govtalk.gov.uk/taxation/PAYE/RTI/FullPaymentSubmission/16-17">
      <EmpRefs>
        <OfficeNo>${escapeXml(officeNumber)}</OfficeNo>
        <PayeRef>${escapeXml(employerRef)}</PayeRef>
        <AORef>${escapeXml(accountsOfficeRef)}</AORef>
      </EmpRefs>
      <RelatedTaxYear>${escapeXml(taxYear)}</RelatedTaxYear>
      ${employeeBlocks}
    </FullPaymentSubmission>`;

  return { envelope: "", bodyForIRmark: bodyContent };
}

async function buildFullFPSEnvelope(payload: FPSPayload): Promise<string> {
  const { bodyForIRmark } = buildFPSXml(payload);
  const irmark = await computeIRmark(bodyForIRmark);
  const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, "");

  return `<?xml version="1.0" encoding="UTF-8"?>
<GovTalkMessage xmlns="http://www.govtalk.gov.uk/CM/envelope">
  <EnvelopeVersion>2.0</EnvelopeVersion>
  <Header>
    <MessageDetails>
      <Class>HMRC-PAYE-RTI-FPS</Class>
      <Qualifier>request</Qualifier>
      <Function>submit</Function>
      <TransactionID></TransactionID>
      <CorrelationID></CorrelationID>
      <Transformation>XML</Transformation>
      <GatewayTest>1</GatewayTest>
    </MessageDetails>
    <SenderDetails>
      <IDAuthentication>
        <SenderID>${escapeXml(payload.senderId)}</SenderID>
        <Authentication>
          <Method>clear</Method>
          <Role>principal</Role>
          <Value>${escapeXml(payload.senderAuth)}</Value>
        </Authentication>
      </IDAuthentication>
    </SenderDetails>
  </Header>
  <GovTalkDetails>
    <Keys>
      <Key Type="TaxOfficeNumber">${escapeXml(payload.payeRef.split("/")[0])}</Key>
      <Key Type="TaxOfficeReference">${escapeXml(payload.payeRef.split("/")[1])}</Key>
    </Keys>
    <ChannelRouting>
      <Channel>
        <URI>0000</URI>
        <Product>Lovable Practice Platform</Product>
        <Version>1.0</Version>
      </Channel>
    </ChannelRouting>
  </GovTalkDetails>
  <Body>
    <IRenvelope xmlns="http://www.govtalk.gov.uk/taxation/PAYE/RTI/FullPaymentSubmission/16-17">
      <IRheader>
        <Keys>
          <Key Type="TaxOfficeNumber">${escapeXml(payload.payeRef.split("/")[0])}</Key>
          <Key Type="TaxOfficeReference">${escapeXml(payload.payeRef.split("/")[1])}</Key>
        </Keys>
        <PeriodEnd>${new Date().toISOString().split("T")[0]}</PeriodEnd>
        <IRmark Type="generic">${irmark}</IRmark>
        <Sender>Agent</Sender>
      </IRheader>
      ${bodyForIRmark.trim()}
    </IRenvelope>
  </Body>
</GovTalkMessage>`;
}

// ── EPS XML Builder ──────────────────────────────

interface EPSPayload {
  senderId: string;
  senderAuth: string;
  taxYear: string;
  payeRef: string;
  accountsOfficeRef: string;
  taxMonth: number;  // 1-12
  noPaymentDates?: { from: string; to: string };
  statutoryPayRecovery?: {
    smpRecovered?: number;
    sppRecovered?: number;
    sapRecovered?: number;
    shppRecovered?: number;
    nicCompensationOnSmp?: number;
    nicCompensationOnSpp?: number;
    nicCompensationOnSap?: number;
    nicCompensationOnShpp?: number;
    cisDeductions?: number;
  };
  finalSubmissionForYear?: boolean;
  schemeCoasedDate?: string;
}

async function buildFullEPSEnvelope(payload: EPSPayload): Promise<string> {
  const [officeNumber, employerRef] = payload.payeRef.split("/");

  const recoveryBlock = payload.statutoryPayRecovery ? `
        <RecoverableAmountsYTD>
          ${payload.statutoryPayRecovery.smpRecovered != null ? `<SMPRecovered>${payload.statutoryPayRecovery.smpRecovered.toFixed(2)}</SMPRecovered>` : ""}
          ${payload.statutoryPayRecovery.sppRecovered != null ? `<SPPRecovered>${payload.statutoryPayRecovery.sppRecovered.toFixed(2)}</SPPRecovered>` : ""}
          ${payload.statutoryPayRecovery.sapRecovered != null ? `<SAPRecovered>${payload.statutoryPayRecovery.sapRecovered.toFixed(2)}</SAPRecovered>` : ""}
          ${payload.statutoryPayRecovery.shppRecovered != null ? `<ShPPRecovered>${payload.statutoryPayRecovery.shppRecovered.toFixed(2)}</ShPPRecovered>` : ""}
          ${payload.statutoryPayRecovery.nicCompensationOnSmp != null ? `<NICCompensationOnSMP>${payload.statutoryPayRecovery.nicCompensationOnSmp.toFixed(2)}</NICCompensationOnSMP>` : ""}
          ${payload.statutoryPayRecovery.cisDeductions != null ? `<CISDeductionsSuffered>${payload.statutoryPayRecovery.cisDeductions.toFixed(2)}</CISDeductionsSuffered>` : ""}
        </RecoverableAmountsYTD>` : "";

  const noPayBlock = payload.noPaymentDates ? `
        <NoPaymentDates>
          <NoPaymentFrom>${escapeXml(payload.noPaymentDates.from)}</NoPaymentFrom>
          <NoPaymentTo>${escapeXml(payload.noPaymentDates.to)}</NoPaymentTo>
        </NoPaymentDates>` : "";

  const bodyContent = `
    <EmployerPaymentSummary xmlns="http://www.govtalk.gov.uk/taxation/PAYE/RTI/EmployerPaymentSummary/16-17">
      <EmpRefs>
        <OfficeNo>${escapeXml(officeNumber)}</OfficeNo>
        <PayeRef>${escapeXml(employerRef)}</PayeRef>
        <AORef>${escapeXml(payload.accountsOfficeRef)}</AORef>
      </EmpRefs>
      <RelatedTaxYear>${escapeXml(payload.taxYear)}</RelatedTaxYear>
      ${noPayBlock}
      ${recoveryBlock}
      ${payload.finalSubmissionForYear ? `<FinalSubmission>
        <ForYear>yes</ForYear>
        ${payload.schemeCoasedDate ? `<DateSchemeCeased>${escapeXml(payload.schemeCoasedDate)}</DateSchemeCeased>` : ""}
      </FinalSubmission>` : ""}
    </EmployerPaymentSummary>`;

  const irmark = await computeIRmark(bodyContent);

  return `<?xml version="1.0" encoding="UTF-8"?>
<GovTalkMessage xmlns="http://www.govtalk.gov.uk/CM/envelope">
  <EnvelopeVersion>2.0</EnvelopeVersion>
  <Header>
    <MessageDetails>
      <Class>HMRC-PAYE-RTI-EPS</Class>
      <Qualifier>request</Qualifier>
      <Function>submit</Function>
      <TransactionID></TransactionID>
      <CorrelationID></CorrelationID>
      <Transformation>XML</Transformation>
      <GatewayTest>1</GatewayTest>
    </MessageDetails>
    <SenderDetails>
      <IDAuthentication>
        <SenderID>${escapeXml(payload.senderId)}</SenderID>
        <Authentication>
          <Method>clear</Method>
          <Role>principal</Role>
          <Value>${escapeXml(payload.senderAuth)}</Value>
        </Authentication>
      </IDAuthentication>
    </SenderDetails>
  </Header>
  <GovTalkDetails>
    <Keys>
      <Key Type="TaxOfficeNumber">${escapeXml(officeNumber)}</Key>
      <Key Type="TaxOfficeReference">${escapeXml(employerRef)}</Key>
    </Keys>
    <ChannelRouting>
      <Channel>
        <URI>0000</URI>
        <Product>Lovable Practice Platform</Product>
        <Version>1.0</Version>
      </Channel>
    </ChannelRouting>
  </GovTalkDetails>
  <Body>
    <IRenvelope xmlns="http://www.govtalk.gov.uk/taxation/PAYE/RTI/EmployerPaymentSummary/16-17">
      <IRheader>
        <Keys>
          <Key Type="TaxOfficeNumber">${escapeXml(officeNumber)}</Key>
          <Key Type="TaxOfficeReference">${escapeXml(employerRef)}</Key>
        </Keys>
        <PeriodEnd>${new Date().toISOString().split("T")[0]}</PeriodEnd>
        <IRmark Type="generic">${irmark}</IRmark>
        <Sender>Agent</Sender>
      </IRheader>
      ${bodyContent.trim()}
    </IRenvelope>
  </Body>
</GovTalkMessage>`;
}

// ═══════════════════════════════════════════════
// Main handler
// ═══════════════════════════════════════════════

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
      return new Response(JSON.stringify({ authorizeUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── OAuth2: Exchange code ────────────────────────
    if (path === "oauth/token" && req.method === "POST") {
      const tokens = await exchangeCode(body.code, body.redirectUri);
      return new Response(JSON.stringify(tokens), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── OAuth2: Exchange code AND store in client_credentials ──
    if (path === "oauth/exchange-and-store" && req.method === "POST") {
      const { code, redirectUri, clientId, tenantId, scopes } = body;
      if (!code || !clientId || !tenantId) {
        return new Response(JSON.stringify({ error: "code, clientId, and tenantId required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const tokens = await exchangeCode(code, redirectUri || "https://www.iqadvisory.co.uk/auth-redirect");

      // Store tokens in client_credentials (encrypted at rest by Supabase)
      const now = new Date().toISOString();
      const expiresAt = tokens.expires_in
        ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
        : null;

      // Determine provider based on scopes
      const scopeStr = scopes || tokens.scope || "";
      const providers: string[] = [];
      if (scopeStr.includes("vat")) providers.push("hmrc_vat");
      if (scopeStr.includes("self-assessment")) providers.push("hmrc_sa");
      if (scopeStr.includes("paye")) providers.push("hmrc_paye");
      if (providers.length === 0) providers.push("hmrc");

      // Upsert credentials for each provider scope
      for (const provider of providers) {
        const { error: upsertErr } = await supabase
          .from("client_credentials")
          .upsert(
            {
              tenant_id: tenantId,
              client_id: clientId,
              provider,
              credential_type: "oauth2",
              ciphertext: JSON.stringify({
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token,
                token_type: tokens.token_type,
              }),
              expires_at: expiresAt,
              metadata_json: {
                scope: tokens.scope || scopeStr,
                connected_at: now,
              },
            },
            { onConflict: "tenant_id,client_id,provider" }
          );

        if (upsertErr) {
          console.error("Error storing HMRC credentials:", upsertErr);
          // Try insert if upsert fails (no unique constraint yet)
          await supabase.from("client_credentials").insert({
            tenant_id: tenantId,
            client_id: clientId,
            provider,
            credential_type: "oauth2",
            ciphertext: JSON.stringify({
              access_token: tokens.access_token,
              refresh_token: tokens.refresh_token,
              token_type: tokens.token_type,
            }),
            expires_at: expiresAt,
            metadata_json: {
              scope: tokens.scope || scopeStr,
              connected_at: now,
            },
          });
        }
      }

      // Log the event
      await supabase.from("event_logs").insert({
        tenant_id: tenantId,
        event_type: "hmrc_oauth_connected",
        source: "system",
        client_id: clientId,
        payload_json: { providers, scope: tokens.scope || scopeStr },
      });

      return new Response(JSON.stringify({
        success: true,
        providers,
        scope: tokens.scope || scopeStr,
        expiresAt,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── OAuth2: Refresh ──────────────────────────────
    if (path === "oauth/refresh" && req.method === "POST") {
      const tokens = await refreshToken(body.refresh_token);
      return new Response(JSON.stringify(tokens), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── OAuth2: Test credentials ─────────────────────
    if (path === "oauth/test" && req.method === "POST") {
      const token = await getClientCredentialsToken();
      return new Response(JSON.stringify({ ok: true, token_prefix: token.substring(0, 8) + "..." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── MTD VAT: Pull Obligations ────────────────────
    if (path === "vat/obligations" && req.method === "POST") {
      const { vrn, accessToken, from, to } = body;
      if (!accessToken) {
        return new Response(JSON.stringify({ error: "accessToken required (from per-client OAuth)" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const hmrcRes = await fetch(`${HMRC_BASE_URL}/organisations/vat/${vrn}/obligations?${params}`, {
        headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/vnd.hmrc.1.0+json" },
      });
      return new Response(JSON.stringify({ status: hmrcRes.status, data: await hmrcRes.json() }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── MTD VAT: Submit Return ───────────────────────
    if (path === "vat/submit" && req.method === "POST") {
      const { vrn, accessToken, periodKey, returnData } = body;
      if (!accessToken) {
        return new Response(JSON.stringify({ error: "accessToken required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const hmrcRes = await fetch(`${HMRC_BASE_URL}/organisations/vat/${vrn}/returns`, {
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
      });
      return new Response(JSON.stringify({ status: hmrcRes.status, data: await hmrcRes.json() }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── RTI: Build FPS XML ───────────────────────────
    if (path === "rti/fps/build" && req.method === "POST") {
      const xml = await buildFullFPSEnvelope(body as FPSPayload);
      return new Response(JSON.stringify({ xml, size: xml.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── RTI: Submit FPS ──────────────────────────────
    if (path === "rti/fps" && req.method === "POST") {
      const fpsPayload = body as FPSPayload;
      if (!fpsPayload.senderId || !fpsPayload.senderAuth) {
        return new Response(JSON.stringify({
          error: "senderId and senderAuth (Government Gateway credentials) required",
          help: "Register for PAYE Online for Agents at https://www.gov.uk/paye-online/enrol",
        }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const xml = await buildFullFPSEnvelope(fpsPayload);

      // Submit to HMRC Transaction Engine
      const hmrcRes = await fetch(RTI_SUBMISSION_URL, {
        method: "POST",
        headers: { "Content-Type": "application/xml" },
        body: xml,
      });

      const responseXml = await hmrcRes.text();

      // Parse correlation ID from response (basic extraction)
      const correlationMatch = responseXml.match(/<CorrelationID>(.*?)<\/CorrelationID>/);
      const qualifierMatch = responseXml.match(/<Qualifier>(.*?)<\/Qualifier>/);
      const errorMatch = responseXml.match(/<Text>(.*?)<\/Text>/);

      return new Response(JSON.stringify({
        submitted: true,
        httpStatus: hmrcRes.status,
        correlationId: correlationMatch?.[1] ?? null,
        qualifier: qualifierMatch?.[1] ?? null,
        errorText: qualifierMatch?.[1] === "error" ? errorMatch?.[1] : null,
        rawResponse: responseXml.substring(0, 2000),
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── RTI: Build EPS XML ───────────────────────────
    if (path === "rti/eps/build" && req.method === "POST") {
      const xml = await buildFullEPSEnvelope(body as EPSPayload);
      return new Response(JSON.stringify({ xml, size: xml.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── RTI: Submit EPS ──────────────────────────────
    if (path === "rti/eps" && req.method === "POST") {
      const epsPayload = body as EPSPayload;
      if (!epsPayload.senderId || !epsPayload.senderAuth) {
        return new Response(JSON.stringify({
          error: "senderId and senderAuth (Government Gateway credentials) required",
          help: "Register for PAYE Online for Agents at https://www.gov.uk/paye-online/enrol",
        }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const xml = await buildFullEPSEnvelope(epsPayload);

      const hmrcRes = await fetch(RTI_SUBMISSION_URL, {
        method: "POST",
        headers: { "Content-Type": "application/xml" },
        body: xml,
      });

      const responseXml = await hmrcRes.text();
      const correlationMatch = responseXml.match(/<CorrelationID>(.*?)<\/CorrelationID>/);
      const qualifierMatch = responseXml.match(/<Qualifier>(.*?)<\/Qualifier>/);

      return new Response(JSON.stringify({
        submitted: true,
        httpStatus: hmrcRes.status,
        correlationId: correlationMatch?.[1] ?? null,
        qualifier: qualifierMatch?.[1] ?? null,
        rawResponse: responseXml.substring(0, 2000),
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── RTI: Poll for response ───────────────────────
    if (path === "rti/poll" && req.method === "POST") {
      const { correlationId, senderId, senderAuth } = body;
      const pollXml = `<?xml version="1.0" encoding="UTF-8"?>
<GovTalkMessage xmlns="http://www.govtalk.gov.uk/CM/envelope">
  <EnvelopeVersion>2.0</EnvelopeVersion>
  <Header>
    <MessageDetails>
      <Class>HMRC-PAYE-RTI-FPS</Class>
      <Qualifier>poll</Qualifier>
      <Function>submit</Function>
      <CorrelationID>${escapeXml(correlationId)}</CorrelationID>
      <Transformation>XML</Transformation>
    </MessageDetails>
    <SenderDetails>
      <IDAuthentication>
        <SenderID>${escapeXml(senderId)}</SenderID>
        <Authentication>
          <Method>clear</Method>
          <Role>principal</Role>
          <Value>${escapeXml(senderAuth)}</Value>
        </Authentication>
      </IDAuthentication>
    </SenderDetails>
  </Header>
  <GovTalkDetails>
    <Keys/>
  </GovTalkDetails>
  <Body/>
</GovTalkMessage>`;

      const hmrcRes = await fetch(RTI_SUBMISSION_URL, {
        method: "POST",
        headers: { "Content-Type": "application/xml" },
        body: pollXml,
      });

      const responseXml = await hmrcRes.text();
      const qualifierMatch = responseXml.match(/<Qualifier>(.*?)<\/Qualifier>/);

      return new Response(JSON.stringify({
        httpStatus: hmrcRes.status,
        qualifier: qualifierMatch?.[1] ?? null,
        rawResponse: responseXml.substring(0, 2000),
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Unknown HMRC endpoint", path }), {
      status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("HMRC function error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
