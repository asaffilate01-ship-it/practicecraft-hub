import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ─── VALIDATION ENGINE ───
interface ValidationIssue {
  field: string;
  message: string;
  severity: "error" | "warning";
}

const UK_POSTCODE_RE = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i;
const AUTH_CODE_RE = /^[A-Za-z0-9]{6}$/;

function validateAddress(addr: Record<string, unknown>, prefix: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!addr?.address_line1 && !addr?.line1) issues.push({ field: `${prefix}.line1`, message: "Address line 1 is required", severity: "error" });
  if (!addr?.city && !addr?.post_town) issues.push({ field: `${prefix}.city`, message: "Post town / city is required", severity: "error" });
  if (!addr?.postcode) issues.push({ field: `${prefix}.postcode`, message: "Postcode is required", severity: "error" });
  const pc = (addr?.postcode as string) || "";
  const country = ((addr?.country as string) || "").toLowerCase();
  if (pc && (country === "uk" || country === "england" || country === "wales" || country === "scotland" || country === "northern ireland" || !country)) {
    if (!UK_POSTCODE_RE.test(pc)) issues.push({ field: `${prefix}.postcode`, message: "Invalid UK postcode format", severity: "error" });
  }
  return issues;
}

function validateChangePayload(
  changeType: string,
  payload: Record<string, unknown>,
  context: {
    authCodeStored: boolean;
    companyStatus?: string;
    activeDirectors: number;
    activePscs: number;
    hasRO: boolean;
    hasSicCodes: boolean;
    pendingChanges: number;
    lastSyncDaysAgo: number | null;
  }
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Universal auth code check
  if (!context.authCodeStored) {
    issues.push({ field: "authCode", message: "Companies House auth code not stored for this client", severity: "error" });
  }

  // Company must be active
  if (context.companyStatus && context.companyStatus !== "active") {
    issues.push({ field: "companyStatus", message: `Company status is "${context.companyStatus}" — filing may be blocked`, severity: "error" });
  }

  switch (changeType) {
    case "CONFIRMATION_STATEMENT": {
      if (context.activeDirectors === 0) issues.push({ field: "directors", message: "At least 1 active director is required", severity: "error" });
      if (context.activePscs === 0) issues.push({ field: "psc", message: "PSC register is empty — a PSC statement or entry is required", severity: "error" });
      if (!context.hasRO) issues.push({ field: "registeredOffice", message: "Registered office address is required", severity: "error" });
      if (context.pendingChanges > 0) issues.push({ field: "pendingChanges", message: `${context.pendingChanges} pending change(s) must be resolved before filing CS`, severity: "error" });
      if (!context.hasSicCodes) issues.push({ field: "sicCodes", message: "SIC codes are empty", severity: "warning" });
      if (context.lastSyncDaysAgo !== null && context.lastSyncDaysAgo > 14) issues.push({ field: "sync", message: `Last CH sync was ${context.lastSyncDaysAgo} days ago — consider syncing first`, severity: "warning" });
      break;
    }
    case "CHANGE_REGISTERED_OFFICE": {
      const addr = (payload.address || payload.newAddress || {}) as Record<string, unknown>;
      issues.push(...validateAddress(addr, "address"));
      break;
    }
    case "CHANGE_SAIL_ADDRESS": {
      const addr = (payload.address || payload.sailAddress || {}) as Record<string, unknown>;
      issues.push(...validateAddress(addr, "sailAddress"));
      break;
    }
    case "APPOINT_DIRECTOR": {
      if (!payload.fullName) issues.push({ field: "fullName", message: "Full name is required", severity: "error" });
      if (!payload.appointmentDate) issues.push({ field: "appointmentDate", message: "Appointment date is required", severity: "error" });
      if (payload.appointmentDate && new Date(payload.appointmentDate as string) > new Date()) {
        issues.push({ field: "appointmentDate", message: "Appointment date cannot be in the future", severity: "error" });
      }
      if (!payload.dateOfBirth) issues.push({ field: "dateOfBirth", message: "Date of birth is required", severity: "error" });
      const sAddr = (payload.serviceAddress || {}) as Record<string, unknown>;
      issues.push(...validateAddress(sAddr, "serviceAddress"));
      if (!payload.residentialAddress) issues.push({ field: "residentialAddress", message: "Residential address is missing (recommended for compliance)", severity: "warning" });
      break;
    }
    case "RESIGN_DIRECTOR": {
      if (!payload.directorId) issues.push({ field: "directorId", message: "Director must be selected", severity: "error" });
      if (!payload.resignationDate) issues.push({ field: "resignationDate", message: "Resignation date is required", severity: "error" });
      if (payload.resignationDate && payload.appointmentDate && new Date(payload.resignationDate as string) < new Date(payload.appointmentDate as string)) {
        issues.push({ field: "resignationDate", message: "Resignation date cannot be before appointment date", severity: "error" });
      }
      if (payload.resignationDate && new Date(payload.resignationDate as string) > new Date()) {
        issues.push({ field: "resignationDate", message: "Resignation date is in the future", severity: "error" });
      }
      break;
    }
    case "PSC_CHANGE": {
      if (!payload.name && !payload.fullName) issues.push({ field: "name", message: "PSC name is required", severity: "error" });
      const noc = payload.naturesOfControl as string[] | undefined;
      if (!noc || noc.length === 0) issues.push({ field: "naturesOfControl", message: "At least one nature of control must be specified", severity: "error" });
      if (!payload.notifiedDate) issues.push({ field: "notifiedDate", message: "Notified date is required", severity: "error" });
      if (!payload.dateOfBirth) issues.push({ field: "dateOfBirth", message: "Date of birth is missing for individual PSC", severity: "warning" });
      break;
    }
    case "SIC_CHANGE": {
      const codes = payload.sicCodes as string[] | undefined;
      if (!codes || codes.length === 0) issues.push({ field: "sicCodes", message: "At least one SIC code is required", severity: "error" });
      if (codes) {
        for (const code of codes) {
          if (!/^\d{5}$/.test(code.trim())) issues.push({ field: "sicCodes", message: `Invalid SIC code format: "${code}" (must be 5 digits)`, severity: "error" });
        }
      }
      break;
    }
    case "ALLOT_SHARES": {
      if (!payload.shareClassId) issues.push({ field: "shareClassId", message: "Share class is required", severity: "error" });
      if (!payload.toMemberId && !payload.subscriberName) issues.push({ field: "subscriber", message: "Subscriber / member is required", severity: "error" });
      const qty = Number(payload.quantity);
      if (!qty || qty <= 0) issues.push({ field: "quantity", message: "Quantity must be greater than 0", severity: "error" });
      if (!payload.txDate) issues.push({ field: "txDate", message: "Transaction date is required", severity: "error" });
      if (!payload.considerationPence && payload.considerationPence !== 0) issues.push({ field: "consideration", message: "Consideration amount is missing", severity: "warning" });
      break;
    }
    case "TRANSFER_SHARES": {
      if (!payload.fromMemberId) issues.push({ field: "fromMember", message: "Transferor (from member) is required", severity: "error" });
      if (!payload.toMemberId) issues.push({ field: "toMember", message: "Transferee (to member) is required", severity: "error" });
      const tQty = Number(payload.quantity);
      if (!tQty || tQty <= 0) issues.push({ field: "quantity", message: "Quantity must be greater than 0", severity: "error" });
      if (!payload.txDate) issues.push({ field: "txDate", message: "Transaction date is required", severity: "error" });
      break;
    }
  }

  return issues;
}

// Filing route determination
function getFilingRoute(changeType: string): "api_filing" | "xml_gateway" {
  switch (changeType) {
    case "CONFIRMATION_STATEMENT":
    case "CHANGE_REGISTERED_OFFICE":
    case "PSC_CHANGE":
      return "api_filing";
    default:
      return "xml_gateway";
  }
}

// Idempotency key builder
function buildIdempotencyKey(tenantId: string, clientId: string, changeType: string, changeId: string): string {
  return `ch:${tenantId}:${clientId}:${changeType}:${changeId}:v1`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header");

    const supabase = createClient(supabaseUrl, supabaseKey);
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", user.id)
      .single();
    if (!profile?.tenant_id) throw new Error("No tenant");

    const tenantId = profile.tenant_id;
    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/secretarial\/?/, "");
    const segments = path.split("/").filter(Boolean);

    function requireClientId(): string {
      const clientId = url.searchParams.get("clientId");
      if (!clientId) throw new Error("clientId required");
      return clientId;
    }

    // ─── SUMMARY ───
    if (req.method === "GET" && segments[0] === "summary") {
      const clientId = requireClientId();

      const [companyRes, changesRes, filingsRes, csRes, healthRes] = await Promise.all([
        supabase.from("company_profiles").select("*").eq("tenant_id", tenantId).eq("client_id", clientId).maybeSingle(),
        supabase.from("secretarial_changes").select("id, change_type, status, title, updated_at")
          .eq("tenant_id", tenantId).eq("client_id", clientId)
          .order("updated_at", { ascending: false }).limit(20),
        supabase.from("ch_filings").select("id, filing_type, status, submitted_at, accepted_at")
          .eq("tenant_id", tenantId).eq("client_id", clientId)
          .order("created_at", { ascending: false }).limit(20),
        supabase.from("confirmation_statement_cycles").select("*")
          .eq("tenant_id", tenantId).eq("client_id", clientId)
          .order("due_date", { ascending: false }).limit(5),
        supabase.from("v_company_register_health").select("*")
          .eq("tenant_id", tenantId).eq("client_id", clientId).maybeSingle(),
      ]);

      const { data: authCodeCred } = await supabase.from("client_credentials")
        .select("id")
        .eq("tenant_id", tenantId).eq("client_id", clientId)
        .eq("provider", "companies_house").eq("credential_type", "auth_code")
        .maybeSingle();

      return json({
        company: companyRes.data,
        recentChanges: changesRes.data || [],
        recentFilings: filingsRes.data || [],
        confirmationStatements: csRes.data || [],
        registerHealth: healthRes.data || null,
        authCodeStored: !!authCodeCred,
      });
    }

    // ─── REGISTERS: DIRECTORS ───
    if (req.method === "GET" && segments[0] === "registers" && segments[1] === "directors") {
      const clientId = requireClientId();
      const { data, error } = await supabase.from("company_register_directors")
        .select("*").eq("tenant_id", tenantId).eq("client_id", clientId)
        .order("appointed_on", { ascending: false });
      if (error) throw error;
      return json(data);
    }

    if (req.method === "POST" && segments[0] === "registers" && segments[1] === "directors") {
      const body = await req.json();
      const clientId = body.clientId;
      if (!clientId) throw new Error("clientId required");

      const { data, error } = await supabase.from("company_register_directors").insert({
        tenant_id: tenantId,
        client_id: clientId,
        full_name: body.fullName,
        date_of_birth: body.dateOfBirth || null,
        nationality: body.nationality || null,
        occupation: body.occupation || null,
        service_address_json: body.serviceAddress || {},
        residential_address_json: body.residentialAddress || {},
        appointed_on: body.appointmentDate || null,
        ch_officer_id: body.chOfficerId || null,
      }).select().single();
      if (error) throw error;

      await supabase.from("secretarial_changes").insert({
        tenant_id: tenantId,
        client_id: clientId,
        change_type: "APPOINT_DIRECTOR",
        title: `Appoint director: ${body.fullName}`,
        payload_json: { directorId: data.id, fullName: body.fullName, ...body },
        created_by_user_id: user.id,
      });

      return json(data, 201);
    }

    // ─── REGISTERS: PSC ───
    if (req.method === "GET" && segments[0] === "registers" && segments[1] === "psc") {
      const clientId = requireClientId();
      const { data, error } = await supabase.from("company_register_psc")
        .select("*").eq("tenant_id", tenantId).eq("client_id", clientId)
        .order("notified_on", { ascending: false });
      if (error) throw error;
      return json(data);
    }

    // ─── REGISTERS: MEMBERS ───
    if (req.method === "GET" && segments[0] === "registers" && segments[1] === "members") {
      const clientId = requireClientId();
      const { data, error } = await supabase.from("company_register_members")
        .select("*").eq("tenant_id", tenantId).eq("client_id", clientId);
      if (error) throw error;
      return json(data);
    }

    // ─── SHARE CLASSES ───
    if (req.method === "GET" && segments[0] === "share-classes") {
      const clientId = requireClientId();
      const { data, error } = await supabase.from("share_classes")
        .select("*").eq("tenant_id", tenantId).eq("client_id", clientId);
      if (error) throw error;
      return json(data);
    }

    // ─── SHARE TRANSACTIONS ───
    if (req.method === "GET" && segments[0] === "share-transactions") {
      const clientId = requireClientId();
      const { data, error } = await supabase.from("share_transactions")
        .select("*, share_classes(class_name)")
        .eq("tenant_id", tenantId).eq("client_id", clientId)
        .order("tx_date", { ascending: false });
      if (error) throw error;
      return json(data);
    }

    if (req.method === "POST" && segments[0] === "share-transactions") {
      const body = await req.json();
      if (!body.clientId) throw new Error("clientId required");

      const { data, error } = await supabase.from("share_transactions").insert({
        tenant_id: tenantId,
        client_id: body.clientId,
        tx_type: body.txType,
        tx_date: body.txDate,
        share_class_id: body.shareClassId || null,
        from_member_id: body.fromMemberId || null,
        to_member_id: body.toMemberId || null,
        quantity: body.quantity || 0,
        consideration_pence: body.considerationPence || null,
        notes: body.notes || null,
        created_by_user_id: user.id,
      }).select().single();
      if (error) throw error;

      const changeType = body.txType === "ALLOTMENT" ? "ALLOT_SHARES" : "TRANSFER_SHARES";
      await supabase.from("secretarial_changes").insert({
        tenant_id: tenantId,
        client_id: body.clientId,
        change_type: changeType,
        title: `${body.txType}: ${body.quantity} shares`,
        payload_json: { transactionId: data.id, txType: body.txType, quantity: body.quantity },
        created_by_user_id: user.id,
      });

      return json(data, 201);
    }

    // ─── AUTH CODE ───
    if (req.method === "POST" && segments[0] === "auth-code") {
      const body = await req.json();
      const { clientId, authCode } = body;
      if (!clientId || !authCode) throw new Error("clientId and authCode required");

      // Validate auth code format
      if (!AUTH_CODE_RE.test(authCode)) {
        return json({ error: "Auth code must be exactly 6 alphanumeric characters" }, 400);
      }

      const { data: existing } = await supabase.from("client_credentials")
        .select("id")
        .eq("tenant_id", tenantId).eq("client_id", clientId)
        .eq("provider", "companies_house").eq("credential_type", "auth_code")
        .maybeSingle();

      if (existing) {
        await supabase.from("client_credentials")
          .update({ ciphertext: authCode, updated_at: new Date().toISOString() })
          .eq("id", existing.id);
      } else {
        await supabase.from("client_credentials").insert({
          tenant_id: tenantId, client_id: clientId,
          provider: "companies_house", credential_type: "auth_code",
          ciphertext: authCode,
        });
      }

      await supabase.from("event_logs").insert({
        tenant_id: tenantId, event_type: "ch_auth_code_updated",
        source: "user", actor_user_id: user.id, client_id: clientId,
        payload_json: {},
      });

      return json({ success: true });
    }

    // ─── CHANGES: LIST ───
    if (req.method === "GET" && segments[0] === "changes" && segments.length === 1) {
      const clientId = url.searchParams.get("clientId");
      const status = url.searchParams.get("status");

      let query = supabase.from("secretarial_changes").select("*")
        .eq("tenant_id", tenantId)
        .order("updated_at", { ascending: false });
      if (clientId) query = query.eq("client_id", clientId);
      if (status) query = query.eq("status", status);

      const { data, error } = await query;
      if (error) throw error;
      return json(data);
    }

    // ─── CHANGES: CREATE ───
    if (req.method === "POST" && segments[0] === "changes" && segments.length === 1) {
      const body = await req.json();
      if (!body.clientId || !body.changeType || !body.title) {
        throw new Error("clientId, changeType, and title required");
      }

      const { data, error } = await supabase.from("secretarial_changes").insert({
        tenant_id: tenantId,
        client_id: body.clientId,
        change_type: body.changeType,
        title: body.title,
        description: body.description || null,
        payload_json: body.payload || {},
        requires_auth_code: body.requiresAuthCode ?? true,
        created_by_user_id: user.id,
      }).select().single();
      if (error) throw error;

      await supabase.from("event_logs").insert({
        tenant_id: tenantId, event_type: "secretarial_change_created",
        source: "user", actor_user_id: user.id, client_id: body.clientId,
        payload_json: { changeId: data.id, changeType: body.changeType },
      });

      return json(data, 201);
    }

    // ─── CHANGES: VALIDATE ───
    if (req.method === "POST" && segments[0] === "changes" && segments[2] === "validate") {
      const changeId = segments[1];

      const { data: change, error: changeErr } = await supabase.from("secretarial_changes")
        .select("*").eq("tenant_id", tenantId).eq("id", changeId).single();
      if (changeErr || !change) throw new Error("Change not found");

      // Gather validation context
      const [authRes, companyRes, directorsRes, pscRes, pendingRes] = await Promise.all([
        supabase.from("client_credentials").select("id")
          .eq("tenant_id", tenantId).eq("client_id", change.client_id)
          .eq("provider", "companies_house").eq("credential_type", "auth_code").maybeSingle(),
        supabase.from("company_profiles").select("company_status, registered_office_json, sic_codes, last_synced_at")
          .eq("tenant_id", tenantId).eq("client_id", change.client_id).maybeSingle(),
        supabase.from("company_register_directors").select("id")
          .eq("tenant_id", tenantId).eq("client_id", change.client_id).eq("is_active", true),
        supabase.from("company_register_psc").select("id")
          .eq("tenant_id", tenantId).eq("client_id", change.client_id).eq("is_active", true),
        supabase.from("secretarial_changes").select("id")
          .eq("tenant_id", tenantId).eq("client_id", change.client_id)
          .in("status", ["draft", "awaiting_approval", "ready_to_file"])
          .neq("id", changeId),
      ]);

      const lastSynced = companyRes.data?.last_synced_at;
      const lastSyncDaysAgo = lastSynced ? Math.floor((Date.now() - new Date(lastSynced).getTime()) / 86400000) : null;
      const ro = companyRes.data?.registered_office_json as Record<string, unknown> | null;

      const issues = validateChangePayload(change.change_type, change.payload_json as Record<string, unknown>, {
        authCodeStored: !!authRes.data,
        companyStatus: companyRes.data?.company_status || undefined,
        activeDirectors: directorsRes.data?.length || 0,
        activePscs: pscRes.data?.length || 0,
        hasRO: !!ro && !!(ro.address_line1 || ro.line1),
        hasSicCodes: (companyRes.data?.sic_codes || []).length > 0,
        pendingChanges: pendingRes.data?.length || 0,
        lastSyncDaysAgo,
      });

      const errors = issues.filter(i => i.severity === "error");
      const warnings = issues.filter(i => i.severity === "warning");

      // Store validation results on the change
      await supabase.from("secretarial_changes")
        .update({
          validation_json: { errors, warnings, validatedAt: new Date().toISOString() },
          updated_at: new Date().toISOString(),
        })
        .eq("id", changeId);

      return json({ ok: errors.length === 0, errors, warnings });
    }

    // ─── CHANGES: APPROVE ───
    if (req.method === "POST" && segments[0] === "changes" && segments[2] === "approve") {
      const changeId = segments[1];

      const { data, error } = await supabase.from("secretarial_changes")
        .update({
          status: "ready_to_file",
          approved_by_user_id: user.id,
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("tenant_id", tenantId).eq("id", changeId)
        .in("status", ["draft", "awaiting_approval"])
        .select().single();

      if (error) throw error;

      await supabase.from("event_logs").insert({
        tenant_id: tenantId, event_type: "secretarial_change_approved",
        source: "user", actor_user_id: user.id,
        payload_json: { changeId },
      });

      return json(data);
    }

    // ─── CHANGES: SUBMIT (queue for CH filing with idempotency + validation) ───
    if (req.method === "POST" && segments[0] === "changes" && segments[2] === "submit") {
      const changeId = segments[1];

      // Load change
      const { data: change, error: changeErr } = await supabase.from("secretarial_changes")
        .select("*").eq("tenant_id", tenantId).eq("id", changeId).single();
      if (changeErr || !change) throw new Error("Change not found");
      if (change.status !== "ready_to_file") throw new Error("Change must be ready_to_file before submission");

      // Run validation before submit
      const [authRes, companyRes, directorsRes, pscRes, pendingRes] = await Promise.all([
        supabase.from("client_credentials").select("id, ciphertext")
          .eq("tenant_id", tenantId).eq("client_id", change.client_id)
          .eq("provider", "companies_house").eq("credential_type", "auth_code").maybeSingle(),
        supabase.from("company_profiles").select("company_status, company_number, registered_office_json, sic_codes, last_synced_at")
          .eq("tenant_id", tenantId).eq("client_id", change.client_id).maybeSingle(),
        supabase.from("company_register_directors").select("id")
          .eq("tenant_id", tenantId).eq("client_id", change.client_id).eq("is_active", true),
        supabase.from("company_register_psc").select("id")
          .eq("tenant_id", tenantId).eq("client_id", change.client_id).eq("is_active", true),
        supabase.from("secretarial_changes").select("id")
          .eq("tenant_id", tenantId).eq("client_id", change.client_id)
          .in("status", ["draft", "awaiting_approval", "ready_to_file"])
          .neq("id", changeId),
      ]);

      // Auth code check
      if (change.requires_auth_code && !authRes.data) {
        throw new Error("Companies House auth code required but not stored for this client");
      }

      // Auth code format validation
      if (authRes.data?.ciphertext && !AUTH_CODE_RE.test(authRes.data.ciphertext)) {
        // Mark integration as degraded
        await supabase.from("integration_health").upsert({
          tenant_id: tenantId,
          client_id: change.client_id,
          provider: "companies_house",
          status: "needs_recheck",
          last_error: "Auth code format invalid — may have been changed",
          checked_at: new Date().toISOString(),
        }, { onConflict: "tenant_id,client_id,provider" });

        throw new Error("Auth code format invalid — please update the auth code");
      }

      const lastSynced = companyRes.data?.last_synced_at;
      const lastSyncDaysAgo = lastSynced ? Math.floor((Date.now() - new Date(lastSynced).getTime()) / 86400000) : null;
      const ro = companyRes.data?.registered_office_json as Record<string, unknown> | null;

      const issues = validateChangePayload(change.change_type, change.payload_json as Record<string, unknown>, {
        authCodeStored: !!authRes.data,
        companyStatus: companyRes.data?.company_status || undefined,
        activeDirectors: directorsRes.data?.length || 0,
        activePscs: pscRes.data?.length || 0,
        hasRO: !!ro && !!(ro.address_line1 || ro.line1),
        hasSicCodes: (companyRes.data?.sic_codes || []).length > 0,
        pendingChanges: pendingRes.data?.length || 0,
        lastSyncDaysAgo,
      });

      const errors = issues.filter(i => i.severity === "error");
      if (errors.length > 0) {
        // Store validation and reject
        await supabase.from("secretarial_changes")
          .update({
            status: "draft",
            validation_json: { errors, warnings: issues.filter(i => i.severity === "warning"), validatedAt: new Date().toISOString() },
            updated_at: new Date().toISOString(),
          })
          .eq("id", changeId);

        return json({ error: "Validation failed", issues: errors }, 422);
      }

      // Build idempotency key
      const idempotencyKey = buildIdempotencyKey(tenantId, change.client_id, change.change_type, changeId);
      const filingRoute = getFilingRoute(change.change_type);

      // Check for existing submission job with same idempotency key (prevent duplicates)
      const { data: existingJob } = await supabase.from("submission_jobs")
        .select("id, status, correlation_id")
        .eq("tenant_id", tenantId)
        .eq("idempotency_key", idempotencyKey)
        .maybeSingle();

      if (existingJob) {
        if (["sent", "accepted"].includes(existingJob.status)) {
          return json({ submissionJobId: existingJob.id, status: existingJob.status, message: "Already submitted" }, 200);
        }
        // Resume existing job (e.g., if it was queued but not sent)
        if (existingJob.status === "queued") {
          return json({ submissionJobId: existingJob.id, status: "queued", message: "Already queued" }, 200);
        }
      }

      // Create submission job with idempotency
      const { data: job, error: jobErr } = await supabase.from("submission_jobs").insert({
        tenant_id: tenantId,
        client_id: change.client_id,
        job_type: `ch_${change.change_type.toLowerCase()}`,
        status: "queued",
        payload_json: {
          ...change.payload_json as Record<string, unknown>,
          _filingRoute: filingRoute,
          _companyNumber: companyRes.data?.company_number,
          _changeType: change.change_type,
        },
        idempotency_key: idempotencyKey,
        created_by_user_id: user.id,
      }).select().single();
      if (jobErr) throw jobErr;

      // Update change
      await supabase.from("secretarial_changes")
        .update({
          status: "queued",
          submission_job_id: job.id,
          validation_json: { errors: [], warnings: issues.filter(i => i.severity === "warning"), validatedAt: new Date().toISOString() },
          updated_at: new Date().toISOString(),
        })
        .eq("id", changeId);

      // Create CH filing record
      await supabase.from("ch_filings").insert({
        tenant_id: tenantId,
        client_id: change.client_id,
        filing_type: change.change_type,
        filing_description: change.title,
        request_json: change.payload_json,
        status: "pending",
        submission_job_id: job.id,
      });

      await supabase.from("event_logs").insert({
        tenant_id: tenantId, event_type: "ch_filing_submitted",
        source: "user", actor_user_id: user.id, client_id: change.client_id,
        payload_json: {
          changeId,
          submissionJobId: job.id,
          filingRoute,
          idempotencyKey,
        },
        correlation_id: job.correlation_id || null,
      });

      return json({ submissionJobId: job.id, filingRoute, idempotencyKey }, 202);
    }

    // ─── CHANGES: GET DETAILS (single change with submission job + events) ───
    if (req.method === "GET" && segments[0] === "changes" && segments.length === 2) {
      const changeId = segments[1];

      const { data: change, error } = await supabase.from("secretarial_changes")
        .select("*, clients(legal_name)")
        .eq("tenant_id", tenantId).eq("id", changeId).single();
      if (error) throw error;

      // Fetch related submission job if exists
      let submissionJob = null;
      if (change.submission_job_id) {
        const { data: job } = await supabase.from("submission_jobs")
          .select("*").eq("id", change.submission_job_id).single();
        submissionJob = job;
      }

      // Fetch related event logs
      const { data: events } = await supabase.from("event_logs")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("client_id", change.client_id)
        .or(`payload_json->>changeId.eq.${changeId},payload_json->>submissionJobId.eq.${change.submission_job_id}`)
        .order("created_at", { ascending: false })
        .limit(20);

      // Fetch related CH filing
      let chFiling = null;
      if (change.submission_job_id) {
        const { data: filing } = await supabase.from("ch_filings")
          .select("*")
          .eq("tenant_id", tenantId)
          .eq("submission_job_id", change.submission_job_id)
          .maybeSingle();
        chFiling = filing;
      }

      return json({ change, submissionJob, chFiling, events: events || [] });
    }

    // ─── FILINGS HISTORY ───
    if (req.method === "GET" && segments[0] === "filings") {
      const clientId = requireClientId();
      const { data, error } = await supabase.from("ch_filings")
        .select("*").eq("tenant_id", tenantId).eq("client_id", clientId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return json(data);
    }

    // ─── WORKBENCH (aggregated) ───
    if (req.method === "GET" && segments[0] === "workbench") {
      const [dueRes, pendingRes, healthRes] = await Promise.all([
        supabase.from("v_secretarial_due").select("*").eq("tenant_id", tenantId),
        supabase.from("v_secretarial_changes_pending").select("*").eq("tenant_id", tenantId),
        supabase.from("v_company_register_health").select("*").eq("tenant_id", tenantId),
      ]);

      return json({
        due: dueRes.data || [],
        pendingChanges: pendingRes.data || [],
        registerHealth: healthRes.data || [],
      });
    }

    // ─── CONFIRMATION STATEMENTS ───
    if (req.method === "GET" && segments[0] === "confirmation-statements") {
      const clientId = requireClientId();
      const { data, error } = await supabase.from("confirmation_statement_cycles")
        .select("*").eq("tenant_id", tenantId).eq("client_id", clientId)
        .order("due_date", { ascending: false });
      if (error) throw error;
      return json(data);
    }

    return json({ error: "Not found" }, 404);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status = message === "Unauthorized" ? 401 : 400;
    return json({ error: message }, status);
  }
});
