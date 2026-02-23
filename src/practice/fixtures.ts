export const practiceBranding = {
  appName: "Practice Suite",
  resellerName: "Kartoa Practice Cloud",
  tenants: {
    "t-001": {
      tenantId: "t-001",
      practiceName: "IQ Advisory",
      logoUrl: "https://dummyimage.com/160x40/000/fff&text=IQ+Advisory",
      primaryColor: "#111111",
      accentColor: "#111111",
      supportEmail: "support@iqadvisory.co.uk",
    },
    "t-002": {
      tenantId: "t-002",
      practiceName: "TaxLounge",
      logoUrl: "https://dummyimage.com/160x40/111/fff&text=TaxLounge",
      primaryColor: "#0f766e",
      accentColor: "#0f766e",
      supportEmail: "support@taxlounge.co.uk",
    },
  } as Record<string, PracticeTenantBranding>,
};

export type PracticeTenantBranding = {
  tenantId: string;
  practiceName: string;
  logoUrl?: string;
  primaryColor?: string;
  accentColor?: string;
  supportEmail?: string;
};

export const practiceFeaturesByTenant: Record<string, Record<string, boolean>> = {
  "t-001": {
    clients: true,
    secretarial: true,
    incorporations: true,
    vat: true,
    payroll: true,
    submissions: true,
    documents: true,
    tasks: true,
    practice_mgmt: true,
    billing: true,
    kyc_aml: true,
  },
  "t-002": {
    clients: true,
    secretarial: true,
    incorporations: false,
    vat: true,
    payroll: false,
    submissions: true,
    documents: true,
    tasks: true,
    practice_mgmt: true,
    billing: true,
    kyc_aml: true,
  },
};

export const practiceTenants = [
  { id: "t-001", name: "IQ Advisory", plan: "Pro", region: "UK", status: "active" },
  { id: "t-002", name: "TaxLounge", plan: "Starter", region: "UK", status: "active" },
];

/* ── Onboarding drafts ──────────────────────────────────── */

export const onboardingDrafts: Record<string, any> = {
  "t-001": {
    tenantId: "t-001",
    status: "in_progress",
    step: "basics",
    basics: {
      practiceName: "IQ Advisory",
      region: "UK",
      plan: "Pro",
      contactEmail: "support@iqadvisory.co.uk",
      contactPhone: "+44 20 0000 0000",
    },
    branding: {
      logoUrl: "https://dummyimage.com/160x40/000/fff&text=IQ+Advisory",
      primaryColor: "#111111",
      accentColor: "#111111",
    },
    modules: {
      clients: true,
      secretarial: true,
      incorporations: true,
      vat: true,
      payroll: true,
      submissions: true,
      documents: true,
      tasks: true,
      practice_mgmt: true,
      billing: true,
      kyc_aml: true,
    },
    integrations: {
      companiesHouse: { enabled: true, apiKey: "mock", presenterId: "PRESENTER", email: "api@practice.com" },
      hmrc: { enabled: true, clientId: "mock", clientSecret: "mock", environment: "sandbox" },
      gocardless: { enabled: true, accessToken: "mock", environment: "sandbox" },
      stripe: { enabled: true, publishableKey: "pk_test_mock", secretKey: "sk_test_mock" },
      accessPaysuite: { enabled: false, merchantId: "", apiKey: "" },
      openBanking: { enabled: false, provider: "truelayer" },
    },
    templates: {
      coaPack: "uk_sme_default",
      taskPack: "practice_default_120",
      lettersPack: "engagement_letters_v1",
      invoicePack: "invoice_default_v1",
    },
    users: [
      { email: "owner@iqadvisory.co.uk", name: "Owner", role: "owner" },
      { email: "admin@iqadvisory.co.uk", name: "Admin", role: "admin" },
    ],
  },
};

export const templateCatalog = {
  coaPacks: [
    { id: "uk_sme_default", name: "UK SME Default (Ltd/Sole/Partnership/Charity)", version: "1.0" },
    { id: "uk_charity_sofa", name: "UK Charity (SORP-ready mapping)", version: "1.0" },
  ],
  taskPacks: [
    { id: "practice_default_120", name: "Practice Default (120+ tasks)", version: "1.0" },
    { id: "compliance_heavy_180", name: "Compliance Heavy (180+ tasks)", version: "1.0" },
  ],
  lettersPacks: [
    { id: "engagement_letters_v1", name: "Engagement Letters Pack v1", version: "1.0" },
    { id: "gdpr_privacy_v1", name: "GDPR & Privacy Pack v1", version: "1.0" },
  ],
  invoicePacks: [
    { id: "invoice_default_v1", name: "Invoice Templates v1", version: "1.0" },
    { id: "invoice_premium_v2", name: "Invoice Templates Premium v2", version: "2.0" },
  ],
};
