
-- Add employee_id FK to payslips (currently only has employee_name text)
ALTER TABLE public.payslips ADD COLUMN IF NOT EXISTS employee_id uuid REFERENCES public.payroll_employees(id);
ALTER TABLE public.payslips ADD COLUMN IF NOT EXISTS hours_worked numeric DEFAULT 0;
ALTER TABLE public.payslips ADD COLUMN IF NOT EXISTS overtime_hours numeric DEFAULT 0;
ALTER TABLE public.payslips ADD COLUMN IF NOT EXISTS overtime_pence bigint DEFAULT 0;
ALTER TABLE public.payslips ADD COLUMN IF NOT EXISTS holiday_pay_pence bigint DEFAULT 0;
ALTER TABLE public.payslips ADD COLUMN IF NOT EXISTS sick_pay_pence bigint DEFAULT 0;
ALTER TABLE public.payslips ADD COLUMN IF NOT EXISTS smp_pence bigint DEFAULT 0;
ALTER TABLE public.payslips ADD COLUMN IF NOT EXISTS spp_pence bigint DEFAULT 0;
ALTER TABLE public.payslips ADD COLUMN IF NOT EXISTS sap_pence bigint DEFAULT 0;
ALTER TABLE public.payslips ADD COLUMN IF NOT EXISTS shpp_pence bigint DEFAULT 0;
ALTER TABLE public.payslips ADD COLUMN IF NOT EXISTS attachment_of_earnings_pence bigint DEFAULT 0;

-- Add pay_frequency to pay_runs
ALTER TABLE public.pay_runs ADD COLUMN IF NOT EXISTS pay_frequency text NOT NULL DEFAULT 'monthly';
ALTER TABLE public.pay_runs ADD COLUMN IF NOT EXISTS total_pension_employee_pence bigint DEFAULT 0;
ALTER TABLE public.pay_runs ADD COLUMN IF NOT EXISTS total_pension_employer_pence bigint DEFAULT 0;
ALTER TABLE public.pay_runs ADD COLUMN IF NOT EXISTS total_student_loan_pence bigint DEFAULT 0;

-- Payroll Absences (holiday, sick, maternity, paternity, etc.)
CREATE TABLE IF NOT EXISTS public.payroll_absences (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  employee_id uuid NOT NULL REFERENCES public.payroll_employees(id) ON DELETE CASCADE,
  employer_id uuid NOT NULL REFERENCES public.payroll_employers(id),
  absence_type text NOT NULL, -- holiday, sick, maternity, paternity, adoption, shared_parental, unpaid, compassionate, jury_service, other
  start_date date NOT NULL,
  end_date date,
  days numeric NOT NULL DEFAULT 1,
  hours numeric DEFAULT 0,
  is_paid boolean NOT NULL DEFAULT true,
  statutory_pay_type text, -- ssp, smp, spp, sap, shpp, none
  notes text,
  status text NOT NULL DEFAULT 'approved', -- requested, approved, declined, cancelled
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payroll_absences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation - payroll_absences" ON public.payroll_absences
  FOR ALL USING (tenant_id = public.get_user_tenant_id(auth.uid()));

-- Employee holiday entitlements
ALTER TABLE public.payroll_employees ADD COLUMN IF NOT EXISTS holiday_entitlement_days numeric DEFAULT 28;
ALTER TABLE public.payroll_employees ADD COLUMN IF NOT EXISTS holiday_taken_days numeric DEFAULT 0;
ALTER TABLE public.payroll_employees ADD COLUMN IF NOT EXISTS holiday_carried_forward numeric DEFAULT 0;
ALTER TABLE public.payroll_employees ADD COLUMN IF NOT EXISTS address_line1 text;
ALTER TABLE public.payroll_employees ADD COLUMN IF NOT EXISTS address_line2 text;
ALTER TABLE public.payroll_employees ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE public.payroll_employees ADD COLUMN IF NOT EXISTS county text;
ALTER TABLE public.payroll_employees ADD COLUMN IF NOT EXISTS postcode text;
ALTER TABLE public.payroll_employees ADD COLUMN IF NOT EXISTS country text DEFAULT 'GB';
ALTER TABLE public.payroll_employees ADD COLUMN IF NOT EXISTS sort_code text;
ALTER TABLE public.payroll_employees ADD COLUMN IF NOT EXISTS account_number text;
ALTER TABLE public.payroll_employees ADD COLUMN IF NOT EXISTS account_name text;
ALTER TABLE public.payroll_employees ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'bacs'; -- bacs, cheque, cash
ALTER TABLE public.payroll_employees ADD COLUMN IF NOT EXISTS payroll_id text; -- employer's payroll ID for employee
ALTER TABLE public.payroll_employees ADD COLUMN IF NOT EXISTS p45_issue_date date;
ALTER TABLE public.payroll_employees ADD COLUMN IF NOT EXISTS p45_previous_pay_pence bigint DEFAULT 0;
ALTER TABLE public.payroll_employees ADD COLUMN IF NOT EXISTS p45_previous_tax_pence bigint DEFAULT 0;
ALTER TABLE public.payroll_employees ADD COLUMN IF NOT EXISTS starter_declaration text; -- A, B, C (new starter)
ALTER TABLE public.payroll_employees ADD COLUMN IF NOT EXISTS is_irregular_employment boolean DEFAULT false;
ALTER TABLE public.payroll_employees ADD COLUMN IF NOT EXISTS week1_month1 boolean DEFAULT false;
ALTER TABLE public.payroll_employees ADD COLUMN IF NOT EXISTS directors_nic_method text DEFAULT 'annual'; -- annual, cumulative

-- P11D Benefits in Kind
CREATE TABLE IF NOT EXISTS public.payroll_benefits (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  employee_id uuid NOT NULL REFERENCES public.payroll_employees(id) ON DELETE CASCADE,
  employer_id uuid NOT NULL REFERENCES public.payroll_employers(id),
  tax_year text NOT NULL DEFAULT '2025-26',
  benefit_type text NOT NULL, -- company_car, fuel, medical, accommodation, loan, vouchers, other
  description text NOT NULL,
  cash_equivalent_pence bigint NOT NULL DEFAULT 0,
  amount_made_good_pence bigint DEFAULT 0,
  payrolled boolean NOT NULL DEFAULT false,
  section text, -- P11D section letter: A-N
  start_date date,
  end_date date,
  metadata_json jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payroll_benefits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation - payroll_benefits" ON public.payroll_benefits
  FOR ALL USING (tenant_id = public.get_user_tenant_id(auth.uid()));

-- Payroll Forms tracking (P45, P60, P11D, FPS, EPS, etc.)
CREATE TABLE IF NOT EXISTS public.payroll_forms (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  employer_id uuid NOT NULL REFERENCES public.payroll_employers(id),
  employee_id uuid REFERENCES public.payroll_employees(id),
  form_type text NOT NULL, -- p45, p60, p11d, p11d_b, fps, eps, p32, p35, eas, p46_car
  tax_year text NOT NULL DEFAULT '2025-26',
  status text NOT NULL DEFAULT 'draft', -- draft, generated, sent, submitted, accepted, rejected
  form_data_json jsonb NOT NULL DEFAULT '{}',
  document_id uuid REFERENCES public.documents(id),
  generated_at timestamptz,
  sent_at timestamptz,
  submitted_at timestamptz,
  hmrc_response_json jsonb DEFAULT '{}',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payroll_forms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation - payroll_forms" ON public.payroll_forms
  FOR ALL USING (tenant_id = public.get_user_tenant_id(auth.uid()));

-- Employer-level settings
ALTER TABLE public.payroll_employers ADD COLUMN IF NOT EXISTS small_employer boolean DEFAULT false;
ALTER TABLE public.payroll_employers ADD COLUMN IF NOT EXISTS apprenticeship_levy boolean DEFAULT false;
ALTER TABLE public.payroll_employers ADD COLUMN IF NOT EXISTS apprenticeship_levy_allowance_pence bigint DEFAULT 1500000;
ALTER TABLE public.payroll_employers ADD COLUMN IF NOT EXISTS employment_allowance boolean DEFAULT false;
ALTER TABLE public.payroll_employers ADD COLUMN IF NOT EXISTS pension_provider text;
ALTER TABLE public.payroll_employers ADD COLUMN IF NOT EXISTS pension_scheme_ref text;
ALTER TABLE public.payroll_employers ADD COLUMN IF NOT EXISTS staging_date date;
ALTER TABLE public.payroll_employers ADD COLUMN IF NOT EXISTS cis_registered boolean DEFAULT false;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payroll_absences_employee ON public.payroll_absences(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_absences_dates ON public.payroll_absences(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_payroll_benefits_employee ON public.payroll_benefits(employee_id, tax_year);
CREATE INDEX IF NOT EXISTS idx_payroll_forms_employer ON public.payroll_forms(employer_id, form_type, tax_year);
CREATE INDEX IF NOT EXISTS idx_payslips_employee_id ON public.payslips(employee_id);

-- Update triggers
CREATE TRIGGER update_payroll_absences_updated_at BEFORE UPDATE ON public.payroll_absences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_payroll_benefits_updated_at BEFORE UPDATE ON public.payroll_benefits FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_payroll_forms_updated_at BEFORE UPDATE ON public.payroll_forms FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
