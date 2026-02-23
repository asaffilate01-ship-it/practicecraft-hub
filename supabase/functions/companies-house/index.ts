import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.224.0/crypto/mod.ts";
import { encodeHex } from "https://deno.land/std@0.224.0/encoding/hex.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CH_REST_BASE = "https://api.company-information.service.gov.uk";
const CH_XML_GW = "https://xmlgw.companieshouse.gov.uk/v1-0/xmlgw/Gateway";

// ── Helpers ──────────────────────────────────────────────────

function restAuth(apiKey: string) {
  return { Authorization: `Basic ${btoa(apiKey + ":")}` };
}

/** CHMD5 authentication: MD5(presenterId + presenterAuth) */
async function chmd5(presenterId: string, presenterAuth: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(presenterId + presenterAuth);
  const hash = await crypto.subtle.digest("MD5", data);
  return encodeHex(new Uint8Array(hash));
}

/** Build GovTalk envelope around a body XML string */
function govTalkEnvelope(opts: {
  classType: string;
  qualifier: string;
  transactionId: string;
  presenterId: string;
  authValue: string;
  testFlag?: boolean;
  bodyXml: string;
}): string {
  const testElement = opts.testFlag ? `<ChannelRouting><Channel><URI>Test</URI></Channel></ChannelRouting>` : "";
  return `<?xml version="1.0" encoding="UTF-8"?>
<GovTalkMessage xmlns="http://www.govtalk.gov.uk/CM/envelope"
  xmlns:dsig="http://www.w3.org/2000/09/xmldsig#"
  xmlns:gt="http://www.govtalk.gov.uk/schemas/govtalk/core">
  <EnvelopeVersion>2.0</EnvelopeVersion>
  <Header>
    <MessageDetails>
      <Class>${opts.classType}</Class>
      <Qualifier>${opts.qualifier}</Qualifier>
      <TransactionID>${opts.transactionId}</TransactionID>
    </MessageDetails>
    <SenderDetails>
      <IDAuthentication>
        <SenderID>${opts.presenterId}</SenderID>
        <Authentication>
          <Method>CHMD5</Method>
          <Value>${opts.authValue}</Value>
        </Authentication>
      </IDAuthentication>
    </SenderDetails>
  </Header>
  <GovTalkDetails>
    <Keys/>
    ${testElement}
  </GovTalkDetails>
  <Body>
    ${opts.bodyXml}
  </Body>
</GovTalkMessage>`;
}

/** Build a GetSubmissionStatus request envelope */
function statusEnvelope(opts: {
  presenterId: string;
  authValue: string;
  transactionId: string;
}): string {
  return govTalkEnvelope({
    classType: "GetSubmissionStatus",
    qualifier: "poll",
    transactionId: opts.transactionId,
    presenterId: opts.presenterId,
    authValue: opts.authValue,
    bodyXml: "",
  });
}

// ── Filing Body Builders ─────────────────────────────────────

function escXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function addressXml(addr: Record<string, string>, ns = ""): string {
  const prefix = ns ? `${ns}:` : "";
  const lines: string[] = [];
  if (addr.premises) lines.push(`<${prefix}Premise>${escXml(addr.premises)}</${prefix}Premise>`);
  if (addr.addressLine1) lines.push(`<${prefix}AddressLine>${escXml(addr.addressLine1)}</${prefix}AddressLine>`);
  if (addr.addressLine2) lines.push(`<${prefix}AddressLine>${escXml(addr.addressLine2)}</${prefix}AddressLine>`);
  if (addr.postTown) lines.push(`<${prefix}PostTown>${escXml(addr.postTown)}</${prefix}PostTown>`);
  if (addr.postcode) lines.push(`<${prefix}Postcode>${escXml(addr.postcode)}</${prefix}Postcode>`);
  if (addr.county) lines.push(`<${prefix}County>${escXml(addr.county)}</${prefix}County>`);
  if (addr.country) lines.push(`<${prefix}Country>${escXml(addr.country)}</${prefix}Country>`);
  return lines.join("\n");
}

/** CS01 - Confirmation Statement */
function buildCS01Body(payload: {
  companyNumber: string;
  companyName: string;
  companyAuthCode: string;
  statementDate: string;
  confirmations?: Record<string, boolean>;
}): string {
  return `<ConfirmationStatement xmlns="http://xmlgw.companieshouse.gov.uk/v1-0/schema"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
    <CompanyNumber>${escXml(payload.companyNumber)}</CompanyNumber>
    <CompanyName>${escXml(payload.companyName)}</CompanyName>
    <CompanyAuthCode>${escXml(payload.companyAuthCode)}</CompanyAuthCode>
    <MadeUpDate>${escXml(payload.statementDate)}</MadeUpDate>
    <StatementOfCapital>
      <NoUpdate/>
    </StatementOfCapital>
    <SICCodes>
      <NoUpdate/>
    </SICCodes>
    <ShareholderInformation>
      <NoUpdate/>
    </ShareholderInformation>
    <PSCInformation>
      <NoUpdate/>
    </PSCInformation>
  </ConfirmationStatement>`;
}

/** AD01 - Change of Registered Office */
function buildAD01Body(payload: {
  companyNumber: string;
  companyName: string;
  companyAuthCode: string;
  newAddress: Record<string, string>;
}): string {
  return `<ChangeRegisteredOffice xmlns="http://xmlgw.companieshouse.gov.uk/v1-0/schema"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
    <CompanyNumber>${escXml(payload.companyNumber)}</CompanyNumber>
    <CompanyName>${escXml(payload.companyName)}</CompanyName>
    <CompanyAuthCode>${escXml(payload.companyAuthCode)}</CompanyAuthCode>
    <RegisteredOfficeAddress>
      ${addressXml(payload.newAddress)}
    </RegisteredOfficeAddress>
  </ChangeRegisteredOffice>`;
}

/** AP01 - Appoint Director */
function buildAP01Body(payload: {
  companyNumber: string;
  companyName: string;
  companyAuthCode: string;
  appointmentDate: string;
  person: {
    title?: string;
    forename: string;
    surname: string;
    dateOfBirth: string;
    nationality: string;
    occupation: string;
    serviceAddress: Record<string, string>;
    residentialAddress?: Record<string, string>;
    consentToAct: boolean;
  };
}): string {
  const p = payload.person;
  const titleEl = p.title ? `<Title>${escXml(p.title)}</Title>` : "";
  const residentialXml = p.residentialAddress
    ? `<ResidentialAddress>${addressXml(p.residentialAddress)}</ResidentialAddress>`
    : `<ResidentialAddress><SameAsServiceAddress/></ResidentialAddress>`;

  return `<AppointDirector xmlns="http://xmlgw.companieshouse.gov.uk/v1-0/schema"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
    <CompanyNumber>${escXml(payload.companyNumber)}</CompanyNumber>
    <CompanyName>${escXml(payload.companyName)}</CompanyName>
    <CompanyAuthCode>${escXml(payload.companyAuthCode)}</CompanyAuthCode>
    <Appointment>
      <Person>
        ${titleEl}
        <Forename>${escXml(p.forename)}</Forename>
        <Surname>${escXml(p.surname)}</Surname>
      </Person>
      <DateOfBirth>${escXml(p.dateOfBirth)}</DateOfBirth>
      <Nationality>${escXml(p.nationality)}</Nationality>
      <Occupation>${escXml(p.occupation)}</Occupation>
      <ServiceAddress>
        ${addressXml(p.serviceAddress)}
      </ServiceAddress>
      ${residentialXml}
      <AppointmentDate>${escXml(payload.appointmentDate)}</AppointmentDate>
      <ConsentToAct>${p.consentToAct ? "1" : "0"}</ConsentToAct>
    </Appointment>
  </AppointDirector>`;
}

/** TM01 - Terminate Director */
function buildTM01Body(payload: {
  companyNumber: string;
  companyName: string;
  companyAuthCode: string;
  terminationDate: string;
  person: {
    forename: string;
    surname: string;
    dateOfBirth: string;
  };
}): string {
  const p = payload.person;
  return `<TerminateDirector xmlns="http://xmlgw.companieshouse.gov.uk/v1-0/schema"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
    <CompanyNumber>${escXml(payload.companyNumber)}</CompanyNumber>
    <CompanyName>${escXml(payload.companyName)}</CompanyName>
    <CompanyAuthCode>${escXml(payload.companyAuthCode)}</CompanyAuthCode>
    <Resignation>
      <Person>
        <Forename>${escXml(p.forename)}</Forename>
        <Surname>${escXml(p.surname)}</Surname>
      </Person>
      <DateOfBirth>${escXml(p.dateOfBirth)}</DateOfBirth>
      <ResignationDate>${escXml(payload.terminationDate)}</ResignationDate>
    </Resignation>
  </TerminateDirector>`;
}

// Map filing types to class names and body builders
const FILING_BUILDERS: Record<string, { classType: string; build: (p: any) => string }> = {
  CS01: { classType: "ConfirmationStatement", build: buildCS01Body },
  AD01: { classType: "ChangeRegisteredOffice", build: buildAD01Body },
  AP01: { classType: "AppointDirector", build: buildAP01Body },
  TM01: { classType: "TerminateDirector", build: buildTM01Body },
};

// ── XML Response Parser ──────────────────────────────────────

function extractTag(xml: string, tag: string): string | null {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i");
  const m = xml.match(re);
  return m ? m[1].trim() : null;
}

function parseGatewayResponse(xml: string): {
  qualifier: string | null;
  transactionId: string | null;
  errors: string[];
  gatewayTimestamp: string | null;
} {
  const qualifier = extractTag(xml, "Qualifier");
  const transactionId = extractTag(xml, "TransactionID");
  const gatewayTimestamp = extractTag(xml, "GatewayTimestamp");
  const errors: string[] = [];

  // Extract all error texts
  const errorRegex = /<Text[^>]*>([\s\S]*?)<\/Text>/gi;
  let match;
  while ((match = errorRegex.exec(xml)) !== null) {
    errors.push(match[1].trim());
  }

  return { qualifier, transactionId, errors, gatewayTimestamp };
}

// ── Main Handler ─────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const chApiKey = Deno.env.get("CH_API_KEY");
    const presenterId = Deno.env.get("CH_PRESENTER_ID");
    const presenterAuth = Deno.env.get("CH_PRESENTER_AUTH");

    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/companies-house\/?/, "");
    const body = req.method !== "GET" ? await req.json() : {};

    // ═══════════════════════════════════════════════════════════
    // REST API Endpoints (unchanged — use CH_API_KEY)
    // ═══════════════════════════════════════════════════════════

    // ── Search Companies ─────────────────────────────
    if (path === "search" && req.method === "POST") {
      const { query } = body;
      if (!chApiKey) {
        return json({ error: "CH_API_KEY not configured" }, 400);
      }
      const res = await fetch(
        `${CH_REST_BASE}/search/companies?q=${encodeURIComponent(query)}&items_per_page=10`,
        { headers: restAuth(chApiKey) }
      );
      const data = await res.json();
      return json(data);
    }

    // ── Get Company Profile ──────────────────────────
    if (path === "profile" && req.method === "POST") {
      const { companyNumber } = body;
      if (!chApiKey) return json({ error: "CH_API_KEY not configured" }, 400);
      const res = await fetch(`${CH_REST_BASE}/company/${companyNumber}`, {
        headers: restAuth(chApiKey),
      });
      return json(await res.json());
    }

    // ── Get Officers ─────────────────────────────────
    if (path === "officers" && req.method === "POST") {
      const { companyNumber } = body;
      if (!chApiKey) return json({ error: "CH_API_KEY not configured" }, 400);
      const res = await fetch(`${CH_REST_BASE}/company/${companyNumber}/officers`, {
        headers: restAuth(chApiKey),
      });
      return json(await res.json());
    }

    // ── Get PSCs ─────────────────────────────────────
    if (path === "psc" && req.method === "POST") {
      const { companyNumber } = body;
      if (!chApiKey) return json({ error: "CH_API_KEY not configured" }, 400);
      const res = await fetch(
        `${CH_REST_BASE}/company/${companyNumber}/persons-with-significant-control`,
        { headers: restAuth(chApiKey) }
      );
      return json(await res.json());
    }

    // ── Filing History ───────────────────────────────
    if (path === "filing-history" && req.method === "POST") {
      const { companyNumber } = body;
      if (!chApiKey) return json({ error: "CH_API_KEY not configured" }, 400);
      const res = await fetch(
        `${CH_REST_BASE}/company/${companyNumber}/filing-history?items_per_page=25`,
        { headers: restAuth(chApiKey) }
      );
      return json(await res.json());
    }

    // ═══════════════════════════════════════════════════════════
    // XML Gateway Filing (live with presenter credentials)
    // ═══════════════════════════════════════════════════════════

    if (path === "file" && req.method === "POST") {
      if (!presenterId || !presenterAuth) {
        return json({ error: "CH_PRESENTER_ID and CH_PRESENTER_AUTH secrets required for filing" }, 400);
      }

      const { filingType, companyNumber, companyName, companyAuthCode, payload, clientId, tenantId, test } = body;

      if (!filingType || !companyNumber || !companyAuthCode) {
        return json({ error: "filingType, companyNumber, and companyAuthCode are required" }, 400);
      }

      const builder = FILING_BUILDERS[filingType];
      if (!builder) {
        return json({
          error: `Unsupported filing type: ${filingType}`,
          supported: Object.keys(FILING_BUILDERS),
        }, 400);
      }

      // Generate unique transaction ID
      const txId = `${filingType}-${companyNumber}-${Date.now()}`;

      // Build body XML
      const bodyXml = builder.build({
        companyNumber,
        companyName: companyName || companyNumber,
        companyAuthCode,
        ...payload,
      });

      // Compute CHMD5 auth
      const authValue = await chmd5(presenterId, presenterAuth);

      // Build full envelope
      const envelope = govTalkEnvelope({
        classType: builder.classType,
        qualifier: "request",
        transactionId: txId,
        presenterId,
        authValue,
        testFlag: test === true,
        bodyXml,
      });

      console.log(`[CH XML] Submitting ${filingType} for ${companyNumber}, txId=${txId}`);

      // Submit to Companies House
      const chRes = await fetch(CH_XML_GW, {
        method: "POST",
        headers: { "Content-Type": "text/xml" },
        body: envelope,
      });

      const responseXml = await chRes.text();
      const parsed = parseGatewayResponse(responseXml);

      console.log(`[CH XML] Response: qualifier=${parsed.qualifier}, errors=${parsed.errors.length}`);

      // Determine status
      let status = "pending";
      if (parsed.errors.length > 0) {
        status = "rejected";
      } else if (parsed.qualifier === "acknowledgement") {
        status = "submitted";
      } else if (parsed.qualifier === "error") {
        status = "rejected";
      }

      // Store in ch_filings if tenantId and clientId provided
      let filingId: string | null = null;
      if (tenantId && clientId) {
        const { data: filing, error: insertErr } = await supabase
          .from("ch_filings")
          .insert({
            tenant_id: tenantId,
            client_id: clientId,
            filing_type: filingType,
            filing_description: `${filingType} for ${companyNumber}`,
            status,
            ch_transaction_id: parsed.transactionId || txId,
            request_json: { envelope_class: builder.classType, transaction_id: txId, payload },
            response_json: {
              qualifier: parsed.qualifier,
              gateway_timestamp: parsed.gatewayTimestamp,
              errors: parsed.errors,
              raw_truncated: responseXml.substring(0, 2000),
            },
            submitted_at: new Date().toISOString(),
            rejected_reason: parsed.errors.length > 0 ? parsed.errors.join("; ") : null,
          })
          .select("id")
          .single();

        if (!insertErr && filing) {
          filingId = filing.id;
        }
      }

      return json({
        status,
        transactionId: parsed.transactionId || txId,
        filingId,
        qualifier: parsed.qualifier,
        errors: parsed.errors,
        gatewayTimestamp: parsed.gatewayTimestamp,
      });
    }

    // ═══════════════════════════════════════════════════════════
    // Poll Submission Status
    // ═══════════════════════════════════════════════════════════

    if (path === "poll" && req.method === "POST") {
      if (!presenterId || !presenterAuth) {
        return json({ error: "CH_PRESENTER_ID and CH_PRESENTER_AUTH secrets required" }, 400);
      }

      const { transactionId } = body;
      if (!transactionId) {
        return json({ error: "transactionId is required" }, 400);
      }

      const authValue = await chmd5(presenterId, presenterAuth);
      const envelope = statusEnvelope({
        presenterId,
        authValue,
        transactionId,
      });

      const chRes = await fetch(CH_XML_GW, {
        method: "POST",
        headers: { "Content-Type": "text/xml" },
        body: envelope,
      });

      const responseXml = await chRes.text();
      const parsed = parseGatewayResponse(responseXml);

      // Extract barcode if present in accepted response
      const barcode = extractTag(responseXml, "Barcode");

      // If we have an accepted filing, try to update ch_filings
      if (parsed.qualifier === "response" && barcode) {
        await supabase
          .from("ch_filings")
          .update({
            status: "accepted",
            ch_barcode: barcode,
            accepted_at: new Date().toISOString(),
          })
          .eq("ch_transaction_id", transactionId);
      } else if (parsed.errors.length > 0) {
        await supabase
          .from("ch_filings")
          .update({
            status: "rejected",
            rejected_reason: parsed.errors.join("; "),
          })
          .eq("ch_transaction_id", transactionId);
      }

      return json({
        transactionId,
        qualifier: parsed.qualifier,
        barcode,
        errors: parsed.errors,
        gatewayTimestamp: parsed.gatewayTimestamp,
      });
    }

    // ═══════════════════════════════════════════════════════════
    // Build Preview (dry run — returns XML without submitting)
    // ═══════════════════════════════════════════════════════════

    if (path === "preview" && req.method === "POST") {
      if (!presenterId || !presenterAuth) {
        return json({ error: "CH_PRESENTER_ID and CH_PRESENTER_AUTH secrets required" }, 400);
      }

      const { filingType, companyNumber, companyName, companyAuthCode, payload } = body;
      const builder = FILING_BUILDERS[filingType];
      if (!builder) {
        return json({ error: `Unsupported: ${filingType}`, supported: Object.keys(FILING_BUILDERS) }, 400);
      }

      const txId = `PREVIEW-${filingType}-${Date.now()}`;
      const bodyXml = builder.build({
        companyNumber,
        companyName: companyName || companyNumber,
        companyAuthCode,
        ...payload,
      });

      const authValue = await chmd5(presenterId, presenterAuth);
      const envelope = govTalkEnvelope({
        classType: builder.classType,
        qualifier: "request",
        transactionId: txId,
        presenterId,
        authValue,
        testFlag: true,
        bodyXml,
      });

      return new Response(envelope, {
        headers: { ...corsHeaders, "Content-Type": "text/xml" },
      });
    }

    // ═══════════════════════════════════════════════════════════
    // Reset Credentials — clears stored CH secrets for a tenant
    // ═══════════════════════════════════════════════════════════

    if ((path === "reset-credentials" || body?.action === "reset-credentials") && req.method === "POST") {
      const { tenantId, clientId } = body;

      // Clear client_credentials entries for CH
      if (tenantId) {
        const q = supabase
          .from("client_credentials")
          .delete()
          .eq("tenant_id", tenantId)
          .eq("provider", "companies_house");
        if (clientId) q.eq("client_id", clientId);
        await q;
      }

      // Log the reset
      if (tenantId) {
        await supabase.from("audit_log").insert({
          tenant_id: tenantId,
          action: "integration.reset",
          entity_name: "companies_house",
          entity_id: tenantId,
        });
      }

      return json({ ok: true });
    }

    // ═══════════════════════════════════════════════════════════
    // Integration Status — returns masked view of CH config
    // ═══════════════════════════════════════════════════════════

    if ((path === "integration-status" || body?.action === "integration-status") && req.method === "POST") {
      return json({
        companiesHouse: {
          enabled: !!chApiKey,
          presenterId: presenterId || null,
          email: null,
          apiKey: chApiKey ? "***" : "",
        },
      });
    }

    return json({ error: "Unknown Companies House endpoint", path }, 404);
  } catch (error) {
    console.error("Companies House function error:", error);
    return json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      500
    );
  }
});

// ── Response helper ──────────────────────────────────────────

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
