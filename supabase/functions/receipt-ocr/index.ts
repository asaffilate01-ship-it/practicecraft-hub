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

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const clientId = formData.get("client_id") as string;

    if (!file || !clientId) throw new Error("file and client_id required");

    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", userData.user.id)
      .single();
    if (!profile) throw new Error("Profile not found");

    const arrayBuffer = await file.arrayBuffer();
    const digest = await crypto.subtle.digest("SHA-256", arrayBuffer);
    const sha256 = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
    const { data: duplicate } = await supabase
      .from("document_fingerprints")
      .select("document_id")
      .eq("tenant_id", profile.tenant_id)
      .eq("client_id", clientId)
      .eq("sha256", sha256)
      .maybeSingle();
    if (duplicate) {
      return new Response(JSON.stringify({ error: "This receipt is an exact duplicate of a document already uploaded for this client." }), {
        status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Upload file to storage
    const filePath = `${profile.tenant_id}/${clientId}/receipts/${Date.now()}_${file.name}`;
    const { error: uploadErr } = await supabase.storage
      .from("client-documents")
      .upload(filePath, file, { contentType: file.type });
    if (uploadErr) throw uploadErr;

    // Create document record
    const { data: doc, error: docErr } = await supabase
      .from("documents")
      .insert({
        tenant_id: profile.tenant_id,
        client_id: clientId,
        filename: file.name,
        mime_type: file.type,
        size_bytes: file.size,
        storage_path: filePath,
        document_type: "receipt",
        folder_path: "/receipts",
        uploaded_by_user_id: userData.user.id,
      })
      .select()
      .single();
    if (docErr) throw docErr;

    const { error: fingerprintErr } = await supabase.from("document_fingerprints").insert({
      tenant_id: profile.tenant_id,
      client_id: clientId,
      document_id: doc.id,
      sha256,
      size_bytes: file.size,
    });
    if (fingerprintErr) {
      await supabase.from("documents").delete().eq("id", doc.id);
      await supabase.storage.from("client-documents").remove([filePath]);
      throw fingerprintErr;
    }

    // Convert file to base64 for AI vision
    const bytes = new Uint8Array(arrayBuffer);
    let binary = "";
    for (let offset = 0; offset < bytes.length; offset += 32768) {
      binary += String.fromCharCode(...bytes.subarray(offset, offset + 32768));
    }
    const base64 = btoa(binary);
    const mediaType = file.type || "image/jpeg";

    // Get chart of accounts for mapping
    const { data: accounts } = await supabase
      .from("chart_of_accounts")
      .select("id, code, name, account_type")
      .eq("tenant_id", profile.tenant_id)
      .eq("is_active", true)
      .order("code");

    const accountList = (accounts || [])
      .filter(a => a.account_type === "expense" || a.account_type === "asset")
      .map(a => `${a.code} - ${a.name} (${a.account_type})`)
      .join("\n");

    // Call Lovable AI with vision to extract receipt data
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a UK accounting receipt extraction assistant. Extract structured data from receipt images and match expenses to the provided chart of accounts.`
          },
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: `data:${mediaType};base64,${base64}` }
              },
              {
                type: "text",
                text: `Extract data from this receipt. Chart of Accounts for matching:\n${accountList}`
              }
            ]
          }
        ],
        tools: [{
          type: "function",
          function: {
            name: "extract_receipt",
            description: "Extract structured receipt data",
            parameters: {
              type: "object",
              properties: {
                supplier_name: { type: "string" },
                invoice_number: { type: "string" },
                receipt_date: { type: "string", description: "ISO date YYYY-MM-DD" },
                currency: { type: "string", description: "e.g. GBP" },
                subtotal_pence: { type: "number" },
                vat_pence: { type: "number" },
                total_pence: { type: "number" },
                vat_rate: { type: "number", description: "e.g. 20 for 20%" },
                payment_method: { type: "string" },
                suggested_account_code: { type: "string", description: "Best matching account code from COA" },
                line_items: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      description: { type: "string" },
                      quantity: { type: "number" },
                      unit_price_pence: { type: "number" },
                      total_pence: { type: "number" }
                    },
                    required: ["description", "total_pence"],
                    additionalProperties: false
                  }
                },
                confidence: { type: "string", enum: ["high", "medium", "low"] }
              },
              required: ["supplier_name", "total_pence", "confidence"],
              additionalProperties: false
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "extract_receipt" } }
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits depleted" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI error: ${aiResponse.status}`);
    }

    const aiResult = await aiResponse.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No AI extraction result");

    const extraction = JSON.parse(toolCall.function.arguments);

    // Find suggested account
    const suggestedAccount = (accounts || []).find(a => a.code === extraction.suggested_account_code);

    const confidence = extraction.confidence === "high" ? 95 : extraction.confidence === "medium" ? 75 : 45;
    const totalGrossPence = Math.round(Number(extraction.total_pence) || 0);
    const totalVatPence = Math.round(Number(extraction.vat_pence) || 0);
    const totalNetPence = Math.round(Number(extraction.subtotal_pence) || (totalGrossPence - totalVatPence));
    const { data: savedExtraction, error: extractionErr } = await supabase
      .from("receipt_extractions")
      .upsert({
        tenant_id: profile.tenant_id,
        client_id: clientId,
        document_id: doc.id,
        supplier_name: extraction.supplier_name || null,
        invoice_number: extraction.invoice_number || null,
        receipt_date: extraction.receipt_date || null,
        currency: extraction.currency || "GBP",
        total_gross_pence: totalGrossPence,
        total_vat_pence: totalVatPence,
        total_net_pence: totalNetPence,
        confidence,
        raw_json: extraction,
      }, { onConflict: "tenant_id,document_id" })
      .select("id")
      .single();
    if (extractionErr) throw extractionErr;

    await supabase.from("documents").update({
      status: "processed",
      ocr_text: JSON.stringify(extraction),
    }).eq("id", doc.id);

    return new Response(JSON.stringify({
      document_id: doc.id,
      extraction_id: savedExtraction.id,
      extraction,
      suggested_account: suggestedAccount || null,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("receipt-ocr error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
