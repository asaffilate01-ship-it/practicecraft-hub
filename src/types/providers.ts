/**
 * Provider adapter types for regulatory submission workers.
 * Used by edge functions that process queued submission_jobs.
 */

export type ProviderName =
  | "hmrc_vat"
  | "hmrc_rti"
  | "companies_house"
  | "charity_commission"
  | "hmrc_sa"
  | "hmrc_ct";

export type SubmissionKind =
  | "VAT_RETURN"
  | "FPS"
  | "EPS"
  | "CONFIRMATION_STATEMENT"
  | "AD01"
  | "CH01"
  | "PSC01"
  | "AA01"
  | "CHARITY_RETURN"
  | "SA_RETURN"
  | "CT600";

export type AdapterSubmitInput = {
  tenantId: string;
  jobId: string;
  kind: SubmissionKind;
  ref: string;
  correlationId: string;
  payload: Record<string, unknown>;
  mode?: "test" | "live";
};

export type AdapterSubmitResult = {
  accepted: boolean;
  httpStatus?: number;
  code?: string;
  message?: string;
  externalRef?: string;
  metaRedacted?: Record<string, unknown>;
  resultPublic?: Record<string, unknown>;
};

export interface ProviderAdapter {
  name: ProviderName;
  submit(input: AdapterSubmitInput): Promise<AdapterSubmitResult>;
}
