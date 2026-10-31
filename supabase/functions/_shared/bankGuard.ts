import { AccessError } from "./access.ts";

/**
 * Open Banking remains disabled until server-owned provider credentials,
 * one-use OAuth state, bank/client bindings and consent expiry are implemented.
 * Only an authenticated status probe is safe to expose.
 */
export function requireSafeBankAction(body: unknown): "connection_status" {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new AccessError("Invalid bank request", 400);
  }
  const action = (body as Record<string, unknown>).action;
  if (action !== "connection_status") {
    throw new AccessError("Automatic bank connections are unavailable; import a statement CSV instead.", 503);
  }
  return "connection_status";
}
