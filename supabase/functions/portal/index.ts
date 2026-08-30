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

  const url = new URL(req.url);
  const body = req.method !== "GET" ? await req.json().catch(() => ({})) : {};
  const serviceClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Invitation lookup returns only the fields required to render signup.
  if (body?.action === "validate-invite") {
    const { data: invitation, error } = await serviceClient
      .from("portal_invitations")
      .select("id,email,portal_role,expires_at,tenants(firm_name),clients(legal_name)")
      .eq("token", body.token)
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();
    if (error || !invitation) return json({ error: "Invalid or expired invitation" }, 404);
    return json({ invitation });
  }

  // Accepting an invitation is permitted immediately after signup, including
  // when email confirmation means there is not yet a user session. Possession
  // of the invitation token is not enough: the created auth user's email must
  // also match the invited address.
  if (body?.action === "accept-invite") {
    const { data: inv, error: invErr } = await serviceClient
      .from("portal_invitations")
      .select("*")
      .eq("token", body.token)
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();
    if (invErr || !inv || !body.userId) return json({ error: "Invalid or expired invitation" }, 400);

    const { data: authUser, error: authUserError } = await serviceClient.auth.admin.getUserById(body.userId);
    if (authUserError || !authUser.user || authUser.user.email?.toLowerCase() !== inv.email.toLowerCase()) {
      return json({ error: "Invitation identity does not match" }, 403);
    }
    if (authUser.user.user_metadata?.user_type !== "portal") {
      return json({ error: "Invitation can only link a portal signup" }, 403);
    }

    const { error: linkError } = await serviceClient.from("portal_users").upsert({
      user_id: authUser.user.id,
      tenant_id: inv.tenant_id,
      client_id: inv.client_id,
      portal_role: inv.portal_role,
      display_name: body.displayName || "",
      status: "active",
    }, { onConflict: "user_id,tenant_id" });
    if (linkError) throw linkError;

    // Repair identities created before the portal-aware signup trigger.
    await serviceClient.from("user_roles").delete().eq("user_id", authUser.user.id);
    await serviceClient.from("profiles").delete().eq("id", authUser.user.id);
    await serviceClient
      .from("portal_invitations")
      .update({ status: "accepted", accepted_at: new Date().toISOString() })
      .eq("id", inv.id);
    return json({ ok: true });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

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
  const [{ data: portalUser }, { data: profile }] = await Promise.all([
    supabase.from("portal_users").select("tenant_id,client_id,portal_role").eq("user_id", userId).eq("status", "active").maybeSingle(),
    supabase.from("profiles").select("tenant_id").eq("id", userId).maybeSingle(),
  ]);
  if (!portalUser && !profile) return json({ error: "No active staff or portal identity" }, 403);

  const tenantId = portalUser?.tenant_id || profile!.tenant_id;
  const pathParts = url.pathname.split("/").filter(Boolean);
  // /portal/me/summary, /portal/me/deadlines, etc.
  const endpoint = pathParts.slice(2).join("/"); // after "portal/me"

  const isClientUser = Boolean(portalUser);
  // Portal identities are always pinned to their linked client; only staff can
  // request a client context explicitly.
  const clientId = portalUser?.client_id || url.searchParams.get("clientId");

  try {
    if (body?.action === "gdpr_export") {
      if (body.user_id && body.user_id !== userId) return json({ error: "Subject identity mismatch" }, 403);
      if (body.tenant_id && body.tenant_id !== tenantId) return json({ error: "Tenant access denied" }, 403);

      const [profileResult, portalResult, rolesResult, messagesResult, documentsResult, auditResult, requestsResult] =
        await Promise.all([
          serviceClient.from("profiles").select("id,tenant_id,full_name,email,avatar_url,created_at,updated_at")
            .eq("id", userId).eq("tenant_id", tenantId).maybeSingle(),
          serviceClient.from("portal_users").select("user_id,tenant_id,client_id,portal_role,display_name,status,created_at,updated_at")
            .eq("user_id", userId).eq("tenant_id", tenantId),
          serviceClient.from("user_roles").select("tenant_id,role,created_at")
            .eq("user_id", userId).eq("tenant_id", tenantId),
          serviceClient.from("messages").select("id,thread_id,sender_type,body,created_at")
            .eq("tenant_id", tenantId).eq("sender_user_id", userId).order("created_at").limit(10000),
          serviceClient.from("documents").select("id,client_id,filename,mime_type,size_bytes,document_type,status,created_at")
            .eq("tenant_id", tenantId).eq("uploaded_by_user_id", userId).order("created_at").limit(10000),
          serviceClient.from("audit_log").select("id,action,entity_name,entity_id,created_at")
            .eq("tenant_id", tenantId).eq("user_id", userId).order("created_at").limit(10000),
          serviceClient.from("data_subject_requests").select("id,request_type,status,requested_at,completed_at")
            .eq("tenant_id", tenantId).eq("subject_user_id", userId).order("requested_at"),
        ]);

      await serviceClient.from("audit_log").insert({
        tenant_id: tenantId,
        user_id: userId,
        action: "gdpr_export_generated",
        entity_name: "data_subject",
        after_json: { generated_at: new Date().toISOString() },
      });

      return json({
        generated_at: new Date().toISOString(),
        subject_user_id: userId,
        tenant_id: tenantId,
        profile: profileResult.data,
        portal_identities: portalResult.data || [],
        staff_roles: rolesResult.data || [],
        messages_sent: messagesResult.data || [],
        documents_uploaded: documentsResult.data || [],
        audit_events: auditResult.data || [],
        data_subject_requests: requestsResult.data || [],
      });
    }

    if (body?.action === "gdpr_delete_request") {
      if (body.user_id && body.user_id !== userId) return json({ error: "Subject identity mismatch" }, 403);
      if (body.tenant_id && body.tenant_id !== tenantId) return json({ error: "Tenant access denied" }, 403);

      const { data: request, error: requestError } = await serviceClient
        .from("data_subject_requests")
        .insert({ tenant_id: tenantId, subject_user_id: userId, request_type: "erasure", status: "received" })
        .select("id,status,requested_at")
        .single();
      if (requestError?.code === "23505") {
        const { data: existing } = await serviceClient
          .from("data_subject_requests")
          .select("id,status,requested_at")
          .eq("tenant_id", tenantId)
          .eq("subject_user_id", userId)
          .eq("request_type", "erasure")
          .in("status", ["received", "identity_check", "in_review"])
          .single();
        return json({ request: existing, duplicate: true });
      }
      if (requestError) throw requestError;

      await serviceClient.from("audit_log").insert({
        tenant_id: tenantId,
        user_id: userId,
        action: "gdpr_erasure_requested",
        entity_name: "data_subject_request",
        entity_id: request.id,
        after_json: { status: request.status, requested_at: request.requested_at },
      });
      return json({ request }, 201);
    }

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
          .from("client-documents")
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
          const stripeResponse = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/stripe`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: authHeader,
              apikey: Deno.env.get("SUPABASE_ANON_KEY")!,
            },
            body: JSON.stringify({ action: "create-invoice-payment", invoiceId }),
          });
          const stripePayload = await stripeResponse.json();
          return json(stripePayload, stripeResponse.status);
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
