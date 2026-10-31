# Agent instructions for TaxLounge

1. Read `PRODUCT.md` and `DESIGN.md` before changing UI, and `docs/platform-audit-2026-10-05.md` before claiming backend readiness.
2. This repository is **TaxLounge** (historical repo: `practicecraft-hub`). Never silently identify it with **TaxNuvia**, **Finvessa** or another central Factory product; the legacy `ACCOUNTANCY` registration is not a migration command.
3. Preserve existing API/route contracts, authentication and authorisation, tenant/client isolation, review gates, regulatory acknowledgements, audit records and historical migrations.
4. For design, draw on Taste Skill, Impeccable and Awesome DESIGN.md, audit existing screens first, and use the project's own tokens and accessibility standards.
5. For AI/MCP, prefer a server-side Omniqora adapter with explicit approved tools, permission checks, source citations, budgets, idempotency and human approval. No browser service-role credentials, cross-tenant retrieval or auto-filing.
6. Never cache authenticated API responses through the PWA. Preserve the `supabase-api` legacy-cache removal until old installs have migrated.
7. Avoid adding new provider SDKs, dependencies, integrations or compliance claims without security/licence and capability verification.
8. CI, typecheck, tests, production audit, migrations and real browser accessibility/viewport checks are distinct release gates. Document blockers, do not bypass them.
9. Use existing Lovable/GitHub branches and PR history; no force push, no fake operational data, no Lovable credit use or production deploy as part of design edits.
10. Do not rewrite legal email, operator identity, fees, trial entitlement, retention promises or privacy terms without verifying the contractual details.
