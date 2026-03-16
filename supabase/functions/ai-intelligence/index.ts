import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !userData.user) throw new Error("Authentication failed");

    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", userData.user.id)
      .single();
    if (!profile) throw new Error("No profile found");

    const tenantId = profile.tenant_id;
    const { action, context } = await req.json();

    const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

    // ─── SMART TASK SUGGESTIONS ───
    if (action === "suggest_tasks") {
      const { data: clients } = await supabase
        .from("clients")
        .select("id, legal_name, entity_type, status")
        .eq("tenant_id", tenantId)
        .eq("status", "active")
        .limit(20);

      const { data: recentTasks } = await supabase
        .from("tasks")
        .select("title, status, due_date, service, client_id")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(30);

      const { data: periods } = await supabase
        .from("accounts_periods")
        .select("client_id, period_end, status, filing_deadline")
        .eq("tenant_id", tenantId)
        .in("status", ["draft", "in_progress"])
        .limit(20);

      const { data: vatReturns } = await supabase
        .from("vat_returns")
        .select("client_id, period_end, status, due_date")
        .eq("tenant_id", tenantId)
        .in("status", ["draft", "in_progress"])
        .limit(20);

      const today = new Date().toISOString().slice(0, 10);
      const prompt = `You are a UK accounting practice management AI. Today is ${today}.

Active clients: ${JSON.stringify(clients?.map(c => ({ name: c.legal_name, type: c.entity_type })) || [])}
Recent tasks: ${JSON.stringify(recentTasks?.slice(0, 15) || [])}
Open accounts periods: ${JSON.stringify(periods || [])}
Open VAT returns: ${JSON.stringify(vatReturns || [])}

Suggest 3-5 actionable tasks the practice should create right now based on upcoming deadlines, missing work, or best practices. Consider UK filing deadlines (CT600 = 12 months after period end, SA = 31 Jan, VAT = 1 month 7 days after period end).`;

      const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: "You are a UK practice management AI assistant." },
            { role: "user", content: prompt },
          ],
          tools: [{
            type: "function",
            function: {
              name: "suggest_tasks",
              description: "Return actionable task suggestions for the practice.",
              parameters: {
                type: "object",
                properties: {
                  suggestions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        description: { type: "string" },
                        priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
                        client_name: { type: "string" },
                        service: { type: "string" },
                        suggested_due_date: { type: "string", description: "ISO date" },
                        reason: { type: "string" },
                      },
                      required: ["title", "priority", "reason"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["suggestions"],
                additionalProperties: false,
              },
            },
          }],
          tool_choice: { type: "function", function: { name: "suggest_tasks" } },
        }),
      });

      if (!aiResp.ok) {
        if (aiResp.status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429, headers: jsonHeaders });
        if (aiResp.status === 402) return new Response(JSON.stringify({ error: "AI credits depleted" }), { status: 402, headers: jsonHeaders });
        throw new Error(`AI error: ${aiResp.status}`);
      }

      const result = await aiResp.json();
      const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
      const parsed = toolCall ? JSON.parse(toolCall.function.arguments) : { suggestions: [] };

      return new Response(JSON.stringify(parsed), { headers: jsonHeaders });
    }

    // ─── ANOMALY DETECTION ───
    if (action === "detect_anomalies") {
      const clientId = context?.client_id;
      if (!clientId) throw new Error("client_id required");

      const { data: txns } = await supabase
        .from("bank_transactions")
        .select("id, description, amount_pence, transaction_date, transaction_type, categorisation_status")
        .eq("client_id", clientId)
        .order("transaction_date", { ascending: false })
        .limit(100);

      if (!txns?.length) {
        return new Response(JSON.stringify({ anomalies: [], message: "No transactions to analyse" }), { headers: jsonHeaders });
      }

      const txnSummary = txns.map(t =>
        `${t.transaction_date} | ${t.description} | £${(Math.abs(t.amount_pence) / 100).toFixed(2)} ${t.amount_pence < 0 ? 'OUT' : 'IN'} | ${t.categorisation_status}`
      ).join("\n");

      const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: "You are a UK forensic accountant AI. Analyse bank transactions for anomalies: unusual amounts, duplicate payments, round-number payments that could be personal, irregular patterns, uncategorised high-value items." },
            { role: "user", content: `Analyse these transactions for anomalies:\n${txnSummary}` },
          ],
          tools: [{
            type: "function",
            function: {
              name: "report_anomalies",
              description: "Report detected transaction anomalies",
              parameters: {
                type: "object",
                properties: {
                  anomalies: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        transaction_date: { type: "string" },
                        description: { type: "string" },
                        amount: { type: "string" },
                        anomaly_type: { type: "string", enum: ["duplicate", "unusual_amount", "personal_expense", "uncategorised_high_value", "pattern_break", "round_number"] },
                        severity: { type: "string", enum: ["low", "medium", "high"] },
                        explanation: { type: "string" },
                      },
                      required: ["description", "anomaly_type", "severity", "explanation"],
                      additionalProperties: false,
                    },
                  },
                  summary: { type: "string" },
                },
                required: ["anomalies", "summary"],
                additionalProperties: false,
              },
            },
          }],
          tool_choice: { type: "function", function: { name: "report_anomalies" } },
        }),
      });

      if (!aiResp.ok) {
        if (aiResp.status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429, headers: jsonHeaders });
        if (aiResp.status === 402) return new Response(JSON.stringify({ error: "AI credits depleted" }), { status: 402, headers: jsonHeaders });
        throw new Error(`AI error: ${aiResp.status}`);
      }

      const result = await aiResp.json();
      const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
      const parsed = toolCall ? JSON.parse(toolCall.function.arguments) : { anomalies: [], summary: "No anomalies detected" };

      return new Response(JSON.stringify(parsed), { headers: jsonHeaders });
    }

    // ─── CHURN RISK ───
    if (action === "churn_risk") {
      const { data: clients } = await supabase
        .from("clients")
        .select("id, legal_name, email, status, created_at")
        .eq("tenant_id", tenantId)
        .eq("status", "active")
        .limit(50);

      const { data: recentTasks } = await supabase
        .from("tasks")
        .select("client_id, status, due_date, updated_at")
        .eq("tenant_id", tenantId)
        .order("updated_at", { ascending: false })
        .limit(200);

      const { data: invoices } = await supabase
        .from("invoices")
        .select("client_id, status, due_date, total_pence")
        .eq("tenant_id", tenantId)
        .order("due_date", { ascending: false })
        .limit(200);

      const clientSummary = (clients || []).map(c => {
        const clientTasks = (recentTasks || []).filter(t => t.client_id === c.id);
        const overdueTasks = clientTasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== "done");
        const clientInvoices = (invoices || []).filter(i => i.client_id === c.id);
        const overdueInvoices = clientInvoices.filter(i => i.status === "overdue");
        return `${c.legal_name}: ${overdueTasks.length} overdue tasks, ${overdueInvoices.length} overdue invoices, joined ${c.created_at?.slice(0, 10)}`;
      }).join("\n");

      const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: "You are a practice management AI. Assess churn risk for each client based on overdue tasks, unpaid invoices, and engagement patterns." },
            { role: "user", content: `Assess churn risk:\n${clientSummary}` },
          ],
          tools: [{
            type: "function",
            function: {
              name: "assess_churn",
              description: "Return churn risk assessment per client",
              parameters: {
                type: "object",
                properties: {
                  risks: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        clientName: { type: "string" },
                        riskLevel: { type: "string", enum: ["low", "medium", "high"] },
                        riskScore: { type: "number", description: "0-100" },
                        signals: { type: "array", items: { type: "string" } },
                      },
                      required: ["clientName", "riskLevel", "riskScore", "signals"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["risks"],
                additionalProperties: false,
              },
            },
          }],
          tool_choice: { type: "function", function: { name: "assess_churn" } },
        }),
      });

      if (!aiResp.ok) {
        if (aiResp.status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429, headers: jsonHeaders });
        if (aiResp.status === 402) return new Response(JSON.stringify({ error: "AI credits depleted" }), { status: 402, headers: jsonHeaders });
        throw new Error(`AI error: ${aiResp.status}`);
      }

      const result = await aiResp.json();
      const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
      const parsed = toolCall ? JSON.parse(toolCall.function.arguments) : { risks: [] };
      return new Response(JSON.stringify(parsed), { headers: jsonHeaders });
    }

    // ─── REVENUE INSIGHTS ───
    if (action === "revenue_insights") {
      const { data: invoices } = await supabase
        .from("invoices")
        .select("client_id, total_pence, status, issued_at, clients(legal_name)")
        .eq("tenant_id", tenantId)
        .order("issued_at", { ascending: false })
        .limit(200);

      // Group by client
      const clientRevenue: Record<string, { name: string; total: number }> = {};
      const monthlyRevenue: Record<string, number> = {};

      (invoices || []).forEach((inv: any) => {
        const cName = inv.clients?.legal_name || "Unknown";
        if (!clientRevenue[inv.client_id]) clientRevenue[inv.client_id] = { name: cName, total: 0 };
        clientRevenue[inv.client_id].total += (inv.total_pence || 0) / 100;

        if (inv.issued_at) {
          const month = inv.issued_at.slice(0, 7);
          monthlyRevenue[month] = (monthlyRevenue[month] || 0) + (inv.total_pence || 0) / 100;
        }
      });

      const topClients = Object.entries(clientRevenue)
        .sort((a, b) => b[1].total - a[1].total)
        .slice(0, 10)
        .map(([id, v]) => ({ clientId: id, clientName: v.name, totalRevenue: v.total }));

      // Simple 3-month projection
      const months = Object.entries(monthlyRevenue).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 6);
      const avgMonthly = months.length > 0 ? months.reduce((a, [, v]) => a + v, 0) / months.length : 0;
      const now = new Date();
      const forecast = Array.from({ length: 3 }, (_, i) => {
        const d = new Date(now);
        d.setMonth(d.getMonth() + i + 1);
        return { month: d.toLocaleString("en-GB", { month: "short", year: "numeric" }), projected: Math.round(avgMonthly) };
      });

      return new Response(JSON.stringify({ topClients, forecast }), { headers: jsonHeaders });
    }

    // ─── STAFF UTILISATION ───
    if (action === "staff_utilisation") {
      const { data: timeEntries } = await supabase
        .from("time_entries")
        .select("user_id, minutes, is_billable, profiles(full_name)")
        .eq("tenant_id", tenantId)
        .limit(500);

      const staffMap: Record<string, { name: string; total: number; billable: number }> = {};
      (timeEntries || []).forEach((t: any) => {
        if (!staffMap[t.user_id]) staffMap[t.user_id] = { name: t.profiles?.full_name || "Unknown", total: 0, billable: 0 };
        staffMap[t.user_id].total += (t.minutes || 0);
        if (t.is_billable) staffMap[t.user_id].billable += (t.minutes || 0);
      });

      const utilisation = Object.entries(staffMap).map(([userId, v]) => ({
        userId,
        name: v.name,
        totalHours: +(v.total / 60).toFixed(1),
        billableHours: +(v.billable / 60).toFixed(1),
        utilisation: v.total > 0 ? Math.round((v.billable / v.total) * 100) : 0,
        capacity: Math.min(100, Math.round((v.total / 60) / (160) * 100)), // assume 160 hrs/month
      }));

      return new Response(JSON.stringify({ utilisation }), { headers: jsonHeaders });
    }

    return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), { status: 400, headers: jsonHeaders });
  } catch (e) {
    console.error("ai-intelligence error:", e);
    const status = (e as any).message?.includes("Rate limit") ? 429 : 500;
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
