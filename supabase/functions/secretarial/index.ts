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

      // Check auth code status
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

      // Auto-create change request for filing
      await supabase.from("secretarial_changes").insert({
        tenant_id: tenantId,
        client_id: clientId,
        change_type: "APPOINT_DIRECTOR",
        title: `Appoint director: ${body.fullName}`,
        payload_json: { directorId: data.id, fullName: body.fullName },
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

      // Auto-create change request
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

    // ─── CHANGES: SUBMIT (queue for CH filing) ───
    if (req.method === "POST" && segments[0] === "changes" && segments[2] === "submit") {
      const changeId = segments[1];

      // Load change
      const { data: change, error: changeErr } = await supabase.from("secretarial_changes")
        .select("*").eq("tenant_id", tenantId).eq("id", changeId).single();
      if (changeErr || !change) throw new Error("Change not found");
      if (change.status !== "ready_to_file") throw new Error("Change must be ready_to_file before submission");

      // Check auth code if required
      if (change.requires_auth_code) {
        const { data: cred } = await supabase.from("client_credentials")
          .select("id")
          .eq("tenant_id", tenantId).eq("client_id", change.client_id)
          .eq("provider", "companies_house").eq("credential_type", "auth_code")
          .maybeSingle();
        if (!cred) throw new Error("Companies House auth code required but not stored for this client");
      }

      // Create submission job
      const { data: job, error: jobErr } = await supabase.from("submission_jobs").insert({
        tenant_id: tenantId,
        client_id: change.client_id,
        job_type: `ch_${change.change_type.toLowerCase()}`,
        status: "queued",
        payload_json: change.payload_json,
        created_by_user_id: user.id,
      }).select().single();
      if (jobErr) throw jobErr;

      // Update change
      await supabase.from("secretarial_changes")
        .update({
          status: "queued",
          submission_job_id: job.id,
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
      });

      await supabase.from("event_logs").insert({
        tenant_id: tenantId, event_type: "ch_filing_submitted",
        source: "user", actor_user_id: user.id, client_id: change.client_id,
        payload_json: { changeId, submissionJobId: job.id },
      });

      return json({ submissionJobId: job.id }, 202);
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
