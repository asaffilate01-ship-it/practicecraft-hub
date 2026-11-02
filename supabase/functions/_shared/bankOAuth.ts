import { AccessError } from "./access.ts";

/** Pure cryptographic primitives; never serialize credentials into browser responses. */
export const SANDBOX_AUTH_ORIGIN = "https://auth.truelayer-sandbox.com";
export const SANDBOX_API_ORIGIN = "https://api.truelayer-sandbox.com";
export const CONSENT_SCOPE = "info accounts";
export const INTENT_TTL_MS = 5 * 60 * 1000;

export type BankingAction = "connection_status" | "start_consent" | "complete_consent" | "list_consents" | "disconnect_consent";
const actions: readonly BankingAction[] = ["connection_status", "start_consent", "complete_consent", "list_consents", "disconnect_consent"];
export const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseBankingAction(body: unknown): BankingAction {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new AccessError("Invalid bank request", 400);
  const action = (body as Record<string, unknown>).action;
  if (typeof action !== "string" || !actions.includes(action as BankingAction)) {
    throw new AccessError("This banking operation is unavailable; manual CSV import is still supported", 503);
  }
  return action as BankingAction;
}

function bytesToB64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}
function b64ToBytes(input: string): Uint8Array {
  if (!/^[a-zA-Z0-9+/]+={0,2}$/.test(input)) throw new AccessError("Invalid server encryption key", 503);
  return Uint8Array.from(atob(input), character => character.charCodeAt(0));
}
function randomBytes(length: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length));
}
export function base64Url(bytes: Uint8Array): string {
  return bytesToB64(bytes).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}
export function generateOpaqueState(): string {
  return base64Url(randomBytes(32));
}
export function generatePkceVerifier(): string {
  return base64Url(randomBytes(48));
}
export async function digestSha256(value: string): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
  return Array.from(digest, byte => byte.toString(16).padStart(2, "0")).join("");
}
export async function pkceChallenge(verifier: string): Promise<string> {
  if (!/^[A-Za-z0-9._~-]{43,128}$/.test(verifier)) throw new AccessError("Invalid PKCE verifier", 400);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier)));
  return base64Url(digest);
}
export function validateOAuthState(value: unknown): string {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(value)) throw new AccessError("Invalid or missing banking state", 400);
  return value;
}
export function validateProviderCode(value: unknown): string {
  if (typeof value !== "string" || value.length < 8 || value.length > 2048 || /[\s<>]/.test(value)) {
    throw new AccessError("Invalid or missing provider callback code", 400);
  }
  return value;
}
export function validateConsentId(value: unknown): string {
  if (typeof value !== "string" || !uuid.test(value)) throw new AccessError("A valid consent ID is required", 400);
  return value;
}
export function validateRedirectUri(value: string | undefined): string {
  if (!value) throw new AccessError("Sandbox redirect URI is not configured", 503);
  let url: URL;
  try { url = new URL(value); } catch { throw new AccessError("Invalid sandbox redirect URI", 503); }
  if (url.protocol !== "https:" || !url.hostname || url.username || url.password || url.port ||
      url.search || url.hash || url.pathname !== "/banking/callback" || url.href !== value) {
    throw new AccessError("Sandbox redirect URI must be an exact, registered HTTPS callback", 503);
  }
  return value;
}
export function parseKey(encoded: string | undefined): Uint8Array {
  try {
    if (!encoded) throw new Error("missing");
    const result = b64ToBytes(encoded);
    if (result.length !== 32) throw new Error("wrong size");
    return result;
  } catch {
    throw new AccessError("Bank encryption configuration is unavailable", 503);
  }
}

export type SandboxConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  encryptionKey: Uint8Array;
  enabled: true;
};
export function getSandboxConfig(env: (key: string) => string | undefined): SandboxConfig | null {
  // Hard-coded sandbox-only allowlist. A live client key is NEVER accepted.
  if (env("TAXLOUNGE_OPEN_BANKING_SANDBOX") !== "enabled" ||
      env("TRUELAYER_MODE") !== "sandbox") return null;
  const clientId = env("TRUELAYER_CLIENT_ID") ?? "";
  const clientSecret = env("TRUELAYER_CLIENT_SECRET") ?? "";
  if (!/^sandbox-[a-zA-Z0-9_-]{5,100}$/.test(clientId) || clientSecret.length < 12) return null;
  return {
    clientId, clientSecret,
    redirectUri: validateRedirectUri(env("TRUELAYER_REDIRECT_URI")),
    encryptionKey: parseKey(env("TAXLOUNGE_BANK_ENCRYPTION_KEY_B64")),
    enabled: true,
  };
}
export function buildSandboxAuthUrl(config: SandboxConfig, state: string, challenge: string): string {
  validateOAuthState(state);
  if (!/^[A-Za-z0-9_-]{43}$/.test(challenge)) throw new AccessError("Invalid PKCE challenge", 400);
  const url = new URL("/", SANDBOX_AUTH_ORIGIN);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("scope", CONSENT_SCOPE);
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("providers", "uk-cs-mock");
  return url.toString();
}
async function encryptionKey(key: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", key as BufferSource, "AES-GCM", false, ["encrypt", "decrypt"]);
}
export async function encryptBankSecret(secret: string, key: Uint8Array, subject: string): Promise<string> {
  if (!secret || secret.length > 16384) throw new AccessError("Invalid provider secret", 502);
  const iv = randomBytes(12);
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as BufferSource, additionalData: new TextEncoder().encode(subject) },
    await encryptionKey(key),
    new TextEncoder().encode(secret),
  ));
  const combined = new Uint8Array(iv.length + ciphertext.length);
  combined.set(iv); combined.set(ciphertext, iv.length);
  return bytesToB64(combined);
}
export async function decryptBankSecret(encoded: string, key: Uint8Array, subject: string): Promise<string> {
  try {
    const combined = b64ToBytes(encoded);
    if (combined.length < 29 || combined.length > 17000) throw new Error("Invalid ciphertext");
    const plain = await crypto.subtle.decrypt({
      name: "AES-GCM", iv: combined.slice(0, 12) as BufferSource,
      additionalData: new TextEncoder().encode(subject),
    }, await encryptionKey(key), combined.slice(12) as BufferSource);
    return new TextDecoder().decode(plain);
  } catch {
    throw new AccessError("Banking credential is invalid or cannot be decrypted", 503);
  }
}
export function requireSandboxToken(value: unknown): { accessToken: string; expiresIn: number } {
  const v = value as Record<string, unknown> | null;
  if (!v || v.token_type !== "Bearer" ||
      typeof v.access_token !== "string" || v.access_token.length < 16 ||
      v.access_token.length > 16384 || !Number.isInteger(v.expires_in) ||
      (v.expires_in as number) <= 0 || (v.expires_in as number) > 7200) {
    throw new AccessError("Provider returned an invalid authorisation response", 502);
  }
  return { accessToken: v.access_token, expiresIn: v.expires_in as number };
}
export function requireAuthorisedAccountResults(value: unknown): number {
  const v = value as { results?: unknown } | null;
  if (!v || !Array.isArray(v.results) || v.results.length > 100) {
    throw new AccessError("Provider account authorisation could not be confirmed", 502);
  }
  return v.results.length;
}
