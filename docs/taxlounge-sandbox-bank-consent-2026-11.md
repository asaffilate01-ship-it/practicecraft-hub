# TaxLounge — sandbox Open Banking consent foundation (November 2026)

This is **TaxLounge** in `practicecraft-hub`, not TaxNuvia, Finvessa or Dishbee.

## Delivered
- The existing *manual bank accounts and CSV imports* stay available.
- A **disabled-by-default TrueLayer Data API v1 sandbox** supports the fictitious `uk-cs-mock` bank only. The authorisation host is fixed to `https://auth.truelayer-sandbox.com`. Live TrueLayer credentials are rejected; no production provider connection, bank sync, transaction import, journal posting or payment is made by this feature.
- An authorised TaxLounge staff user must have `ledger.view`, `ledger.edit` and `integrations.edit`, plus access to the selected client. The bank callback must be a pre-registered, exact HTTPS URI ending `/banking/callback`; the client cannot supply arbitrary redirect URIs.
- OAuth uses 256-bit random state held in the database only as a SHA-256 digest, an encrypted PKCE S256 verifier and a five-minute, practice/client/user-bound intent. The server consumes it **atomically once**, before exchanging the callback code. Replay, cross-tenant, other-user and expired callbacks fail closed.
- The authenticated Edge Function exchanges a code with TrueLayer's **sandbox** token endpoint and checks `/data/v1/accounts`. It stores only AES-256-GCM-encrypted short-lived access tokens in `bank_private.bank_sandbox_credentials`. This private schema has no `authenticated` or `anon` privileges and must never be exposed in the Supabase Data API.
- Staff may view **non-secret, RLS-scoped metadata** in `public.bank_oauth_consents`. A completed consent is `authorised_unlinked`: the number of mock accounts can be shown, but no live account or bank transaction is linked. An initiating staff member can delete the locally stored credential, including after new consent initiation is disabled. Deleting local credentials does **not** revoke a bank's consent.
- The UI clears the OAuth `code` and `state` from browser address history before showing a result. The browser never receives access tokens, refresh tokens, PKCE verifiers, service-role credentials or encryption keys.

## Configuration (TaxLounge sandbox Edge secrets only)
Do not commit secret values or use the connected Dishbee Supabase project.

| Variable | Requirement |
|---|---|
| `TAXLOUNGE_OPEN_BANKING_SANDBOX` | Literal `enabled` for an opt-in test |
| `TRUELAYER_MODE` | Literal `sandbox` (live disallowed) |
| `TRUELAYER_CLIENT_ID` | Sandbox client identifier starting `sandbox-` |
| `TRUELAYER_CLIENT_SECRET` | Server-only sandbox credential |
| `TRUELAYER_REDIRECT_URI` | Registered HTTPS app callback, exactly `/banking/callback` |
| `TAXLOUNGE_BANK_ENCRYPTION_KEY_B64` | Independently generated 32-byte AES encryption key as base64, stored **only** in secure server secrets |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY` | Correct TaxLounge project for caller JWT/RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | Edge Function secret; never exposed to browsers or analytics |

The encryption key requires a deliberate rotation/re-encryption plan. Do not expect manually restored encrypted token rows to survive a key change without planned re-encryption.

## Test and release
1. Use the Supabase CLI-generated migration `*_taxlounge_sandbox_oauth_consents.sql`, reapply the full migration chain on a fresh isolated database, and run every pgTAP suite.
2. Verify missing `authenticated` privileges for OAuth state and token tables, tenant/client ownership, single-use callback replay, role-scoped metadata, and deletion of private ciphertext.
3. Run TypeScript, unit tests, Deno Edge check, production build and both dependency audits. Keep the rollout feature **off** by default. Run browser acceptance for 360/390px and desktop OAuth callbacks, provider cancellation and expired staff sessions.
4. Before enabling even sandbox, connect the correct **TaxLounge** Supabase project, perform staging backup/restore, configure a TrueLayer sandbox app and exact redirect URI, and validate the external API round trip. No provider credentials or external mock-bank calls are executed during CI.
5. Production requires TrueLayer contract/regulatory approval, data retention and consent notices, named bank-account selection, validated tenant/client/account binding, encrypted refresh-token rotation if appropriate, bank-level revocation, token expiry monitoring and a separately verified idempotent transaction importer.

This phase uses `info accounts` scope only, without `offline_access`, so no refresh token or ongoing banking sync is requested. The TrueLayer Data API **v1** consent concept is distinct from a Data API v3 `connection_id`. All production account linking remains blocked.

References: https://docs.truelayer.com/docs/generate-an-auth-link ; https://docs.truelayer.com/reference/generateaccesstoken ; https://supabase.com/docs/guides/database/postgres/row-level-security
