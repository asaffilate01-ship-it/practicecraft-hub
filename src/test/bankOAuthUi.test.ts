// @vitest-environment node
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
describe("TaxLounge mock bank consent UI boundaries", () => {
  const page = readFileSync("src/components/bank/BankOAuthPilot.tsx", "utf8");
  const callback = readFileSync("src/pages/BankOAuthCallback.tsx", "utf8");
  const routes = readFileSync("src/App.tsx", "utf8");
  it("gates the mock-bank pilot by verified server status and a chosen client", () => {
    expect(page).toContain("status.data?.enabled");
    expect(page).toContain("selectedClientId");
    expect(page).toContain('can("integrations", "edit")');
    expect(page).toContain("https://auth.truelayer-sandbox.com");
    expect(page).not.toContain("data.access_token");
  });
  it("clears sensitive OAuth callback parameters from browser history", () => {
    expect(callback).toContain('window.history.replaceState');
    expect(callback).toContain('action: "complete_consent"');
    expect(callback).toContain('state: "failed"');
    expect(callback).not.toContain("sessionStorage");
    expect(callback).not.toContain("localStorage");
    expect(routes).toContain('path="/banking/callback"');
  });
});
