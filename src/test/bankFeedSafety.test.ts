// @vitest-environment node
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { requireManualBankConnection, validateBankCsvFile } from "@/lib/bankFeedSafety";

const manual = { id: "bank-a", tenant_id: "practice-a", client_id: "client-a", provider: "manual" };
describe("TaxLounge manual bank import boundaries", () => {
  it("accepts only a current practice/client manual account", () => {
    expect(requireManualBankConnection(manual, "practice-a", "client-a")).toEqual(manual);
    expect(requireManualBankConnection(manual, "practice-a", null)).toEqual(manual);
    expect(() => requireManualBankConnection(manual, "practice-b", null)).toThrow("outside");
    expect(() => requireManualBankConnection(manual, "practice-a", "client-b")).toThrow("outside");
    expect(() => requireManualBankConnection({ ...manual, provider: "truelayer" }, "practice-a", "client-a")).toThrow("unavailable");
    expect(() => requireManualBankConnection(undefined, "practice-a", "client-a")).toThrow("outside");
  });
  it("bounds CSV size and file extension before parsing", () => {
    expect(() => validateBankCsvFile({ name: "statement.CSV", size: 240 })).not.toThrow();
    expect(() => validateBankCsvFile({ name: "bank.xlsx", size: 240 })).toThrow(".csv");
    expect(() => validateBankCsvFile({ name: "statement.csv", size: 0 })).toThrow("empty");
    expect(() => validateBankCsvFile({ name: "statement.csv", size: 5 * 1024 * 1024 + 1 })).toThrow("5 MB");
  });
  it("requires scoped ledger operations and no longer advertises nonexistent live sync", () => {
    const source = readFileSync("src/pages/BankFeeds.tsx", "utf8");
    expect(source).toContain('can("ledger", "edit")');
    expect(source).toContain(".eq(\"tenant_id\", tenantId!)");
    expect(source).toContain('if (selectedClientId) query = query.eq("client_id", selectedClientId);');
    expect(source).not.toContain("syncOpenBanking.mutate()");
    expect(source).toContain("Confirm ledger posting");
    expect(source).toContain("postToLedger.mutate()");
    expect(source).toContain("transactionsError");
    expect(source).not.toContain('value="truelayer"');
  });
});
