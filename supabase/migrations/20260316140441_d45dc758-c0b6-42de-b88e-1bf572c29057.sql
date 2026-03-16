
-- Multi-currency support
CREATE TABLE public.currencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  code text NOT NULL,
  name text NOT NULL,
  symbol text NOT NULL DEFAULT '£',
  is_base boolean NOT NULL DEFAULT false,
  exchange_rate numeric(12,6) NOT NULL DEFAULT 1.0,
  rate_updated_at timestamptz DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, code)
);

ALTER TABLE public.currencies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON public.currencies FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

-- EC Sales List
CREATE TABLE public.ec_sales_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  client_id uuid NOT NULL REFERENCES public.clients(id),
  vat_return_id uuid REFERENCES public.vat_returns(id),
  customer_name text NOT NULL,
  customer_vat_number text NOT NULL,
  country_code text NOT NULL,
  supply_type text NOT NULL DEFAULT 'goods',
  value_gbp_pence bigint NOT NULL DEFAULT 0,
  period_start date NOT NULL,
  period_end date NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ec_sales_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON public.ec_sales_entries FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

-- Proposals & Engagement Letters
CREATE TABLE public.proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  client_id uuid REFERENCES public.clients(id),
  title text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  prospect_name text,
  prospect_email text,
  services_json jsonb NOT NULL DEFAULT '[]',
  fee_breakdown_json jsonb NOT NULL DEFAULT '[]',
  total_fee_pence bigint NOT NULL DEFAULT 0,
  fee_frequency text NOT NULL DEFAULT 'monthly',
  terms_text text,
  valid_until date,
  sent_at timestamptz,
  accepted_at timestamptz,
  declined_at timestamptz,
  engagement_letter_doc_id uuid REFERENCES public.documents(id),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON public.proposals FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

-- Calendar & Staff Scheduling
CREATE TABLE public.calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  title text NOT NULL,
  description text,
  event_type text NOT NULL DEFAULT 'meeting',
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  all_day boolean NOT NULL DEFAULT false,
  assigned_user_id uuid,
  client_id uuid REFERENCES public.clients(id),
  task_id uuid REFERENCES public.tasks(id),
  recurrence_rule text,
  color text,
  metadata_json jsonb NOT NULL DEFAULT '{}',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON public.calendar_events FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE TABLE public.staff_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  user_id uuid NOT NULL,
  date date NOT NULL,
  status text NOT NULL DEFAULT 'available',
  hours_available numeric(4,2) DEFAULT 8.0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, user_id, date)
);

ALTER TABLE public.staff_availability ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON public.staff_availability FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

-- Trial Balance Import
CREATE TABLE public.tb_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  client_id uuid NOT NULL REFERENCES public.clients(id),
  source text NOT NULL DEFAULT 'csv',
  file_name text,
  status text NOT NULL DEFAULT 'pending',
  mapping_json jsonb NOT NULL DEFAULT '{}',
  rows_total int DEFAULT 0,
  rows_mapped int DEFAULT 0,
  rows_posted int DEFAULT 0,
  error_log_json jsonb NOT NULL DEFAULT '[]',
  imported_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tb_imports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON public.tb_imports FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));
