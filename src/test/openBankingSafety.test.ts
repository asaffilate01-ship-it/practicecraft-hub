// @vitest-environment node
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { AccessError } from "../../supabase/functions/_shared/access";
import { parseBankingAction } from "../../supabase/functions/_shared/bankOAuth";

describe("TaxLounge Open Banking sandbox-only fail-closed contract", () => {
  it("supports only the controlled sandbox consent workflow and safe status reads", () => {
    for (const action of ["connection_status", "start_consent", "complete_consent", "list_consents", "disconnect_consent"]) {
      expect(parseBankingAction({ action })).toBe(action);
    }
    for (const action of ["create_auth_link", "exchange_code", "fetch_transactions", "fetch_balance", "list_accounts", "import_transactions", "sync_transactions", undefined]) {
      expect(() => parseBankingAction({ action })).toThrow("unavailable");
    }
  });
  it("rejects malformed bank requests before any provider call", () => {
    for (const payload of [null, [], "status", true]) {
      expect(() => parseBankingAction(payload)).toThrow("Invalid bank request");
    }
  });
  it("fails legacy actions with 503 and without bank credentials", () => {
    try {
      parseBankingAction({ action: "exchange_code", access_token: "secret" });
      throw Error("Expected fail-closed exchange");
    } catch (error) {
      expect(error).toBeInstanceOf(AccessError);
      expect((error as AccessError).status).toBe(503);
    }
  });
  it("uses a staff JWT, rechecks edit permissions and keeps private tokens server-only", () => {
    const source = readFileSync("supabase/functions/open-banking/index.ts", "utf8");
    const config = readFileSync("supabase/config.toml", "utf8");
    expect(source).toContain("requireStaff(caller, token)");
    expect(source).toContain('requirePermissions(caller, actor, ["ledger.view"])');
    expect(source).toContain('requirePermissions(caller, actor, ["ledger.edit", "integrations.edit"])');
    expect(source).toContain('env("SUPABASE_SERVICE_ROLE_KEY")');
    expect(source).toContain("encryptBankSecret(providerToken.accessToken");
    expect(source).not.toContain('return json({ access_token');
    expect(source).not.toContain('from("bank_transactions")');
    expect(config).toMatch(/\[functions\.open-banking\]\s*verify_jwt\s*=\s*true/);
  });
});
