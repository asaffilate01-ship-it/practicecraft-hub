
-- Trial balance entries per accounting period
CREATE TABLE public.trial_balance_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  period_id UUID NOT NULL REFERENCES public.accounts_periods(id) ON DELETE CASCADE,
  account_code TEXT NOT NULL,
  account_name TEXT NOT NULL,
  account_type TEXT NOT NULL DEFAULT 'expense',
  debit_pence BIGINT NOT NULL DEFAULT 0,
  credit_pence BIGINT NOT NULL DEFAULT 0,
  adjustment_debit_pence BIGINT NOT NULL DEFAULT 0,
  adjustment_credit_pence BIGINT NOT NULL DEFAULT 0,
  adjustment_notes TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.trial_balance_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant users can view TB entries"
  ON public.trial_balance_entries FOR SELECT
  TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Tenant users can insert TB entries"
  ON public.trial_balance_entries FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Tenant users can update TB entries"
  ON public.trial_balance_entries FOR UPDATE
  TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Tenant users can delete TB entries"
  ON public.trial_balance_entries FOR DELETE
  TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE TRIGGER update_trial_balance_entries_updated_at
  BEFORE UPDATE ON public.trial_balance_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Tax computations per accounting period (stores CT600/SA100/SA800 form data as JSON)
CREATE TABLE public.tax_computations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  period_id UUID NOT NULL REFERENCES public.accounts_periods(id) ON DELETE CASCADE,
  computation_type TEXT NOT NULL DEFAULT 'ct600',
  form_data JSONB NOT NULL DEFAULT '{}',
  computed_values JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(period_id, computation_type)
);

ALTER TABLE public.tax_computations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant users can view tax computations"
  ON public.tax_computations FOR SELECT
  TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Tenant users can insert tax computations"
  ON public.tax_computations FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Tenant users can update tax computations"
  ON public.tax_computations FOR UPDATE
  TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Tenant users can delete tax computations"
  ON public.tax_computations FOR DELETE
  TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE TRIGGER update_tax_computations_updated_at
  BEFORE UPDATE ON public.tax_computations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE INDEX idx_tb_entries_period ON public.trial_balance_entries(period_id);
CREATE INDEX idx_tax_computations_period ON public.tax_computations(period_id);
