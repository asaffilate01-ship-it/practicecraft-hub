import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DEFAULT_STEPS: Record<string, Array<{ key: string; required: boolean }>> = {
  ltd: [
    { key: "basic_details", required: true },
    { key: "services", required: true },
    { key: "kyc_aml", required: true },
    { key: "hmrc_auth", required: false },
    { key: "companies_house_auth_code", required: false },
    { key: "vat_setup", required: false },
    { key: "paye_setup", required: false },
    { key: "open_banking", required: false },
    { key: "engagement_letter", required: true },
    { key: "go_live", required: true },
  ],
  sole_trader: [
    { key: "basic_details", required: true },
    { key: "services", required: true },
    { key: "kyc_aml", required: true },
    { key: "hmrc_auth", required: false },
    { key: "vat_setup", required: false },
    { key: "open_banking", required: false },
    { key: "engagement_letter", required: true },
    { key: "go_live", required: true },
  ],
  partnership: [
    { key: "basic_details", required: true },
    { key: "services", required: true },
    { key: "kyc_aml", required: true },
    { key: "hmrc_auth", required: false },
    { key: "vat_setup", required: false },
    { key: "engagement_letter", required: true },
    { key: "go_live", required: true },
  ],
  llp: [
    { key: "basic_details", required: true },
    { key: "services", required: true },
    { key: "kyc_aml", required: true },
    { key: "hmrc_auth", required: false },
    { key: "companies_house_auth_code", required: false },
    { key: "vat_setup", required: false },
    { key: "paye_setup", required: false },
    { key: "engagement_letter", required: true },
    { key: "go_live", required: true },
  ],
  charity: [
    { key: "basic_details", required: true },
    { key: "services", required: true },
    { key: "kyc_aml", required: true },
    { key: "vat_setup", required: false },
    { key: "paye_setup", required: false },
    { key: "engagement_letter", required: true },
    { key: "go_live", required: true },
  ],
  trust: [
    { key: "basic_details", required: true },
    { key: "services", required: true },
    { key: "kyc_aml", required: true },
    { key: "engagement_letter", required: true },
    { key: "go_live", required: true },
  ],
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json({ error: "Unauthorized" }, 401);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const token = authHeader.replace("Bearer ", "");
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
  if (claimsError || !claimsData?.claims) {
    return json({ error: "Unauthorized" }, 401);
  }

  const userId = claimsData.claims.sub;

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", userId)
    .single();

  if (!profile) return json({ error: "Profile not found" }, 404);
  const tenantId = profile.tenant_id;

  const url = new URL(req.url);
  const pathParts = url.pathname.split("/").filter(Boolean);
  // /onboarding/cases, /onboarding/cases/:id, /onboarding/cases/:id/steps, etc.

  const caseId = pathParts[2];
  const subPath = pathParts.slice(3).join("/");

  try {
    // GET /onboarding/cases - list cases
    if (req.method === "GET" && !caseId) {
      const status = url.searchParams.get("status");
      let query = supabase
        .from("onboarding_cases")
        .select("*, client:clients(legal_name, entity_type)")
        .order("updated_at", { ascending: false });

      if (status) query = query.eq("status", status);

      const { data, error } = await query;
      if (error) throw error;
      return json(data);
    }

    // POST /onboarding/cases - create case
    if (req.method === "POST" && !caseId) {
      const body = await req.json();
      const entityType = body.entityType || "ltd";

      // Create case
      const { data: newCase, error: caseErr } = await supabase
        .from("onboarding_cases")
        .insert({
          tenant_id: tenantId,
          client_id: body.clientId || null,
          entity_type: entityType,
          status: "draft",
          created_by_user_id: userId,
        })
        .select()
        .single();

      if (caseErr) throw caseErr;

      // Create default steps
      const steps = DEFAULT_STEPS[entityType] || DEFAULT_STEPS.ltd;
      const stepRows = steps.map((s) => ({
        tenant_id: tenantId,
        onboarding_case_id: newCase.id,
        step_key: s.key,
        step_status: "todo",
        required: s.required,
      }));

      await supabase.from("onboarding_steps").insert(stepRows);

      return json(newCase, 201);
    }

    // GET /onboarding/cases/:id - get case
    if (req.method === "GET" && caseId && !subPath) {
      const { data, error } = await supabase
        .from("onboarding_cases")
        .select("*, client:clients(legal_name, entity_type, email, phone)")
        .eq("id", caseId)
        .single();

      if (error) throw error;
      return json(data);
    }

    // PUT /onboarding/cases/:id - update case
    if (req.method === "PUT" && caseId && !subPath) {
      const body = await req.json();
      const updates: Record<string, unknown> = {};
      if (body.status) updates.status = body.status;
      if (body.data) updates.data_json = body.data;
      if (body.clientId) updates.client_id = body.clientId;

      const { data, error } = await supabase
        .from("onboarding_cases")
        .update(updates)
        .eq("id", caseId)
        .select()
        .single();

      if (error) throw error;
      return json(data);
    }

    // GET /onboarding/cases/:id/steps - list steps
    if (req.method === "GET" && subPath === "steps") {
      const { data, error } = await supabase
        .from("onboarding_steps")
        .select("*")
        .eq("onboarding_case_id", caseId)
        .order("created_at");

      if (error) throw error;
      return json(data);
    }

    // PUT /onboarding/cases/:id/steps/:stepKey - update step
    const stepMatch = subPath.match(/^steps\/(.+)$/);
    if (req.method === "PUT" && stepMatch) {
      const stepKey = stepMatch[1];
      const body = await req.json();
      const updates: Record<string, unknown> = {};
      if (body.stepStatus) updates.step_status = body.stepStatus;
      if (body.data) updates.data_json = body.data;

      const { data, error } = await supabase
        .from("onboarding_steps")
        .update(updates)
        .eq("onboarding_case_id", caseId)
        .eq("step_key", stepKey)
        .select()
        .single();

      if (error) throw error;
      return json(data);
    }

    // POST /onboarding/cases/:id/actions/hmrc/connect - start HMRC OAuth
    if (req.method === "POST" && subPath === "actions/hmrc/connect") {
      // In production, build HMRC OAuth URL with state param
      const state = `${caseId}:${tenantId}`;
      const redirectUrl = `https://www.tax.service.gov.uk/oauth/authorize?response_type=code&client_id=YOUR_CLIENT_ID&scope=read:vat+write:vat&state=${encodeURIComponent(state)}&redirect_uri=${encodeURIComponent("https://your-domain.com/api/hmrc/callback")}`;

      // Update step status
      await supabase
        .from("onboarding_steps")
        .update({ step_status: "in_progress" })
        .eq("onboarding_case_id", caseId)
        .eq("step_key", "hmrc_auth");

      return json({ redirectUrl, state });
    }

    // POST /onboarding/cases/:id/actions/hmrc/callback - OAuth callback
    if (req.method === "POST" && subPath === "actions/hmrc/callback") {
      const body = await req.json();
      // In production: exchange code for tokens, store encrypted in client_credentials
      // For now, mark step as done
      await supabase
        .from("onboarding_steps")
        .update({
          step_status: "done",
          data_json: { connected_at: new Date().toISOString(), scope: "read:vat write:vat" },
        })
        .eq("onboarding_case_id", caseId)
        .eq("step_key", "hmrc_auth");

      return json({ success: true });
    }

    // POST /onboarding/cases/:id/actions/go-live - complete onboarding
    if (req.method === "POST" && subPath === "actions/go-live") {
      // Check mandatory steps are done
      const { data: steps } = await supabase
        .from("onboarding_steps")
        .select("step_key, step_status, required")
        .eq("onboarding_case_id", caseId);

      const incomplete = (steps || []).filter(
        (s: { required: boolean; step_status: string; step_key: string }) =>
          s.required && s.step_status !== "done" && s.step_key !== "go_live"
      );

      if (incomplete.length > 0) {
        return json(
          {
            error: "Incomplete required steps",
            incompleteSteps: incomplete.map((s: { step_key: string }) => s.step_key),
          },
          400
        );
      }

      // Get the case to find client_id
      const { data: onCase } = await supabase
        .from("onboarding_cases")
        .select("client_id")
        .eq("id", caseId)
        .single();

      // Mark case completed
      await supabase
        .from("onboarding_cases")
        .update({ status: "completed" })
        .eq("id", caseId);

      // Mark go_live step done
      await supabase
        .from("onboarding_steps")
        .update({ step_status: "done" })
        .eq("onboarding_case_id", caseId)
        .eq("step_key", "go_live");

      // Emit client_created event for automations
      if (onCase?.client_id) {
        await supabase.from("domain_events").insert({
          tenant_id: tenantId,
          trigger: "client_created",
          payload: { clientId: onCase.client_id, onboardingCaseId: caseId },
        });
      }

      // Log event
      await supabase.from("event_logs").insert({
        tenant_id: tenantId,
        event_type: "onboarding_completed",
        source: "user",
        actor_user_id: userId,
        client_id: onCase?.client_id,
        payload_json: { caseId },
      });

      return json({ success: true, status: "completed" });
    }

    return json({ error: "Not found" }, 404);
  } catch (err) {
    console.error("Onboarding error:", err);
    return json({ error: err.message || "Internal error" }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
