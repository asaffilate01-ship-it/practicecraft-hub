/**
 * Typed API client skeleton — audience-safe wrappers around Supabase functions.
 * Staff client sets tenantId header; portal uses portal token.
 */
import { supabase } from "@/integrations/supabase/client";
import type {
  SecretarialChange,
  ValidationResult,
  SubmissionJob,
  IncorporationApplication,
} from "@/types/domain";

// ── Helpers ─────────────────────────────────────────────────

async function invoke<T = unknown>(
  fnName: string,
  body?: Record<string, unknown>,
  method: "POST" | "GET" = "POST"
): Promise<T> {
  const { data, error } = await supabase.functions.invoke(fnName, {
    body: method === "GET" ? undefined : body,
  });
  if (error) throw error;
  return data as T;
}

// ── Secretarial API ─────────────────────────────────────────

export const secretarialApi = {
  summary: (clientId: string) =>
    invoke("secretarial", { action: "summary", clientId }, "POST"),

  createChange: (clientId: string, body: Partial<SecretarialChange>) =>
    invoke<SecretarialChange>("secretarial", { action: "create_change", clientId, ...body }),

  validateChange: (clientId: string, changeId: string) =>
    invoke<ValidationResult>("secretarial", { action: "validate", clientId, changeId }),

  approveChange: (clientId: string, changeId: string) =>
    invoke<SecretarialChange>("secretarial", { action: "approve", clientId, changeId }),

  submitChange: (clientId: string, changeId: string) =>
    invoke<{ submissionJobId: string }>("secretarial", { action: "submit", clientId, changeId }),
};

// ── Incorporations API ──────────────────────────────────────

export const incorporationsApi = {
  create: (body: Partial<IncorporationApplication>) =>
    invoke<IncorporationApplication>("incorporations", { action: "create", ...body }),

  validate: (applicationId: string) =>
    invoke<ValidationResult>("incorporations", { action: "validate", applicationId }),

  submit: (applicationId: string) =>
    invoke<{ submissionJobId: string }>("incorporations", { action: "submit", applicationId }),
};

// ── Submissions API ─────────────────────────────────────────

export const submissionsApi = {
  list: (filters?: Record<string, unknown>) =>
    invoke<SubmissionJob[]>("submissions", { action: "list", ...filters }),

  get: (jobId: string) =>
    invoke<SubmissionJob>("submissions", { action: "get", jobId }),

  retry: (jobId: string) =>
    invoke<SubmissionJob>("submissions", { action: "retry", jobId }),

  cancel: (jobId: string) =>
    invoke<SubmissionJob>("submissions", { action: "cancel", jobId }),
};

// ── Integrations API ────────────────────────────────────────

export const integrationsApi = {
  /** Reset Companies House credentials — clears stored secrets */
  chReset: () =>
    invoke<{ ok: true }>("companies-house", { action: "reset-credentials" }),

  /** Reset HMRC credentials and tokens */
  hmrcReset: () =>
    invoke<{ ok: true }>("hmrc", { action: "reset-credentials" }),

  /** Get masked integration status for a tenant */
  status: () =>
    invoke<{
      companiesHouse: { enabled: boolean; presenterId?: string; email?: string; apiKey: string };
      hmrc: { enabled: boolean; environment: string; clientId?: string; clientSecret: string; hasTokens: boolean };
    }>("companies-house", { action: "integration-status" }),
};
