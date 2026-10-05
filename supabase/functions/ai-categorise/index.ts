import { AccessError, requireStaff, requirePermissions, validateSuggestions, uuid } from "../_shared/access.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (req.method !== "POST") throw new AccessError("POST required", 405);
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) throw new AccessError("Authentication required", 401);
    const token = authHeader.slice(7);
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } }
    );
    const actor = await requireStaff(supabase, token);
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    const { transaction_ids } = await req.json();
    if (!Array.isArray(transaction_ids) || transaction_ids.length < 1 || transaction_ids.length > 50
      || transaction_ids.some(id => typeof id !== "string" || !uuid.test(id))
      || new Set(transaction_ids).size !== transaction_ids.length) throw new AccessError("Provide 1–50 unique transaction IDs", 400);
    await requirePermissions(supabase, actor, ["ledger.view", "ledger.edit"]);
    if (!LOVABLE_API_KEY) throw new AccessError("AI provider is not configured", 503);

    // Fetch transactions
    const { data: txns, error: txnErr } = await supabase
      .from("bank_transactions")
      .select("id, description, amount_pence, transaction_type, reference")
      .eq("tenant_id", actor.tenantId)
      .in("categorisation_status", ["uncategorised", "suggested"])
      .in("id", transaction_ids);
    if (txnErr) throw txnErr;
    if (txns?.length !== transaction_ids.length) throw new AccessError("Transactions unavailable or already confirmed", 409);

    // Get tenant's chart of accounts
    const { data: accounts } = await supabase
      .from("chart_of_accounts")
      .select("id, code, name, account_type")
      .eq("tenant_id", actor.tenantId)
      .eq("is_active", true)
      .order("code");

    if (!accounts?.length) throw new Error("No chart of accounts found");

    const accountList = accounts.map(a => `${a.code} - ${a.name} (${a.account_type})`).join("\n");
    const txnList = txns.map(t =>
      `ID: ${t.id} | Desc: "${t.description}" | Amount: £${(Math.abs(t.amount_pence) / 100).toFixed(2)} ${t.amount_pence < 0 ? 'OUT' : 'IN'} | Ref: ${t.reference || 'none'}`
    ).join("\n");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      signal: AbortSignal.timeout(45000),
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are a UK bookkeeping assistant. Given bank transactions and a chart of accounts, suggest the most appropriate account for each transaction. Consider the description, amount, direction (IN=credit/income, OUT=debit/expense), and reference.`
          },
          {
            role: "user",
            content: `Chart of Accounts:\n${accountList}\n\nTransactions to categorise:\n${txnList}`
          }
        ],
        tools: [{
          type: "function",
          function: {
            name: "categorise_transactions",
            description: "Return suggested account codes for each transaction",
            parameters: {
              type: "object",
              properties: {
                suggestions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      transaction_id: { type: "string" },
                      account_code: { type: "string", description: "The chart of accounts code" },
                      confidence: { type: "string", enum: ["high", "medium", "low"] },
                      reason: { type: "string", description: "Brief reason for the suggestion" }
                    },
                    required: ["transaction_id", "account_code", "confidence"],
                    additionalProperties: false
                  }
                }
              },
              required: ["suggestions"],
              additionalProperties: false
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "categorise_transactions" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits depleted. Please top up." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResult = await response.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No AI response");

    const parsed = JSON.parse(toolCall.function.arguments);
    const suggestions = validateSuggestions(parsed.suggestions, txns, accounts);

    // Update transactions with suggestions
    const updates = [];
    for (const s of suggestions) {
      const account = accounts.find(a => a.code === s.account_code);
      if (account) {
        updates.push(
          supabase.from("bank_transactions").update({
            suggested_account_id: account.id,
            categorisation_status: "suggested",
          }).eq("id", s.transaction_id).eq("tenant_id", actor.tenantId)
            .in("categorisation_status", ["uncategorised", "suggested"]).select("id")
        );
      }
    }
    const results = await Promise.all(updates);
    if (results.some(r => r.error || r.data?.length !== 1)) throw new AccessError("Some suggestions could not be saved; refresh before retrying", 409);

    return new Response(JSON.stringify({ suggestions, updated: updates.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-categorise error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: e instanceof AccessError ? e.status : 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
