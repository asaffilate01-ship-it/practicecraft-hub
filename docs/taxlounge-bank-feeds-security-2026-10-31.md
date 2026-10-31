# TaxLounge bank feeds — security boundary (31 October 2026)

## Implemented safe interim state
The previous `open-banking` Edge Function accepted user-provided connection/client IDs, performed privileged service-role writes, exchanged TrueLayer authorization codes without one-use server state and returned provider access tokens to the browser. The client also called `sync_transactions`, which had no corresponding server action.

**That integration is not production-ready.** This change explicitly closes the token/privileged-write surface: the only permitted Edge Function action is `connection_status`, after authentication and `ledger.view` authorisation. All provider, token-exchange, and automatic import actions fail closed with HTTP 503. Function JWT gateway verification is enabled. No bank provider secrets or client data are returned.

The local manual CSV workflow remains available; it is NOT a live bank feed, consent agreement, or provider-authorised connection.

## Before re-enabling an Open Banking integration
1. Register the provider application and confirmed redirect URI on the backend; never accept arbitrary redirect destinations.
2. Issue a high-entropy, expiring, server-persisted one-use OAuth state/PKCE binding associated with the authenticated practice, authorised client and bank connection. Consume atomically and reject replay, expiry, CSRF and tenant/client mismatch.
3. Keep tokens server-side in a reviewed encrypted vault; rotate/refresh and revoke safely; never expose access or refresh tokens in browser JSON or log entries.
4. Independently validate provider account identities, authorised tenant-client-connection binding and valid consent before every data fetch/import. Do not trust caller-provided connection, tenant or account identifiers.
5. Implement idempotent transactional import, provider paging, retries and explicit provider acknowledgement, reconciliation, disconnect and consent-expiry actions.
6. Add two-tenant/two-client negative tests, callback replay tests, account-switch tests and regulator/provider sandbox evidence before any release switch.
7. Apply reviewed database constraints/RLS checks and test manual CSV posting authorisation separately. Current tenant-level RLS does not alone guarantee bank_connection/client consistency.

**Deployment:** Code changes need the updated `open-banking` function deployed before removing the live endpoint risk. A GitHub merge is not proof that a deployed Edge Function changed. Do not enable any old Open Banking flows during the transition.
