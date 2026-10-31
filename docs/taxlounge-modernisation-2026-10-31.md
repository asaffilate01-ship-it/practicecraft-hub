# TaxLounge modernisation and AI/MCP programme — 31 October 2026

## Evidence-based summary
Reviewed current main/source, open design PR #5, October platform audit, feature/Edge Function inventory and recent Actions. The existing application has roughly 100 React routes and extensive migration/function code, but hosted evidence remains separate. Open PR #5's CI failed at a production dependency audit before these changes; its earlier TypeScript, tests, migrations and build steps passed. Verify fresh CI against the exact latest commit.

## Immediate changes in the linked design PR
- Default product presentation now says TaxLounge across auth UI, sidebar fallback, mobile header, HTML and PWA identity, without changing practice-owned firm names.
- Mobile shortcuts apply permission, plan-feature and staff-role rules; the former bottom bar advertised denied routes.
- The PWA stops runtime caching authenticated Supabase responses and attempts to delete the old `supabase-api` cache at startup; validate service-worker upgrade and offline modes in real browsers.
- Restored browser zoom, added password toggle labels, removed unbacked notification and Profile actions, and stopped claiming an unverified trial or domain.
- Product/Design/Agent guidance now states TaxLounge boundaries and release standards.

## Verified code delivery and unresolved assurance

- The active PR contains the TaxLounge product identity, safer PWA caching, authorised mobile navigation, personal per-practice/per-staff work queue preferences, conservative error states and entitlement-aware workspace cards.
- A dependency-remediation GitHub Action rebuilt the npm lockfile, upgraded the Zod runtime dependency to a patched major release and moved build-only PWA tooling into dev dependencies. **The production dependency audit reported zero vulnerabilities in the gated build.**
- A second test-toolchain remediation upgraded Vitest and verified that the full dependency graph had **no outstanding critical-severity findings** (moderate/low dev-tool findings remain and require continued review).
- Updated the standard CI to fail on production high-severity advisories and full-tree critical advisories. Staging browser/device and regulated provider acceptance are still outstanding.
- This is a **code verification milestone only**, not evidence of production migrations, live HMRC/Companies House filing, user invitation flows, live bank feeds or a connected central worker.

## Open blockers ranked by severity
| Priority | Workstream | Required acceptance evidence |
|---|---|---|
| Ongoing | Dependency advisories | Production audit currently clear; critical dev findings remediated. Review remaining moderate/low development-tool findings and preserve the audit gates after every lockfile change |
| P0 | Bank feeds | Persisted one-use OAuth state, tenant/client/connection binding, provider callback replay tests and disconnection/recovery |
| P0 | Ledger, permissions, billing | Row-level negative tests, atomic posting/lock/approval, authorised invitations/removals, webhook idempotency, entitlement checks |
| P0 | Privacy and legal | Confirm actual legal operator, DPA, support/privacy/legal email addresses, contact details, notice dates, third parties and cookie policy; existing legal pages contain legacy naming/addresses |
| P1 | Factory landlord pilot | Confirm actual centrally registered `ACCOUNTANCY` identifier; bind one authorised practice and one service capability; verify revoke/expiry/rollback before propagation |
| P1 | Regulator work | Current-year deterministic tax/payroll calculators, official HMRC sandbox/test evidence, fraud headers, iXBRL taxonomy and accepted/rejected provider acknowledgements |
| P1 | UI accessibility | 360/390px, 768px, 1440px, 200% zoom, dark mode, keyboard and screen reader; verify in Chrome/Edge/Safari and signed-in role journeys |
| P2 | Intelligence | Model provenance, PII minimisation, versioned prompts, tenant-aware retrieval, metered agent costs and review outcome evaluations |

## Proposed premium experience (not yet all implemented)
1. **Practice command centre:** daily deadlines, work owners, aged documents, AML blockers and client exceptions; no false all-clear when a query fails.
2. **Client lifecycle:** prospect → risk/AML → engagement/e-sign → service assignment → recurring work → review → invoice; progress should be visible across modules.
3. **Client portal:** secure document requests, message threads, approvals, scoped account updates, reminders and clear filing acknowledgements.
4. **Work review:** versioned evidence and preparation/reviewer roles; preview impact before posting or filing. Build a genuine immutable submission-receipt timeline.
5. **Operations:** saved filters, keyboard search, bulk task assignment, consistent feedback, mobile density and useful error recovery.
6. **Dashboard design:** editorial page headers, compact semantic KPI strips, realistic tables, owner/date columns and single-layer panels rather than decorative nested cards.

## AI agents: recommended roadmap
| Agent | Inputs and output | Guardrails |
|---|---|---|
| Document intake | Payslips, bank statements, invoices; structured extracted draft plus confidence and source references | Consent, client-bound storage, malware checks, document review and deterministic totals |
| Bookkeeping review | Suggested categorisation, duplicate invoice flags and reconciliation exceptions | No direct ledger write without reviewer; reject cross-client data |
| Deadline and job coordinator | Real authorised obligations, confirmed provider dates, staff workload; propose assignments | No invented statutory dates, no automatic filing; respect role access |
| Client communications | Draft secure portal requests, progress summaries and reminders | Client consent, controlled templates, human approval before sending |
| Practice insights | Aggregate only from permitted data, workload/capacity and overdue risk | Distinguish rule-based summaries from forecasts; model provenance and cost limits |
| Regulation evidence assistant | Official HMRC/Companies House guidance with source version/date and explanation | Retrieval ACL, authority whitelist, no unsourced legal certainty or executable filing claims |

## MCP and Omniqora contract
Use TaxLounge UI → authenticated tenant-scoped Edge Function → centrally approved Omniqora tool gateway → explicit read-only capability / prepared draft → reviewer → locally controlled action. Tools must have least privilege, tenant and client scope, approval state, purpose, audit and cost budget. Financial posting, payments, regulator submission and account deletions are never model-driven one-step tools. The existing `omniqora-bridge` is an aggregate pilot and does NOT mean the full agent runtime is connected.

Recommended staged additions:
- Read-only tools: `clients.search`, `tasks.list`, `filings.status`, `documents.searchAuthorised`, `obligations.current` with authoritative provider evidence.
- Later controlled drafts: `documents.extractDraft`, `tasks.propose`, `messages.draft`, `journal.propose`; reviewers commit via existing regulated workflows.
- Separate event outbox, idempotency/replay protection, provider acknowledgements, PII redaction, deletion propagation and per-practice retrieval indexes; no arbitrary browser-originated MCP endpoints.

## Selected open-source references (evaluate, do not bulk-install)
| Project | Appropriate TaxLounge use | Caution |
|---|---|---|
| [Taste Skill](https://github.com/Leonxlnx/taste-skill) | Audit-first typography, information density and design direction | Design guidance, not a runtime library |
| [Impeccable](https://github.com/pbakaus/impeccable) | Source audit, clarify/adapt/harden/polish | Advisory scanner is not browser acceptance |
| [Awesome DESIGN.md](https://github.com/VoltAgent/awesome-design-md) | Document and maintain TaxLounge's unique visual language | Do not imitate third-party trademarks |
| [React Flow](https://github.com/xyflow/xyflow) | Optional drag-and-drop workflow editor | Keep workflow execution on the server |
| [Trigger.dev](https://github.com/triggerdotdev/trigger.dev) | Retryable document/notification jobs | Compare with existing Supabase schedulers before adding infrastructure |
| [Docling](https://github.com/docling-project/docling) | Multi-format statements, invoices, document structure and source anchors | Independent extraction validation, PII processing review |
| [Langfuse](https://github.com/langfuse/langfuse) | AI tracing, cost and evaluation sets | Ensure UK/EU data boundaries and no raw secrets or client PII in logs |
| [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk) | Standardised scoped tools for Omniqora | OAuth, audience scope and no uncontrolled model write tools |
| [Nango](https://github.com/NangoHQ/nango) | Optional connector OAuth/retries for permitted providers | Check licence and regulator-specific contracts first |
| [Playwright](https://github.com/microsoft/playwright) + [axe-core](https://github.com/dequelabs/axe-core) | Real mobile/desktop and a11y regression tests | Include authenticated permission/cross-tenant journeys |

## UK compliance release discipline
HMRC's MTD for Income Tax phasing and API versions evolve. At this review date, official guidance indicates staged thresholds (£50k in April 2026; £30k April 2027; £20k April 2028), with provider-specific eligibility and exemptions. Never derive filing eligibility solely from turnover or guess acknowledgement states. Confirm each official API version, production access and test suite before release.

- Official MTD guidance: https://www.gov.uk/hmrc-internal-manuals/self-assessment-legal-framework/salf910
- HMRC developer API catalogue: https://developer.service.hmrc.gov.uk/api-documentation/docs/api?categoryFilters=INCOME_TAX_MTD
- October 2026 version lifecycle: https://www.gov.uk/government/publications/edition-7-making-tax-digital-for-income-tax-software-developer-newsletter/edition-7-making-tax-digital-for-income-tax-software-developer-newsletter

## Rollout sequence
**A.** Close CI and role/privacy blockers → **B.** real browser UX/device tests → **C.** one practice in staging → **D.** limited Omniqora read-only tools → **E.** independently verified statutory computations → **F.** explicit regulator acceptance → **G.** controlled production pilot with rollback. No automatic migration of TaxNuvia/Finvessa data.
