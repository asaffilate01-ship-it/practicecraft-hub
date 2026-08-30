export type ReadinessStatus = "beta" | "sandbox" | "build" | "blocked";
export type ControlStatus = "not_started" | "building" | "sandbox_testing" | "acceptance_submitted" | "recognised" | "blocked";

export interface RegulatoryIntegrationRequirement {
  key: string;
  authority: "HMRC" | "Companies House" | "Charity Commission";
  name: string;
  protocol: string;
  authentication: string;
  covers: string;
  credentials: string[];
  productionGate: string;
  officialUrl: string;
}

export interface ReadinessModule {
  key: string;
  name: string;
  authority: "Internal" | "HMRC" | "Companies House" | "Charity Commission";
  status: ReadinessStatus;
  current: string;
  next: string;
  route?: string;
  phase: 1 | 2 | 3 | 4;
  integrationKeys?: string[];
}

export const readinessLabels: Record<ReadinessStatus, string> = {
  beta: "Beta usable", sandbox: "Sandbox / test", build: "Build required", blocked: "Live filing blocked",
};

export const controlLabels: Record<ControlStatus, string> = {
  not_started: "Not started", building: "Building", sandbox_testing: "Sandbox testing",
  acceptance_submitted: "Acceptance submitted", recognised: "Recognition recorded", blocked: "Blocked",
};

export const regulatoryIntegrations: RegulatoryIntegrationRequirement[] = [
  {
    key: "hmrc-vat-mtd", authority: "HMRC", name: "VAT (MTD) API", protocol: "REST + OAuth 2.0",
    authentication: "OAuth authorisation-code grant for each business; server-held client secret and refresh token.",
    covers: "VAT obligations, returns, liabilities, payments, penalties and customer information.",
    credentials: ["HMRC Developer Hub application", "Client ID and server-only client secret", "Registered redirect URI", "Agent Services Account for agent journeys"],
    productionGate: "Test fraud-prevention headers, complete the end-to-end sandbox journey and obtain production application access.",
    officialUrl: "https://developer.service.hmrc.gov.uk/api-documentation/docs/api/service/vat-api/1.0",
  },
  {
    key: "hmrc-mtd-income-tax", authority: "HMRC", name: "MTD Income Tax API family", protocol: "REST + OAuth 2.0",
    authentication: "OAuth user-restricted scopes; consent and tokens are held per taxpayer/client.",
    covers: "Business details, obligations, self-employment/property updates, other income, losses, calculations, accounts and final declaration.",
    credentials: ["HMRC production application", "Client ID and server-only client secret", "Registered redirect URI", "Agent Services Account", "Current supported API subscriptions/scopes"],
    productionGate: "Implement the complete supported journey on current API versions, fraud headers, test-support scenarios and production access review.",
    officialUrl: "https://developer.service.hmrc.gov.uk/api-documentation/docs/api?categoryFilters=INCOME_TAX_MTD",
  },
  {
    key: "hmrc-agent-authorisation", authority: "HMRC", name: "Agent Authorisation API", protocol: "REST + OAuth 2.0",
    authentication: "Application credentials and agent authorisation scopes.",
    covers: "Creates and tracks digital agent-authorisation invitations; it does not replace tax-product OAuth consent.",
    credentials: ["Agent Services Account", "HMRC application credentials", "Agent reference and supported tax-service identifiers"],
    productionGate: "Complete invitation, status and error journeys and retain authorisation evidence.",
    officialUrl: "https://developer.service.hmrc.gov.uk/api-documentation/docs/api/service/agent-authorisation-api/2.0",
  },
  {
    key: "hmrc-rti-xml", authority: "HMRC", name: "PAYE RTI Online", protocol: "Government Gateway XML",
    authentication: "Vendor/product identity plus employer or agent Government Gateway filing credentials in the HMRC envelope.",
    covers: "FPS, EPS and related current-year PAYE/RTI submissions and polling.",
    credentials: ["HMRC software-developer registration", "4-digit Vendor ID", "Test service credentials", "Employer PAYE references", "Government Gateway filing credentials"],
    productionGate: "Generate the current-year RIM/schema and IRmark, pass Local Test Service/recognition cases and retain acknowledgement/poll responses.",
    officialUrl: "https://developer.service.hmrc.gov.uk/api-documentation/docs/api/xml/Real%20Time%20Information%20online",
  },
  {
    key: "hmrc-corporation-tax-xml", authority: "HMRC", name: "Corporation Tax Online", protocol: "Government Gateway XML + dual iXBRL",
    authentication: "HMRC software vendor and company/agent online filing credentials.",
    covers: "CT600 returns and amendments with accounts and tax-computation iXBRL attachments.",
    credentials: ["4-digit Vendor ID", "Corporation Tax applicant/test pack", "Test service credentials", "Company UTR", "Government Gateway filing credentials"],
    productionGate: "Pass current CT600 validation and recognition, including both iXBRL documents; recognition is renewed annually.",
    officialUrl: "https://www.gov.uk/government/collections/corporation-tax-online-support-for-software-developers",
  },
  {
    key: "hmrc-self-assessment-xml", authority: "HMRC", name: "Self Assessment Online", protocol: "Government Gateway XML",
    authentication: "HMRC software vendor and taxpayer/agent online filing credentials.",
    covers: "The non-MTD SA100, SA800 and SA900 return route; pre-population uses separate REST APIs.",
    credentials: ["4-digit Vendor ID", "Current tax-year technical pack", "Test service credentials", "Taxpayer UTR", "Government Gateway filing credentials"],
    productionGate: "Pass recognition scenarios for every marketed return/form set and tax year before enabling live submission.",
    officialUrl: "https://developer.service.hmrc.gov.uk/api-documentation/docs/api/xml/Self%20Assessment%20Online",
  },
  {
    key: "hmrc-charities-xml", authority: "HMRC", name: "Charities Online", protocol: "Government Gateway XML",
    authentication: "Charity/CASC online credentials and HMRC recognised software identity.",
    covers: "Submit, amend and retrieve Gift Aid repayment claim information.",
    credentials: ["4-digit Vendor ID", "Charities Online recognition pack", "Test service credentials", "HMRC charity reference", "Charities Online filing credentials"],
    productionGate: "Generate the current RIM/schema, pass recognition sample data and demonstrate interaction with HMRC online services.",
    officialUrl: "https://developer.service.hmrc.gov.uk/api-documentation/docs/api/xml/Charities%20Online",
  },
  {
    key: "hmrc-cis-xml", authority: "HMRC", name: "Construction Industry Scheme Online", protocol: "Government Gateway XML",
    authentication: "Contractor/agent filing credentials and software vendor identity.",
    covers: "Subcontractor verification and CIS300 monthly/nil returns.",
    credentials: ["4-digit Vendor ID", "CIS technical/test pack", "Contractor references", "Government Gateway filing credentials"],
    productionGate: "Pass current verification, monthly return, amendment and polling recognition cases.",
    officialUrl: "https://developer.service.hmrc.gov.uk/api-documentation/docs/api/xml/Construction%20Industry%20Scheme%20Online",
  },
  {
    key: "companies-house-public-data", authority: "Companies House", name: "Companies House Public Data API", protocol: "REST + API key",
    authentication: "HTTP Basic authentication with the API key as username.",
    covers: "Company profiles, officers, PSCs and filing history; it does not authorise filings.",
    credentials: ["Companies House developer account", "Server-only API key"],
    productionGate: "Secure the key server-side, respect rate limits and keep synced register data tenant-scoped.",
    officialUrl: "https://developer-specs.company-information.service.gov.uk/guides/authorisation",
  },
  {
    key: "companies-house-api-filing", authority: "Companies House", name: "Companies House API Filing", protocol: "REST + OAuth 2.0",
    authentication: "Companies House OAuth user consent and form-specific company scopes.",
    covers: "Transactions and currently exposed filing services, including registered office/email changes and specified insolvency functions.",
    credentials: ["Companies House OAuth application", "Client ID and server-only client secret", "Registered redirect URI", "Required company scopes"],
    productionGate: "Use sandbox, implement transaction validation/submission and expose only forms actually supported by API Filing.",
    officialUrl: "https://developer-specs.company-information.service.gov.uk/manipulate-company-data-api-filing/guides/overview",
  },
  {
    key: "companies-house-xml-gateway", authority: "Companies House", name: "Companies House Software Filing", protocol: "XML Gateway + iXBRL attachments",
    authentication: "Presenter ID/code plus each company's authentication code; fees may require a credit account.",
    covers: "Formations, confirmation statements, officer/PSC/share changes and accounts types supported by current XML schemas.",
    credentials: ["Software Filing presenter account", "Presenter ID and code", "Per-company authentication code", "Credit account for fee-bearing filings", "ACSP registration for client filings"],
    productionGate: "Pass form-by-form test submissions and manual attachment review where required; retain polling, acceptance and rejection evidence.",
    officialUrl: "https://www.gov.uk/guidance/using-software-to-file-your-companys-information",
  },
  {
    key: "charity-commission-register", authority: "Charity Commission", name: "Register of Charities API", protocol: "REST + subscription key",
    authentication: "Charity Commission Developer Hub subscription and API key.",
    covers: "Read-only public Register of Charities data. It does not submit applications, annual returns or changes.",
    credentials: ["Charity Commission Developer Hub account", "Register of Charities product subscription", "Server-only API key"],
    productionGate: "Keep filing as a controlled online-service handoff until the Commission publishes and grants access to a submission interface.",
    officialUrl: "https://api-portal.charitycommission.gov.uk/hub",
  },
];

export const regulatoryReadiness: ReadinessModule[] = [
  { key: "practice-management", name: "Practice management", authority: "Internal", status: "beta", current: "Clients, tasks, workflows, documents, portal, billing, time, permissions and audit views are implemented.", next: "Complete role/UAT matrix, backups, incident runbooks, accessibility and penetration testing.", route: "/practice", phase: 1 },
  { key: "records-ai", name: "Record ingestion and accounts AI", authority: "Internal", status: "beta", current: "Bank/CSV/PDF ingestion, fingerprints, duplicate/match review, capex suggestions, judgements and year-end checklist exist.", next: "Deploy migrations/functions, add OCR confidence QA, deterministic posting controls and accountant-labelled evaluation sets.", route: "/review-centre", phase: 1 },
  { key: "accounts-production", name: "Accounts preparation and final accounts", authority: "Internal", status: "build", current: "Trial balance, journals, lead schedules, tax computation and draft statement workflows are present.", next: "Add FRS 102/105 policy engine, disclosure checklists, comparatives, consolidation, rounding, sign-off locks and PDF/iXBRL validation.", route: "/accounts", phase: 2 },
  { key: "vat-mtd", name: "VAT Making Tax Digital", authority: "HMRC", status: "sandbox", current: "OAuth, obligation sync, exact HMRC period keys, server-held tokens, finalisation declaration and evidenced submissions are implemented for sandbox deployment.", next: "Complete fraud-header tests, sandbox scenarios, error/retry journey, WCAG/security evidence and HMRC production checklist.", route: "/vat", phase: 1, integrationKeys: ["hmrc-vat-mtd", "hmrc-agent-authorisation"] },
  { key: "paye-rti", name: "PAYE / RTI (FPS and EPS)", authority: "HMRC", status: "blocked", current: "Payroll calculations and draft FPS/EPS screens exist; legacy XML submission is deliberately blocked.", next: "Implement the current-year RIM, canonical IRmark, poll/delete journey and Local Test Service cases, then request recognition with a Vendor ID.", route: "/payroll", phase: 3, integrationKeys: ["hmrc-rti-xml"] },
  { key: "corporation-tax", name: "Corporation Tax (CT600)", authority: "HMRC", status: "build", current: "Computation and workflow status exist; there is no valid CT600 submission package.", next: "Generate current CT600 XML, attach computations and accounts iXBRL, validate with HMRC LTS and retain receipts/amendments.", route: "/corporation-tax", phase: 3, integrationKeys: ["hmrc-corporation-tax-xml"] },
  { key: "self-assessment", name: "Self Assessment", authority: "HMRC", status: "build", current: "SA workflows and calculations exist but do not produce or submit recognised SA returns.", next: "Choose initial forms (SA100/SA103 first), implement current-year schemas/calculation validation and HMRC test cases before SA800/SA900.", route: "/self-assessment", phase: 4, integrationKeys: ["hmrc-self-assessment-xml", "hmrc-agent-authorisation"] },
  { key: "charity-accounts", name: "Charity accounts", authority: "Internal", status: "build", current: "Charity clients use the accounts foundation and have profile, application and annual-return workspaces.", next: "Add Charities SORP/FRS 102 fund accounting, SOFA, trustee report, independent examination and charity disclosures.", route: "/charities", phase: 2 },
  { key: "gift-aid", name: "Gift Aid claims", authority: "HMRC", status: "build", current: "Controlled claim and donation schedule tables plus a staff workbench exist; no claim is transmitted.", next: "Implement current Charities Online XML, credentials, IRmark/envelope rules, test cases, amendments and immutable receipts.", route: "/charities", phase: 3, integrationKeys: ["hmrc-charities-xml"] },
  { key: "charity-commission-return", name: "Charity Commission annual return", authority: "Charity Commission", status: "build", current: "The product prepares return data and records manual filing evidence; the public Commission API is lookup-only.", next: "Map current questions and validation, trustee approval, online-service handoff, evidence capture and accepted-status reconciliation.", route: "/charities", phase: 3, integrationKeys: ["charity-commission-register"] },
  { key: "partnership-sa800", name: "Partnership SA800", authority: "HMRC", status: "build", current: "Partnership profiles, partners, allocations and SA800 workspaces exist without live transmission.", next: "Implement current-year schemas, validations, partner statements, exclusions and HMRC test-service acceptance.", route: "/partnerships", phase: 4, integrationKeys: ["hmrc-self-assessment-xml"] },
  { key: "llp-accounts", name: "LLP accounts and filings", authority: "Companies House", status: "build", current: "LLP profiles and accounts-review foundations exist; no LLP iXBRL filing package is generated.", next: "Add LLP SORP presentation, members report/approval, taxonomy tagging, package validation and Companies House acceptance.", route: "/partnerships", phase: 3, integrationKeys: ["companies-house-xml-gateway"] },
  { key: "mtd-income-tax", name: "MTD for Income Tax", authority: "HMRC", status: "build", current: "A local workbench exists; local status changes are not HMRC submissions.", next: "Build business details, obligations, updates, adjustments, losses, other income, calculation and final declaration journeys.", route: "/itsa", phase: 4, integrationKeys: ["hmrc-mtd-income-tax", "hmrc-agent-authorisation"] },
  { key: "cis", name: "CIS monthly return", authority: "HMRC", status: "build", current: "Contractor/subcontractor records and verification workflow exist without a CIS300 gateway submission.", next: "Implement verification, monthly/nil return, amendment and polling against the current HMRC test service.", route: "/cis", phase: 4, integrationKeys: ["hmrc-cis-xml"] },
  { key: "company-secretarial", name: "Companies House secretarial filings", authority: "Companies House", status: "sandbox", current: "Company lookup plus CS01, AD01, AP01 and TM01 XML builders exist; gateway mode defaults to test and live has an explicit gate.", next: "Complete test cases, polling/rejections, PSC/share/allotment forms and presenter acceptance.", route: "/secretarial/workbench", phase: 2, integrationKeys: ["companies-house-public-data", "companies-house-api-filing", "companies-house-xml-gateway"] },
  { key: "company-accounts", name: "Companies House annual accounts", authority: "Companies House", status: "build", current: "Tagging screens exist but no standards-valid accounts iXBRL package or filing journey is implemented.", next: "Adopt current UK taxonomies, build renderer/validator, visual review and Companies House test pack.", route: "/ixbrl", phase: 2, integrationKeys: ["companies-house-xml-gateway"] },
  { key: "incorporations", name: "Companies House incorporations", authority: "Companies House", status: "build", current: "Application workflow exists without a production-qualified incorporation connector.", next: "Implement IN01 schema, identity/ACSP controls, fees, attachments, polling and rejection correction.", route: "/incorporations", phase: 4, integrationKeys: ["companies-house-xml-gateway"] },
];

export function readinessCounts(items = regulatoryReadiness) {
  return items.reduce<Record<ReadinessStatus, number>>((counts, item) => ({ ...counts, [item.status]: counts[item.status] + 1 }), { beta: 0, sandbox: 0, build: 0, blocked: 0 });
}
