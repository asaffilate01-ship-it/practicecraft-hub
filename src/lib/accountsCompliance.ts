import type { TBEntry } from "@/components/accounts/TrialBalanceStep";

export type AccountsFramework = "frs105" | "frs102_1a";
export type AccountsEntitySize = "micro" | "small";
export type AccountsRoundingBasis = "pounds" | "thousands";
export type AccountsComplianceStatus = "drafting" | "prepared" | "locked" | "reopened";

export type AccountsComplianceProfile = {
  id?: string;
  tenant_id: string;
  period_id: string;
  framework: AccountsFramework;
  entity_size: AccountsEntitySize;
  rounding_basis: AccountsRoundingBasis;
  framework_eligibility_confirmed: boolean;
  comparatives_required: boolean;
  comparatives_complete: boolean;
  policy_data: Record<string, string>;
  disclosure_checks: Record<string, boolean>;
  status: AccountsComplianceStatus;
  prepared_by_user_id?: string | null;
  prepared_at?: string | null;
  reviewed_by_user_id?: string | null;
  reviewed_at?: string | null;
  review_statement?: string | null;
  reopened_at?: string | null;
  reopen_reason?: string | null;
};

export const FRAMEWORK_OPTIONS: Array<{
  value: AccountsFramework;
  label: string;
  entitySize: AccountsEntitySize;
  description: string;
}> = [
  {
    value: "frs105",
    label: "FRS 105",
    entitySize: "micro",
    description: "Micro-entities regime. Eligibility must be confirmed for the reporting period.",
  },
  {
    value: "frs102_1a",
    label: "FRS 102 Section 1A",
    entitySize: "small",
    description: "Small-entities presentation and disclosure controls under FRS 102.",
  },
];

export const POLICY_FIELDS: Record<AccountsFramework, Array<{ key: string; label: string; hint: string }>> = {
  frs105: [
    { key: "basis_of_preparation", label: "Basis of preparation", hint: "State the reporting framework, historical-cost basis and presentation currency." },
    { key: "going_concern", label: "Going concern", hint: "Record the assessment, period considered and conclusion." },
    { key: "turnover", label: "Turnover / revenue", hint: "Describe when revenue is recognised for the entity's material income streams." },
    { key: "tangible_fixed_assets", label: "Tangible fixed assets", hint: "State measurement basis, useful lives, depreciation method and residual-value policy." },
  ],
  frs102_1a: [
    { key: "basis_of_preparation", label: "Basis of preparation", hint: "State the reporting framework, historical-cost basis and presentation currency." },
    { key: "going_concern", label: "Going concern", hint: "Record the assessment, period considered and conclusion." },
    { key: "turnover", label: "Turnover / revenue", hint: "Describe when revenue is recognised for the entity's material income streams." },
    { key: "tangible_fixed_assets", label: "Tangible fixed assets", hint: "State measurement basis, useful lives, depreciation method and residual-value policy." },
    { key: "financial_instruments", label: "Financial instruments", hint: "Describe the policy for material basic and other financial instruments." },
  ],
};

const BASE_DISCLOSURES = [
  { key: "entity_eligibility", label: "Entity size and reporting-regime eligibility documented" },
  { key: "related_parties", label: "Related-party population and transactions reviewed" },
  { key: "commitments_contingencies", label: "Commitments, guarantees and contingencies reviewed" },
  { key: "post_balance_events", label: "Events after the reporting date reviewed" },
  { key: "average_employees", label: "Average employee disclosure supported" },
];

export function disclosureFields(framework: AccountsFramework, entityType: string) {
  return [
    ...BASE_DISCLOSURES,
    ...(framework === "frs102_1a"
      ? [{ key: "material_judgements", label: "Material judgements and estimation uncertainty reviewed" }]
      : []),
    ...(["ltd", "llp"].includes(entityType)
      ? [{ key: "director_or_member_advances", label: "Director or member advances, credits and guarantees reviewed" }]
      : []),
  ];
}

export type PreparationCheck = {
  key: string;
  label: string;
  passed: boolean;
};

export function evaluateAccountsPreparation(
  profile: AccountsComplianceProfile | null | undefined,
  entries: TBEntry[],
  entityType: string,
): PreparationCheck[] {
  const adjustedDebits = entries.reduce((total, entry) => total + entry.debit_pence + entry.adjustment_debit_pence, 0);
  const adjustedCredits = entries.reduce((total, entry) => total + entry.credit_pence + entry.adjustment_credit_pence, 0);
  const policies = profile ? POLICY_FIELDS[profile.framework] : [];
  const disclosures = profile ? disclosureFields(profile.framework, entityType) : [];

  return [
    { key: "setup", label: "Compliance setup saved", passed: Boolean(profile?.id) },
    { key: "eligibility", label: "Framework eligibility confirmed", passed: Boolean(profile?.framework_eligibility_confirmed) },
    { key: "trial_balance", label: "Adjusted trial balance exists and balances", passed: entries.length > 0 && adjustedDebits === adjustedCredits },
    {
      key: "comparatives",
      label: "Comparatives completed or correctly marked not required",
      passed: Boolean(profile && (!profile.comparatives_required || profile.comparatives_complete)),
    },
    {
      key: "policies",
      label: "Required accounting policies completed",
      passed: Boolean(profile && policies.every((field) => profile.policy_data[field.key]?.trim())),
    },
    {
      key: "disclosures",
      label: "Required disclosure controls completed",
      passed: Boolean(profile && disclosures.every((field) => profile.disclosure_checks[field.key])),
    },
  ];
}

export function defaultComplianceProfile(
  tenantId: string,
  periodId: string,
  accountsStandard: string,
): AccountsComplianceProfile {
  const framework: AccountsFramework = accountsStandard.toLowerCase().includes("105") ? "frs105" : "frs102_1a";
  return {
    tenant_id: tenantId,
    period_id: periodId,
    framework,
    entity_size: framework === "frs105" ? "micro" : "small",
    rounding_basis: "pounds",
    framework_eligibility_confirmed: false,
    comparatives_required: true,
    comparatives_complete: false,
    policy_data: {},
    disclosure_checks: {},
    status: "drafting",
  };
}
