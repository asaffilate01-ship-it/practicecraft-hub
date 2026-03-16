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
  const resource = pathParts[1]; // "rules", "send", "logs"
  const resourceId = pathParts[2];

  const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

  try {
    // ── Notification Rules CRUD ──

    if (resource === "rules" && req.method === "GET" && !resourceId) {
      const { data, error } = await supabase
        .from("notification_rules")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return new Response(JSON.stringify(data), { headers: jsonHeaders });
    }

    if (resource === "rules" && req.method === "POST") {
      const body = await req.json();
      const { data: profile } = await supabase.from("profiles").select("tenant_id").eq("id", user.id).single();
      if (!profile?.tenant_id) throw new Error("No tenant");

      const { data, error } = await supabase.from("notification_rules").insert({
        tenant_id: profile.tenant_id,
        name: body.name,
        is_enabled: body.isEnabled ?? true,
        channel: body.channel,
        template_key: body.templateKey || null,
        days_before_due: body.daysBeforeDue ?? 7,
        applies_to_json: body.appliesTo || {},
      }).select().single();
      if (error) throw error;
      return new Response(JSON.stringify(data), { status: 201, headers: jsonHeaders });
    }

    if (resource === "rules" && req.method === "PUT" && resourceId) {
      const body = await req.json();
      const update: Record<string, unknown> = {};
      if (body.name !== undefined) update.name = body.name;
      if (body.isEnabled !== undefined) update.is_enabled = body.isEnabled;
      if (body.channel !== undefined) update.channel = body.channel;
      if (body.templateKey !== undefined) update.template_key = body.templateKey;
      if (body.daysBeforeDue !== undefined) update.days_before_due = body.daysBeforeDue;
      if (body.appliesTo !== undefined) update.applies_to_json = body.appliesTo;

      const { data, error } = await supabase
        .from("notification_rules")
        .update(update)
        .eq("id", resourceId)
        .select()
        .single();
      if (error) throw error;
      return new Response(JSON.stringify(data), { headers: jsonHeaders });
    }

    if (resource === "rules" && req.method === "DELETE" && resourceId) {
      const { error } = await supabase.from("notification_rules").delete().eq("id", resourceId);
      if (error) throw error;
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // ── Send one-off notification ──

    if (resource === "send" && req.method === "POST") {
      const body = await req.json();
      const { data: profile } = await supabase.from("profiles").select("tenant_id").eq("id", user.id).single();
      if (!profile?.tenant_id) throw new Error("No tenant");

      // Queue the notification
      const { data: queueItem, error: qErr } = await supabase.from("notification_queue").insert({
        tenant_id: profile.tenant_id,
        client_id: body.to?.clientId || null,
        channel: body.channel,
        template_key: body.templateKey || null,
        payload_json: {
          to: body.to,
          vars: body.vars || {},
        },
        status: "queued",
      }).select().single();
      if (qErr) throw qErr;

      // Also log it
      await supabase.from("notification_logs").insert({
        tenant_id: profile.tenant_id,
        client_id: body.to?.clientId || null,
        user_id: body.to?.userId || null,
        channel: body.channel,
        template_key: body.templateKey || null,
        to_address: body.to?.email || body.to?.phone || null,
        status: "queued",
      });

      return new Response(JSON.stringify({ queued: true, id: queueItem.id }), { status: 202, headers: jsonHeaders });
    }

    // ── Notification Logs ──

    if (resource === "logs" && req.method === "GET") {
      const clientId = url.searchParams.get("clientId");
      const status = url.searchParams.get("status");
      const page = parseInt(url.searchParams.get("page") || "1");
      const pageSize = Math.min(parseInt(url.searchParams.get("pageSize") || "50"), 100);

      let query = supabase
        .from("notification_logs")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);

      if (clientId) query = query.eq("client_id", clientId);
      if (status) query = query.eq("status", status);

      const { data, count, error } = await query;
      if (error) throw error;

      return new Response(JSON.stringify({
        data,
        pagination: { page, pageSize, total: count || 0 },
      }), { headers: jsonHeaders });
    }

    return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: jsonHeaders });
  } catch (err) {
    console.error("Notifications error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: jsonHeaders });
  }
});
