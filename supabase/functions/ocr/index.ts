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
  const url = new URL(req.url);
  const pathParts = url.pathname.split("/").filter(Boolean);
  const subPath = pathParts.slice(1).join("/"); // after "ocr"

  try {
    // GET /ocr/jobs - list OCR jobs
    if (req.method === "GET" && subPath === "jobs") {
      const clientId = url.searchParams.get("clientId");
      const status = url.searchParams.get("status");

      let query = supabase
        .from("ocr_jobs")
        .select("*, document:documents(filename, mime_type), client:clients(legal_name)")
        .order("created_at", { ascending: false });

      if (clientId) query = query.eq("client_id", clientId);
      if (status) query = query.eq("status", status);

      const { data, error } = await query;
      if (error) throw error;
      return json(data);
    }

    // GET /ocr/jobs/:jobId - get single job
    const jobMatch = subPath.match(/^jobs\/([^/]+)$/);
    if (req.method === "GET" && jobMatch) {
      const { data, error } = await supabase
        .from("ocr_jobs")
        .select("*, document:documents(filename, mime_type, storage_path), extraction:receipt_extractions(*)")
        .eq("id", jobMatch[1])
        .single();

      if (error) throw error;
      return json(data);
    }

    // GET /ledger/suggestions - list suggestions
    if (req.method === "GET" && subPath === "ledger/suggestions") {
      const status = url.searchParams.get("status");
      const clientId = url.searchParams.get("clientId");

      let query = supabase
        .from("ledger_suggestions")
        .select("*, document:documents(filename), client:clients(legal_name), extraction:receipt_extractions(supplier_name, receipt_date, total_gross_pence)")
        .order("created_at", { ascending: false });

      if (status) query = query.eq("status", status);
      if (clientId) query = query.eq("client_id", clientId);

      const { data, error } = await query;
      if (error) throw error;
      return json(data);
    }

    // POST /ledger/suggestions/:id/approve
    const approveMatch = subPath.match(/^ledger\/suggestions\/([^/]+)\/approve$/);
    if (req.method === "POST" && approveMatch) {
      const suggestionId = approveMatch[1];
      const body = req.headers.get("content-length") !== "0" ? await req.json().catch(() => ({})) : {};

      // Get suggestion
      const { data: suggestion, error: sugErr } = await supabase
        .from("ledger_suggestions")
        .select("*")
        .eq("id", suggestionId)
        .single();

      if (sugErr || !suggestion) return json({ error: "Suggestion not found" }, 404);
      if (suggestion.status !== "suggested") return json({ error: "Already processed" }, 400);

      const lines = body.overrideLines || suggestion.lines_json;

      // Get profile for tenant_id
      const { data: prof } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("id", userId)
        .single();
      if (!prof) return json({ error: "Profile not found" }, 404);

      if (!Array.isArray(lines) || lines.length === 0) {
        return json({ error: "At least one reviewed debit line is required" }, 400);
      }
      const bankAccountId = body.bankAccountId || body.bank_account_id || lines[0]?.bank_account_id;
      if (!bankAccountId) {
        return json({ error: "Select the bank or cash account used for payment before posting" }, 400);
      }
      const { data: bankAccount } = await supabase
        .from("chart_of_accounts")
        .select("id, account_type")
        .eq("id", bankAccountId)
        .eq("tenant_id", prof.tenant_id)
        .eq("is_active", true)
        .maybeSingle();
      if (!bankAccount || bankAccount.account_type !== "asset") {
        return json({ error: "The balancing account must be an active bank or cash asset account" }, 400);
      }

      // Create journal entry
      const { data: journal, error: journalErr } = await supabase
        .from("journal_entries")
        .insert({
          tenant_id: prof!.tenant_id,
          client_id: suggestion.client_id,
          narration: `Receipt: ${suggestion.document_id}`,
          reference: `OCR-${suggestion.extraction_id || suggestion.id}`,
          created_by: userId,
          is_posted: false,
        })
        .select()
        .single();

      if (journalErr) throw journalErr;

      // Create journal lines from suggestion lines
      const journalLines = [];
      for (const line of lines) {
        const accountId = line.account_id || line.coa_id;
        const debit = Number(line.net_pence || line.gross_pence || 0) / 100;
        if (!accountId || !Number.isFinite(debit) || debit <= 0) {
          await supabase.from("journal_entries").delete().eq("id", journal.id);
          return json({ error: "Every reviewed line needs an account and positive amount" }, 400);
        }
        journalLines.push({
          journal_entry_id: journal.id,
          account_id: accountId,
          debit,
          credit: 0,
          description: line.description || "Receipt expense",
        });
      }
      const totalDebit = journalLines.reduce((sum: number, line: { debit: number }) => sum + line.debit, 0);
      journalLines.push({
        journal_entry_id: journal.id,
        account_id: bankAccount.id,
        debit: 0,
        credit: totalDebit,
        description: "Payment",
      });

      const { error: linesError } = await supabase.from("journal_lines").insert(journalLines);
      if (linesError) {
        await supabase.from("journal_entries").delete().eq("id", journal.id);
        throw linesError;
      }
      const { error: postError } = await supabase.from("journal_entries").update({ is_posted: true }).eq("id", journal.id);
      if (postError) throw postError;

      // Update suggestion
      await supabase
        .from("ledger_suggestions")
        .update({
          status: "posted",
          approved_by_user_id: userId,
          approved_at: new Date().toISOString(),
          posted_journal_id: journal.id,
        })
        .eq("id", suggestionId);

      // Audit log
      await supabase.from("event_logs").insert({
        tenant_id: prof!.tenant_id,
        event_type: "ledger_suggestion_posted",
        source: "user",
        actor_user_id: userId,
        client_id: suggestion.client_id,
        payload_json: { suggestionId, journalId: journal.id },
      });

      return json({ success: true, journalId: journal.id });
    }

    // POST /ledger/suggestions/:id/reject
    const rejectMatch = subPath.match(/^ledger\/suggestions\/([^/]+)\/reject$/);
    if (req.method === "POST" && rejectMatch) {
      const suggestionId = rejectMatch[1];
      const body = req.headers.get("content-length") !== "0" ? await req.json().catch(() => ({})) : {};

      const { error } = await supabase
        .from("ledger_suggestions")
        .update({
          status: "rejected",
          reason: body.reason || null,
          approved_by_user_id: userId,
          approved_at: new Date().toISOString(),
        })
        .eq("id", suggestionId)
        .eq("status", "suggested");

      if (error) throw error;
      return json({ success: true });
    }

    return json({ error: "Not found" }, 404);
  } catch (err) {
    console.error("OCR/Ledger error:", err);
    return json({ error: err.message || "Internal error" }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
