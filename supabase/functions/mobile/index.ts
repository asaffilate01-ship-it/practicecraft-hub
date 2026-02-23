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

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", userId)
    .single();

  if (!profile) return json({ error: "Profile not found" }, 404);
  const tenantId = profile.tenant_id;

  const url = new URL(req.url);
  const pathParts = url.pathname.split("/").filter(Boolean);
  const endpoint = pathParts.slice(1).join("/"); // after "mobile"

  try {
    // POST /mobile/uploads/request - Request signed upload URL
    if (endpoint === "uploads/request" && req.method === "POST") {
      const body = await req.json();
      const { clientId, type, mimeType, sizeBytes, filename, captureMeta } = body;

      if (!clientId || !type || !mimeType) {
        return json({ error: "clientId, type, mimeType required" }, 400);
      }

      const safeName = filename || `scan_${Date.now()}`;
      const storagePath = `${tenantId}/${clientId}/mobile/${Date.now()}_${safeName}`;

      // Create document record
      const { data: doc, error: docError } = await supabase
        .from("documents")
        .insert({
          tenant_id: tenantId,
          client_id: clientId,
          uploaded_by_user_id: userId,
          filename: safeName,
          mime_type: mimeType,
          size_bytes: sizeBytes || 0,
          storage_path: storagePath,
          document_type: type,
          status: "pending",
          metadata_json: captureMeta || {},
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

    // POST /mobile/uploads/:documentId/complete - Complete upload
    const completeMatch = endpoint.match(/^uploads\/([^/]+)\/complete$/);
    if (completeMatch && req.method === "POST") {
      const documentId = completeMatch[1];
      const body = req.headers.get("content-length") !== "0" ? await req.json().catch(() => ({})) : {};

      // Update document status
      const updateFields: Record<string, unknown> = { status: "uploaded" };
      if (body.tags) updateFields.tags = body.tags;

      const { data, error } = await supabase
        .from("documents")
        .update(updateFields)
        .eq("id", documentId)
        .select()
        .single();

      if (error) throw error;

      // If queueOcr requested, we could emit an event for async processing
      if (body.queueOcr !== false) {
        await supabase.from("domain_events").insert({
          tenant_id: tenantId,
          trigger: "document_uploaded",
          payload: { documentId, queueOcr: true },
        });
      }

      return json(data);
    }

    // GET /mobile/sync - Delta sync
    if (endpoint === "sync" && req.method === "GET") {
      const since = url.searchParams.get("since");
      const serverTime = new Date().toISOString();

      const sinceFilter = since || "1970-01-01T00:00:00Z";

      // Fetch updated records since timestamp (parallel)
      const [clientsRes, tasksRes, invoicesRes, documentsRes] = await Promise.all([
        supabase
          .from("clients")
          .select("*")
          .gte("updated_at", sinceFilter)
          .order("updated_at"),
        supabase
          .from("tasks")
          .select("*")
          .gte("updated_at", sinceFilter)
          .order("updated_at"),
        supabase
          .from("invoices")
          .select("*")
          .gte("updated_at", sinceFilter)
          .order("updated_at"),
        supabase
          .from("documents")
          .select("*")
          .gte("updated_at", sinceFilter)
          .order("updated_at"),
      ]);

      return json({
        serverTime,
        clients: clientsRes.data || [],
        tasks: tasksRes.data || [],
        invoices: invoicesRes.data || [],
        documents: documentsRes.data || [],
        deleted: {
          // Tombstone tracking would require a separate deleted_records table
          // For now, return empty arrays
          tasks: [],
          documents: [],
        },
      });
    }

    // POST /mobile/push/register - Register push token
    if (endpoint === "push/register" && req.method === "POST") {
      const body = await req.json();
      const { platform, token: pushToken } = body;

      if (!platform || !pushToken) {
        return json({ error: "platform and token required" }, 400);
      }

      const { error } = await supabase.from("push_tokens").upsert(
        {
          tenant_id: tenantId,
          user_id: userId,
          platform,
          token: pushToken,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "tenant_id,user_id,platform,token" }
      );

      if (error) throw error;
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    return json({ error: "Not found" }, 404);
  } catch (err) {
    console.error("Mobile error:", err);
    return json({ error: err.message || "Internal error" }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
