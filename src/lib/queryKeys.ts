/**
 * Canonical TanStack Query key factory.
 * Prefix by module, include entity IDs as key parts.
 * tenantId is implicit via API client headers.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
export const qk = {
  me: ["me"] as const,

  // ── Clients ─────────────────────────────────────────
  clients: (filters?: any) => ["clients", filters] as const,
  client: (clientId: string) => ["client", clientId] as const,

  // ── Secretarial ─────────────────────────────────────
  secretarial: {
    summary: (clientId: string) => ["secretarial", "summary", clientId] as const,
    registers: {
      directors: (clientId: string) => ["secretarial", "registers", "directors", clientId] as const,
      psc: (clientId: string) => ["secretarial", "registers", "psc", clientId] as const,
      members: (clientId: string) => ["secretarial", "registers", "members", clientId] as const,
      shareClasses: (clientId: string) => ["secretarial", "shareClasses", clientId] as const,
      shareTx: (clientId: string) => ["secretarial", "shareTx", clientId] as const,
    },
    changes: (clientId: string, filters?: any) =>
      ["secretarial", "changes", clientId, filters] as const,
    change: (changeId: string) => ["secretarial", "change", changeId] as const,
    workbench: (filters?: any) => ["secretarial", "workbench", filters] as const,
  },

  // ── Incorporations ──────────────────────────────────
  incorporations: {
    pipeline: (filters?: any) => ["incorp", "pipeline", filters] as const,
    app: (id: string) => ["incorp", "app", id] as const,
    validate: (id: string) => ["incorp", "validate", id] as const,
  },

  // ── VAT ─────────────────────────────────────────────
  vat: {
    workbench: (filters?: any) => ["vat", "workbench", filters] as const,
    return: (returnId: string) => ["vat", "return", returnId] as const,
    obligations: (clientId?: string) => ["vat", "obligations", clientId] as const,
  },

  // ── Payroll ─────────────────────────────────────────
  payroll: {
    workbench: (filters?: any) => ["payroll", "workbench", filters] as const,
    employer: (employerId: string) => ["payroll", "employer", employerId] as const,
    run: (runId: string) => ["payroll", "run", runId] as const,
  },

  // ── AML / KYC ───────────────────────────────────────
  aml: {
    workbench: (filters?: any) => ["aml", "workbench", filters] as const,
    case: (caseId: string) => ["aml", "case", caseId] as const,
  },

  // ── Submissions ─────────────────────────────────────
  submissions: {
    jobs: (filters?: any) => ["submissions", "jobs", filters] as const,
    job: (id: string) => ["submissions", "job", id] as const,
  },

  // ── Documents ───────────────────────────────────────
  documents: {
    library: (filters?: any) => ["documents", "library", filters] as const,
    templates: (filters?: any) => ["documents", "templates", filters] as const,
  },

  // ── Billing ─────────────────────────────────────────
  billing: {
    invoices: (filters?: any) => ["billing", "invoices", filters] as const,
    plans: (filters?: any) => ["billing", "plans", filters] as const,
    payments: (filters?: any) => ["billing", "payments", filters] as const,
  },

  // ── Practice ────────────────────────────────────────
  practice: {
    users: (filters?: any) => ["practice", "users", filters] as const,
    roles: ["practice", "roles"] as const,
    workflows: (filters?: any) => ["practice", "workflows", filters] as const,
    integrations: ["practice", "integrations"] as const,
    branding: ["practice", "branding"] as const,
    features: ["practice", "features"] as const,
    tenants: ["practice", "tenants"] as const,
  },

  // ── Settings ────────────────────────────────────────
  settings: {
    tenant: ["settings", "tenant"] as const,
    branding: ["settings", "branding"] as const,
    notifications: ["settings", "notifications"] as const,
    security: ["settings", "security"] as const,
  },

  // ── Portal (client audience) ────────────────────────
  portal: {
    summary: ["portal", "summary"] as const,
    deadlines: (range?: any) => ["portal", "deadlines", range] as const,
    invoices: (filters?: any) => ["portal", "invoices", filters] as const,
    documents: (filters?: any) => ["portal", "documents", filters] as const,
    messages: {
      threads: ["portal", "messages", "threads"] as const,
      thread: (id: string) => ["portal", "messages", "thread", id] as const,
    },
  },

  // ── Tasks ───────────────────────────────────────────
  tasks: (filters?: any) => ["tasks", filters] as const,
  task: (taskId: string) => ["task", taskId] as const,
} as const;
