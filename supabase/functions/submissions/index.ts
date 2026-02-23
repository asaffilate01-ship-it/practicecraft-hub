import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
  const resourceId = pathParts[1]; // submission job ID
  const action = pathParts[2]; // "retry" or "cancel"

  const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

  try {
    // GET /submissions - list jobs
    if (req.method === "GET" && !resourceId) {
      const clientId = url.searchParams.get("clientId");
      const provider = url.searchParams.get("provider");
      const status = url.searchParams.get("status");
      const page = parseInt(url.searchParams.get("page") || "1");
      const pageSize = Math.min(parseInt(url.searchParams.get("pageSize") || "50"), 100);

      let query = supabase
        .from("submission_jobs")
        .select("*, clients(legal_name)", { count: "exact" })
        .order("created_at", { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);

      if (clientId) query = query.eq("client_id", clientId);
      if (provider) query = query.eq("provider", provider);
      if (status) query = query.eq("status", status);

      const { data, count, error } = await query;
      if (error) throw error;

      return new Response(JSON.stringify({
        data,
        pagination: { page, pageSize, total: count || 0 },
      }), { headers: jsonHeaders });
    }

    // GET /submissions/{id} - get details
    if (req.method === "GET" && resourceId && !action) {
      const { data, error } = await supabase
        .from("submission_jobs")
        .select("*, clients(legal_name)")
        .eq("id", resourceId)
        .single();
      if (error) throw error;
      return new Response(JSON.stringify(data), { headers: jsonHeaders });
    }

    // POST /submissions/{id}/retry
    if (req.method === "POST" && resourceId && action === "retry") {
      const body = await req.json().catch(() => ({}));

      const { data: job, error: fetchErr } = await supabase
        .from("submission_jobs")
        .select("*")
        .eq("id", resourceId)
        .single();
      if (fetchErr) throw fetchErr;

      if (!["rejected", "cancelled"].includes(job.status)) {
        return new Response(JSON.stringify({ error: "Can only retry rejected or cancelled jobs" }), { status: 400, headers: jsonHeaders });
      }

      const { data, error } = await supabase
        .from("submission_jobs")
        .update({
          status: "queued",
          attempt_count: job.attempt_count + 1,
          last_error: null,
          next_retry_at: new Date().toISOString(),
        })
        .eq("id", resourceId)
        .select()
        .single();
      if (error) throw error;

      // Log the retry event
      const { data: profile } = await supabase.from("profiles").select("tenant_id").eq("id", user.id).single();
      if (profile?.tenant_id) {
        await supabase.from("event_logs").insert({
          tenant_id: profile.tenant_id,
          event_type: "submission_retried",
          source: "user",
          actor_user_id: user.id,
          client_id: job.client_id,
          payload_json: { submissionJobId: resourceId, reason: body.reason || null },
          correlation_id: job.correlation_id,
        });
      }

      return new Response(JSON.stringify(data), { status: 202, headers: jsonHeaders });
    }

    // POST /submissions/{id}/cancel
    if (req.method === "POST" && resourceId && action === "cancel") {
      const { data: job, error: fetchErr } = await supabase
        .from("submission_jobs")
        .select("*")
        .eq("id", resourceId)
        .single();
      if (fetchErr) throw fetchErr;

      if (job.status !== "queued") {
        return new Response(JSON.stringify({ error: "Can only cancel queued jobs" }), { status: 400, headers: jsonHeaders });
      }

      const { data, error } = await supabase
        .from("submission_jobs")
        .update({ status: "cancelled" })
        .eq("id", resourceId)
        .select()
        .single();
      if (error) throw error;

      // Log the cancel event
      const { data: profile } = await supabase.from("profiles").select("tenant_id").eq("id", user.id).single();
      if (profile?.tenant_id) {
        await supabase.from("event_logs").insert({
          tenant_id: profile.tenant_id,
          event_type: "submission_cancelled",
          source: "user",
          actor_user_id: user.id,
          client_id: job.client_id,
          payload_json: { submissionJobId: resourceId },
          correlation_id: job.correlation_id,
        });
      }

      return new Response(JSON.stringify(data), { headers: jsonHeaders });
    }

    return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: jsonHeaders });
  } catch (err) {
    console.error("Submissions error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: jsonHeaders });
  }
});
