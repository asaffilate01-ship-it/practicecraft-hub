
-- ══════════════════════════════════════════════════════════════
-- CIS MODULE TABLES
-- ══════════════════════════════════════════════════════════════

CREATE TABLE public.cis_contractors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  client_id uuid NOT NULL REFERENCES public.clients(id),
  utr text NOT NULL,
  accounts_office_ref text,
  paye_reference text,
  status text NOT NULL DEFAULT 'active',
  verification_date timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, client_id)
);

CREATE TABLE public.cis_subcontractors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  contractor_id uuid NOT NULL REFERENCES public.cis_contractors(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id),
  name text NOT NULL,
  utr text,
  nino text,
  trading_name text,
  company_number text,
  verification_status text NOT NULL DEFAULT 'unverified',
  deduction_rate numeric(5,2) NOT NULL DEFAULT 20,
  last_verified_at timestamp with time zone,
  hmrc_verification_ref text,
  address_json jsonb NOT NULL DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.cis_deductions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  contractor_id uuid NOT NULL REFERENCES public.cis_contractors(id),
  subcontractor_id uuid NOT NULL REFERENCES public.cis_subcontractors(id),
  tax_month integer NOT NULL,
  tax_year text NOT NULL,
  gross_amount_pence integer NOT NULL DEFAULT 0,
  materials_amount_pence integer NOT NULL DEFAULT 0,
  deduction_amount_pence integer NOT NULL DEFAULT 0,
  net_amount_pence integer NOT NULL DEFAULT 0,
  deduction_rate numeric(5,2) NOT NULL,
  payment_date date,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.cis_monthly_returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  contractor_id uuid NOT NULL REFERENCES public.cis_contractors(id),
  tax_month integer NOT NULL,
  tax_year text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  total_gross_pence integer NOT NULL DEFAULT 0,
  total_materials_pence integer NOT NULL DEFAULT 0,
  total_deductions_pence integer NOT NULL DEFAULT 0,
  nil_return boolean NOT NULL DEFAULT false,
  employment_status_declaration boolean NOT NULL DEFAULT false,
  submitted_at timestamp with time zone,
  hmrc_receipt_id text,
  submission_job_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, contractor_id, tax_month, tax_year)
);

-- ══════════════════════════════════════════════════════════════
-- MTD ITSA TABLES
-- ══════════════════════════════════════════════════════════════

CREATE TABLE public.itsa_obligations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  client_id uuid NOT NULL REFERENCES public.clients(id),
  nino text NOT NULL,
  business_id text,
  period_start date NOT NULL,
  period_end date NOT NULL,
  due_date date NOT NULL,
  obligation_type text NOT NULL DEFAULT 'quarterly',
  status text NOT NULL DEFAULT 'open',
  submitted_at timestamp with time zone,
  hmrc_receipt_id text,
  submission_job_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.itsa_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  obligation_id uuid NOT NULL REFERENCES public.itsa_obligations(id),
  client_id uuid NOT NULL REFERENCES public.clients(id),
  update_type text NOT NULL DEFAULT 'quarterly',
  income_json jsonb NOT NULL DEFAULT '{}',
  expenses_json jsonb NOT NULL DEFAULT '{}',
  adjustments_json jsonb NOT NULL DEFAULT '{}',
  total_income_pence integer NOT NULL DEFAULT 0,
  total_expenses_pence integer NOT NULL DEFAULT 0,
  net_profit_pence integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  submitted_at timestamp with time zone,
  hmrc_receipt_id text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.itsa_final_declarations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  client_id uuid NOT NULL REFERENCES public.clients(id),
  tax_year text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  total_income_pence integer NOT NULL DEFAULT 0,
  total_deductions_pence integer NOT NULL DEFAULT 0,
  total_tax_due_pence integer NOT NULL DEFAULT 0,
  calculation_json jsonb NOT NULL DEFAULT '{}',
  declaration_accepted boolean NOT NULL DEFAULT false,
  submitted_at timestamp with time zone,
  hmrc_receipt_id text,
  submission_job_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, client_id, tax_year)
);

-- ══════════════════════════════════════════════════════════════
-- IXBRL TAGGING TABLES
-- ══════════════════════════════════════════════════════════════

CREATE TABLE public.ixbrl_taxonomies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  version text NOT NULL,
  taxonomy_type text NOT NULL DEFAULT 'uk-gaap',
  schema_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(name, version)
);

CREATE TABLE public.ixbrl_tag_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  taxonomy_id uuid NOT NULL REFERENCES public.ixbrl_taxonomies(id),
  account_code text NOT NULL,
  tag_name text NOT NULL,
  tag_namespace text NOT NULL DEFAULT 'uk-gaap',
  context_ref text,
  unit_ref text DEFAULT 'GBP',
  decimals integer DEFAULT -3,
  is_custom boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, taxonomy_id, account_code)
);

CREATE TABLE public.ixbrl_filing_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  client_id uuid NOT NULL REFERENCES public.clients(id),
  accounts_period_id uuid REFERENCES public.accounts_periods(id),
  taxonomy_id uuid NOT NULL REFERENCES public.ixbrl_taxonomies(id),
  status text NOT NULL DEFAULT 'draft',
  validation_errors_json jsonb NOT NULL DEFAULT '[]',
  generated_xbrl text,
  generated_at timestamp with time zone,
  submitted_at timestamp with time zone,
  submission_job_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ══════════════════════════════════════════════════════════════
-- PENSION AUTO-ENROLMENT TABLES
-- ══════════════════════════════════════════════════════════════

CREATE TABLE public.pension_schemes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  client_id uuid NOT NULL REFERENCES public.clients(id),
  provider text NOT NULL DEFAULT 'nest',
  scheme_reference text,
  employer_reference text,
  staging_date date,
  re_enrolment_date date,
  status text NOT NULL DEFAULT 'active',
  contribution_employee_pct numeric(5,2) NOT NULL DEFAULT 5.0,
  contribution_employer_pct numeric(5,2) NOT NULL DEFAULT 3.0,
  qualifying_earnings_lower_pence integer NOT NULL DEFAULT 652000,
  qualifying_earnings_upper_pence integer NOT NULL DEFAULT 5018600,
  metadata_json jsonb NOT NULL DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, client_id, provider)
);

CREATE TABLE public.pension_enrolments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  scheme_id uuid NOT NULL REFERENCES public.pension_schemes(id),
  employee_id uuid NOT NULL,
  enrolment_type text NOT NULL DEFAULT 'auto',
  status text NOT NULL DEFAULT 'enrolled',
  enrolled_at timestamp with time zone NOT NULL DEFAULT now(),
  opted_out_at timestamp with time zone,
  opt_out_window_end date,
  postponement_end date,
  employee_contribution_pct numeric(5,2),
  employer_contribution_pct numeric(5,2),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.pension_contributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  scheme_id uuid NOT NULL REFERENCES public.pension_schemes(id),
  enrolment_id uuid NOT NULL REFERENCES public.pension_enrolments(id),
  payrun_id uuid,
  period text NOT NULL,
  qualifying_earnings_pence integer NOT NULL DEFAULT 0,
  employee_contribution_pence integer NOT NULL DEFAULT 0,
  employer_contribution_pence integer NOT NULL DEFAULT 0,
  total_contribution_pence integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'calculated',
  submitted_to_provider_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ══════════════════════════════════════════════════════════════
-- RLS POLICIES
-- ══════════════════════════════════════════════════════════════

ALTER TABLE public.cis_contractors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cis_subcontractors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cis_deductions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cis_monthly_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itsa_obligations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itsa_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itsa_final_declarations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ixbrl_taxonomies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ixbrl_tag_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ixbrl_filing_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pension_schemes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pension_enrolments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pension_contributions ENABLE ROW LEVEL SECURITY;

-- Tenant-scoped RLS for all new tables
CREATE POLICY "tenant_isolation" ON public.cis_contractors FOR ALL TO authenticated USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_isolation" ON public.cis_subcontractors FOR ALL TO authenticated USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_isolation" ON public.cis_deductions FOR ALL TO authenticated USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_isolation" ON public.cis_monthly_returns FOR ALL TO authenticated USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_isolation" ON public.itsa_obligations FOR ALL TO authenticated USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_isolation" ON public.itsa_updates FOR ALL TO authenticated USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_isolation" ON public.itsa_final_declarations FOR ALL TO authenticated USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_isolation" ON public.ixbrl_tag_mappings FOR ALL TO authenticated USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_isolation" ON public.ixbrl_filing_instances FOR ALL TO authenticated USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_isolation" ON public.pension_schemes FOR ALL TO authenticated USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_isolation" ON public.pension_enrolments FOR ALL TO authenticated USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_isolation" ON public.pension_contributions FOR ALL TO authenticated USING (tenant_id = public.get_user_tenant_id(auth.uid()));

-- Taxonomies are global reference data - readable by all authenticated users
CREATE POLICY "read_all" ON public.ixbrl_taxonomies FOR SELECT TO authenticated USING (true);

-- Updated_at triggers
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.cis_contractors FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.cis_subcontractors FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.cis_deductions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.cis_monthly_returns FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.itsa_obligations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.itsa_updates FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.itsa_final_declarations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.ixbrl_tag_mappings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.ixbrl_filing_instances FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.pension_schemes FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.pension_enrolments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.pension_contributions FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Seed default iXBRL taxonomies
INSERT INTO public.ixbrl_taxonomies (name, version, taxonomy_type, schema_url) VALUES
  ('FRS 102', '2024', 'uk-gaap', 'https://xbrl.frc.org.uk/FRS-102/2024-01-01/FRS-102-2024-01-01.xsd'),
  ('FRS 105', '2024', 'uk-gaap', 'https://xbrl.frc.org.uk/FRS-105/2024-01-01/FRS-105-2024-01-01.xsd'),
  ('CT600', '2024', 'hmrc-ct', 'https://www.hmrc.gov.uk/schemas/ct/CT600-2024.xsd')
ON CONFLICT (name, version) DO NOTHING;
