import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("go-live security contracts", () => {
  const stripe = read("supabase/functions/stripe/index.ts");
  const stripeWebhook = read("supabase/functions/stripe-webhook/index.ts");
  const secretarial = read("supabase/functions/secretarial/index.ts");
  const portal = read("supabase/functions/portal/index.ts");
  const migration = read("supabase/migrations/20260829233000_go_live_security_stage.sql");

  it("accepts payment state changes only through verified Stripe events", () => {
    expect(stripeWebhook).toContain("constructEventAsync");
    expect(stripeWebhook).toContain("STRIPE_WEBHOOK_SECRET");
    expect(stripeWebhook).toContain("claim_stripe_webhook_event");
    expect(stripe).not.toContain('action === "webhook"');
    expect(stripe).not.toContain("constructEventAsync");
  });

  it("derives tenant access from the authenticated identity", () => {
    expect(stripe).toContain("admin.auth.getUser(token)");
    expect(stripe).toContain('.eq("tenant_id", caller.tenantId)');
    expect(stripe).not.toContain("const { tenantId");
  });

  it("keeps Stripe prices and redirects under server control", () => {
    expect(stripe).toContain("STRIPE_PRICE_STARTER");
    expect(stripe).toContain("configuredOrigins().has(parsed.origin)");
    expect(stripe).not.toMatch(/price_[A-Za-z0-9]{12,}/);
  });

  it("encrypts Companies House credentials and blocks browser ciphertext access", () => {
    expect(secretarial).toContain('crypto.subtle.encrypt');
    expect(secretarial).toContain('credential_type: "auth_code"');
    expect(migration).toContain("REVOKE ALL ON public.client_credentials FROM anon, authenticated");
    expect(migration).not.toMatch(/GRANT SELECT \([^)]*ciphertext/s);
    expect(read("src/components/client/CredentialsTab.tsx")).not.toContain("cred.ciphertext");
  });

  it("provides auditable GDPR access and erasure request workflows", () => {
    expect(portal).toContain('body?.action === "gdpr_export"');
    expect(portal).toContain('body?.action === "gdpr_delete_request"');
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.data_subject_requests");
    expect(portal).not.toContain("pay.example.com");
  });
});
