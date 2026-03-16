
-- Recurring invoice templates
CREATE TABLE public.recurring_invoice_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  client_id uuid NOT NULL REFERENCES public.clients(id),
  frequency text NOT NULL DEFAULT 'monthly',
  description text NOT NULL DEFAULT '',
  net_amount_pence integer NOT NULL DEFAULT 0,
  vat_rate numeric NOT NULL DEFAULT 20,
  total_pence integer NOT NULL DEFAULT 0,
  next_issue_date date,
  is_active boolean NOT NULL DEFAULT true,
  last_issued_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.recurring_invoice_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON public.recurring_invoice_templates
  FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

-- Add dunning columns to invoices
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS dunning_count integer DEFAULT 0;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS last_dunning_at timestamptz;

-- Automation execution log
CREATE TABLE public.automation_execution_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  rule_id uuid REFERENCES public.automation_rules(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'success',
  result_message text,
  trigger_data_json jsonb DEFAULT '{}'::jsonb,
  executed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.automation_execution_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON public.automation_execution_log
  FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

-- Triggers
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.recurring_invoice_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER prevent_tenant_change BEFORE UPDATE ON public.recurring_invoice_templates
  FOR EACH ROW EXECUTE FUNCTION public.prevent_tenant_id_change();

CREATE TRIGGER prevent_tenant_change_exec_log BEFORE UPDATE ON public.automation_execution_log
  FOR EACH ROW EXECUTE FUNCTION public.prevent_tenant_id_change();
