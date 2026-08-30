import type { Json } from "@/integrations/supabase/types";

export type IxbrlIssue = {
  code: string;
  severity: "blocking" | "warning";
  message: string;
};

export type IxbrlFact = {
  account_code: string;
  account_name: string;
  account_type: string;
  concept: string;
  namespace: string;
  context_ref: string;
  unit_ref: string;
  decimals: number;
  current_value_pence: number;
  comparative_value_pence: number;
};

export function parseIxbrlIssues(value: Json): IxbrlIssue[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || Array.isArray(item) || typeof item !== "object") return [];
    const code = typeof item.code === "string" ? item.code : "UNKNOWN";
    const message = typeof item.message === "string" ? item.message : "Validation issue";
    const severity = item.severity === "warning" ? "warning" : "blocking";
    return [{ code, message, severity }];
  });
}

export function parseIxbrlFacts(value: Json): IxbrlFact[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || Array.isArray(item) || typeof item !== "object") return [];
    if (typeof item.account_code !== "string" || typeof item.concept !== "string") return [];
    return [{
      account_code: item.account_code,
      account_name: typeof item.account_name === "string" ? item.account_name : item.account_code,
      account_type: typeof item.account_type === "string" ? item.account_type : "unknown",
      concept: item.concept,
      namespace: typeof item.namespace === "string" ? item.namespace : "uk-gaap",
      context_ref: typeof item.context_ref === "string" ? item.context_ref : "CurrentPeriod",
      unit_ref: typeof item.unit_ref === "string" ? item.unit_ref : "GBP",
      decimals: typeof item.decimals === "number" ? item.decimals : 0,
      current_value_pence: typeof item.current_value_pence === "number" ? item.current_value_pence : 0,
      comparative_value_pence: typeof item.comparative_value_pence === "number" ? item.comparative_value_pence : 0,
    }];
  });
}

export function ixbrlStageLabel(instance: {
  preflight_status: string;
  facts_reviewed_at: string | null;
  external_validation_status: string;
  test_package_status: string;
}): string {
  if (instance.test_package_status === "accepted") return "Test accepted";
  if (instance.test_package_status === "rejected") return "Test rejected";
  if (instance.test_package_status === "submitted") return "Test submitted";
  if (instance.test_package_status === "ready") return "Test ready";
  if (instance.external_validation_status === "passed") return "Validator passed";
  if (instance.external_validation_status === "failed") return "Validator failed";
  if (instance.facts_reviewed_at) return "Facts review complete";
  if (instance.preflight_status === "passed") return "Preflight passed";
  if (instance.preflight_status === "failed") return "Action required";
  return "Draft";
}

export function canRequestIxbrlTestPackage(instance: {
  facts_reviewed_at: string | null;
  external_validation_status: string;
  test_package_status: string;
}): boolean {
  return Boolean(instance.facts_reviewed_at)
    && instance.external_validation_status === "passed"
    && instance.test_package_status === "not_ready";
}

export function formatPence(value: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 2,
  }).format(value / 100);
}
