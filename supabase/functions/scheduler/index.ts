import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
  // Store event
  await supabaseAdmin.from("domain_events").insert({
    tenant_id: tenantId,
    trigger,
    payload,
  });
  // Run automation rules
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
    // send_email and other actions can be added later
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

  // Try to find task template
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

  // Calculate due date
  let dueDate: string | null = null;
  if (payload.dueDate) {
    const d = new Date(payload.dueDate as string);
    d.setDate(d.getDate() - daysBefore);
    dueDate = d.toISOString().slice(0, 10);
  }

  // Dedupe: don't create duplicate tasks
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

// ── Checkers ──

async function runInvoiceOverdueCheck(tenantId: string) {
  const today = new Date().toISOString().slice(0, 10);
  const { data: overdue } = await supabaseAdmin
    .from("invoices")
    .select("id, client_id, due_date, invoice_number")
    .eq("tenant_id", tenantId)
    .eq("status", "sent") // sent but not paid
    .lt("due_date", today);

  if (!overdue) return;

  for (const inv of overdue) {
    const key = `invoice_overdue:${inv.id}`;
    if (await dedupeExists(tenantId, key)) continue;
    await addDedupe(tenantId, key);

    // Mark invoice as overdue
    await supabaseAdmin
      .from("invoices")
      .update({ status: "overdue" })
      .eq("id", inv.id);

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
      dueDate: vr.period_end, // simplified: period_end as proxy for due date
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

  // Just tracking — no new event for now, the views handle display
  console.log(`[${tenantId}] ${tasks?.length || 0} overdue tasks`);
}

// ── Main handler ──

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { schedule } = await req.json().catch(() => ({ schedule: "daily" }));

    // Get all tenants
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
        } else {
          // daily
          await runVatDueCheck(tenant.id);
          await runOverdueTasksCheck(tenant.id);
          await runInvoiceOverdueCheck(tenant.id);
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
