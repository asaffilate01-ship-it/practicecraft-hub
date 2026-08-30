# Go-live security stage deployment

This stage closes the audited payment, credential and GDPR blockers. It does not itself authorise production filing.

## Changes included

- authenticated, tenant-derived Stripe actions;
- Stripe signature verification, live/test-mode locking and atomic event idempotency;
- server-configured subscription price IDs and allow-listed return URLs;
- server-only AES-GCM encryption for Companies House credentials;
- one canonical Companies House credential type (`auth_code`);
- auditable data export and erasure-request workflows;
- invoice payment timestamps and payment method recording;
- removal of tracked environment configuration;
- pull-request CI for type checking, changed security lint, tests, build, dependency audit and migrations.

## Required Edge Function secrets

Configure these in the staging Supabase project before deploying:

| Secret | Purpose |
|---|---|
| `PUBLIC_APP_URL` | Canonical HTTPS application origin |
| `ALLOWED_ORIGINS` | Comma-separated additional trusted origins, normally staging only |
| `INTEGRATION_ENCRYPTION_KEY` | Random secret of at least 32 characters for credential encryption |
| `STRIPE_SECRET_KEY` | Stripe test key in staging; live key only after approval |
| `STRIPE_WEBHOOK_SECRET` | Signing secret for this exact Stripe endpoint and mode |
| `STRIPE_PRICE_STARTER` | Server-owned Starter recurring Price ID |
| `STRIPE_PRICE_PRO` | Server-owned Professional recurring Price ID |
| `STRIPE_PRICE_ENTERPRISE` | Server-owned Enterprise recurring Price ID |

Never add these values to `.env`, a `VITE_` variable, GitHub source or client-side settings.

## Deployment order

1. Apply `20260829233000_go_live_security_stage.sql`.
2. Deploy `secretarial`; opening a client's credential screen migrates legacy plaintext values to encrypted values.
3. Confirm authenticated users cannot select `client_credentials.ciphertext` through PostgREST.
4. Deploy authenticated browser actions normally: `supabase functions deploy stripe`.
5. Deploy only the signature-gated webhook without Supabase JWT verification: `supabase functions deploy stripe-webhook --no-verify-jwt`.
6. Deploy `portal` and the frontend from the same commit.
7. Register `https://<project-ref>.supabase.co/functions/v1/stripe-webhook` as the Stripe webhook endpoint.
8. Subscribe to `checkout.session.completed`, `customer.subscription.deleted` and `invoice.payment_failed`.
9. Run Stripe CLI/test-mode signature, duplicate-event, wrong-tenant, wrong-invoice and amount-mismatch tests.
10. Run GDPR export twice and confirm the export contains only the signed-in subject. Submit erasure twice and confirm the second request is deduplicated.

## Required acceptance evidence

- migration and function deployment logs tied to the commit SHA;
- Stripe event IDs with signature verification and duplicate delivery results;
- negative cross-tenant tests for staff and client-portal identities;
- screenshot/query evidence that credential ciphertext is inaccessible to browser roles;
- restored backup test after the migration;
- product-owner approval before moving Stripe from test to live mode.

If `PUBLIC_APP_URL`, the Stripe signing secret, a plan price or the encryption key is missing, the relevant workflow fails closed.
