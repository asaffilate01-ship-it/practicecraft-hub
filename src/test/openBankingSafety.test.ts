// @vitest-environment node
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { AccessError } from "../../supabase/functions/_shared/access";
import { requireSafeBankAction } from "../../supabase/functions/_shared/bankGuard";

describe("TaxLounge Open Banking fail-closed contract", () => {
  it("only allows a harmless authenticated connection status probe", () => {
    expect(requireSafeBankAction({ action: "connection_status" })).toBe("connection_status");
    for (const action of ["create_auth_link", "exchange_code", "fetch_transactions", "fetch_balance", "list_accounts", "import_transactions", "sync_transactions", undefined]) {
      expect(() => requireSafeBankAction({ action })).toThrow("Automatic bank connections are unavailable");
    }
  });

  it("rejects malformed bank requests", () => {
    for (const payload of [null, [], "status", true]) {
      expect(() => requireSafeBankAction(payload)).toThrow("Invalid bank request");
    }
  });

  it("fails disabled actions with 503 rather than exposing tokens", () => {
    try {
      requireSafeBankAction({ action: "exchange_code", code: "secret" });
      throw Error("Expected fail-closed exchange");
    } catch (error) {
      expect(error).toBeInstanceOf(AccessError);
      expect((error as AccessError).status).toBe(503);
    }
  });

  it("requires a caller's JWT and never uses service-role privileges or provider token roundtrips", () => {
    const source = readFileSync("supabase/functions/open-banking/index.ts", "utf8");
    const config = readFileSync("supabase/config.toml", "utf8");
    expect(source).toContain("requireStaff(db, token)");
    expect(source).toContain('requirePermissions(db, actor, ["ledger.view"])');
    expect(source).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(source).not.toContain("TRUELAYER_CLIENT_SECRET");
    expect(source).not.toContain("access_token");
    expect(source).not.toContain("connect/token");
    expect(config).toMatch(/\[functions\.open-banking\]\s*verify_jwt\s*=\s*true/);
  });
});
