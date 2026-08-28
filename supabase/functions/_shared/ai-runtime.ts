import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { AI_PROMPT_VERSION, isUuid } from "./ai-contracts.ts";

type AiGatewayResponse = {
  choices?: Array<{
    message?: {
      tool_calls?: Array<{ function?: { arguments?: unknown } }>;
    };
  }>;
};

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function corsHeaders(req: Request): Record<string, string> {
  const configured = (Deno.env.get("ALLOWED_ORIGINS") || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const origin = req.headers.get("Origin");
  const allowedOrigin = configured.length === 0
    ? "*"
    : origin && configured.includes(origin) ? origin : configured[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

export function json(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json" },
  });
}

export function adminClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) throw new HttpError(503, "Server database credentials are not configured");
  return createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function requireStaff(req: Request, supabase: ReturnType<typeof adminClient>) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) throw new HttpError(401, "Unauthorized");
  const { data, error } = await supabase.auth.getUser(authHeader.slice(7));
  if (error || !data.user) throw new HttpError(401, "Unauthorized");

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", data.user.id)
    .maybeSingle();
  if (profileError) throw new HttpError(500, "Unable to resolve staff profile");
  if (!profile?.tenant_id) throw new HttpError(403, "Active staff access is required");

  const { data: staffRoles, error: roleError } = await supabase
    .from("user_roles")
    .select("tenant_id, role")
    .eq("user_id", data.user.id)
    .eq("tenant_id", profile.tenant_id)
    .in("role", ["super_admin", "firm_owner", "manager", "staff", "payroll_officer"]);
  if (roleError) throw new HttpError(500, "Unable to verify staff permissions");
  if (!staffRoles?.length) throw new HttpError(403, "Active staff access is required");
  return { userId: data.user.id, tenantId: profile.tenant_id as string };
}

export async function requireTenantClient(
  supabase: ReturnType<typeof adminClient>,
  tenantId: string,
  clientId: unknown,
): Promise<string> {
  if (!isUuid(clientId)) throw new HttpError(400, "A valid client_id is required");
  const { data, error } = await supabase
    .from("clients")
    .select("id")
    .eq("id", clientId)
    .eq("tenant_id", tenantId)
    .maybeSingle();
  if (error) throw new HttpError(500, "Unable to verify client access");
  if (!data) throw new HttpError(403, "Client access denied");
  return clientId;
}

function gatewayConfig(kind: "text" | "vision") {
  const apiKey = Deno.env.get("AI_API_KEY") || Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) throw new HttpError(503, "AI provider is not configured");
  const endpoint = Deno.env.get("AI_GATEWAY_URL") || "https://ai.gateway.lovable.dev/v1/chat/completions";
  let url: URL;
  try { url = new URL(endpoint); } catch { throw new HttpError(503, "AI gateway URL is invalid"); }
  const allowedHosts = (Deno.env.get("AI_GATEWAY_ALLOWED_HOSTS") || "ai.gateway.lovable.dev")
    .split(",").map((value) => value.trim()).filter(Boolean);
  if (url.protocol !== "https:" || !allowedHosts.includes(url.hostname)) {
    throw new HttpError(503, "AI gateway is not in the configured allowlist");
  }
  const model = kind === "vision"
    ? Deno.env.get("AI_VISION_MODEL") || "google/gemini-2.5-flash"
    : Deno.env.get("AI_TEXT_MODEL") || "google/gemini-2.5-flash";
  if (model.toLowerCase().includes("preview")) throw new HttpError(503, "Preview AI models are disabled");
  return { apiKey, endpoint: url.toString(), model, provider: url.hostname };
}

export async function callAiTool(options: {
  kind?: "text" | "vision";
  messages: unknown[];
  tools: unknown[];
  toolChoice: unknown;
}): Promise<{ arguments: unknown; model: string; provider: string }> {
  const config = gatewayConfig(options.kind || "text");
  const requestBody = JSON.stringify({
    model: config.model,
    messages: options.messages,
    tools: options.tools,
    tool_choice: options.toolChoice,
    temperature: 0,
  });

  let lastStatus = 0;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);
    try {
      const response = await fetch(config.endpoint, {
        method: "POST",
        headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" },
        body: requestBody,
        signal: controller.signal,
        redirect: "error",
      });
      lastStatus = response.status;
      if (response.ok) {
        const contentLength = Number(response.headers.get("content-length") || 0);
        if (contentLength > 2_000_000) throw new HttpError(502, "AI provider response was too large");
        const responseText = await response.text();
        if (responseText.length > 2_000_000) throw new HttpError(502, "AI provider response was too large");
        let payload: AiGatewayResponse;
        try { payload = JSON.parse(responseText) as AiGatewayResponse; } catch { throw new HttpError(502, "AI provider returned invalid JSON"); }
        const rawArguments = payload?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
        if (typeof rawArguments !== "string") throw new HttpError(502, "AI provider returned no structured result");
        let parsed: unknown;
        try { parsed = JSON.parse(rawArguments); } catch { throw new HttpError(502, "AI provider returned invalid structured data"); }
        return { arguments: parsed, model: config.model, provider: config.provider };
      }
      if (response.status === 402) throw new HttpError(503, "AI provider credits are unavailable");
      if (response.status !== 429 && response.status < 500) break;
    } catch (error) {
      if (error instanceof HttpError) throw error;
      if (attempt === 1) throw new HttpError(504, "AI provider timed out or could not be reached");
    } finally {
      clearTimeout(timeout);
    }
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  throw new HttpError(lastStatus === 429 ? 429 : 502, lastStatus === 429 ? "AI rate limit exceeded" : "AI provider rejected the request");
}

export async function recordAiOperation(
  supabase: ReturnType<typeof adminClient>,
  values: {
    tenantId: string;
    userId: string;
    clientId?: string | null;
    action: string;
    status: "succeeded" | "failed";
    provider?: string | null;
    model?: string | null;
    inputCount?: number;
    outputCount?: number;
    durationMs: number;
    errorCode?: string | null;
    metadata?: Record<string, unknown>;
  },
) {
  const { error } = await supabase.from("ai_operation_runs").insert({
    tenant_id: values.tenantId,
    user_id: values.userId,
    client_id: values.clientId || null,
    action: values.action,
    status: values.status,
    provider: values.provider || null,
    model: values.model || null,
    prompt_version: AI_PROMPT_VERSION,
    input_count: values.inputCount || 0,
    output_count: values.outputCount || 0,
    duration_ms: Math.max(0, Math.round(values.durationMs)),
    error_code: values.errorCode || null,
    metadata_json: values.metadata || {},
  });
  if (error) console.error("Unable to record AI operation audit", error.message);
}

export function errorResponse(req: Request, error: unknown): Response {
  const status = error instanceof HttpError ? error.status : 500;
  const message = error instanceof Error ? error.message : "Unexpected server error";
  console.error("AI function error", { status, message });
  return json(req, { error: status >= 500 && !(error instanceof HttpError) ? "Unexpected server error" : message }, status);
}
