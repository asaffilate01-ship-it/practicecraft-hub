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
