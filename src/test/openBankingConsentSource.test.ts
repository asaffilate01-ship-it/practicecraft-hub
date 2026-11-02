// @vitest-environment node
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { parseBankingAction } from "../../supabase/functions/_shared/bankOAuth";

describe("TaxLounge sandbox OAuth Edge contract", () => {
  const source = readFileSync("supabase/functions/open-banking/index.ts", "utf8");
  it("does not accept the original privileged import/token-return browser actions", () => {
    for (const action of ["create_auth_link","exchange_code","fetch_transactions","import_transactions","sync_transactions","fetch_balance"])
      expect(() => parseBankingAction({ action })).toThrow("unavailable");
    expect(source).not.toContain('from("bank_transactions")');
    expect(source).not.toContain('from("bank_connections")');
    expect(source).not.toContain("TRUELAYER_MODE: 'live'");
    expect(source).toContain('live_provider_enabled: false');
  });
  it("binds callback to tenant and actor with one-use database state", () => {
    expect(source).toContain('.eq("state_digest", stateDigest)');
    expect(source).toContain('.eq("tenant_id", actor.tenantId)');
    expect(source).toContain('.eq("initiated_by", actor.userId)');
    expect(source).toContain('.eq("status", "pending")');
    expect(source).toContain('.gt("expires_at", now)');
    expect(source).toContain("code_verifier: verifier");
    expect(source).toContain("taxlounge_save_sandbox_consent");
  });
  it("keeps server-only credentials and a fail-closed sandbox gate", () => {
    expect(source).toContain('env("SUPABASE_SERVICE_ROLE_KEY")');
    expect(source).toContain('requirePermissions(caller, actor, ["ledger.edit", "integrations.edit"])');
    expect(source).toContain("getSandboxConfig(env)");
    expect(source).toContain("encryptBankSecret(providerToken.accessToken");
    expect(source).not.toContain("return json({ access_token");
    expect(source).not.toContain("return json({ refresh_token");
  });
});
