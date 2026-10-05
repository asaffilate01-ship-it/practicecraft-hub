# PracticeCraft / ACCOUNTANCY system audit — 5 October 2026

## Verdict

This is a substantial accountancy-practice application with persisted workflows, not yet a verified production replacement for Bright or Capium. Breadth is ahead of integration assurance. Screens, database tables, provider credentials, a successful provider exchange and an accepted filing are different milestones.

Repository baseline: `practicecraft-hub` main `e4f822e71fdb3d2b263e5d64f5a5d60933aec94e`. Central reference: `seamless-comms-suite` main `41438ac` inspected locally. This audit and the changes alongside it extend that baseline. Inventory after this phase: 105 React route declarations, 93 page components, 22 Edge Functions including the new bridge, and 55 migration files. These counts describe code, not completed capabilities.

Scope: route/call-site inventory; targeted implementation review of AI, tenancy, integrations, payroll and filing boundaries; local tests/type checks/build; current central Factory snapshot and Intelligence contracts. This is not a full penetration test, every-screen usability audit, production database inspection or regulator certification. No live tenant, provider secret, deployed Edge Function, applied production migration or completed model run was verified. No production data was read or migrated.

## Architecture and ownership

The central portfolio seed explicitly lists this GitHub repository as **ACCOUNTANCY**, architecture role **landlord**, proposed role **Landlord SaaS**, with the instruction: “Practice management landlord; integrate with TaxNuvia rather than duplicate CRM/billing.” Its recorded live URL is `https://practicecraft-hub.lovable.app`; a catalogue URL is not proof of deployment health.

| Layer | Intended role | What is actually present |
|---|---|---|
| Omniqora | Portfolio control plane: Factory registration, identities/mappings, entitlements, shared services, intelligence governance | Central code and portfolio entry inspected; production execution unverified |
| ACCOUNTANCY / PracticeCraft | Product landlord and accountant-facing operational application | This repository; practice/client workflows and isolated Supabase data plane |
| Landlord instance / reseller | White-label commercial/operating instance | Local branding/settings exist; no verified canonical landlord-instance mapping or central provisioning lifecycle |
| Practice tenant | Accounting firm, isolation boundary | `tenants`, `profiles.tenant_id`, `user_roles`, tenant roles and RLS; existing staff flow derives a single practice from identity |
| Client | Business/person served by a practice | `clients` under the practice tenant; not automatically an independent Factory tenant |
| Brand / branch / workspace | Optional operating hierarchy | Do not reinterpret existing clients as brands or branches; canonical mapping and membership lifecycle remain to be built |
| Portal / employee users | Limited participants | Separate routes and role detection; do not register every portal user as a Factory tenant |
| Omniqora Accounts / TaxNuvia | Related accounting/business product and shared-service integration | Central catalogue includes `omniqora-accounts`; no evidence establishes that this key is the canonical identity of PracticeCraft |
| FormationGenie | Company formation and secretarial owner | PracticeCraft still contains secretarial/incorporation code; authenticated cross-product handoff and authority cutover are absent |

Do not silently identify ACCOUNTANCY with `omniqora-accounts`, provision duplicate products, merge client databases, or migrate all tenants at once. Confirm the existing central product/landlord IDs operationally, bind one pilot practice, compare in shadow mode, reconcile, then switch individual capabilities. Landlord first, pilot tenant second, remaining tenants after acceptance. This phase deliberately leaves local subscription and operational authority in place.

## Built / wired / remaining matrix

“Wired in code” means a call path exists. It does not mean it has succeeded in the hosted environment.

| Area | Built and wired in code | Gap / deployment evidence still required |
|---|---|---|
| Practice overview | Persisted cross-module operations feed, urgency, filters, list/board, review drawer and source links | Live tenant acceptance, load/performance testing, saved views and bulk work ownership |
| Clients and practice work | Clients, tasks, workflow screens, calendar, documents, requests, proposals, time and audit trail | Complete prospect → AML → engagement → service orchestration and recovery tests |
| Accounts production | Trial balance CSV validation, adjustments, statements/notes, fixed assets, disclosures, evidence and review controls | Validated taxonomy/iXBRL packages, supported entity/FRS coverage, deterministic comparison/rounding corpus and external acceptance |
| Corporation tax | Period management and computation/form workspaces | `CorporationTax.tsx` still has `totalTaxPence = 0`; period creation uses a hard-coded nine-month date offset. Replace ad hoc rules with a validated deadline engine; this phase removes invented statutory dates from task AI prompts. “Submitted” is labelled “Filed” without this screen proving an acknowledgement |
| Self Assessment / ITSA | Workbenches, periods and supplementary form foundations | Supported-year calculations, obligations/API completion, submission acceptance evidence and negative cases |
| VAT | OAuth, obligations, return workspace and gated submission implementation | Live credentials, fraud-header evidence, environment configuration and authorised production acceptance |
| Payroll | Employers, employees, slips, runs, totals, anomaly checks and persisted independent preparation reviews from PR #3 | Historical hard-coded calculator is not current-year certified; review is evidence, not a complete release gate; payment exports/reconciliation, corrections and year-end forms remain |
| RTI | FPS/EPS preparation and submission attempt evidence | `rti-processor` deliberately rejects live filing; `hmrc` returns unavailable for RTI until validation. A visible FPS button is not live HMRC capability |
| Pensions / CIS | Persisted workbench foundations | Provider exports/acknowledgements, assessment edge cases and end-to-end statutory validation |
| Charity / partnership | Workbench and form foundations | Full supported accounts/tax rules, allocations and provider/portal acceptance workflows |
| Company secretarial | Company records, registers, change screens, profile sync and filing code | FormationGenie ownership transition, shared client mapping, approved filing coverage and end-to-end evidence |
| Incorporations | Application/payment state and queued submission job | Queueing is labelled submitted in the handler; that does not establish Companies House acceptance. Complete dispatch/acknowledgement or delegate to FormationGenie |
| Bookkeeping | Transactions, categorisation rules, journal and review workspaces | Atomic posting and approval enforcement across every mutation route, period locks and client-bound relational integrity need a dedicated review |
| Receipt AI | Image upload, fingerprint, extraction persistence and human-review UI | Retry/recovery after provider failure, full evaluation corpus, atomic reviewed posting, persisted provider/model lineage and wider document formats |
| Practice AI | Task suggestions, anomalies, churn and local invoice/utilisation summaries | Provider deployment, measured model quality, retention/consent, metering and durable review history; local summaries are not ML forecasts |
| Banking | TrueLayer request/import code and frontend call | OAuth state is encoded JSON rather than a persisted one-time nonce; import accepts client/connection IDs with a service-role client and needs binding checks. Callback/token ownership/recovery must be completed before treating bank feeds as production-ready |
| Stripe / GoCardless | Payment functions and invoice workflows; Stripe security-stage code | Test/live credentials, webhooks, replay/amount tests and reconciliation not verified against hosted providers |
| Integrations health | Tenant health records and configuration screens | `integration_health` records are browser-writable under existing policies; they are observations, not trusted provider attestations. New UI labels them accordingly |
| Practice administration | Tenant settings, users, plans and branding UI | Invite, remove-user and plan-upgrade buttons in `TenantAdmin.tsx` are explicitly “coming soon” |
| Client / employee portal | Auth/routing, documents, invoices, messaging and payslips | Full role/client/employee isolation acceptance, accessibility and mobile QA. Payslip email resend remains “coming soon” |
| SaaS Factory | Portfolio inventory entry centrally; new server-side shadow bridge in this phase | Canonical registration/binding, secrets, pilot tenant provisioning, memberships, subscription lifecycle and live snapshot verification |
| Omniqora Intelligence | New aggregate-only queued-run adapter and status/result UI | Active entitlement/capabilities, deployed central worker, provider credentials, completed result and operational monitoring |
| Events / RAG / GraphRAG | No product-to-central event/index pipeline found | Transactional outbox, signing/replay protection, delivery receipts, tenant/client ACL indexing, deletion propagation and retrieval evaluations |
| Delivery | GitHub CI; production frontend build | Lovable project access/publication and production Supabase migration/function logs not available in this session |

## Findings addressed in this phase

1. **AI tenant boundaries.** `ai-categorise` previously used service-role reads/writes for caller-supplied transaction IDs, and trusted model-returned IDs when updating. Anomaly analysis read caller-selected client transactions without a tenant condition. Receipt upload did not verify client ownership. All three now use the caller JWT with RLS, derive staff identity and tenant-bound membership (rather than trusting the legacy RPC’s first role), check module permissions and bind records to that tenant. Categorisation rejects unavailable/confirmed/posted records, validates returned IDs and account codes, and preserves already-confirmed records if they change during a model request.
2. **Broken intelligence queries.** Task suggestions queried/wrote a nonexistent `tasks.service` column; the suggested service is now retained in the task description. Invoice analytics referenced `total_pence` / `issued_at`; this schema uses `total` / `issue_date`. Staff utilisation referenced `minutes` and an unavailable profile relationship; it now reads `duration_minutes`, loads tenant profiles explicitly and limits entries to the current London calendar month. Counts remain bounded samples and capacity remains an illustrative 160-hour assumption.
3. **Misleading AI success.** Missing model tool output and failed source queries no longer become empty successful analysis. Responses receive shape validation. UI errors no longer say the practice is healthy or transactions are clean. Invoice totals are labelled as invoiced totals, not collected revenue.
4. **Identity and cache boundaries.** AI React Query keys now include user and tenant (and client where needed). Module permissions gate requests. Unknown legacy staff roles default to viewer; paid navigation no longer becomes visible while subscription features are unresolved. These are additional UI safeguards, not a claim that all existing backend entitlements are enforced.
5. **Factory integration foundation.** `/practice/integrations` now includes configuration status, a manual live snapshot check and an aggregate-only Omniqora brief. The server selects the binding from authenticated local tenant identity, checks central scope/freshness/product status and entitlement validity, and does not accept a browser tenant/product/endpoint/credential/prompt override.
6. **Verification gate.** `npm run typecheck` now checks the actual application and Node projects instead of the empty root TypeScript project. CI also checks the changed Edge Functions. Boundary tests cover cross-scope refusal, stale snapshots, future/expired entitlements, denied capabilities, transport refusal and invalid AI output.

## Exactly how AI is connected after this phase

Existing path: authenticated browser → local AI Edge Function → scoped local Supabase reads → Lovable AI gateway → validated suggestion → human review. This path remains separate from Omniqora. Existing task/churn prompts still send client information to that configured provider; they are not centrally governed or centrally metered simply because the Factory panel exists.

New optional path: authenticated integration user → `omniqora-bridge` → server-selected tenant binding → fresh central snapshot → `omniqora.intelligence-runtime` entitlement and operation capability → central `/api/platform/intelligence` → queued agent run → explicit result retrieval. Inputs are only date, active-client count and overdue-task count. No names, monetary values, payroll data, documents or arbitrary prompt are sent on this route. It exposes no action approval, posting, filing or tool-execution endpoint.

A queued run proves receipt, not model execution. The central worker/runtime must execute it. There is no fallback to Lovable on central failure. The current central `run.start` contract has no idempotency key; this UI disables automatic retries and repeated starts during a run, but an ambiguous timeout still requires checking central history before retrying. Durable local run history, cancellation, usage budgets and request idempotency are next work.

## Deployment and pilot acceptance

This phase requires no new database migration. Earlier migrations, including `20260930193000_payroll_preparation_review.sql`, still need their own deployment evidence.

1. Publish the reviewed frontend and deploy `ai-intelligence`, `ai-categorise`, `receipt-ocr`, and `omniqora-bridge` to the existing Lovable-managed Supabase project. The functions validate JWTs internally; the config retains `verify_jwt = false` for these handlers. Do not deploy only the browser bundle and call the fixes live.
2. Keep the existing Lovable provider key server-side. For Factory, provision/identify the canonical ACCOUNTANCY product landlord and one practice tenant centrally. Do not reuse another product key on the basis of a similar name.
3. Create a central product connection whose `external_tenant_id` equals the local practice UUID. Grant only `intelligence.run.start` / `intelligence.run.read` if the brief is enabled, and activate the appropriate Intelligence entitlement. Use the central `oqcp_` credential, not a Supabase service-role key.
4. Set the server secret `OMNIQORA_CONNECTIONS_JSON` to a map keyed by local practice UUID. Each value has `origin` (HTTPS origin only), `productKey` (actual canonical central key), `tenantId` (central tenant UUID), and `credential`. Never place this secret in a VITE variable or browser settings. This is a pilot binding mechanism; scalable lifecycle provisioning and credential rotation remain central-operations work.
5. Verify Factory connection in the app; compare central identity/product/services with the selected local practice. This reads a snapshot and leaves local authority unchanged. A snapshot check updates central connection verification metadata but sends no operational records.
6. Request an aggregate brief, retain the run ID, and check until a real result or explicit failure is returned. Verify missing entitlements, revoked/expired credentials and wrong bindings fail closed.
7. Run staff/portal/employee and two-practice negative tests against staging, including wrong-client OCR, mixed-tenant transaction IDs, model-injected IDs and already-posted transactions. Confirm restored backup and migration state separately.
8. Cut over capabilities only after shadow comparison, reconciliation, operational approval and rollback evidence. Do not bulk-migrate tenants.

## Next implementation phases in priority order

| Phase | Concrete deliverables | Completion evidence |
|---|---|---|
| A — this change | AI isolation repairs, truthful status/errors, corrected summaries, shadow Factory bridge and aggregate brief | Unit/contract tests, real TypeScript check, Edge Function check, CI and code review; deployment remains separate |
| B — close remaining access/workflow gaps | Bank connection/client binding and one-time OAuth state; atomic ledger approval/posting; server-side role/entitlement matrix; real staff invitation/removal | Multi-tenant negative tests against DB/functions; replay/retry tests; no unauthorised state transitions |
| C — Factory pilot and shared identity | Canonical product/landlord registration; one practice mapping; membership sync; credential lifecycle; branding/domain and local-to-central subscription parity | Verified snapshot, revoked-credential case, reconciliation report and staged authority approval |
| D — governed intelligence | Versioned prompts, source references, persisted local requests/reviews, idempotency/budgets, outbox and tenant/client-aware retrieval | Completed central worker run, provenance, no cross-client retrieval, deletion propagation and evaluation thresholds |
| E — regulatory/payroll completion | Supported-year deterministic payroll/tax rules; statutory edge cases; schema validators; correction/year-end flows; payment and filing receipts | Official test packs and applicable recognition/acceptance evidence, independently reviewed calculations; no AI-calculated payroll |
| F — product unification | FormationGenie handoff; TaxNuvia/Omniqora Accounts ownership boundaries; shared client map; common workspace navigation and reliable service timeline | One client journey across products without duplicate authority or direct cross-product database access |
| G — operational launch | Browser/mobile/accessibility QA, performance budgets, alerts, backup restore, incident/offboarding runbooks and pilot rollout | Hosted acceptance record tied to exact frontend/function/migration versions |

Avoid a completion percentage: the remaining blockers include access boundaries and statutory correctness, so screen count is not a useful measure of launch readiness.

## Validation record

Local verification: 64 tests passed; actual application/Node TypeScript checks, scoped security lint and production build passed. Browser screenshot and hosted acceptance remain unverified. The build reports an existing large-chunk warning and unmatched PWA precache patterns.

A fresh production dependency audit reports zero vulnerabilities after correctly classifying `tailwindcss-animate` as a build-only development dependency. A braces stack-exhaustion advisory remains in the Tailwind 3 development toolchain; moving its category is not a patch for that development dependency. Avoid processing untrusted build patterns and evaluate the Tailwind/toolchain upgrade separately. The deployed output is static compiled assets. Deno dependency downloads are blocked in this local runner; GitHub CI performs the Edge Function type checks before merge.
