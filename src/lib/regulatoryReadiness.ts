export type ReadinessStatus = "beta" | "sandbox" | "build" | "blocked";

export interface ReadinessModule {
  name: string;
  authority: "Internal" | "HMRC" | "Companies House" | "Charity Commission";
  status: ReadinessStatus;
  current: string;
  next: string;
  route?: string;
  phase: 1 | 2 | 3 | 4;
}

export const readinessLabels: Record<ReadinessStatus, string> = {
  beta: "Beta usable", sandbox: "Sandbox / test", build: "Build required", blocked: "Live filing blocked",
};

export const regulatoryReadiness: ReadinessModule[] = [
  { name: "Practice management", authority: "Internal", status: "beta", current: "Clients, tasks, workflows, documents, portal, billing, time, permissions and audit views are implemented.", next: "Complete role/UAT matrix, backups, incident runbooks, accessibility and penetration testing.", route: "/practice", phase: 1 },
  { name: "Record ingestion and accounts AI", authority: "Internal", status: "beta", current: "Bank/CSV/PDF ingestion, fingerprints, duplicate/match review, tenant-bound AI suggestions, validated outputs, stable-model controls and metadata-only operation audit exist.", next: "Deploy the AI safety migration/functions, then complete provider DPIA/terms, OCR confidence QA, prompt-injection tests, deterministic posting controls and accountant-labelled evaluation sets.", route: "/accounts-intelligence", phase: 1 },
  { name: "Accounts preparation and final accounts", authority: "Internal", status: "build", current: "Trial balance, journals, lead schedules, tax computation and draft statement workflows are present.", next: "Add FRS 102/105 policy engine, disclosure checklists, comparatives, consolidation, rounding, sign-off locks and PDF/iXBRL validation.", route: "/accounts", phase: 2 },
  { name: "VAT Making Tax Digital", authority: "HMRC", status: "sandbox", current: "OAuth, obligation sync, exact HMRC period keys, server-held tokens, finalisation declaration and evidenced submissions are implemented for sandbox deployment.", next: "Complete fraud-header test suite, sandbox scenarios, error/retry journey, WCAG/security evidence and HMRC production checklist.", route: "/vat", phase: 1 },
  { name: "PAYE / RTI (FPS and EPS)", authority: "HMRC", status: "blocked", current: "Payroll calculations and draft FPS/EPS screens exist; legacy XML submission is deliberately blocked.", next: "Implement the current-year RIM, canonical IRmark, poll/delete journey and Local Test Service cases, then request PAYE recognition with a Vendor ID.", route: "/payroll", phase: 3 },
  { name: "Corporation Tax (CT600)", authority: "HMRC", status: "build", current: "Computation and workflow status exist; there is no valid CT600 submission package.", next: "Generate current CT600 XML, attach computations and accounts iXBRL, validate with HMRC LTS and retain receipts/amendments.", route: "/corporation-tax", phase: 3 },
  { name: "Self Assessment", authority: "HMRC", status: "build", current: "SA workflows and calculations exist but do not produce or submit recognised SA returns.", next: "Choose initial forms (SA100/SA103 first), implement current-year schemas/calculation validation and HMRC test cases before adding SA800/SA900.", route: "/self-assessment", phase: 4 },
  { name: "Charity accounts", authority: "Internal", status: "build", current: "Charity clients can use the accounts-production foundation and now have dedicated profile, application and annual-return workspaces.", next: "Add Charities SORP/FRS 102 fund accounting, restricted/unrestricted funds, SOFA, trustee report, independent examination and charity-specific disclosures.", route: "/charities", phase: 2 },
  { name: "Gift Aid claims", authority: "HMRC", status: "build", current: "Controlled claim and donation schedule tables plus a staff workbench exist; no claim is transmitted.", next: "Implement current Charities Online XML schemas, credentials, IRmark/envelope rules, test-service cases, amendments and immutable HMRC receipts.", route: "/charities", phase: 3 },
  { name: "Charity Commission annual return", authority: "Charity Commission", status: "build", current: "The product prepares annual-return data and records manual filing evidence; the public Commission API is used only for register lookup/sync.", next: "Map the current annual-return questions and validation, trustee approval, online-service handoff, evidence capture and accepted-status reconciliation.", route: "/charities", phase: 3 },
  { name: "Partnership SA800", authority: "HMRC", status: "build", current: "Partnership profiles, partners, allocation data and SA800 workspaces are implemented without live transmission.", next: "Implement current-year partnership return schemas, computation validations, partner statements, exclusions and HMRC test-service acceptance.", route: "/partnerships", phase: 4 },
  { name: "LLP accounts and filings", authority: "Companies House", status: "build", current: "LLP clients have dedicated profile, accounts-review and approval foundations; no LLP iXBRL filing package is generated.", next: "Add LLP SORP presentation, members report/approval, current taxonomy tagging, package validation and Companies House test acceptance.", route: "/partnerships", phase: 3 },
  { name: "MTD for Income Tax", authority: "HMRC", status: "build", current: "A local workbench exists; local status changes are not HMRC submissions.", next: "Build business details, obligations, quarterly updates, adjustments, losses, other income, crystallisation/calculation and final declaration journeys.", route: "/itsa", phase: 4 },
  { name: "CIS monthly return", authority: "HMRC", status: "build", current: "Contractor/subcontractor records and verification workflow exist without a CIS300 gateway submission.", next: "Implement verification, monthly return schema, nil return, amendment and polling against the current HMRC test service.", route: "/cis", phase: 4 },
  { name: "Companies House secretarial filings", authority: "Companies House", status: "sandbox", current: "Company lookup plus CS01, AD01, AP01 and TM01 XML builders exist; gateway mode defaults to test and live requires an explicit validation gate.", next: "Complete test-gateway cases, secure auth-code handling, polling/rejections, PSC/share/allotment forms and presenter acceptance.", route: "/secretarial/workbench", phase: 2 },
  { name: "Companies House annual accounts", authority: "Companies House", status: "build", current: "Tagging screens exist but no standards-valid accounts iXBRL package or accounts filing journey is implemented.", next: "Adopt current UK taxonomies, build the accounts iXBRL renderer/validator, visual review and Companies House test submission pack.", route: "/ixbrl", phase: 2 },
  { name: "Companies House incorporations", authority: "Companies House", status: "build", current: "Application workflow exists without a production-qualified incorporation filing connector.", next: "Implement IN01 schema, identity/ACSP controls, fees/payment, attachment handling, gateway polling and rejection correction.", route: "/incorporations", phase: 4 },
];

export function readinessCounts(items = regulatoryReadiness) {
  return items.reduce<Record<ReadinessStatus, number>>((counts, item) => ({ ...counts, [item.status]: counts[item.status] + 1 }), { beta: 0, sandbox: 0, build: 0, blocked: 0 });
}
