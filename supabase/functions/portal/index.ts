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

  // Get user's profile to find tenant
  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", userId)
    .single();

  if (!profile) return json({ error: "Profile not found" }, 404);

  const tenantId = profile.tenant_id;

  // Determine client_id: for client_user role, find their linked client
  // For staff, they can pass clientId as query param
  const url = new URL(req.url);
  const pathParts = url.pathname.split("/").filter(Boolean);
  // /portal/me/summary, /portal/me/deadlines, etc.
  const endpoint = pathParts.slice(2).join("/"); // after "portal/me"

  // Get user role to determine if client_user
  const { data: userRole } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .single();

  const isClientUser = userRole?.role === "client_user";

  // For client users, find their client_id from metadata or a mapping
  // For now, staff can pass clientId query param
  let clientId = url.searchParams.get("clientId");

  try {
    switch (endpoint) {
      case "summary": {
        // Portal summary with KPIs
        const clientFilter = clientId ? { client_id: clientId } : {};

        const [tasksResult, invoicesResult] = await Promise.all([
          supabase
            .from("tasks")
            .select("id, status, due_date", { count: "exact" })
            .match(clientFilter)
            .not("status", "in", "(done,cancelled)"),
          supabase
            .from("invoices")
            .select("id, status", { count: "exact" })
            .match(clientFilter)
            .not("status", "eq", "paid"),
        ]);

        const openTasks = tasksResult.count || 0;
        const overdueTasks = (tasksResult.data || []).filter(
          (t: { due_date: string | null }) => t.due_date && new Date(t.due_date) < new Date()
        ).length;
        const unpaidInvoices = invoicesResult.count || 0;

        // Last submission
        const { data: lastSub } = await supabase
          .from("submission_jobs")
          .select("status")
          .match(clientFilter)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        let clientData = null;
        if (clientId) {
          const { data } = await supabase
            .from("clients")
            .select("*")
            .eq("id", clientId)
            .single();
          clientData = data;
        }

        return json({
          client: clientData,
          kpis: {
            openTasks,
            overdueTasks,
            unpaidInvoices,
            lastSubmissionStatus: lastSub?.status || null,
          },
        });
      }

      case "deadlines": {
        const from = url.searchParams.get("from") || new Date().toISOString().slice(0, 10);
        const to =
          url.searchParams.get("to") ||
          new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10);

        // Combine tasks due + VAT due into deadlines
        const deadlines: Array<Record<string, unknown>> = [];

        const { data: tasks } = await supabase
          .from("tasks")
          .select("id, title, due_date, status")
          .not("status", "in", "(done,cancelled)")
          .gte("due_date", from)
          .lte("due_date", to)
          .match(clientId ? { client_id: clientId } : {})
          .order("due_date");

        for (const t of tasks || []) {
          deadlines.push({
            type: "task",
            title: t.title,
            dueDate: t.due_date,
            status: t.status,
            referenceId: t.id,
          });
        }

        const { data: vatReturns } = await supabase
          .from("vat_returns")
          .select("id, period_start, period_end, status")
          .match(clientId ? { client_id: clientId } : {})
          .not("status", "eq", "submitted")
          .order("period_end");

        for (const v of vatReturns || []) {
          deadlines.push({
            type: "vat",
            title: `VAT ${v.period_start} - ${v.period_end}`,
            dueDate: v.period_end,
            status: v.status,
            referenceId: v.id,
          });
        }

        return json(deadlines);
      }

      case "tasks": {
        const status = url.searchParams.get("status");
        let query = supabase
          .from("tasks")
          .select("*")
          .match(clientId ? { client_id: clientId } : {})
          .order("due_date");

        if (status) {
          query = query.eq("status", status);
        }

        const { data, error } = await query;
        if (error) throw error;
        return json(data);
      }

      case "documents": {
        const docType = url.searchParams.get("type");
        let query = supabase
          .from("documents")
          .select("*")
          .match(clientId ? { client_id: clientId } : {})
          .order("created_at", { ascending: false });

        if (docType) {
          query = query.eq("document_type", docType);
        }

        const { data, error } = await query;
        if (error) throw error;
        return json(data);
      }

      case "documents/signed-url": {
        if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
        const body = await req.json();

        const filename = body.filename || `upload_${Date.now()}`;
        const storagePath = `${tenantId}/${clientId || "general"}/${Date.now()}_${filename}`;

        // Create document record
        const { data: doc, error: docError } = await supabase
          .from("documents")
          .insert({
            tenant_id: tenantId,
            client_id: clientId,
            uploaded_by_user_id: userId,
            filename,
            mime_type: body.mimeType,
            size_bytes: body.sizeBytes || 0,
            storage_path: storagePath,
            document_type: body.type || "other",
            status: "pending",
          })
          .select()
          .single();

        if (docError) throw docError;

        // Create signed upload URL
        const { data: signedUrl, error: urlError } = await supabase.storage
          .from("tenant-assets")
          .createSignedUploadUrl(storagePath);

        if (urlError) throw urlError;

        return json({
          documentId: doc.id,
          uploadUrl: signedUrl.signedUrl,
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
        });
      }

      case "invoices": {
        const invStatus = url.searchParams.get("status");
        let query = supabase
          .from("invoices")
          .select("*")
          .match(clientId ? { client_id: clientId } : {})
          .order("issue_date", { ascending: false });

        if (invStatus) {
          query = query.eq("status", invStatus);
        }

        const { data, error } = await query;
        if (error) throw error;
        return json(data);
      }

      case "submissions": {
        const subType = url.searchParams.get("type");
        let query = supabase
          .from("submission_jobs")
          .select("*")
          .match(clientId ? { client_id: clientId } : {})
          .order("created_at", { ascending: false });

        if (subType) {
          query = query.eq("submission_type", subType);
        }

        const { data, error } = await query;
        if (error) throw error;
        return json(data);
      }

      case "messages/threads": {
        if (req.method === "GET") {
          const { data, error } = await supabase
            .from("message_threads")
            .select("*")
            .match(clientId ? { client_id: clientId } : {})
            .order("last_message_at", { ascending: false });

          if (error) throw error;
          return json(data);
        }

        if (req.method === "POST") {
          const body = await req.json();
          if (!clientId) return json({ error: "clientId required" }, 400);

          const { data: thread, error: threadErr } = await supabase
            .from("message_threads")
            .insert({
              tenant_id: tenantId,
              client_id: clientId,
              subject: body.subject,
            })
            .select()
            .single();

          if (threadErr) throw threadErr;

          // Insert first message
          await supabase.from("messages").insert({
            thread_id: thread.id,
            tenant_id: tenantId,
            sender_type: isClientUser ? "client" : "staff",
            sender_user_id: userId,
            body: body.body,
          });

          return json(thread, 201);
        }

        return json({ error: "Method not allowed" }, 405);
      }

      default: {
        // Check for /messages/threads/:threadId or /messages/threads/:threadId/reply
        const threadMatch = endpoint.match(/^messages\/threads\/([^/]+)$/);
        const replyMatch = endpoint.match(/^messages\/threads\/([^/]+)\/reply$/);
        const payLinkMatch = endpoint.match(/^invoices\/([^/]+)\/pay-link$/);

        if (threadMatch && req.method === "GET") {
          const threadId = threadMatch[1];
          const { data, error } = await supabase
            .from("messages")
            .select("*")
            .eq("thread_id", threadId)
            .order("created_at");

          if (error) throw error;
          return json(data);
        }

        if (replyMatch && req.method === "POST") {
          const threadId = replyMatch[1];
          const body = await req.json();

          const { data, error } = await supabase
            .from("messages")
            .insert({
              thread_id: threadId,
              tenant_id: tenantId,
              sender_type: isClientUser ? "client" : "staff",
              sender_user_id: userId,
              body: body.body,
            })
            .select()
            .single();

          if (error) throw error;

          // Update thread last_message_at
          await supabase
            .from("message_threads")
            .update({ last_message_at: new Date().toISOString() })
            .eq("id", threadId);

          return json(data, 201);
        }

        if (payLinkMatch && req.method === "POST") {
          const invoiceId = payLinkMatch[1];
          // Placeholder: in production this would create a Stripe/GoCardless session
          return json({
            url: `https://pay.example.com/invoice/${invoiceId}`,
          });
        }

        return json({ error: "Not found" }, 404);
      }
    }
  } catch (err) {
    console.error("Portal error:", err);
    return json({ error: err.message || "Internal error" }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
