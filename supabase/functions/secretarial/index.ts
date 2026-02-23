import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

    // GET /secretarial/summary?clientId=xxx
    if (req.method === "GET" && segments[0] === "summary") {
      const clientId = url.searchParams.get("clientId");
      if (!clientId) throw new Error("clientId required");

      const [companyRes, eventsRes, filingsRes, csRes] = await Promise.all([
        supabase.from("company_profiles").select("*").eq("tenant_id", tenantId).eq("client_id", clientId).maybeSingle(),
        supabase.from("secretarial_events").select("id, event_type, status, effective_date, created_at").eq("tenant_id", tenantId).eq("client_id", clientId).order("created_at", { ascending: false }).limit(20),
        supabase.from("ch_filings").select("id, filing_type, status, submitted_at, accepted_at").eq("tenant_id", tenantId).eq("client_id", clientId).order("created_at", { ascending: false }).limit(20),
        supabase.from("confirmation_statement_cycles").select("*").eq("tenant_id", tenantId).eq("client_id", clientId).order("due_date", { ascending: false }).limit(5),
      ]);

      return new Response(JSON.stringify({
        company: companyRes.data,
        recentEvents: eventsRes.data || [],
        recentFilings: filingsRes.data || [],
        confirmationStatements: csRes.data || [],
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // GET /secretarial/registers/directors?clientId=xxx
    if (req.method === "GET" && segments[0] === "registers" && segments[1] === "directors") {
      const clientId = url.searchParams.get("clientId");
      if (!clientId) throw new Error("clientId required");
      const { data, error } = await supabase.from("company_register_directors").select("*").eq("tenant_id", tenantId).eq("client_id", clientId).order("appointed_on", { ascending: false });
      if (error) throw error;
      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // GET /secretarial/registers/psc?clientId=xxx
    if (req.method === "GET" && segments[0] === "registers" && segments[1] === "psc") {
      const clientId = url.searchParams.get("clientId");
      if (!clientId) throw new Error("clientId required");
      const { data, error } = await supabase.from("company_register_psc").select("*").eq("tenant_id", tenantId).eq("client_id", clientId).order("notified_on", { ascending: false });
      if (error) throw error;
      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // GET /secretarial/registers/members?clientId=xxx
    if (req.method === "GET" && segments[0] === "registers" && segments[1] === "members") {
      const clientId = url.searchParams.get("clientId");
      if (!clientId) throw new Error("clientId required");
      const { data, error } = await supabase.from("company_register_members").select("*, share_classes(class_name, nominal_value_pence)").eq("tenant_id", tenantId).eq("client_id", clientId).order("date_became_member", { ascending: false });
      if (error) throw error;
      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // POST /secretarial/changes — create a secretarial change request
    if (req.method === "POST" && segments[0] === "changes") {
      const body = await req.json();
      const { clientId, eventType, description, payload, effectiveDate } = body;
      if (!clientId || !eventType) throw new Error("clientId and eventType required");

      const { data, error } = await supabase.from("secretarial_events").insert({
        tenant_id: tenantId,
        client_id: clientId,
        event_type: eventType,
        description: description || null,
        payload_json: payload || {},
        effective_date: effectiveDate || null,
        created_by_user_id: user.id,
      }).select().single();

      if (error) throw error;

      // Audit log
      await supabase.from("event_logs").insert({
        tenant_id: tenantId,
        event_type: "secretarial_change_created",
        source: "user",
        actor_user_id: user.id,
        client_id: clientId,
        payload_json: { eventId: data.id, eventType },
      });

      return new Response(JSON.stringify(data), { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // POST /secretarial/filings/submit — submit a CH filing
    if (req.method === "POST" && segments[0] === "filings" && segments[1] === "submit") {
      const body = await req.json();
      const { clientId, filingType, filingDescription, requestPayload } = body;
      if (!clientId || !filingType) throw new Error("clientId and filingType required");

      const { data, error } = await supabase.from("ch_filings").insert({
        tenant_id: tenantId,
        client_id: clientId,
        filing_type: filingType,
        filing_description: filingDescription || null,
        request_json: requestPayload || {},
        status: "pending",
      }).select().single();

      if (error) throw error;

      await supabase.from("event_logs").insert({
        tenant_id: tenantId,
        event_type: "ch_filing_submitted",
        source: "user",
        actor_user_id: user.id,
        client_id: clientId,
        payload_json: { filingId: data.id, filingType },
      });

      return new Response(JSON.stringify(data), { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // GET /secretarial/filings?clientId=xxx
    if (req.method === "GET" && segments[0] === "filings") {
      const clientId = url.searchParams.get("clientId");
      if (!clientId) throw new Error("clientId required");
      const { data, error } = await supabase.from("ch_filings").select("*").eq("tenant_id", tenantId).eq("client_id", clientId).order("created_at", { ascending: false });
      if (error) throw error;
      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // POST /secretarial/auth-code — store/update encrypted auth code
    if (req.method === "POST" && segments[0] === "auth-code") {
      const body = await req.json();
      const { clientId, authCode } = body;
      if (!clientId || !authCode) throw new Error("clientId and authCode required");

      // Upsert into client_credentials
      const { data: existing } = await supabase.from("client_credentials")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("client_id", clientId)
        .eq("provider", "companies_house")
        .eq("credential_type", "auth_code")
        .maybeSingle();

      if (existing) {
        await supabase.from("client_credentials")
          .update({ ciphertext: authCode, updated_at: new Date().toISOString() })
          .eq("id", existing.id);
      } else {
        await supabase.from("client_credentials").insert({
          tenant_id: tenantId,
          client_id: clientId,
          provider: "companies_house",
          credential_type: "auth_code",
          ciphertext: authCode,
        });
      }

      await supabase.from("event_logs").insert({
        tenant_id: tenantId,
        event_type: "ch_auth_code_updated",
        source: "user",
        actor_user_id: user.id,
        client_id: clientId,
        payload_json: {},
      });

      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // GET /secretarial/workbench — aggregated view for practice workbench
    if (req.method === "GET" && segments[0] === "workbench") {
      const [dueRes, pendingRes, healthRes] = await Promise.all([
        supabase.from("v_secretarial_due").select("*").eq("tenant_id", tenantId),
        supabase.from("v_secretarial_changes_pending").select("*").eq("tenant_id", tenantId),
        supabase.from("v_company_register_health").select("*").eq("tenant_id", tenantId),
      ]);

      return new Response(JSON.stringify({
        due: dueRes.data || [],
        pendingChanges: pendingRes.data || [],
        registerHealth: healthRes.data || [],
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status = message === "Unauthorized" ? 401 : 400;
    return new Response(JSON.stringify({ error: message }), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
