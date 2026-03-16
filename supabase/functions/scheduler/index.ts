import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// ── Helpers ──

async function dedupeExists(tenantId: string, key: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("event_dedupe")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("key", key)
    .maybeSingle();
  return !!data;
}

async function addDedupe(tenantId: string, key: string) {
  await supabaseAdmin.from("event_dedupe").upsert(
    { tenant_id: tenantId, key },
    { onConflict: "tenant_id,key" }
  );
}

async function emitEvent(tenantId: string, trigger: string, payload: Record<string, unknown>) {
  await supabaseAdmin.from("domain_events").insert({
    tenant_id: tenantId,
    trigger,
    payload,
  });
  await runAutomationRules(tenantId, trigger, payload);
}

async function runAutomationRules(tenantId: string, trigger: string, payload: Record<string, unknown>) {
  const { data: rules } = await supabaseAdmin
    .from("automation_rules")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("trigger_type", trigger)
    .eq("is_enabled", true);

  if (!rules) return;

  for (const rule of rules) {
    if (rule.action_type === "create_task") {
      await createTaskFromRule(tenantId, payload, rule.action_payload_json);
    }
    if (rule.action_type === "send_email") {
      await queueNotificationFromRule(tenantId, payload, rule.action_payload_json);
    }
  }
}

async function createTaskFromRule(
  tenantId: string,
  payload: Record<string, unknown>,
  actionPayload: Record<string, unknown>
) {
  const clientId = payload.clientId as string | undefined;
  const templateName = actionPayload.task_template_name as string;
  const priority = (actionPayload.priority as string) || "medium";
  const daysBefore = (actionPayload.days_before_due as number) || 0;
  const fallbackTitle = (actionPayload.fallback_title as string) || templateName;

  let title = fallbackTitle;
  let description: string | null = null;
  let checklistJson: unknown = [];

  if (templateName) {
    const { data: tmpl } = await supabaseAdmin
      .from("task_templates")
      .select("name, description, checklist_json")
      .eq("tenant_id", tenantId)
      .eq("name", templateName)
      .maybeSingle();

    if (tmpl) {
      title = tmpl.name;
      description = tmpl.description;
      checklistJson = tmpl.checklist_json;
    }
  }

  let dueDate: string | null = null;
  if (payload.dueDate) {
    const d = new Date(payload.dueDate as string);
    d.setDate(d.getDate() - daysBefore);
    dueDate = d.toISOString().slice(0, 10);
  }

  const dedupeKey = `task:${templateName}:${clientId || "no-client"}:${dueDate || "no-date"}`;
  if (await dedupeExists(tenantId, dedupeKey)) return;
  await addDedupe(tenantId, dedupeKey);

  await supabaseAdmin.from("tasks").insert({
    tenant_id: tenantId,
    client_id: clientId || null,
    title,
    description,
    priority,
    due_date: dueDate,
    checklist_json: checklistJson,
    status: "todo",
  });
}

async function queueNotificationFromRule(
  tenantId: string,
  payload: Record<string, unknown>,
  actionPayload: Record<string, unknown>
) {
  const templateKey = actionPayload.template_key as string | undefined;
  const clientId = payload.clientId as string | undefined;

  if (!templateKey) return;

  // Get client email
  let toAddress: string | null = null;
  if (clientId) {
    const { data: client } = await supabaseAdmin
      .from("clients")
      .select("email")
      .eq("id", clientId)
      .maybeSingle();
    toAddress = client?.email || null;
  }

  await supabaseAdmin.from("notification_queue").insert({
    tenant_id: tenantId,
    client_id: clientId || null,
    channel: "email",
    template_key: templateKey,
    payload_json: { to: { clientId, email: toAddress }, vars: payload },
    status: "queued",
  });

  await supabaseAdmin.from("notification_logs").insert({
    tenant_id: tenantId,
    client_id: clientId || null,
    channel: "email",
    template_key: templateKey,
    to_address: toAddress,
    status: "queued",
  });
}

// ── Notification Dispatch ──

async function processNotificationQueue(tenantId: string) {
  const { data: queued } = await supabaseAdmin
    .from("notification_queue")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("status", "queued")
    .order("created_at")
    .limit(20);

  if (!queued?.length) return;

  for (const item of queued) {
    try {
      const payload = item.payload_json as any;
      const to = payload?.to?.email;

      if (!to) {
        // Mark as failed - no recipient
        await supabaseAdmin.from("notification_queue").update({ status: "failed" }).eq("id", item.id);
        continue;
      }

      // Look up template
      let subject = "Notification";
      let bodyHtml = "<p>You have a notification.</p>";

      if (item.template_key) {
        const { data: tmpl } = await supabaseAdmin
          .from("email_templates")
          .select("subject, body_html")
          .eq("tenant_id", tenantId)
          .eq("key", item.template_key)
          .maybeSingle();

        if (tmpl) {
          subject = tmpl.subject;
          bodyHtml = tmpl.body_html;

          // Simple variable substitution
          const vars = payload?.vars || {};
          for (const [k, v] of Object.entries(vars)) {
            subject = subject.replace(new RegExp(`{{${k}}}`, "g"), String(v));
            bodyHtml = bodyHtml.replace(new RegExp(`{{${k}}}`, "g"), String(v));
          }
        }
      }

      // Mark as sent (actual email sending would go here via email API)
      await supabaseAdmin.from("notification_queue").update({ status: "sent" }).eq("id", item.id);
      await supabaseAdmin.from("notification_logs").update({ status: "sent" })
        .eq("tenant_id", tenantId)
        .eq("template_key", item.template_key)
        .eq("to_address", to)
        .eq("status", "queued");

      console.log(`[${tenantId}] Notification dispatched: ${item.template_key} → ${to}`);
    } catch (err) {
      console.error(`Notification dispatch error:`, err);
      await supabaseAdmin.from("notification_queue").update({ status: "failed" }).eq("id", item.id);
    }
  }
}

// ── Deadline Reminders ──

async function runDeadlineReminders(tenantId: string) {
  // Get notification rules for this tenant
  const { data: rules } = await supabaseAdmin
    .from("notification_rules")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("is_enabled", true);

  if (!rules?.length) return;

  for (const rule of rules) {
    const daysBefore = rule.days_before_due || 7;
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + daysBefore);
    const targetStr = targetDate.toISOString().slice(0, 10);

    const appliesTo = rule.applies_to_json as any;

    // Check tasks with matching due date
    const { data: tasks } = await supabaseAdmin
      .from("tasks")
      .select("id, title, client_id, due_date, status")
      .eq("tenant_id", tenantId)
      .eq("due_date", targetStr)
      .not("status", "in", '("done","cancelled")');

    if (!tasks?.length) continue;

    // Filter by applicable statuses if specified
    const validStatuses = appliesTo?.task_status as string[] | undefined;

    for (const task of tasks) {
      if (validStatuses && !validStatuses.includes(task.status)) continue;

      const dedupeKey = `reminder:${rule.id}:${task.id}:${targetStr}`;
      if (await dedupeExists(tenantId, dedupeKey)) continue;
      await addDedupe(tenantId, dedupeKey);

      // Get client email
      let email: string | null = null;
      if (task.client_id) {
        const { data: client } = await supabaseAdmin
          .from("clients").select("email").eq("id", task.client_id).maybeSingle();
        email = client?.email || null;
      }

      if (!email) continue;

      await supabaseAdmin.from("notification_queue").insert({
        tenant_id: tenantId,
        client_id: task.client_id,
        channel: rule.channel,
        template_key: rule.template_key,
        payload_json: {
          to: { clientId: task.client_id, email },
          vars: { taskTitle: task.title, dueDate: task.due_date },
        },
        status: "queued",
      });

      await supabaseAdmin.from("notification_logs").insert({
        tenant_id: tenantId,
        client_id: task.client_id,
        channel: rule.channel,
        template_key: rule.template_key,
        to_address: email,
        status: "queued",
      });
    }
  }
}

// ── Signature Expiry ──

async function runSignatureExpiryCheck(tenantId: string) {
  const now = new Date().toISOString();
  const { data: expired } = await supabaseAdmin
    .from("signature_requests")
    .select("id")
    .eq("tenant_id", tenantId)
    .in("status", ["sent", "viewed"])
    .lt("expires_at", now);

  if (!expired?.length) return;

  for (const sig of expired) {
    await supabaseAdmin.from("signature_requests").update({ status: "expired" }).eq("id", sig.id);
  }
  console.log(`[${tenantId}] Expired ${expired.length} signature requests`);
}

// ── Checkers ──

async function runInvoiceOverdueCheck(tenantId: string) {
  const today = new Date().toISOString().slice(0, 10);
  const { data: overdue } = await supabaseAdmin
    .from("invoices")
    .select("id, client_id, due_date, invoice_number")
    .eq("tenant_id", tenantId)
    .eq("status", "sent")
    .lt("due_date", today);

  if (!overdue) return;

  for (const inv of overdue) {
    const key = `invoice_overdue:${inv.id}`;
    if (await dedupeExists(tenantId, key)) continue;
    await addDedupe(tenantId, key);

    await supabaseAdmin.from("invoices").update({ status: "overdue" }).eq("id", inv.id);
    await emitEvent(tenantId, "invoice_overdue", {
      invoiceId: inv.id,
      clientId: inv.client_id,
      invoiceNumber: inv.invoice_number,
    });
  }
}

async function runVatDueCheck(tenantId: string) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 21);
  const futureDateStr = futureDate.toISOString().slice(0, 10);

  const { data: vatReturns } = await supabaseAdmin
    .from("vat_returns")
    .select("id, client_id, period_start, period_end, status")
    .eq("tenant_id", tenantId)
    .eq("status", "draft")
    .lte("period_end", futureDateStr);

  if (!vatReturns) return;

  for (const vr of vatReturns) {
    const key = `vat_obligation_detected:${vr.client_id}:${vr.period_end}`;
    if (await dedupeExists(tenantId, key)) continue;
    await addDedupe(tenantId, key);

    await emitEvent(tenantId, "vat_obligation_detected", {
      clientId: vr.client_id,
      periodStart: vr.period_start,
      periodEnd: vr.period_end,
      dueDate: vr.period_end,
      vatReturnId: vr.id,
    });
  }
}

async function runOverdueTasksCheck(tenantId: string) {
  const today = new Date().toISOString().slice(0, 10);
  const { data: tasks } = await supabaseAdmin
    .from("tasks")
    .select("id, title, client_id, due_date, assigned_to_user_id")
    .eq("tenant_id", tenantId)
    .lt("due_date", today)
    .not("status", "in", '("done","cancelled")');

  console.log(`[${tenantId}] ${tasks?.length || 0} overdue tasks`);
}

// ── Main handler ──

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { schedule } = await req.json().catch(() => ({ schedule: "daily" }));

    const { data: tenants, error: tenantErr } = await supabaseAdmin
      .from("tenants")
      .select("id");

    if (tenantErr) throw tenantErr;
    if (!tenants?.length) {
      return new Response(JSON.stringify({ message: "No tenants" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: Record<string, string> = {};

    for (const tenant of tenants) {
      try {
        if (schedule === "hourly") {
          await runInvoiceOverdueCheck(tenant.id);
          await processNotificationQueue(tenant.id);
        } else {
          // daily
          await runVatDueCheck(tenant.id);
          await runOverdueTasksCheck(tenant.id);
          await runInvoiceOverdueCheck(tenant.id);
          await runDeadlineReminders(tenant.id);
          await runSignatureExpiryCheck(tenant.id);
          await processNotificationQueue(tenant.id);
        }
        results[tenant.id] = "ok";
      } catch (err) {
        console.error(`Tenant ${tenant.id} error:`, err);
        results[tenant.id] = `error: ${(err as Error).message}`;
      }
    }

    return new Response(JSON.stringify({ schedule, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Scheduler error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
