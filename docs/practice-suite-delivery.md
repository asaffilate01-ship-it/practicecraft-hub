# Practice suite delivery

## Implemented in this change

The default practice home is now an operational workspace with RAG priority,
search, module filters, selected-client scope, list/board views and an item review
panel linking to existing workspaces. Analytics remains at /analytics. Navigation
has workspace search, active-section expansion and accessible toggle labels.

The queue reads existing persisted tasks, document requests, accounts periods,
payroll runs and submission jobs. Queries are tenant-scoped, permission-gated and
cache-keyed by user, tenant and authorised sources. Existing RLS remains authoritative.
Partial failures are visible. Each source is limited to 500 records and counts
explicitly describe loaded records. A production portfolio needs server-side
pagination and aggregate counts before marketing unlimited-volume dashboards.

The payroll detail placeholder is replaced with a tenant-scoped run review,
employee breakdown, employer costs and eight-component reconciliation. FPS
preparation and acknowledgement links are separate from payment state.

## Critical existing payroll limitation

PayCalculationEngine.ts has hard-coded historical constants and is not established
as correct for current-year payroll. This change adds review warnings; it does NOT
replace or certify that calculator, enforce a backend live-payroll prohibition,
submit RTI, initiate payments, or claim HMRC recognition. Current-year rules,
official test vectors, supported-case coverage and independent parallel-run
validation are required before production payroll use.

## Next implementation work against the approved suite direction

1. Replace legacy payroll calculation with an independently validated, versioned
   engine or contracted payroll provider. Add server-enforced approvals, immutable
   snapshots, acknowledgement processing and idempotent journals/payment requests.
2. Workforce: approved timesheets, overtime, absence and expenses feeding payroll;
   staff and employee permissions separate from ordinary CRM access.
3. Working papers: evidence-linked schedules and adjustment review; extend the
   existing accounts compliance locks and evidence review instead of duplicating them.
4. FormationGenie owns company-secretarial workflows. Implement explicit company
   mappings and client grants, signed events, replay protection and reconciliation.
   No FormationGenie or Omniqora connector is implemented by this change.
5. Proposals, engagements and practice profitability should extend existing billing
   and time recording. UK and US tax engines remain jurisdiction-specific.
6. AI capture/research requires a separate credential setup and verified sources;
   this change does not call a model or present priority heuristics as AI.

## UX acceptance criteria for subsequent modules

Every list has useful search/filtering, visible status and next actions. Every form
has inline validation, recoverable failures and clear save/approval feedback.
Preparation, review, filing acceptance and payment are distinct. Drawers preserve
list context. Sensitive financial figures obey module and client grants. Mobile
layouts retain readable labels and keyboard-accessible controls. Usability should
be measured with actual accountants completing representative tasks, not claimed
as superior from screenshots alone.

## Verification

TypeScript application check, production build, operation/date/reconciliation unit
tests and component tests for filtering, review panels, client scope, permissions,
board view and partial errors. No live backend writes or external filings performed.
