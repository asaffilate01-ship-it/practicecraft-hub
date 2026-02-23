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
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const token = authHeader.replace("Bearer ", "");
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
  if (claimsError || !claimsData?.claims) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userId = claimsData.claims.sub;
  const url = new URL(req.url);
  const pathParts = url.pathname.split("/").filter(Boolean);
  // paths: /templates/email, /templates/email/:key, /templates/email/:key/preview

  const subResource = pathParts[1] || "email"; // default to email
  const templateKey = pathParts[2];
  const action = pathParts[3]; // "preview" or undefined

  try {
    // GET /templates/email - list templates
    if (req.method === "GET" && subResource === "email" && !templateKey) {
      const { data, error } = await supabase
        .from("email_templates")
        .select("key, name, subject, is_active, updated_at")
        .order("name");

      if (error) throw error;
      return jsonResponse(data);
    }

    // GET /templates/email/:key - get single template
    if (req.method === "GET" && templateKey && !action) {
      const { data, error } = await supabase
        .from("email_templates")
        .select("key, name, subject, body_html, body_text, variables_json, is_active")
        .eq("key", templateKey)
        .single();

      if (error) throw error;
      return jsonResponse({
        ...data,
        variables: data.variables_json,
      });
    }

    // PUT /templates/email/:key - update template (creates version)
    if (req.method === "PUT" && templateKey && !action) {
      const body = await req.json();

      // Get current version count
      const { count } = await supabase
        .from("template_versions")
        .select("*", { count: "exact", head: true })
        .eq("template_key", templateKey);

      const newVersion = (count || 0) + 1;

      // Get current template for version snapshot
      const { data: current } = await supabase
        .from("email_templates")
        .select("*")
        .eq("key", templateKey)
        .single();

      if (current) {
        // Save current as version
        await supabase.from("template_versions").insert({
          tenant_id: current.tenant_id,
          template_type: "email",
          template_key: templateKey,
          version: newVersion,
          subject: body.subject || current.subject,
          body_html: body.bodyHtml || current.body_html,
          body_text: body.bodyText || current.body_text,
          variables_json: current.variables_json,
          created_by_user_id: userId,
        });
      }

      // Update the template
      const updateFields: Record<string, unknown> = {};
      if (body.name !== undefined) updateFields.name = body.name;
      if (body.subject !== undefined) updateFields.subject = body.subject;
      if (body.bodyHtml !== undefined) updateFields.body_html = body.bodyHtml;
      if (body.bodyText !== undefined) updateFields.body_text = body.bodyText;
      if (body.isActive !== undefined) updateFields.is_active = body.isActive;

      const { data, error } = await supabase
        .from("email_templates")
        .update(updateFields)
        .eq("key", templateKey)
        .select()
        .single();

      if (error) throw error;
      return jsonResponse(data);
    }

    // POST /templates/email/:key/preview - preview rendered template
    if (req.method === "POST" && templateKey && action === "preview") {
      const body = await req.json();
      const mode = body.mode || "sample";

      // Get template
      const { data: template } = await supabase
        .from("email_templates")
        .select("*")
        .eq("key", templateKey)
        .single();

      if (!template) {
        return jsonResponse({ error: "Template not found" }, 404);
      }

      // Get whitelist
      const { data: whitelist } = await supabase
        .from("template_variable_whitelist")
        .select("key")
        .eq("template_type", "email");

      const allowedKeys = new Set((whitelist || []).map((w: { key: string }) => w.key));

      // Build context
      let context: Record<string, string> = {};

      if (mode === "sample") {
        context = {
          "tenant.firm_name": "Sample Practice Ltd",
          "tenant.support_email": "support@sample.com",
          "client.legal_name": "ABC Company Ltd",
          "client.trading_name": "ABC Co",
          "client.contact_name": "John Smith",
          "task.title": "VAT Return Q4",
          "task.due_date": "2026-03-31",
          "vat.period": "Q4 2025/26",
          "vat.due_date": "2026-04-07",
          "payroll.period": "March 2026",
          "invoice.number": "INV-0042",
          "invoice.total_gbp": "£1,250.00",
          "invoice.pay_url": "https://pay.example.com/inv-0042",
          "hmrc.receipt_id": "HMRC-REC-12345",
          "portal.login_url": "https://portal.example.com/login",
        };
      } else if (mode === "live" && body.contextIds) {
        // Fetch real data based on contextIds
        const { clientId, taskId, invoiceId } = body.contextIds;

        // Get tenant
        const { data: profile } = await supabase
          .from("profiles")
          .select("tenant_id")
          .eq("id", userId)
          .single();

        if (profile) {
          const { data: tenant } = await supabase
            .from("tenants")
            .select("firm_name, support_email")
            .eq("id", profile.tenant_id)
            .single();

          if (tenant) {
            context["tenant.firm_name"] = tenant.firm_name || "";
            context["tenant.support_email"] = tenant.support_email || "";
          }
        }

        if (clientId) {
          const { data: client } = await supabase
            .from("clients")
            .select("legal_name, trading_name")
            .eq("id", clientId)
            .single();

          if (client) {
            context["client.legal_name"] = client.legal_name || "";
            context["client.trading_name"] = client.trading_name || "";
          }
        }

        if (taskId) {
          const { data: task } = await supabase
            .from("tasks")
            .select("title, due_date")
            .eq("id", taskId)
            .single();

          if (task) {
            context["task.title"] = task.title || "";
            context["task.due_date"] = task.due_date || "";
          }
        }

        if (invoiceId) {
          const { data: invoice } = await supabase
            .from("invoices")
            .select("invoice_number, total")
            .eq("id", invoiceId)
            .single();

          if (invoice) {
            context["invoice.number"] = invoice.invoice_number || "";
            context["invoice.total_gbp"] = `£${(invoice.total || 0).toFixed(2)}`;
          }
        }
      }

      // Render template with simple {{var}} replacement
      const subjectSrc = body.overrides?.subject || template.subject;
      const htmlSrc = body.overrides?.bodyHtml || template.body_html;
      const textSrc = body.overrides?.bodyText || template.body_text;

      const referencedKeys: string[] = [];
      const varRegex = /\{\{(\w+\.\w+)\}\}/g;

      function renderTemplate(src: string): string {
        return src.replace(varRegex, (_match: string, key: string) => {
          referencedKeys.push(key);
          return context[key] || `{{${key}}}`;
        });
      }

      const renderedSubject = renderTemplate(subjectSrc);
      const renderedHtml = renderTemplate(htmlSrc);
      const renderedText = textSrc ? renderTemplate(textSrc) : null;

      // Check all referenced keys against whitelist
      const uniqueKeys = [...new Set(referencedKeys)];
      const disallowed = uniqueKeys.filter((k) => !allowedKeys.has(k));
      const allowed = disallowed.length === 0;

      return jsonResponse({
        subject: renderedSubject,
        bodyHtml: renderedHtml,
        bodyText: renderedText,
        referencedKeys: uniqueKeys,
        allowed,
        disallowedKeys: disallowed.length > 0 ? disallowed : undefined,
      });
    }

    // GET /templates/variables - list allowed variables
    if (req.method === "GET" && subResource === "variables") {
      const { data, error } = await supabase
        .from("template_variable_whitelist")
        .select("key, description, template_type")
        .order("key");

      if (error) throw error;
      return jsonResponse(data);
    }

    return jsonResponse({ error: "Not found" }, 404);
  } catch (err) {
    console.error("Templates error:", err);
    return jsonResponse({ error: err.message || "Internal error" }, 500);
  }
});

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
