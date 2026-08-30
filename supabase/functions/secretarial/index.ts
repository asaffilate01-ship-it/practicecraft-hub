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

// ─── SCHEMA VALIDATION ENGINE ───
// Returns path-based errors/warnings matching the UI-friendly output format:
// { ok, errors: [{path, code, message}], warnings: [{path, code, message}] }

interface ValidationResult {
  path: string;
  code: string;
  message: string;
}

const UK_POSTCODE_RE = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[ABD-HJLNP-UW-Z]{2}$/i;
const SIC_RE = /^\d{5}$/;
const AUTH_CODE_RE = /^[A-Za-z0-9]{6}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const CREDENTIAL_TYPES = new Set(["auth_code", "director_verification_code", "psc_verification_code"]);

function bytesToBase64(bytes: Uint8Array): string {
  let value = "";
  for (const byte of bytes) value += String.fromCharCode(byte);
  return btoa(value);
}

function base64ToBytes(value: string): Uint8Array {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}

async function credentialKey(): Promise<CryptoKey> {
  const secret = Deno.env.get("INTEGRATION_ENCRYPTION_KEY");
  if (!secret || secret.length < 32) {
    throw new Error("INTEGRATION_ENCRYPTION_KEY must contain at least 32 characters");
  }
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
}

async function encryptCredential(value: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    await credentialKey(),
    new TextEncoder().encode(value),
  );
  return `v1:${bytesToBase64(iv)}:${bytesToBase64(new Uint8Array(encrypted))}`;
}

async function decryptCredential(value: string): Promise<string> {
  // Legacy plaintext is accepted only inside this server function and is
  // immediately re-encrypted by the credential routes before later use.
  if (!value.startsWith("v1:")) return value;
  const [, ivValue, encryptedValue] = value.split(":");
  if (!ivValue || !encryptedValue) throw new Error("Stored credential is malformed");
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBytes(ivValue) },
    await credentialKey(),
    base64ToBytes(encryptedValue),
  );
  return new TextDecoder().decode(decrypted);
}

// ── Address validator (shared definition) ──
function validateAddress(addr: Record<string, unknown> | null | undefined, basePath: string): { errors: ValidationResult[]; warnings: ValidationResult[] } {
  const errors: ValidationResult[] = [];
  const warnings: ValidationResult[] = [];
  if (!addr || typeof addr !== "object") {
    errors.push({ path: basePath, code: "REQUIRED", message: "Address is required" });
    return { errors, warnings };
  }
  const line1 = addr.addressLine1 ?? addr.address_line1 ?? addr.line1;
  if (!line1) errors.push({ path: `${basePath}/addressLine1`, code: "REQUIRED", message: "Address line 1 is required" });
  const postTown = addr.postTown ?? addr.post_town ?? addr.city;
  if (!postTown) errors.push({ path: `${basePath}/postTown`, code: "REQUIRED", message: "Post town is required" });
  const country = (addr.country as string) || "";
  if (!country) errors.push({ path: `${basePath}/country`, code: "REQUIRED", message: "Country is required" });
  const pc = (addr.postcode as string) || "";
  const isUK = !country || /^(united kingdom|england|wales|scotland|northern ireland|uk|gb)$/i.test(country);
  if (isUK) {
    if (!pc) errors.push({ path: `${basePath}/postcode`, code: "REQUIRED", message: "Postcode is required for UK addresses" });
    else if (!UK_POSTCODE_RE.test(pc)) errors.push({ path: `${basePath}/postcode`, code: "INVALID_POSTCODE", message: "Postcode is not valid for UK" });
  }
  if (pc && !isUK && !/^[A-Z0-9\s-]{2,15}$/i.test(pc)) {
    warnings.push({ path: `${basePath}/postcode`, code: "UNUSUAL_POSTCODE", message: "Postcode format looks unusual" });
  }
  return { errors, warnings };
}

function requireString(val: unknown, path: string, code: string, msg: string, minLen = 1): ValidationResult | null {
  if (!val || typeof val !== "string" || val.trim().length < minLen) return { path, code, message: msg };
  return null;
}

function requireDate(val: unknown, path: string): ValidationResult | null {
  if (!val || typeof val !== "string" || !DATE_RE.test(val)) return { path, code: "INVALID_DATE", message: "A valid date (YYYY-MM-DD) is required" };
  return null;
}

function requireUuid(val: unknown, path: string, msg: string): ValidationResult | null {
  if (!val || typeof val !== "string" || val.length < 10) return { path, code: "REQUIRED", message: msg };
  return null;
}

// ── Person name validator ──
function validatePersonName(name: unknown, basePath: string): ValidationResult[] {
  const errs: ValidationResult[] = [];
  if (!name || typeof name !== "object") {
    errs.push({ path: basePath, code: "REQUIRED", message: "Person name is required" });
    return errs;
  }
  const n = name as Record<string, unknown>;
  const f = requireString(n.forename, `${basePath}/forename`, "REQUIRED", "Forename is required");
  if (f) errs.push(f);
  const s = requireString(n.surname, `${basePath}/surname`, "REQUIRED", "Surname is required");
  if (s) errs.push(s);
  return errs;
}

// ── Schema registry: per-change-type validators ──
type PayloadValidator = (
  payload: Record<string, unknown>,
  context: ValidationContext
) => { errors: ValidationResult[]; warnings: ValidationResult[] };

interface ValidationContext {
  authCodeStored: boolean;
  companyStatus?: string;
  activeDirectors: number;
  activePscs: number;
  hasRO: boolean;
  hasSicCodes: boolean;
  pendingChanges: number;
  lastSyncDaysAgo: number | null;
}

function commonChecks(ctx: ValidationContext): { errors: ValidationResult[]; warnings: ValidationResult[] } {
  const errors: ValidationResult[] = [];
  const warnings: ValidationResult[] = [];
  if (!ctx.authCodeStored) errors.push({ path: "/authCode", code: "AUTH_CODE_MISSING", message: "Companies House auth code not stored for this client" });
  if (ctx.companyStatus && ctx.companyStatus !== "active") {
    errors.push({ path: "/companyStatus", code: "COMPANY_INACTIVE", message: `Company status is "${ctx.companyStatus}" — filing may be blocked` });
  }
  return { errors, warnings };
}

const VALIDATORS: Record<string, PayloadValidator> = {
  // 1.1 Confirmation Statement
  CONFIRMATION_STATEMENT: (payload, ctx) => {
    const { errors, warnings } = commonChecks(ctx);
    const d = requireDate(payload.statementDate, "/statementDate");
    if (d) errors.push(d);
    const conf = payload.confirmations as Record<string, boolean> | undefined;
    if (!conf) {
      errors.push({ path: "/confirmations", code: "REQUIRED", message: "Confirmations object is required" });
    } else {
      if (!conf.officersConfirmed) errors.push({ path: "/confirmations/officersConfirmed", code: "NOT_CONFIRMED", message: "Officers must be confirmed" });
      if (!conf.pscConfirmed) errors.push({ path: "/confirmations/pscConfirmed", code: "NOT_CONFIRMED", message: "PSC register must be confirmed" });
      if (!conf.registeredOfficeConfirmed) errors.push({ path: "/confirmations/registeredOfficeConfirmed", code: "NOT_CONFIRMED", message: "Registered office must be confirmed" });
      if (!conf.sicConfirmed) errors.push({ path: "/confirmations/sicConfirmed", code: "NOT_CONFIRMED", message: "SIC codes must be confirmed" });
      if (!conf.shareCapitalConfirmed) errors.push({ path: "/confirmations/shareCapitalConfirmed", code: "NOT_CONFIRMED", message: "Share capital must be confirmed" });
    }
    // Contextual register checks
    if (ctx.activeDirectors === 0) errors.push({ path: "/directors", code: "MISSING_DIRECTOR", message: "At least 1 active director is required" });
    if (ctx.activePscs === 0) errors.push({ path: "/psc", code: "MISSING_PSC", message: "PSC register is empty — a PSC statement or entry is required" });
    if (!ctx.hasRO) errors.push({ path: "/registeredOffice", code: "MISSING_RO", message: "Registered office address is required" });
    if (ctx.pendingChanges > 0) errors.push({ path: "/pendingChanges", code: "PENDING_CHANGES", message: `${ctx.pendingChanges} pending change(s) must be resolved before filing CS` });
    if (!ctx.hasSicCodes) warnings.push({ path: "/sicCodes", code: "EMPTY_SIC", message: "SIC codes are empty" });
    if (ctx.lastSyncDaysAgo !== null && ctx.lastSyncDaysAgo > 14) warnings.push({ path: "/sync", code: "STALE_SYNC", message: `Last CH sync was ${ctx.lastSyncDaysAgo} days ago — consider syncing first` });
    return { errors, warnings };
  },

  // 1.2 Change Registered Office
  CHANGE_REGISTERED_OFFICE: (payload, ctx) => {
    const { errors, warnings } = commonChecks(ctx);
    const d = requireDate(payload.effectiveDate, "/effectiveDate");
    if (d) errors.push(d);
    const addrResult = validateAddress(payload.newRegisteredOfficeAddress as Record<string, unknown>, "/newRegisteredOfficeAddress");
    errors.push(...addrResult.errors);
    warnings.push(...addrResult.warnings);
    return { errors, warnings };
  },

  // 1.3 Change SAIL Address
  CHANGE_SAIL_ADDRESS: (payload, ctx) => {
    const { errors, warnings } = commonChecks(ctx);
    const d = requireDate(payload.effectiveDate, "/effectiveDate");
    if (d) errors.push(d);
    const addrResult = validateAddress(payload.newSailAddress as Record<string, unknown>, "/newSailAddress");
    errors.push(...addrResult.errors);
    warnings.push(...addrResult.warnings);
    return { errors, warnings };
  },

  // 1.4 Appoint Director
  APPOINT_DIRECTOR: (payload, ctx) => {
    const { errors, warnings } = commonChecks(ctx);
    const d = requireDate(payload.appointmentDate, "/appointmentDate");
    if (d) errors.push(d);
    else {
      const apptDate = new Date(payload.appointmentDate as string);
      if (apptDate > new Date()) errors.push({ path: "/appointmentDate", code: "DATE_IN_FUTURE", message: "Appointment date cannot be in the future" });
    }
    const person = payload.person as Record<string, unknown> | undefined;
    if (!person) {
      errors.push({ path: "/person", code: "REQUIRED", message: "Person details are required" });
    } else {
      errors.push(...validatePersonName(person.name, "/person/name"));
      const dob = requireDate(person.dateOfBirth, "/person/dateOfBirth");
      if (dob) errors.push(dob);
      const nat = requireString(person.nationality, "/person/nationality", "REQUIRED", "Nationality is required", 2);
      if (nat) errors.push(nat);
      const occ = requireString(person.occupation, "/person/occupation", "REQUIRED", "Occupation is required", 2);
      if (occ) errors.push(occ);
      const sAddr = validateAddress(person.serviceAddress as Record<string, unknown>, "/person/serviceAddress");
      errors.push(...sAddr.errors);
      warnings.push(...sAddr.warnings);
      if (!person.residentialAddress) warnings.push({ path: "/person/residentialAddress", code: "MISSING_RESIDENTIAL", message: "Residential address is missing (recommended for compliance)" });
    }
    if (!payload.consentToActDocumentId) warnings.push({ path: "/consentToActDocumentId", code: "MISSING_DOC", message: "No consent-to-act document attached. Recommended." });
    return { errors, warnings };
  },

  // 1.5 Resign Director
  RESIGN_DIRECTOR: (payload, ctx) => {
    const { errors, warnings } = commonChecks(ctx);
    const did = requireUuid(payload.directorId, "/directorId", "Director must be selected");
    if (did) errors.push(did);
    const d = requireDate(payload.resignationDate, "/resignationDate");
    if (d) errors.push(d);
    else {
      const rDate = new Date(payload.resignationDate as string);
      if (rDate > new Date()) errors.push({ path: "/resignationDate", code: "DATE_IN_FUTURE", message: "Resignation date cannot be in the future" });
    }
    // Would need director's appointment date from DB for cross-check — handled at submit time
    return { errors, warnings };
  },

  // 1.6 Appoint Secretary
  APPOINT_SECRETARY: (payload, ctx) => {
    const { errors, warnings } = commonChecks(ctx);
    const d = requireDate(payload.appointmentDate, "/appointmentDate");
    if (d) errors.push(d);
    const person = payload.person as Record<string, unknown> | undefined;
    if (!person) {
      errors.push({ path: "/person", code: "REQUIRED", message: "Person details are required" });
    } else {
      errors.push(...validatePersonName(person.name, "/person/name"));
      const sAddr = validateAddress(person.serviceAddress as Record<string, unknown>, "/person/serviceAddress");
      errors.push(...sAddr.errors);
      warnings.push(...sAddr.warnings);
    }
    return { errors, warnings };
  },

  // 1.7 Resign Secretary
  RESIGN_SECRETARY: (payload, ctx) => {
    const { errors, warnings } = commonChecks(ctx);
    const sid = requireUuid(payload.secretaryId, "/secretaryId", "Secretary must be selected");
    if (sid) errors.push(sid);
    const d = requireDate(payload.resignationDate, "/resignationDate");
    if (d) errors.push(d);
    return { errors, warnings };
  },

  // 1.8 PSC Change
  PSC_CHANGE: (payload, ctx) => {
    const { errors, warnings } = commonChecks(ctx);
    const action = payload.action as string;
    if (!action || !["add", "update", "cease"].includes(action)) {
      errors.push({ path: "/action", code: "INVALID_ENUM", message: "Action must be one of: add, update, cease" });
    }
    const psc = payload.psc as Record<string, unknown> | undefined;
    if (!psc) {
      errors.push({ path: "/psc", code: "REQUIRED", message: "PSC details are required" });
    } else {
      if (!psc.pscType || !["individual", "corporate", "legalPerson"].includes(psc.pscType as string)) {
        errors.push({ path: "/psc/pscType", code: "INVALID_ENUM", message: "PSC type must be individual, corporate, or legalPerson" });
      }
      const nm = requireString(psc.name, "/psc/name", "REQUIRED", "PSC name is required", 2);
      if (nm) errors.push(nm);
      const noc = psc.naturesOfControl as string[] | undefined;
      if (!noc || !Array.isArray(noc) || noc.length === 0) {
        errors.push({ path: "/psc/naturesOfControl", code: "REQUIRED", message: "At least one nature of control must be specified" });
      }
      const notif = requireDate(psc.notifiedOn, "/psc/notifiedOn");
      if (notif) errors.push(notif);
      // Individual must have DOB
      if (psc.pscType === "individual" && !psc.dateOfBirth) {
        errors.push({ path: "/psc/dateOfBirth", code: "REQUIRED", message: "Date of birth is required for individual PSC" });
      }
      // Cease requires ceasedOn
      if (action === "cease" && !psc.ceasedOn) {
        errors.push({ path: "/psc/ceasedOn", code: "REQUIRED", message: "Ceased date is required when ceasing a PSC" });
      }
      // Identity verification (2026 compliance)
      if (psc.pscType === "individual" && !psc.identityVerified) {
        warnings.push({ path: "/psc/identityVerified", code: "ID_NOT_VERIFIED", message: "Identity verification is recommended for PSCs (2026 requirement)" });
      }
      if (psc.serviceAddress) {
        const sAddr = validateAddress(psc.serviceAddress as Record<string, unknown>, "/psc/serviceAddress");
        errors.push(...sAddr.errors);
        warnings.push(...sAddr.warnings);
      }
    }
    return { errors, warnings };
  },

  // 1.9 SIC Change
  SIC_CHANGE: (payload, ctx) => {
    const { errors, warnings } = commonChecks(ctx);
    const d = requireDate(payload.effectiveDate, "/effectiveDate");
    if (d) errors.push(d);
    const codes = payload.sicCodes as string[] | undefined;
    if (!codes || !Array.isArray(codes) || codes.length === 0) {
      errors.push({ path: "/sicCodes", code: "REQUIRED", message: "At least one SIC code is required" });
    } else {
      if (codes.length > 4) errors.push({ path: "/sicCodes", code: "MAX_EXCEEDED", message: "Maximum 4 SIC codes allowed" });
      for (let i = 0; i < codes.length; i++) {
        if (!SIC_RE.test(codes[i]?.trim() || "")) {
          errors.push({ path: `/sicCodes/${i}`, code: "INVALID_SIC", message: `Invalid SIC code format: "${codes[i]}" (must be 5 digits)` });
        }
      }
    }
    return { errors, warnings };
  },

  // 1.10 Allot Shares
  ALLOT_SHARES: (payload, ctx) => {
    const { errors, warnings } = commonChecks(ctx);
    const d = requireDate(payload.allotmentDate, "/allotmentDate");
    if (d) errors.push(d);
    const sc = requireUuid(payload.shareClassId, "/shareClassId", "Share class is required");
    if (sc) errors.push(sc);
    const allotments = payload.allotments as Array<Record<string, unknown>> | undefined;
    if (!allotments || !Array.isArray(allotments) || allotments.length === 0) {
      errors.push({ path: "/allotments", code: "REQUIRED", message: "At least one allotment entry is required" });
    } else {
      for (let i = 0; i < allotments.length; i++) {
        const a = allotments[i];
        const m = requireUuid(a.toMemberId, `/allotments/${i}/toMemberId`, "Subscriber / member is required");
        if (m) errors.push(m);
        const q = Number(a.quantity);
        if (!q || q < 1) errors.push({ path: `/allotments/${i}/quantity`, code: "INVALID_QUANTITY", message: "Quantity must be at least 1" });
        if (a.considerationPence === undefined || a.considerationPence === null) {
          warnings.push({ path: `/allotments/${i}/considerationPence`, code: "MISSING_CONSIDERATION", message: "Consideration amount is missing" });
        }
      }
    }
    if (!payload.resolutionDocumentId) warnings.push({ path: "/resolutionDocumentId", code: "MISSING_DOC", message: "No resolution document attached. Recommended." });
    return { errors, warnings };
  },

  // 1.11 Transfer Shares
  TRANSFER_SHARES: (payload, ctx) => {
    const { errors, warnings } = commonChecks(ctx);
    const d = requireDate(payload.transferDate, "/transferDate");
    if (d) errors.push(d);
    const sc = requireUuid(payload.shareClassId, "/shareClassId", "Share class is required");
    if (sc) errors.push(sc);
    const from = requireUuid(payload.fromMemberId, "/fromMemberId", "Transferor (from member) is required");
    if (from) errors.push(from);
    const to = requireUuid(payload.toMemberId, "/toMemberId", "Transferee (to member) is required");
    if (to) errors.push(to);
    const qty = Number(payload.quantity);
    if (!qty || qty < 1) errors.push({ path: "/quantity", code: "INVALID_QUANTITY", message: "Quantity must be at least 1" });
    if (!payload.stockTransferFormDocumentId) warnings.push({ path: "/stockTransferFormDocumentId", code: "MISSING_DOC", message: "No stock transfer form attached. Recommended." });
    return { errors, warnings };
  },
};

// Fallback for unknown types
function validatePayload(
  changeType: string,
  payload: Record<string, unknown>,
  context: ValidationContext
): { ok: boolean; errors: ValidationResult[]; warnings: ValidationResult[] } {
  const validator = VALIDATORS[changeType];
  if (!validator) {
    const { errors, warnings } = commonChecks(context);
    return { ok: errors.length === 0, errors, warnings };
  }
  const result = validator(payload, context);
  return { ok: result.errors.length === 0, errors: result.errors, warnings: result.warnings };
}

// ── Filing route determination ──
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

// ── Idempotency key builder ──
function buildIdempotencyKey(tenantId: string, clientId: string, changeType: string, changeId: string): string {
  return `ch:${tenantId}:${clientId}:${changeType}:${changeId}:v1`;
}

// ── Schema registry map (for reference / audit) ──
const SCHEMA_REGISTRY: Record<string, string> = {
  CONFIRMATION_STATEMENT: "secretarial/confirmation-statement.json",
  CHANGE_REGISTERED_OFFICE: "secretarial/change-registered-office.json",
  CHANGE_SAIL_ADDRESS: "secretarial/change-sail-address.json",
  APPOINT_DIRECTOR: "secretarial/appoint-director.json",
  RESIGN_DIRECTOR: "secretarial/resign-director.json",
  APPOINT_SECRETARY: "secretarial/appoint-secretary.json",
  RESIGN_SECRETARY: "secretarial/resign-secretary.json",
  PSC_CHANGE: "secretarial/psc-change.json",
  SIC_CHANGE: "secretarial/sic-change.json",
  ALLOT_SHARES: "secretarial/allot-shares.json",
  TRANSFER_SHARES: "secretarial/transfer-shares.json",
};

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

    async function assertClient(clientId: string): Promise<void> {
      const { data } = await supabase
        .from("clients")
        .select("id")
        .eq("id", clientId)
        .eq("tenant_id", tenantId)
        .maybeSingle();
      if (!data) throw new Error("Client access denied");
    }

    // Helper to build validation context for a client
    async function buildValidationContext(clientId: string, excludeChangeId?: string): Promise<ValidationContext> {
      const [authRes, companyRes, directorsRes, pscRes, pendingRes] = await Promise.all([
        supabase.from("client_credentials").select("id")
          .eq("tenant_id", tenantId).eq("client_id", clientId)
          .eq("provider", "companies_house").eq("credential_type", "auth_code").maybeSingle(),
        supabase.from("company_profiles").select("company_status, registered_office_json, sic_codes, last_synced_at")
          .eq("tenant_id", tenantId).eq("client_id", clientId).maybeSingle(),
        supabase.from("company_register_directors").select("id")
          .eq("tenant_id", tenantId).eq("client_id", clientId).eq("is_active", true),
        supabase.from("company_register_psc").select("id")
          .eq("tenant_id", tenantId).eq("client_id", clientId).eq("is_active", true),
        (() => {
          let q = supabase.from("secretarial_changes").select("id")
            .eq("tenant_id", tenantId).eq("client_id", clientId)
            .in("status", ["draft", "awaiting_approval", "ready_to_file"]);
          if (excludeChangeId) q = q.neq("id", excludeChangeId);
          return q;
        })(),
      ]);

      const lastSynced = companyRes.data?.last_synced_at;
      const lastSyncDaysAgo = lastSynced ? Math.floor((Date.now() - new Date(lastSynced).getTime()) / 86400000) : null;
      const ro = companyRes.data?.registered_office_json as Record<string, unknown> | null;

      return {
        authCodeStored: !!authRes.data,
        companyStatus: companyRes.data?.company_status || undefined,
        activeDirectors: directorsRes.data?.length || 0,
        activePscs: pscRes.data?.length || 0,
        hasRO: !!ro && !!(ro.addressLine1 || ro.address_line1 || ro.line1),
        hasSicCodes: (companyRes.data?.sic_codes || []).length > 0,
        pendingChanges: pendingRes.data?.length || 0,
        lastSyncDaysAgo,
      };
    }

    // ─── SCHEMA REGISTRY (GET) ───
    if (req.method === "GET" && segments[0] === "schema-registry") {
      return json(SCHEMA_REGISTRY);
    }

    // ─── SERVER-ONLY CREDENTIAL VAULT ───
    // Responses expose status/metadata only. Credential values never return to
    // the browser after they have been submitted.
    if (req.method === "GET" && segments[0] === "credentials") {
      const clientId = requireClientId();
      await assertClient(clientId);
      const { data, error } = await supabase
        .from("client_credentials")
        .select("id,provider,credential_type,ciphertext,metadata_json,expires_at,created_at,updated_at")
        .eq("tenant_id", tenantId)
        .eq("client_id", clientId)
        .eq("provider", "companies_house")
        .order("credential_type");
      if (error) throw error;

      const safeCredentials = [];
      for (const credential of data || []) {
        if (!credential.ciphertext.startsWith("v1:")) {
          await supabase
            .from("client_credentials")
            .update({
              ciphertext: await encryptCredential(credential.ciphertext),
              metadata_json: { ...(credential.metadata_json || {}), encrypted_at: new Date().toISOString() },
              updated_at: new Date().toISOString(),
            })
            .eq("id", credential.id)
            .eq("tenant_id", tenantId);
        }
        safeCredentials.push({
          id: credential.id,
          provider: credential.provider,
          credential_type: credential.credential_type,
          metadata_json: credential.metadata_json || {},
          expires_at: credential.expires_at,
          created_at: credential.created_at,
          updated_at: credential.updated_at,
          is_stored: true,
        });
      }
      return json(safeCredentials);
    }

    if (req.method === "POST" && segments[0] === "credentials") {
      const body = await req.json();
      const clientId = String(body.clientId || "");
      const credentialType = String(body.credentialType || "");
      const rawValue = String(body.value || "").trim();
      if (!clientId || !CREDENTIAL_TYPES.has(credentialType) || !rawValue || rawValue.length > 256) {
        return json({ error: "A supported credential type and value are required" }, 400);
      }
      await assertClient(clientId);
      const value = credentialType === "auth_code" ? rawValue.toUpperCase() : rawValue;
      if (credentialType === "auth_code" && !AUTH_CODE_RE.test(value)) {
        return json({ error: "Auth code must be exactly 6 alphanumeric characters" }, 400);
      }

      const metadata = {
        ...(body.metadata && typeof body.metadata === "object" ? body.metadata : {}),
        encrypted_at: new Date().toISOString(),
      };
      const encrypted = await encryptCredential(value);
      let query = supabase
        .from("client_credentials")
        .update({
          ciphertext: encrypted,
          metadata_json: metadata,
          expires_at: body.expiresAt || null,
          updated_at: new Date().toISOString(),
        })
        .eq("tenant_id", tenantId)
        .eq("client_id", clientId)
        .eq("provider", "companies_house")
        .eq("credential_type", credentialType);
      if (body.id) query = query.eq("id", String(body.id));
      const { data: updated, error: updateError } = await query.select("id").maybeSingle();
      if (updateError) throw updateError;

      let credentialId = updated?.id;
      if (!credentialId) {
        const { data: inserted, error: insertError } = await supabase
          .from("client_credentials")
          .insert({
            tenant_id: tenantId,
            client_id: clientId,
            provider: "companies_house",
            credential_type: credentialType,
            ciphertext: encrypted,
            metadata_json: metadata,
            expires_at: body.expiresAt || null,
          })
          .select("id")
          .single();
        if (insertError) throw insertError;
        credentialId = inserted.id;
      }

      await supabase.from("event_logs").insert({
        tenant_id: tenantId,
        event_type: "ch_credential_updated",
        source: "user",
        actor_user_id: user.id,
        client_id: clientId,
        payload_json: { credentialId, credentialType },
      });
      return json({ id: credentialId, credential_type: credentialType, is_stored: true });
    }

    if (req.method === "DELETE" && segments[0] === "credentials" && segments[1]) {
      const { data: deleted, error } = await supabase
        .from("client_credentials")
        .delete()
        .eq("id", segments[1])
        .eq("tenant_id", tenantId)
        .eq("provider", "companies_house")
        .select("id,client_id,credential_type")
        .maybeSingle();
      if (error) throw error;
      if (!deleted) return json({ error: "Credential not found" }, 404);
      await supabase.from("event_logs").insert({
        tenant_id: tenantId,
        event_type: "ch_credential_deleted",
        source: "user",
        actor_user_id: user.id,
        client_id: deleted.client_id,
        payload_json: { credentialId: deleted.id, credentialType: deleted.credential_type },
      });
      return json({ success: true });
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

      await assertClient(clientId);

      if (!AUTH_CODE_RE.test(authCode)) {
        return json({ error: "Auth code must be exactly 6 alphanumeric characters" }, 400);
      }

      const { data: existing } = await supabase.from("client_credentials")
        .select("id")
        .eq("tenant_id", tenantId).eq("client_id", clientId)
        .eq("provider", "companies_house").eq("credential_type", "auth_code")
        .maybeSingle();

      const encryptedAuthCode = await encryptCredential(authCode.toUpperCase());
      if (existing) {
        await supabase.from("client_credentials")
          .update({
            ciphertext: encryptedAuthCode,
            metadata_json: { encrypted_at: new Date().toISOString() },
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
      } else {
        await supabase.from("client_credentials").insert({
          tenant_id: tenantId, client_id: clientId,
          provider: "companies_house", credential_type: "auth_code",
          ciphertext: encryptedAuthCode,
          metadata_json: { encrypted_at: new Date().toISOString() },
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

    // ─── CHANGES: VALIDATE (schema-based) ───
    if (req.method === "POST" && segments[0] === "changes" && segments[2] === "validate") {
      const changeId = segments[1];

      const { data: change, error: changeErr } = await supabase.from("secretarial_changes")
        .select("*").eq("tenant_id", tenantId).eq("id", changeId).single();
      if (changeErr || !change) throw new Error("Change not found");

      const ctx = await buildValidationContext(change.client_id, changeId);
      const result = validatePayload(change.change_type, change.payload_json as Record<string, unknown>, ctx);

      // Store validation results
      await supabase.from("secretarial_changes")
        .update({
          validation_json: {
            ok: result.ok,
            errors: result.errors,
            warnings: result.warnings,
            validatedAt: new Date().toISOString(),
            schema: SCHEMA_REGISTRY[change.change_type] || null,
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", changeId);

      return json(result);
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

    // ─── CHANGES: SUBMIT (with schema validation + idempotency) ───
    if (req.method === "POST" && segments[0] === "changes" && segments[2] === "submit") {
      const changeId = segments[1];

      const { data: change, error: changeErr } = await supabase.from("secretarial_changes")
        .select("*").eq("tenant_id", tenantId).eq("id", changeId).single();
      if (changeErr || !change) throw new Error("Change not found");
      if (change.status !== "ready_to_file") throw new Error("Change must be ready_to_file before submission");

      // Auth code check
      const { data: authCred } = await supabase.from("client_credentials")
        .select("id, ciphertext")
        .eq("tenant_id", tenantId).eq("client_id", change.client_id)
        .eq("provider", "companies_house").eq("credential_type", "auth_code").maybeSingle();

      if (change.requires_auth_code && !authCred) {
        throw new Error("Companies House auth code required but not stored for this client");
      }

      const decryptedAuthCode = authCred?.ciphertext
        ? (await decryptCredential(authCred.ciphertext)).toUpperCase()
        : null;
      if (decryptedAuthCode && !AUTH_CODE_RE.test(decryptedAuthCode)) {
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

      // Run schema-based validation
      const ctx = await buildValidationContext(change.client_id, changeId);
      const result = validatePayload(change.change_type, change.payload_json as Record<string, unknown>, ctx);

      if (!result.ok) {
        await supabase.from("secretarial_changes")
          .update({
            status: "draft",
            validation_json: { ...result, validatedAt: new Date().toISOString(), schema: SCHEMA_REGISTRY[change.change_type] || null },
            updated_at: new Date().toISOString(),
          })
          .eq("id", changeId);

        return json({ error: "Validation failed", ...result }, 422);
      }

      // Idempotency
      const idempotencyKey = buildIdempotencyKey(tenantId, change.client_id, change.change_type, changeId);
      const filingRoute = getFilingRoute(change.change_type);

      const { data: existingJob } = await supabase.from("submission_jobs")
        .select("id, status, correlation_id")
        .eq("tenant_id", tenantId)
        .eq("idempotency_key", idempotencyKey)
        .maybeSingle();

      if (existingJob) {
        if (["sent", "accepted"].includes(existingJob.status)) {
          return json({ submissionJobId: existingJob.id, status: existingJob.status, message: "Already submitted" });
        }
        if (existingJob.status === "queued") {
          return json({ submissionJobId: existingJob.id, status: "queued", message: "Already queued" });
        }
      }

      // Get company number for filing
      const { data: company } = await supabase.from("company_profiles")
        .select("company_number").eq("tenant_id", tenantId).eq("client_id", change.client_id).maybeSingle();

      // Create submission job
      const { data: job, error: jobErr } = await supabase.from("submission_jobs").insert({
        tenant_id: tenantId,
        client_id: change.client_id,
        job_type: `ch_${change.change_type.toLowerCase()}`,
        status: "queued",
        payload_json: {
          ...change.payload_json as Record<string, unknown>,
          _filingRoute: filingRoute,
          _companyNumber: company?.company_number,
          _changeType: change.change_type,
          _schema: SCHEMA_REGISTRY[change.change_type] || null,
        },
        idempotency_key: idempotencyKey,
        created_by_user_id: user.id,
      }).select().single();
      if (jobErr) throw jobErr;

      // Update change status to queued
      await supabase.from("secretarial_changes")
        .update({
          status: "queued",
          submission_job_id: job.id,
          validation_json: { ...result, validatedAt: new Date().toISOString(), schema: SCHEMA_REGISTRY[change.change_type] || null },
          updated_at: new Date().toISOString(),
        })
        .eq("id", changeId);

      await supabase.from("event_logs").insert({
        tenant_id: tenantId, event_type: "ch_filing_queued",
        source: "user", actor_user_id: user.id, client_id: change.client_id,
        payload_json: { changeId, submissionJobId: job.id, filingRoute, idempotencyKey },
      });

      // ── Actually submit to Companies House via the companies-house edge function ──
      if (filingRoute === "xml_gateway") {
        try {
          // Map change_type to filing type expected by companies-house/file
          const filingTypeMap: Record<string, string> = {
            CONFIRMATION_STATEMENT: "CS01",
            CHANGE_REGISTERED_OFFICE: "AD01",
            APPOINT_DIRECTOR: "AP01",
            RESIGN_DIRECTOR: "TM01",
          };
          const filingType = filingTypeMap[change.change_type];

          if (filingType) {
            const chUrl = `${supabaseUrl}/functions/v1/companies-house/file`;
            const chPayload = change.payload_json as Record<string, unknown>;

            const chRes = await fetch(chUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: authHeader,
                apikey: Deno.env.get("SUPABASE_ANON_KEY")!,
              },
              body: JSON.stringify({
                filingType,
                companyNumber: company?.company_number,
                companyName: chPayload.companyName || company?.company_number,
                companyAuthCode: decryptedAuthCode,
                payload: chPayload,
                clientId: change.client_id,
                tenantId,
                test: false,
              }),
            });

            const chResult = await chRes.json();

            // Update submission job with result
            const jobStatus = chResult.status === "rejected" ? "rejected" : chResult.status === "submitted" ? "sent" : "sent";
            await supabase.from("submission_jobs")
              .update({
                status: jobStatus,
                correlation_id: chResult.transactionId || null,
                last_error: chResult.errors?.length ? chResult.errors.join("; ") : null,
                attempt_count: 1,
                last_attempt_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq("id", job.id);

            // Update the change status
            const changeStatus = jobStatus === "rejected" ? "rejected" : "sent";
            await supabase.from("secretarial_changes")
              .update({ status: changeStatus, updated_at: new Date().toISOString() })
              .eq("id", changeId);

            // Log the filing result
            await supabase.from("event_logs").insert({
              tenant_id: tenantId, event_type: "ch_filing_submitted",
              source: "system", actor_user_id: user.id, client_id: change.client_id,
              payload_json: {
                changeId, submissionJobId: job.id, filingRoute,
                transactionId: chResult.transactionId,
                qualifier: chResult.qualifier,
                errors: chResult.errors || [],
                filingId: chResult.filingId,
              },
              correlation_id: chResult.transactionId || null,
            });

            return json({
              submissionJobId: job.id,
              filingRoute,
              idempotencyKey,
              chResult: {
                status: chResult.status,
                transactionId: chResult.transactionId,
                errors: chResult.errors || [],
              },
            }, 202);
          }
        } catch (chErr) {
          // Filing call failed — mark job as failed but don't block
          const errMsg = chErr instanceof Error ? chErr.message : "CH filing call failed";
          await supabase.from("submission_jobs")
            .update({ status: "failed", last_error: errMsg, updated_at: new Date().toISOString() })
            .eq("id", job.id);
          await supabase.from("secretarial_changes")
            .update({ status: "rejected", updated_at: new Date().toISOString() })
            .eq("id", changeId);

          return json({ submissionJobId: job.id, filingRoute, error: errMsg }, 500);
        }
      }

      // For API filing route or unsupported XML types, just return queued
      return json({ submissionJobId: job.id, filingRoute, idempotencyKey, status: "queued" }, 202);
    }

    // ─── CHANGES: GET DETAILS ───
    if (req.method === "GET" && segments[0] === "changes" && segments.length === 2) {
      const changeId = segments[1];

      const { data: change, error } = await supabase.from("secretarial_changes")
        .select("*, clients(legal_name)")
        .eq("tenant_id", tenantId).eq("id", changeId).single();
      if (error) throw error;

      let submissionJob = null;
      if (change.submission_job_id) {
        const { data: job } = await supabase.from("submission_jobs")
          .select("*").eq("id", change.submission_job_id).single();
        submissionJob = job;
      }

      const { data: events } = await supabase.from("event_logs")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("client_id", change.client_id)
        .or(`payload_json->>changeId.eq.${changeId},payload_json->>submissionJobId.eq.${change.submission_job_id}`)
        .order("created_at", { ascending: false })
        .limit(20);

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

    // ─── WORKBENCH ───
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
