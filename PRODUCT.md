# TaxLounge: product truth

> TaxLounge is the accountant-facing UK practice-management product maintained in `practicecraft-hub`. The repository name is historical and is not the consumer brand.

## Purpose and users
- Practice owners, partners, managers, accountants, bookkeepers and authorised payroll staff use one operational workspace for client work, evidence, deadlines and approvals.
- Clients and employees use separately scoped portals; they are NOT automatically independent landlord/Factory tenants.
- Practice tenants have their own RLS/permission/entitlement boundaries; client records belong to their authorised practice.

## Product boundary: do not conflate the portfolio
- **TaxLounge**: UK accounting practice operations, staff jobs, client service records, review and supported compliance preparation.
- **TaxNuvia**: separate product and source of truth; integration, where approved, must use explicit authenticated contracts, not shared tables or renamed tenant IDs.
- **Finvessa**: separate product; do not reuse TaxLounge customer records, pricing, accounting computations or entitlements.
- **Omniqora**: shared Factory/Intelligence services only through server-mediated, tenant-authorised and metered capabilities.
- **FormationGenie**: company-formation/secretarial handoff owner where centrally approved; do not duplicate filing authority.
- The central catalogue has historically registered this repository as `ACCOUNTANCY` landlord. TaxLounge display branding does NOT prove that `taxlounge` is its canonical central product key. Confirm mapping centrally before cutover.

## Actual status
- Built workspaces include practice operations, clients/tasks, accounts preparation, payroll reviews, VAT, AML, documents, billing and client portals.
- Built screens are not equivalent to working live HMRC or Companies House submissions, current-year certified tax engines, bank-provider recognition or a deployed Omniqora worker.
- Existing audit: `docs/platform-audit-2026-10-05.md`. Existing go-live gates: `docs/go-live-readiness.md` and `docs/regulatory-readiness.md`.
- Trial length, pricing, live filing availability, model accuracy, bank connectivity and third-party branding must not be asserted without authoritative evidence.

## Product experience principles
1. A user should see the next client job, its real owner, due date, evidence and state in the first viewport.
2. Differentiate **prepared**, **reviewed**, **queued**, **sent**, **acknowledged**, **accepted**, **rejected** and **paid**; never infer a provider response.
3. AI drafts and summarizes with verifiable sources. It never posts accounts, approves payroll, makes payments or submits filings autonomously.
4. Critical transitions are tenant-bound, authorised, idempotent where appropriate, audit-logged and require human sign-off.
5. Mobile and desktop show the same permitted actions; no fake notifications, metrics, testimonials, prices or completed work.
6. Protect privacy: do not cache authenticated API responses in a shared browser, embed service-role keys, or send client data to unapproved AI endpoints.

## Release criteria
TypeScript, unit/integration tests, migration/RLS negative tests, current-year statutory validation, vulnerability review, keyboard/zoom/screen-reader/viewport checks, browser screenshots, provider sandbox acknowledgements and one-practice staging acceptance. No production release solely on green UI tests.
