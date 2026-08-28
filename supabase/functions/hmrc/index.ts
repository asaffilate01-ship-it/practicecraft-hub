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

function bytesToBase64(bytes: Uint8Array): string { let binary = ""; for (const byte of bytes) binary += String.fromCharCode(byte); return btoa(binary); }
function base64ToBytes(value: string): Uint8Array { const binary = atob(value); return Uint8Array.from(binary, char => char.charCodeAt(0)); }
async function sha256(value: string): Promise<string> { const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)); return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2,"0")).join(""); }

async function tokenEncryptionKey(): Promise<CryptoKey> {
  const secret = Deno.env.get("HMRC_TOKEN_ENCRYPTION_KEY");
  if (!secret || secret.length < 32) throw new Error("HMRC_TOKEN_ENCRYPTION_KEY must be configured with at least 32 characters");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt","decrypt"]);
}

async function encryptTokens(tokens: Record<string, unknown>): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await tokenEncryptionKey(), new TextEncoder().encode(JSON.stringify(tokens)));
  return `v1:${bytesToBase64(iv)}:${bytesToBase64(new Uint8Array(encrypted))}`;
}

async function decryptTokens(ciphertext: string): Promise<Record<string, any>> {
  if (!ciphertext.startsWith("v1:")) return JSON.parse(ciphertext);
  const [,ivValue,encryptedValue] = ciphertext.split(":");
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv: base64ToBytes(ivValue) }, await tokenEncryptionKey(), base64ToBytes(encryptedValue));
  return JSON.parse(new TextDecoder().decode(decrypted));
}

function hmrcError(data: any, fallback: string): string { return data?.message || data?.errors?.[0]?.message || data?.code || fallback; }
function isProductionHmrc(): boolean { return HMRC_BASE_URL.includes("api.service.hmrc.gov.uk") && !HMRC_BASE_URL.includes("test-api"); }

function buildFraudPreventionHeaders(req: Request, context: Record<string, any> = {}): Record<string,string> {
  const forwardedFor = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const forwardedPort = req.headers.get("x-forwarded-port");
  const vendorPublicIp = Deno.env.get("HMRC_VENDOR_PUBLIC_IP");
  const productName = Deno.env.get("HMRC_PRODUCT_NAME") || "PracticeCraft";
  const productVersion = Deno.env.get("HMRC_PRODUCT_VERSION") || "development";
  const headers: Record<string,string> = {
    "Gov-Client-Connection-Method":"WEB_APP_VIA_SERVER",
    "Gov-Client-User-IDs":`practicecraft=${encodeURIComponent(String(context.userId || "unknown"))}`,
    "Gov-Vendor-Product-Name":encodeURIComponent(productName),
    "Gov-Vendor-Version":`practicecraft=${encodeURIComponent(productVersion)}`,
  };
  if (context.deviceId) headers["Gov-Client-Device-ID"] = String(context.deviceId);
  if (context.userAgent) headers["Gov-Client-Browser-JS-User-Agent"] = encodeURIComponent(String(context.userAgent));
  if (context.screens) headers["Gov-Client-Screens"] = String(context.screens);
  if (context.timezone) headers["Gov-Client-Timezone"] = String(context.timezone);
  if (context.windowSize) headers["Gov-Client-Window-Size"] = String(context.windowSize);
  if (forwardedFor) { headers["Gov-Client-Public-IP"] = forwardedFor; headers["Gov-Client-Public-IP-Timestamp"] = new Date().toISOString(); }
  if (forwardedPort) headers["Gov-Client-Public-Port"] = forwardedPort;
  if (vendorPublicIp) headers["Gov-Vendor-Public-IP"] = vendorPublicIp;
  return headers;
}

async function loadVatAccessToken(supabase: any, tenantId: string, clientId: string) {
  const { data: credential, error } = await supabase.from("client_credentials").select("id,ciphertext,expires_at,metadata_json").eq("tenant_id",tenantId).eq("client_id",clientId).eq("provider","hmrc_vat").eq("credential_type","oauth2").maybeSingle();
  if (error || !credential) throw new Error("HMRC VAT is not connected for this client");
  let tokens = await decryptTokens(credential.ciphertext);
  const expiresAt = credential.expires_at ? new Date(credential.expires_at).getTime() : 0;
  if (expiresAt && expiresAt <= Date.now()+60_000) {
    if (!tokens.refresh_token) throw new Error("HMRC VAT authorisation has expired; reconnect the client");
    const refreshed = await refreshToken(tokens.refresh_token);
    tokens = { access_token: refreshed.access_token, refresh_token: refreshed.refresh_token || tokens.refresh_token, token_type: refreshed.token_type || tokens.token_type };
    const nextExpiry = refreshed.expires_in ? new Date(Date.now()+refreshed.expires_in*1000).toISOString() : null;
    await supabase.from("client_credentials").update({ ciphertext: await encryptTokens(tokens), expires_at: nextExpiry, metadata_json: { ...(credential.metadata_json||{}), refreshed_at:new Date().toISOString() } }).eq("id",credential.id);
  }
  if (!tokens.access_token) throw new Error("Stored HMRC VAT authorisation is invalid; reconnect the client");
  return String(tokens.access_token);
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
    const body = req.method !== "GET" ? await req.json() : {};
    const routePath = url.pathname.replace(/^\/hmrc\/?/, "");
    const path = routePath || String(body?.action || "");

    const authHeader = req.headers.get("Authorization");
    const jwt = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!jwt) return new Response(JSON.stringify({ error:"Authentication required" }), { status:401, headers:{...corsHeaders,"Content-Type":"application/json"} });
    const { data: authData, error: authError } = await supabase.auth.getUser(jwt);
    if (authError || !authData.user) return new Response(JSON.stringify({ error:"Invalid session" }), { status:401, headers:{...corsHeaders,"Content-Type":"application/json"} });
    const { data: callerProfile } = await supabase.from("profiles").select("tenant_id").eq("id",authData.user.id).single();
    const callerTenantId = callerProfile?.tenant_id;
    if (!callerTenantId) return new Response(JSON.stringify({ error:"No practice tenant is associated with this user" }), { status:403, headers:{...corsHeaders,"Content-Type":"application/json"} });
    if (body?.tenantId && body.tenantId !== callerTenantId) return new Response(JSON.stringify({ error:"Tenant access denied" }), { status:403, headers:{...corsHeaders,"Content-Type":"application/json"} });
    if (body?.clientId) {
      const { data: allowedClient } = await supabase.from("clients").select("id").eq("id",body.clientId).eq("tenant_id",callerTenantId).maybeSingle();
      if (!allowedClient) return new Response(JSON.stringify({ error:"Client access denied" }), { status:403, headers:{...corsHeaders,"Content-Type":"application/json"} });
    }

    // ── OAuth2: Get authorize URL ────────────────────
    if (path === "oauth/authorize-url" && req.method === "POST") {
      const clientId = String(body.clientId || "");
      const requestedScopes = Array.isArray(body.scopes) ? body.scopes.map(String) : ["read:vat","write:vat"];
      const allowedScopes = new Set(["read:vat","write:vat","read:self-assessment","write:self-assessment"]);
      if (!clientId || requestedScopes.some((scope:string)=>!allowedScopes.has(scope))) return new Response(JSON.stringify({ error:"A client and supported HMRC scopes are required" }), { status:400, headers:{...corsHeaders,"Content-Type":"application/json"} });
      const redirectUri = Deno.env.get("HMRC_REDIRECT_URI");
      if (!redirectUri) return new Response(JSON.stringify({ error:"HMRC_REDIRECT_URI is not configured" }), { status:503, headers:{...corsHeaders,"Content-Type":"application/json"} });
      const state = `${crypto.randomUUID()}-${crypto.randomUUID()}`;
      const { error: stateError } = await supabase.from("oauth_states").insert({ state_hash:await sha256(state), tenant_id:callerTenantId, client_id:clientId, provider:"hmrc", scopes:requestedScopes, redirect_uri:redirectUri, expires_at:new Date(Date.now()+600000).toISOString(), created_by_user_id:authData.user.id });
      if (stateError) throw new Error(`Unable to start HMRC authorisation: ${stateError.message}`);
      const authorizeUrl = buildAuthorizeUrl(redirectUri,state,requestedScopes);
      return new Response(JSON.stringify({ authorizeUrl, expiresIn:600 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── OAuth2: Exchange code AND store in client_credentials ──
    if (path === "oauth/exchange-and-store" && req.method === "POST") {
      const { code, state } = body;
      const tenantId = callerTenantId;
      if (!code || !state) {
        return new Response(JSON.stringify({ error: "code and state required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const stateHash = await sha256(String(state));
      const { data: oauthState } = await supabase.from("oauth_states").select("id,tenant_id,client_id,scopes,redirect_uri,expires_at,consumed_at,created_by_user_id").eq("state_hash",stateHash).maybeSingle();
      if (!oauthState || oauthState.tenant_id !== tenantId || oauthState.created_by_user_id !== authData.user.id || oauthState.consumed_at || new Date(oauthState.expires_at).getTime() <= Date.now()) return new Response(JSON.stringify({ error:"HMRC authorisation state is invalid or expired" }), { status:400, headers:{...corsHeaders,"Content-Type":"application/json"} });
      const { data: consumed } = await supabase.from("oauth_states").update({ consumed_at:new Date().toISOString() }).eq("id",oauthState.id).is("consumed_at",null).select("id").maybeSingle();
      if (!consumed) return new Response(JSON.stringify({ error:"HMRC authorisation state has already been used" }), { status:409, headers:{...corsHeaders,"Content-Type":"application/json"} });
      const clientId = oauthState.client_id;
      const scopes = oauthState.scopes;
      const tokens = await exchangeCode(String(code),oauthState.redirect_uri);

      // Store tokens in client_credentials (encrypted at rest by Supabase)
      const now = new Date().toISOString();
      const expiresAt = tokens.expires_in
        ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
        : null;

      // Determine provider based on scopes
      const scopeStr = tokens.scope || scopes.join(" ");
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
              ciphertext: await encryptTokens({
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
            { onConflict: "tenant_id,client_id,provider,credential_type" }
          );

        if (upsertErr) {
          console.error("Error storing HMRC credentials:", upsertErr);
          // Try insert if upsert fails (no unique constraint yet)
          await supabase.from("client_credentials").insert({
            tenant_id: tenantId,
            client_id: clientId,
            provider,
            credential_type: "oauth2",
            ciphertext: await encryptTokens({
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
        clientId,
        providers,
        scope: tokens.scope || scopeStr,
        expiresAt,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (path === "vat/status" && req.method === "POST") {
      const { count } = await supabase.from("client_credentials").select("id",{count:"exact",head:true}).eq("tenant_id",callerTenantId).eq("client_id",body.clientId).eq("provider","hmrc_vat").eq("credential_type","oauth2");
      return new Response(JSON.stringify({ connected:(count||0)>0, mode:isProductionHmrc()?"production":"sandbox" }), { headers:{...corsHeaders,"Content-Type":"application/json"} });
    }

    // ── MTD VAT: Pull and persist obligations ────────
    if ((path === "vat/obligations" || path === "vat/sync-obligations") && req.method === "POST") {
      if (isProductionHmrc() && Deno.env.get("HMRC_PRODUCTION_VALIDATED") !== "true") return new Response(JSON.stringify({ error:"HMRC production access is blocked until HMRC_PRODUCTION_VALIDATED=true after recognition testing" }), { status:503, headers:{...corsHeaders,"Content-Type":"application/json"} });
      const { clientId, from, to, fraudContext } = body;
      const { data: client } = await supabase.from("clients").select("id,vat_number").eq("id",clientId).eq("tenant_id",callerTenantId).maybeSingle();
      const vrn = client?.vat_number?.replace(/\s/g,"");
      if (!vrn) throw new Error("The client does not have a VAT registration number");
      const accessToken = await loadVatAccessToken(supabase,callerTenantId,clientId);
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const hmrcRes = await fetch(`${HMRC_BASE_URL}/organisations/vat/${vrn}/obligations?${params}`, {
        headers: { Authorization:`Bearer ${accessToken}`, Accept:"application/vnd.hmrc.1.0+json", ...buildFraudPreventionHeaders(req,{...(fraudContext||{}),userId:authData.user.id}) },
      });
      const data = await hmrcRes.json().catch(()=>({}));
      if (!hmrcRes.ok) return new Response(JSON.stringify({ error:hmrcError(data,`HMRC returned ${hmrcRes.status}`), status:hmrcRes.status }), { status:502, headers:{...corsHeaders,"Content-Type":"application/json"} });
      for (const obligation of data.obligations || []) {
        const { data: existing } = await supabase.from("vat_returns").select("id,status").eq("tenant_id",callerTenantId).eq("client_id",clientId).eq("period_key",obligation.periodKey).maybeSingle();
        const values = { period_start:obligation.start, period_end:obligation.end, due_date:obligation.due, hmrc_response_json:obligation, ...(obligation.status === "F" ? { status:"submitted", submitted_at:obligation.received || null } : {}) };
        if (existing) await supabase.from("vat_returns").update(values).eq("id",existing.id);
        else await supabase.from("vat_returns").insert({ tenant_id:callerTenantId, client_id:clientId, period_key:obligation.periodKey, ...values });
      }
      return new Response(JSON.stringify({ status:hmrcRes.status, obligations:data.obligations||[], mode:isProductionHmrc()?"production":"sandbox" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── MTD VAT: Submit a reviewed local return ──────
    if ((path === "vat/submit" || path === "vat/submit-return") && req.method === "POST") {
      if (isProductionHmrc() && Deno.env.get("HMRC_PRODUCTION_VALIDATED") !== "true") return new Response(JSON.stringify({ error:"HMRC production filing is blocked until HMRC_PRODUCTION_VALIDATED=true after recognition testing" }), { status:503, headers:{...corsHeaders,"Content-Type":"application/json"} });
      const { vatReturnId, declarationAccepted, fraudContext } = body;
      if (!vatReturnId || declarationAccepted !== true) return new Response(JSON.stringify({ error:"A VAT return and finalisation declaration are required" }), { status:400, headers:{...corsHeaders,"Content-Type":"application/json"} });
      const { data: vatReturn } = await supabase.from("vat_returns").select("*,clients(vat_number)").eq("id",vatReturnId).eq("tenant_id",callerTenantId).maybeSingle();
      if (!vatReturn) throw new Error("VAT return not found");
      if (!vatReturn.client_id || !vatReturn.period_key) throw new Error("Sync HMRC obligations before filing this return");
      if (vatReturn.status !== "ready") throw new Error("Only a reviewed return marked ready can be filed");
      const vrn = vatReturn.clients?.vat_number?.replace(/\s/g,"");
      if (!vrn) throw new Error("The client does not have a VAT registration number");
      const accessToken = await loadVatAccessToken(supabase,callerTenantId,vatReturn.client_id);
      const returnData = { box1:Number(vatReturn.box1),box2:Number(vatReturn.box2),box3:Number(vatReturn.box3),box4:Number(vatReturn.box4),box5:Number(vatReturn.box5),box6:Number(vatReturn.box6),box7:Number(vatReturn.box7),box8:Number(vatReturn.box8),box9:Number(vatReturn.box9) };
      const idempotencyKey = `vat:${vatReturn.id}:${vatReturn.updated_at}`;
      const { data: existingJob } = await supabase.from("submission_jobs").select("id,status,response_json,correlation_id,attempt_count").eq("tenant_id",callerTenantId).eq("idempotency_key",idempotencyKey).maybeSingle();
      if (existingJob?.status === "accepted") return new Response(JSON.stringify({ success:true,duplicate:true,job:existingJob }), { headers:{...corsHeaders,"Content-Type":"application/json"} });
      if (existingJob?.status === "sent" || existingJob?.status === "queued") return new Response(JSON.stringify({ error:"This VAT return already has a submission in progress",jobId:existingJob.id }), { status:409,headers:{...corsHeaders,"Content-Type":"application/json"} });
      const attemptNo = existingJob ? Number(existingJob.attempt_count||0)+1 : 1;
      const { data: job, error: jobError } = existingJob
        ? await supabase.from("submission_jobs").update({status:"sent",attempt_count:attemptNo,last_error:null}).eq("id",existingJob.id).select("id,status,response_json,correlation_id,attempt_count").single()
        : await supabase.from("submission_jobs").insert({tenant_id:callerTenantId,client_id:vatReturn.client_id,provider:"hmrc",submission_type:"VAT_RETURN",idempotency_key:idempotencyKey,status:"sent",request_json:{vat_return_id:vatReturn.id,period_key:vatReturn.period_key,return_data:returnData},attempt_count:attemptNo}).select("id,status,response_json,correlation_id,attempt_count").single();
      if (jobError || !job) throw new Error(jobError?.message || "Unable to create submission record");
      const startedAt = Date.now();
      const { data: attempt } = await supabase.from("submission_attempts").insert({job_id:job.id,attempt_no:attemptNo,status:"started",request_meta_redacted:{vat_return_id:vatReturn.id,period_key:vatReturn.period_key}}).select("id").single();
      const hmrcRes = await fetch(`${HMRC_BASE_URL}/organisations/vat/${vrn}/returns`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          Accept: "application/vnd.hmrc.1.0+json",
          ...buildFraudPreventionHeaders(req,{...(fraudContext||{}),userId:authData.user.id}),
        },
        body: JSON.stringify({
          periodKey: vatReturn.period_key,
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
      const data = await hmrcRes.json().catch(()=>({}));
      const accepted = hmrcRes.ok;
      const receipt = data.formBundleNumber || data.receiptID || null;
      await supabase.from("submission_jobs").update({status:accepted?"accepted":"rejected",response_json:data,correlation_id:receipt,last_error:accepted?null:hmrcError(data,`HMRC returned ${hmrcRes.status}`)}).eq("id",job.id);
      if (attempt?.id) await supabase.from("submission_attempts").update({status:accepted?"succeeded":"failed",finished_at:new Date().toISOString(),duration_ms:Date.now()-startedAt,http_status:hmrcRes.status,response_meta_redacted:{receipt,code:data.code||null},provider_code:data.code||null,provider_message:accepted?"Accepted":hmrcError(data,"Rejected")}).eq("id",attempt.id);
      await supabase.from("vat_returns").update({status:accepted?"submitted":"rejected",submitted_at:accepted?new Date().toISOString():null,hmrc_receipt:receipt,hmrc_response_json:data,submission_job_id:job.id,finalised_at:new Date().toISOString(),finalised_by_user_id:authData.user.id}).eq("id",vatReturn.id);
      await supabase.from("audit_log").insert({tenant_id:callerTenantId,user_id:authData.user.id,action:accepted?"vat.return.accepted":"vat.return.rejected",entity_name:"vat_returns",entity_id:vatReturn.id,after_json:{submission_job_id:job.id,http_status:hmrcRes.status,receipt}});
      return new Response(JSON.stringify({ success:accepted,status:hmrcRes.status,receipt,data,jobId:job.id }), {
        status: accepted ? 200 : 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (path.startsWith("rti/")) return new Response(JSON.stringify({ error:"RTI filing is not available: current-year HMRC schema and recognition testing are incomplete",recognitionReady:false }), { status:501,headers:{...corsHeaders,"Content-Type":"application/json"} });

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

    // ═══════════════════════════════════════════════════════════
    // Reset Credentials — clears HMRC secrets and tokens
    // ═══════════════════════════════════════════════════════════

    if ((path === "reset-credentials" || body?.action === "reset-credentials") && req.method === "POST") {
      const tenantId = callerTenantId;
      const { clientId } = body;

      if (tenantId) {
        const q = supabase
          .from("client_credentials")
          .delete()
          .eq("tenant_id", tenantId)
          .in("provider", ["hmrc", "hmrc_vat", "hmrc_sa", "hmrc_paye"]);
        if (clientId) q.eq("client_id", clientId);
        await q;
      }

      if (tenantId) {
        await supabase.from("audit_log").insert({
          tenant_id: tenantId,
          action: "integration.reset",
          entity_name: "hmrc",
          entity_id: tenantId,
        });
      }

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
