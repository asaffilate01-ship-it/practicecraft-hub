# PracticeCraft go-live readiness

Last reviewed: 28 August 2026

## Current decision

**No-go for production client data or production filings.** The frontend builds and the deployed functions respond, but the staging database still needs the new isolation migrations and the `portal` function deployment. Regulator acceptance evidence is not complete.

## Staging identity audit

The supplied accounts authenticate, but the live database currently creates a separate practice and `firm_owner` grant for every signup. The client and employee identities therefore have both staff and portal identities, while the manager and bookkeeper are in separate tenants. This must be corrected before dashboard acceptance testing means anything.

Migration `20260828133000_portal_role_and_persistence_safety.sql`:

- prevents portal signup from creating a practice owner;
- makes manager and bookkeeper members of the staged client tenant;
- removes accidental staff grants from the client and employee identities;
- scopes client documents, messages, invoices, VAT, submissions and payroll with RLS;
- links an employee auth identity to its matching payroll employee record;
- replaces bucket-wide authenticated access to private client documents.

After deployment, run the four-account test matrix and retain screenshots plus query evidence for positive and negative access cases.

## Module readiness

| Area | Built now | Required before production |
|---|---|---|
| Practice management | Staff dashboard, clients, tasks, workflows, billing and role permissions | Repair staging roles; tenant-isolation E2E; permission matrix; production seed cleanup |
| Accounts preparation | Import/intelligence foundations, duplicate/evidence matching, journals and account-period workflow | Full FRS 105/FRS 102 rules, disclosure checklist, comparative/opening balances, deterministic statements, review lock and signed approval |
| VAT MTD | OAuth/API function and return workbench | Current HMRC sandbox scenarios, fraud-header validation, error/retry evidence and recognition journey |
| PAYE/RTI | Payroll workbench, FPS/EPS builders and processor | Current RIM/IRmark/LTS validation, test credentials, reconciliations, amendments and year-end forms |
| Corporation Tax | CT workspace/readiness controls | Current CT600 schema, computations, accounts iXBRL, joint validation and HMRC test pack |
| Self Assessment | SA workspace | Current-year SA100/SA103 schemas, validations, calculations, test pack and amendment flow |
| MTD Income Tax | ITSA workbench | HMRC production application, obligations, quarterly updates, EOPS/final declaration journey and fraud headers |
| Companies House | REST lookup and XML gateway foundations | Presenter credentials, per-form conformance tests, current iXBRL taxonomy, polling and rejection/amendment journeys |
| Company secretarial | Workbench for selected forms and incorporations | Complete supported-form matrix, identity verification/ACSP operating controls, fees and test evidence |
| Charity accounts | Charity client/profile/application and annual-return preparation records | Charity SORP engine, fund accounting, trustees' report, independent examination/audit routing and signed approval |
| Gift Aid | Claim and donation schedule data model with review states | Declaration validation, current HMRC XML schema, test service acceptance, amendments and production credentials |
| Charity setup | Registration workspace and evidence model | Trustee/governing-document workflow, eligibility checks and manual Charity Commission application handoff |
| Charity Commission return | Prepared return, external reference and evidence fields | Manual online-service submission checklist and evidence capture; do not imply the public register API files returns |
| Partnerships | Profile, partners, allocations and SA800 workspace | Current 2026 SA800 pack, partner statements, validation/test service and amendment flow |
| LLP accounts/returns | LLP profile and accounts review controls | LLP SORP/FRS treatment, members' report, current iXBRL and Companies House test acceptance |
| AI import/automation | Tenant-bound OCR/categorisation/intelligence endpoints, stable-model configuration, validated outputs, metadata-only operation audit and human-review workflow | Deploy the AI safety migration/functions; complete DPIA/provider terms, measured extraction accuracy, labelled regression corpus, prompt-injection/red-team tests, retention controls and monitored quality thresholds |

## Deployment gate

1. Apply all 28 August 2026 migrations, including `20260828160000_ai_operation_safety.sql`, to a staging Supabase branch and refresh generated TypeScript database types.
2. Deploy the updated `portal`, `ai-categorise`, `receipt-ocr` and `ai-intelligence` Edge Functions and verify each with authenticated positive, negative and cross-tenant tests.
3. Re-run all four dashboards on desktop and mobile, including cross-client denial tests and persistence after sign-out/sign-in.
4. Delete or disable demo identities for production; keep credentials outside the frontend bundle and repository.
5. Configure a UK production environment with backups, restore test, retention/deletion policy, audit export, alerting, incident response and support ownership.
6. Complete DPIA, privacy/cookie terms, processor agreements, ICO/PECR assessment, penetration test and vulnerability/dependency process.
7. Complete each regulator's sandbox/test/recognition or presenter journey before enabling its production switch.
8. Pilot with synthetic data, then internal practice data, then a tightly limited client beta with filing-by-filing human approval.

## AI deployment configuration

- Set `AI_API_KEY` (or the legacy `LOVABLE_API_KEY`) only as an Edge Function secret.
- Set `AI_GATEWAY_URL` and restrict `AI_GATEWAY_ALLOWED_HOSTS` to the contracted HTTPS provider host.
- Set stable `AI_TEXT_MODEL` and `AI_VISION_MODEL` identifiers; the runtime rejects model names containing `preview`.
- Set `ALLOWED_ORIGINS` to the exact production and staging application origins.
- Keep categorisation, OCR and anomaly results as suggestions requiring a staff decision; these functions do not post journals or submit filings.

## Evidence required for a go decision

- migration and Edge Function deployment logs;
- four-role route/RLS/storage test report;
- backup restore evidence and monitoring alerts;
- independent penetration-test report with critical/high findings closed;
- HMRC test-case results by tax product;
- Companies House presenter/test-service acceptance by filing type;
- accessibility audit and supported-device/browser matrix;
- signed operational runbooks for filing failure, duplicate filing, outage, data incident and client offboarding.
