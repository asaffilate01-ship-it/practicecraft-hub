# TaxLounge bank database hardening (31 October 2026)

The initial Bank Feeds database policies were tenant-only FOR ALL permissions. The secured UI introduced in PR #9 is not a substitute for row-level controls. This migration replaces those policies with staff role and ledger permission checks, composite foreign keys that bind tenant/client/bank account identity, and a guarded journal-posting RPC.

## Security scope
- Access derives from authenticated profiles + matching user_roles + role permissions_json, never editable user_metadata. ledger.view is read-only; ledger.edit permits manual imports, categorisation and reviewed posting.
- The database refuses newly created provider connections unless they are manual; TrueLayer/Plaid integrations remain disabled. Existing provider records can be viewed by authorised staff but not modified by the manual workflow.
- Bank transactions must reference an account for the **same tenant and client**. Control and category ledger accounts must belong to the same tenant.
- Ownership links are immutable, posted lines cannot be edited directly, and only an authenticated, role-checked and tenant-scoped SECURITY DEFINER RPC can create the two-sided journal and mark it posted. The public RPC has its default PUBLIC/anon execute privilege revoked.
- Direct DELETE of bank connections/transactions is revoked for authenticated users; correction/void flows are a separate controlled workflow.
- The transition is fail-closed: ALTER TABLE VALIDATE refuses deployment if existing records have wrong tenant/client/ledger references. **Do not automatically reassign or purge such records.**

## Release instructions
1. Run read-only preflight in an isolated copy/staging of the correct TaxLounge Supabase database: find bank_connections rows whose tenant/client don't match clients, bank_transactions whose tenant/client/connection don't match, and any cross-tenant ledger accounts. Resolve and document genuine legacy exceptions before migration. Review transaction and provider statuses.
2. Run a full backup and restore rehearsal. Replay the entire SQL migration chain, then run pgtap tests from supabase/tests/bank_feed_permissions.sql and the other regression suites.
3. Deploy to the **TaxLounge** project only, not to Dishbee, TaxNuvia or Finvessa. The connected Supabase account available during this review did **not** expose a TaxLounge project, so no production schema was altered.
4. Release frontend/Edge bundle only after checking the precise deployed migration version and regression evidence; run owner/bookkeeper/viewer/portal and cross-tenant acceptance with realistic data.
5. Do not turn on Open Banking. OAuth one-use state, provider consent, encrypted token vault, expiry, bank/account reconciliation and idempotent provider import remain out of scope.

## Risk and rollback
A column-scoped composite foreign key can reject malformed existing data when validated; this is intentional. Review conflicting records rather than altering IDs. For a rollback of RLS, preserve the restrictive policies until replacement access controls are ready. Do not deploy an old posting function/legacy FOR ALL policy to roll back security.

## Read-only pre-deployment checks

Use [`docs/taxlounge-bank-preflight.sql`](taxlounge-bank-preflight.sql) against a **privileged, restored staging copy of TaxLounge**, recording the counts and constraint-validation results. No cross-client records should be silently repaired or migrated. The audit also lists legacy third-party bank provider records that remain disabled. This report is an evidence prerequisite, not an automated cleanup.
