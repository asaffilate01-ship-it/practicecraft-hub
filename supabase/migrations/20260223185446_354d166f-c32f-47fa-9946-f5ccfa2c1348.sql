
-- ══════════════════════════════════════════════════
-- Payroll tables: employers, pay_runs, payslips
-- ══════════════════════════════════════════════════

-- Payroll employers (PAYE scheme per client)
CREATE TABLE public.payroll_employers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  client_id uuid NOT NULL REFERENCES public.clients(id),
  employer_name text NOT NULL,
  paye_reference text,
  accounts_office_ref text,
  hmrc_gateway_id text,
  tax_year text NOT NULL DEFAULT '2025-26',
  pay_frequency text NOT NULL DEFAULT 'monthly',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payroll_employers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tenant payroll employers" ON public.payroll_employers FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can insert tenant payroll employers" ON public.payroll_employers FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can update tenant payroll employers" ON public.payroll_employers FOR UPDATE USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can delete tenant payroll employers" ON public.payroll_employers FOR DELETE USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE TRIGGER update_payroll_employers_updated_at BEFORE UPDATE ON public.payroll_employers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Pay runs
CREATE TABLE public.pay_runs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  employer_id uuid NOT NULL REFERENCES public.payroll_employers(id),
  tax_period integer NOT NULL,
  tax_year text NOT NULL DEFAULT '2025-26',
  pay_date date NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  total_gross_pence bigint NOT NULL DEFAULT 0,
  total_tax_pence bigint NOT NULL DEFAULT 0,
  total_ni_employee_pence bigint NOT NULL DEFAULT 0,
  total_ni_employer_pence bigint NOT NULL DEFAULT 0,
  total_net_pence bigint NOT NULL DEFAULT 0,
  fps_submission_job_id uuid,
  eps_submission_job_id uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pay_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tenant pay runs" ON public.pay_runs FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can insert tenant pay runs" ON public.pay_runs FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can update tenant pay runs" ON public.pay_runs FOR UPDATE USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can delete tenant pay runs" ON public.pay_runs FOR DELETE USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE TRIGGER update_pay_runs_updated_at BEFORE UPDATE ON public.pay_runs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Payslips (one per employee per pay run)
CREATE TABLE public.payslips (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  pay_run_id uuid NOT NULL REFERENCES public.pay_runs(id),
  employee_name text NOT NULL,
  ni_number text,
  tax_code text,
  gross_pence bigint NOT NULL DEFAULT 0,
  tax_pence bigint NOT NULL DEFAULT 0,
  ni_employee_pence bigint NOT NULL DEFAULT 0,
  ni_employer_pence bigint NOT NULL DEFAULT 0,
  net_pence bigint NOT NULL DEFAULT 0,
  student_loan_pence bigint NOT NULL DEFAULT 0,
  pension_employee_pence bigint NOT NULL DEFAULT 0,
  pension_employer_pence bigint NOT NULL DEFAULT 0,
  deductions_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  additions_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  ytd_gross_pence bigint NOT NULL DEFAULT 0,
  ytd_tax_pence bigint NOT NULL DEFAULT 0,
  ytd_ni_pence bigint NOT NULL DEFAULT 0,
  document_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payslips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tenant payslips" ON public.payslips FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can insert tenant payslips" ON public.payslips FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can update tenant payslips" ON public.payslips FOR UPDATE USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can delete tenant payslips" ON public.payslips FOR DELETE USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE TRIGGER update_payslips_updated_at BEFORE UPDATE ON public.payslips FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ══════════════════════════════════════════════════
-- Accounts Production tables
-- ══════════════════════════════════════════════════

CREATE TABLE public.accounts_periods (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  client_id uuid NOT NULL REFERENCES public.clients(id),
  period_start date NOT NULL,
  period_end date NOT NULL,
  filing_deadline date,
  period_type text NOT NULL DEFAULT 'annual',
  status text NOT NULL DEFAULT 'open',
  accounts_standard text NOT NULL DEFAULT 'FRS 102 Section 1A',
  ct600_status text NOT NULL DEFAULT 'not_started',
  sa_status text NOT NULL DEFAULT 'not_started',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.accounts_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tenant accounts periods" ON public.accounts_periods FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can insert tenant accounts periods" ON public.accounts_periods FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can update tenant accounts periods" ON public.accounts_periods FOR UPDATE USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can delete tenant accounts periods" ON public.accounts_periods FOR DELETE USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE TRIGGER update_accounts_periods_updated_at BEFORE UPDATE ON public.accounts_periods FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
