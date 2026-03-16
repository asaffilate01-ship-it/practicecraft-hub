import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const authHeader = req.headers.get("authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
  }

  const url = new URL(req.url);
  const pathParts = url.pathname.split("/").filter(Boolean);
  // Expected: /automations/rules, /automations/rules/{id}, /automations/triggers
  const resource = pathParts[1]; // "rules" or "triggers"
  const resourceId = pathParts[2]; // optional rule ID

  const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

  try {
    // GET /automations/triggers - list supported trigger types
    if (resource === "triggers" && req.method === "GET") {
      const triggers = [
        "client_created", "vat_obligation_detected", "payroll_schedule",
        "accounts_year_end", "invoice_overdue", "document_uploaded",
        "submission_rejected", "submission_accepted"
      ];
      return new Response(JSON.stringify(triggers), { headers: jsonHeaders });
    }

    // GET /automations/rules
    if (resource === "rules" && req.method === "GET" && !resourceId) {
      const { data, error } = await supabase
        .from("automation_rules")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return new Response(JSON.stringify(data), { headers: jsonHeaders });
    }

    // POST /automations/rules
    if (resource === "rules" && req.method === "POST") {
      const body = await req.json();
      const { data: profile } = await supabase.from("profiles").select("tenant_id").eq("id", user.id).single();
      if (!profile?.tenant_id) throw new Error("No tenant");

      const { data, error } = await supabase.from("automation_rules").insert({
        tenant_id: profile.tenant_id,
        name: body.name,
        is_enabled: body.isEnabled ?? true,
        trigger_type: body.triggerType,
        trigger_filter_json: body.triggerFilter || {},
        action_type: body.actionType,
        action_payload_json: body.actionPayload || {},
      }).select().single();
      if (error) throw error;
      return new Response(JSON.stringify(data), { status: 201, headers: jsonHeaders });
    }

    // PUT /automations/rules/{id}
    if (resource === "rules" && req.method === "PUT" && resourceId) {
      const body = await req.json();
      const update: Record<string, unknown> = {};
      if (body.name !== undefined) update.name = body.name;
      if (body.isEnabled !== undefined) update.is_enabled = body.isEnabled;
      if (body.triggerType !== undefined) update.trigger_type = body.triggerType;
      if (body.triggerFilter !== undefined) update.trigger_filter_json = body.triggerFilter;
      if (body.actionType !== undefined) update.action_type = body.actionType;
      if (body.actionPayload !== undefined) update.action_payload_json = body.actionPayload;

      const { data, error } = await supabase
        .from("automation_rules")
        .update(update)
        .eq("id", resourceId)
        .select()
        .single();
      if (error) throw error;
      return new Response(JSON.stringify(data), { headers: jsonHeaders });
    }

    // DELETE /automations/rules/{id}
    if (resource === "rules" && req.method === "DELETE" && resourceId) {
      const { error } = await supabase
        .from("automation_rules")
        .delete()
        .eq("id", resourceId);
      if (error) throw error;
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: jsonHeaders });
  } catch (err) {
    console.error("Automations error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: jsonHeaders });
  }
});
