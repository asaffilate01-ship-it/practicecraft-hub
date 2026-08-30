import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  canRequestIxbrlTestPackage,
  ixbrlStageLabel,
  parseIxbrlFacts,
  parseIxbrlIssues,
} from "@/lib/ixbrlPreflight";

describe("iXBRL preparation controls", () => {
  it("parses only facts with an account and concept", () => {
    const facts = parseIxbrlFacts([
      { account_code: "4000", account_name: "Turnover", concept: "TurnoverRevenue", current_value_pence: -125_000 },
      { account_code: "1000" },
      null,
    ]);
    expect(facts).toHaveLength(1);
    expect(facts[0].concept).toBe("TurnoverRevenue");
    expect(facts[0].current_value_pence).toBe(-125_000);
  });

  it("treats malformed validation data as a blocking issue", () => {
    expect(parseIxbrlIssues([{ message: "Missing company number" }])).toEqual([
      { code: "UNKNOWN", message: "Missing company number", severity: "blocking" },
    ]);
  });

  it("requires review and real validator evidence before test readiness", () => {
    expect(canRequestIxbrlTestPackage({
      facts_reviewed_at: "2026-08-31T09:00:00Z",
      external_validation_status: "passed",
      test_package_status: "not_ready",
    })).toBe(true);
    expect(canRequestIxbrlTestPackage({
      facts_reviewed_at: "2026-08-31T09:00:00Z",
      external_validation_status: "not_run",
      test_package_status: "not_ready",
    })).toBe(false);
  });

  it("does not confuse internal preflight with regulator acceptance", () => {
    expect(ixbrlStageLabel({
      preflight_status: "passed",
      facts_reviewed_at: null,
      external_validation_status: "not_run",
      test_package_status: "not_ready",
    })).toBe("Preflight passed");
  });
});

describe("iXBRL database authority boundary", () => {
  const migration = readFileSync(
    "supabase/migrations/20260831090000_ixbrl_preflight_phase.sql",
    "utf8",
  );

  it("keeps external validation and provider outcomes server-only", () => {
    expect(migration).toContain("record_ixbrl_external_validation");
    expect(migration).toContain("record_ixbrl_test_result");
    expect(migration).toContain("REVOKE ALL ON FUNCTION public.record_ixbrl_external_validation");
    expect(migration).toContain("TO service_role");
  });

  it("requires locked accounts and independent tagged-facts review", () => {
    expect(migration).toContain("v_profile.status <> 'locked'");
    expect(migration).toContain("v_instance.prepared_by_user_id = auth.uid()");
    expect(migration).toContain("external_validation_status <> 'passed'");
  });

  it("never enables live accounts filing in this phase", () => {
    expect(migration).toContain("live_filing_enabled boolean NOT NULL DEFAULT false");
    expect(migration).not.toContain("live_filing_enabled = true");
  });
});
