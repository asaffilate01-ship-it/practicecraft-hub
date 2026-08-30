# PracticeCraft product unification roadmap

Updated: 30 August 2026

## Product rule

PracticeCraft must behave as one practice operating system, not a menu of separate demos. Every module should use:

1. one tenant-scoped client record;
2. one deadline and task model;
3. one document and approval trail;
4. one submission/evidence ledger;
5. one human-controlled AI review centre; and
6. one responsive workspace design system.

AI may propose matches, duplicates, classifications, capex treatment and accounting judgements. It must not silently post, approve or file them.

## Official product benchmarks

The benchmark is capability and workflow quality, not visual copying.

- [Inform Direct company secretarial features](https://www.informdirect.co.uk/features/): company portfolios, statutory registers, Companies House changes, confirmation statements, approvals and a document library.
- [Inform Direct statutory registers](https://www.informdirect.co.uk/features/statutory-registers/): current and historic registers, members, PSCs, LLP records, mortgages and charges, plus printable/branded outputs.
- [IRIS Elements](https://www.iris.co.uk/products/iris-elements/): one shared client record across practice, compliance and productivity products.
- [IRIS Elements Practice Management](https://www.iris.co.uk/products/iris-elements/practice-management/): repeatable workflows, tasks, automation, client communication, onboarding, AML and integrations.
- [IRIS Elements Company Secretarial](https://www.iris.co.uk/products/iris-elements/company-secretarial/): changes to the client record trigger form generation, review and Companies House submission.
- [Capium](https://www.capium.com/): integrated bookkeeping, payroll, accounts production, tax, company secretarial and practice management.
- [Capium Practice Management](https://www.capium.com/products/practice-management/): CRM, deadlines, tasks, documents, e-signing and cross-module updates.

## Current capability and gap map

| Area | Working foundation | Material gap before competitor parity |
|---|---|---|
| Shared client record | Tenant-scoped clients, client detail, services and module relations | Remove duplicate selectors/state; expose a consistent client workspace header and service timeline everywhere |
| Practice control | Dashboard, tasks, workflows, time, billing, reports | Capacity planning, job budgets, recurring workflow monitoring, SLA/escalation rules and reliable communication automation |
| Client onboarding | Prospects, onboarding, AML cases, proposals and e-signing screens | One enforced prospect → AML → proposal → engagement → client → service workflow with evidence gates |
| Company secretarial | Profiles, directors, PSCs, members, share classes, changes, confirmation cycles and filings | Secretaries, LLP members, charges, registered email/SAIL, accounting reference-date changes, company name changes, dividends, certificates, register-at-date reports and more approved CH forms |
| Accounts production | TB import, journals, disclosures, fixed assets, notes, statements and tax steps | Current taxonomy iXBRL validation, all entity/FRS variants, comparatives/rounding controls, groups/consolidation and formal compliance content testing |
| Corporation tax | Periods, computation workspace, CT600 and supplementary UI foundations | Current-year calculation engine, loss/group/loan logic, validated CT600 XML, dual iXBRL package and HMRC recognition/testing |
| Self Assessment | SA periods and supplementary form foundations | Current-year calculations, full supported supplementary pages, HMRC pre-population, MTD ITSA obligations and HMRC recognition/testing |
| VAT | MTD OAuth/obligations and return workspace | Production fraud headers/network evidence, digital-link controls, penalty/payment views and HMRC production approval |
| Payroll/RTI | Employers, employees, runs, calculations, FPS/EPS builders and pensions screens | Statutory edge cases, year-end forms, corrections/EYU-equivalent workflow, payment reconciliation and HMRC RTI test evidence |
| Charity/partnership | Charity, Gift Aid, annual return, partnership and LLP foundations | Charity SORP accounts, independent examination/trustee workflows, Charities Online submission route, Charity Commission workflow and full SA800 allocations |
| AI accounts import | Documents, CSV/bank data, fingerprints, matching, duplicates, judgements and checklist | Production OCR, extraction QA, evaluation datasets, explainability, confidence thresholds, deterministic postings and monitored model/provider operations |
| Client portal/mobile | Portal routes, invoices, VAT, documents, messages, payslips and responsive shell | End-to-end role testing, push/camera capture, offline/retry handling, accessibility and packaged native apps |

## UX unification stages

### Stage A — implemented in this branch

- fixed the broken `/secretarial` navigation route;
- added a searchable company portfolio with register health and deadlines;
- added a dedicated single-company secretarial record;
- made Companies House profile/officer/PSC sync a real authenticated action;
- added working global search for clients, companies and tasks;
- collapsed secondary navigation groups by default;
- introduced a shared workspace page header across priority dashboards;
- standardised mobile tab scrolling; and
- renamed the fragmented accounts AI surface to one **AI Review Centre** with human-approval language.

### Stage B — next build

- finish the common client workspace header conversion inside every bookkeeping, accounts, tax, payroll, VAT and secretarial detail screen;
- finish converting lower-priority list/workbench pages to shared filters, KPIs, empty states and mobile cards;
- move practice-level AI suggestions into controlled Review Centre sections;
- add saved views, assignee/work-status filters and bulk operations that actually execute;
- add company secretarial document generation and register exports.

### Stage B1 — implemented in the next-phase commit

- added a persistent selected-client workspace bar with entity-aware links, task warnings and submission state;
- added a cross-module client activity timeline sourced from audit events, tasks, documents and submission jobs;
- linked charity and partnership selectors to the shared client context;
- converted AML, CIS, ITSA, pensions, iXBRL, incorporations, submissions, billing, documents, charity and partnership headers to the shared responsive hierarchy;
- removed duplicated inner-page padding from specialist workbenches;
- replaced hard-coded proposal examples with tenant-scoped proposal persistence;
- replaced the hard-coded March 2026 calendar with persistent monthly client/staff events and mobile agenda cards; and
- replaced hard-coded currencies and EC Sales examples with tenant-scoped database records, while leaving automatic rate refresh disabled until a provider is configured.
- replaced the sample trial balance with real CSV parsing, exact-code mapping, balance validation and a persistent review history; ledger posting remains a separate controlled action.

### Stage C — regulatory completion

- implement only the HMRC and Companies House form sets covered by signed test specifications;
- retain fail-closed environment gates for unapproved production submission types;
- attach immutable request, response, receipt, approval and software-version evidence to every submission;
- complete four-role, cross-tenant, accessibility, mobile and disaster-recovery testing; and
- obtain the relevant HMRC recognition and Companies House software filing approval before marketing production filing.

### Stage C1 — implemented in the regulatory control commit

- replaced the static readiness page with a tenant-persistent Regulatory Control Centre;
- documented each required REST API, XML gateway, OAuth/credential route and portal-only handoff;
- added accountable owners, application references, target/review dates and blockers per filing capability;
- added a structured evidence register for sandbox, schema, fraud-header, security, accessibility and recognition results; and
- added a database-enforced production kill switch that authenticated browser users cannot enable.
### Stage C2 — implemented in the accounts compliance phase

- added tenant-persistent FRS 105 and FRS 102 Section 1A preparation profiles;
- added explicit framework-eligibility, comparative, rounding, accounting-policy and disclosure controls;
- made an adjusted, balanced trial balance and complete control set mandatory before preparation sign-off;
- added a two-person reviewer workflow restricted to managers, firm owners and super admins;
- added database-enforced locks over trial balances, tax computations and core period data;
- added an append-only prepared/locked/reopened evidence ledger and retained locked snapshots; and
- added comparative statement columns and consistent whole-pound or £000 presentation rounding.

This phase does not claim standards-valid iXBRL or Companies House/HMRC acceptance.

### Stage C3 — implemented in the iXBRL preflight phase

- replaced the placeholder iXBRL page with a responsive filing workspace, package pipeline, mapping editor, facts inspection and append-only audit view;
- registered the FRC Taxonomy Suite 2026, Charities Taxonomy 2026 and HMRC Corporation Tax computational 2025 release as authority-controlled reference data;
- made reviewer-locked final accounts mandatory before a digital accounts package can be built;
- added versioned source and tagged-fact snapshots, period/identity checks, non-zero mapping coverage and duplicate concept/context warnings;
- added independent tagged-facts review, restricted to managers/owners and requiring a different user from the preparer;
- reserved external validator and test-service outcomes for service-role workflows, preventing browser users from fabricating acceptance; and
- kept live accounts filing disabled and blocked test readiness until real external validation evidence exists.

The next accounts filing stage is the standards-conformant XHTML/iXBRL renderer, rendered-document visual review, execution against the HMRC joint filing checks and Companies House Accounts TIS 5.9 validator, followed by recorded Companies House test-service acceptance.
