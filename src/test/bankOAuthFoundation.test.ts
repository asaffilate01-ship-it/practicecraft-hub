// @vitest-environment node
import { describe, it, expect } from "vitest";
import { webcrypto } from "node:crypto";
import {
  SANDBOX_AUTH_ORIGIN, buildSandboxAuthUrl, generateOpaqueState,
  generatePkceVerifier, digestSha256, pkceChallenge, parseKey,
  encryptBankSecret, decryptBankSecret, getSandboxConfig,
  validateOAuthState, validateProviderCode, parseBankingAction,
  requireSandboxToken, requireAuthorisedAccountResults,
} from "../../supabase/functions/_shared/bankOAuth";

const cryptoApi = globalThis.crypto ?? webcrypto;
Object.defineProperty(globalThis, "crypto", { configurable: true, value: cryptoApi });
const redirect = "https://taxlounge.example.test/banking/callback";
const configured = (overrides: Record<string,string> = {}) => {
  const env: Record<string,string> = {
    TAXLOUNGE_OPEN_BANKING_SANDBOX: "enabled",
    TRUELAYER_MODE: "sandbox",
    TRUELAYER_CLIENT_ID: "sandbox-example-12345",
    TRUELAYER_CLIENT_SECRET: "provider-test-secret-never-live",
    TRUELAYER_REDIRECT_URI: redirect,
    TAXLOUNGE_BANK_ENCRYPTION_KEY_B64: Buffer.alloc(32, 42).toString("base64"),
    ...overrides,
  };
  return (name: string) => env[name];
};
describe("TaxLounge bank OAuth cryptographic gate", () => {
  it("is disabled until the explicit sandbox flag, key and sandbox client are configured", () => {
    expect(getSandboxConfig(() => undefined)).toBeNull();
    expect(getSandboxConfig(configured({ TRUELAYER_MODE: "live" }))).toBeNull();
    expect(getSandboxConfig(configured({ TRUELAYER_CLIENT_ID: "live-app-12345" }))).toBeNull();
    expect(() => getSandboxConfig(configured({ TAXLOUNGE_BANK_ENCRYPTION_KEY_B64: "abc" }))).toThrow();
  });
  it("creates unique high entropy state and PKCE, with an exact registered redirect", async () => {
    const c = getSandboxConfig(configured())!;
    const state = generateOpaqueState(), verifier = generatePkceVerifier();
    const url = new URL(buildSandboxAuthUrl(c,state,await pkceChallenge(verifier)));
    expect(url.origin).toBe(SANDBOX_AUTH_ORIGIN);
    expect(url.searchParams.get("providers")).toBe("uk-cs-mock");
    expect(url.searchParams.get("redirect_uri")).toBe(redirect);
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("state")).toBe(state);
    expect(state).not.toEqual(generateOpaqueState());
    expect(verifier).not.toEqual(generatePkceVerifier());
    expect(await digestSha256(state)).toHaveLength(64);
  });
  it("rejects replay-shaped states, malformed codes and unsupported actions", () => {
    for (const value of ["", "state", "x".repeat(60), null]) expect(() => validateOAuthState(value)).toThrow();
    for (const value of [null,"x","bad code"]) expect(() => validateProviderCode(value)).toThrow();
    for (const action of ["create_auth_link","exchange_code","fetch_transactions","import_transactions","sync_transactions"])
      expect(() => parseBankingAction({action})).toThrow("unavailable");
    expect(parseBankingAction({action:"connection_status"})).toBe("connection_status");
  });
  it("encrypts provider secrets at rest with authenticated per-client context", async () => {
    const key = parseKey(configured()("TAXLOUNGE_BANK_ENCRYPTION_KEY_B64"));
    const ciphertext = await encryptBankSecret("token-is-never-in-browser",key,"tenant:client:intent:access");
    expect(ciphertext).not.toContain("token-is-never-in-browser");
    expect(await decryptBankSecret(ciphertext,key,"tenant:client:intent:access")).toBe("token-is-never-in-browser");
    await expect(decryptBankSecret(ciphertext,key,"tenant:other-client:intent:access")).rejects.toThrow("cannot be decrypted");
  });
  it("validates provider responses and never guesses a consent lifetime", () => {
    expect(requireSandboxToken({access_token:"x".repeat(40),expires_in:1800,token_type:"Bearer"}).expiresIn).toBe(1800);
    expect(() => requireSandboxToken({access_token:"x".repeat(40),expires_in:999999,token_type:"Bearer"})).toThrow();
    expect(requireAuthorisedAccountResults({results:[]})).toBe(0);
    expect(() => requireAuthorisedAccountResults({results:"not an array"})).toThrow();
  });
});
