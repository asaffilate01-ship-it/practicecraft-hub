import { describe, expect, it } from "vitest";
import {
  defaultComplianceProfile,
  disclosureFields,
  evaluateAccountsPreparation,
  POLICY_FIELDS,
  type AccountsComplianceProfile,
} from "@/lib/accountsCompliance";
import type { TBEntry } from "@/components/accounts/TrialBalanceStep";

const balancedEntries: TBEntry[] = [
  {
    account_code: "1000",
    account_name: "Bank",
    account_type: "asset",
    debit_pence: 100_000,
    credit_pence: 0,
    adjustment_debit_pence: 0,
    adjustment_credit_pence: 0,
    adjustment_notes: "",
    sort_order: 10,
    comparative_debit_pence: 80_000,
    comparative_credit_pence: 0,
  },
  {
    account_code: "4000",
    account_name: "Turnover",
    account_type: "income",
    debit_pence: 0,
    credit_pence: 100_000,
    adjustment_debit_pence: 0,
    adjustment_credit_pence: 0,
    adjustment_notes: "",
    sort_order: 20,
    comparative_debit_pence: 0,
    comparative_credit_pence: 80_000,
  },
];

function completeProfile(framework: AccountsComplianceProfile["framework"]): AccountsComplianceProfile {
  const profile = defaultComplianceProfile("tenant", "period", framework === "frs105" ? "FRS 105" : "FRS 102 Section 1A");
  return {
    ...profile,
    id: "profile",
    framework_eligibility_confirmed: true,
    comparatives_complete: true,
    policy_data: Object.fromEntries(POLICY_FIELDS[framework].map((field) => [field.key, `Policy for ${field.label}`])),
    disclosure_checks: Object.fromEntries(disclosureFields(framework, "ltd").map((field) => [field.key, true])),
  };
}

describe("accounts compliance preparation gates", () => {
  it("blocks an unsaved setup and an unbalanced trial balance", () => {
    const entries = balancedEntries.map((entry, index) => index === 0 ? { ...entry, debit_pence: 90_000 } : entry);
    const checks = evaluateAccountsPreparation(null, entries, "ltd");
    expect(checks.find((check) => check.key === "setup")?.passed).toBe(false);
    expect(checks.find((check) => check.key === "trial_balance")?.passed).toBe(false);
  });

  it("passes all deterministic controls for a complete FRS 102 Section 1A profile", () => {
    const checks = evaluateAccountsPreparation(completeProfile("frs102_1a"), balancedEntries, "ltd");
    expect(checks.every((check) => check.passed)).toBe(true);
  });

  it("requires the additional FRS 102 policy and disclosure controls", () => {
    expect(POLICY_FIELDS.frs102_1a.map((field) => field.key)).toContain("financial_instruments");
    expect(disclosureFields("frs102_1a", "ltd").map((field) => field.key)).toContain("material_judgements");
    expect(disclosureFields("frs105", "sole_trader").map((field) => field.key)).not.toContain("director_or_member_advances");
  });

  it("does not treat zero comparative balances as incomplete without the preparer attestation", () => {
    const profile = { ...completeProfile("frs105"), comparatives_complete: false };
    const checks = evaluateAccountsPreparation(profile, balancedEntries, "ltd");
    expect(checks.find((check) => check.key === "comparatives")?.passed).toBe(false);
  });
});
