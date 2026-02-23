
-- Time entries for tracking billable/non-billable hours
CREATE TABLE public.time_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  user_id UUID NOT NULL,
  client_id UUID REFERENCES public.clients(id),
  task_id UUID REFERENCES public.tasks(id),
  description TEXT NOT NULL DEFAULT '',
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  duration_minutes INTEGER NOT NULL DEFAULT 0,
  is_billable BOOLEAN NOT NULL DEFAULT true,
  rate_pence INTEGER,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved','invoiced')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_time_entries_tenant ON public.time_entries(tenant_id);
CREATE INDEX idx_time_entries_user ON public.time_entries(user_id);
CREATE INDEX idx_time_entries_client ON public.time_entries(client_id);
CREATE INDEX idx_time_entries_date ON public.time_entries(date);

-- Updated_at trigger
CREATE TRIGGER update_time_entries_updated_at
  BEFORE UPDATE ON public.time_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- RLS
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for time entries"
  ON public.time_entries FOR ALL
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));
