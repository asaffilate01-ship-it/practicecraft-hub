
-- Employees table for payroll
CREATE TABLE public.payroll_employees (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  employer_id uuid NOT NULL REFERENCES public.payroll_employers(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  title text,
  date_of_birth date,
  gender text DEFAULT 'not_specified',
  ni_number text,
  tax_code text DEFAULT '1257L',
  ni_category char(1) DEFAULT 'A',
  email text,
  phone text,
  address_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  bank_account_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  start_date date,
  leave_date date,
  is_director boolean NOT NULL DEFAULT false,
  annual_salary_pence bigint DEFAULT 0,
  hourly_rate_pence bigint,
  pay_method text NOT NULL DEFAULT 'monthly',
  student_loan_plan text,
  postgrad_loan boolean NOT NULL DEFAULT false,
  pension_opt_out boolean NOT NULL DEFAULT false,
  pension_employee_pct numeric(5,2) DEFAULT 5.00,
  pension_employer_pct numeric(5,2) DEFAULT 3.00,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_payroll_employees_employer ON public.payroll_employees(employer_id);
CREATE INDEX idx_payroll_employees_tenant ON public.payroll_employees(tenant_id);

-- RLS
ALTER TABLE public.payroll_employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tenant employees"
  ON public.payroll_employees FOR SELECT
  USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can insert tenant employees"
  ON public.payroll_employees FOR INSERT
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can update tenant employees"
  ON public.payroll_employees FOR UPDATE
  USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can delete tenant employees"
  ON public.payroll_employees FOR DELETE
  USING (tenant_id = get_user_tenant_id(auth.uid()));

-- Updated_at trigger
CREATE TRIGGER update_payroll_employees_updated_at
  BEFORE UPDATE ON public.payroll_employees
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
