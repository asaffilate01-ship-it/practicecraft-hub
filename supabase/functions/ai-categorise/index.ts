import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

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

    const { transaction_ids } = await req.json();
    if (!transaction_ids?.length) throw new Error("No transaction_ids provided");

    // Fetch transactions
    const { data: txns, error: txnErr } = await supabase
      .from("bank_transactions")
      .select("id, description, amount_pence, transaction_type, reference")
      .in("id", transaction_ids.slice(0, 50));
    if (txnErr) throw txnErr;
    if (!txns?.length) throw new Error("No transactions found");

    // Get tenant's chart of accounts
    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", userData.user.id)
      .single();
    if (!profile) throw new Error("No profile found");

    const { data: accounts } = await supabase
      .from("chart_of_accounts")
      .select("id, code, name, account_type")
      .eq("tenant_id", profile.tenant_id)
      .eq("is_active", true)
      .order("code");

    if (!accounts?.length) throw new Error("No chart of accounts found");

    const accountList = accounts.map(a => `${a.code} - ${a.name} (${a.account_type})`).join("\n");
    const txnList = txns.map(t =>
      `ID: ${t.id} | Desc: "${t.description}" | Amount: £${(Math.abs(t.amount_pence) / 100).toFixed(2)} ${t.amount_pence < 0 ? 'OUT' : 'IN'} | Ref: ${t.reference || 'none'}`
    ).join("\n");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
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
    const suggestions = parsed.suggestions || [];

    // Update transactions with suggestions
    const updates = [];
    for (const s of suggestions) {
      const account = accounts.find(a => a.code === s.account_code);
      if (account) {
        updates.push(
          supabase.from("bank_transactions").update({
            suggested_account_id: account.id,
            categorisation_status: "suggested",
          }).eq("id", s.transaction_id)
        );
      }
    }
    await Promise.all(updates);

    return new Response(JSON.stringify({ suggestions, updated: updates.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-categorise error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
