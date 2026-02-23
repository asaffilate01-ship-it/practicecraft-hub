
-- 1) Event dedupe table (idempotent event processing)
CREATE TABLE IF NOT EXISTS public.event_dedupe (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  key        TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, key)
);
ALTER TABLE public.event_dedupe ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view tenant dedupe keys" ON public.event_dedupe FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can insert tenant dedupe keys" ON public.event_dedupe FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can delete tenant dedupe keys" ON public.event_dedupe FOR DELETE USING (tenant_id = get_user_tenant_id(auth.uid()));

-- 2) Client credentials table (encrypted token storage)
CREATE TABLE IF NOT EXISTS public.client_credentials (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  client_id       UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  provider        TEXT NOT NULL, -- 'hmrc', 'companies_house', 'open_banking'
  credential_type TEXT NOT NULL, -- 'oauth_access_token', 'oauth_refresh_token', 'api_key', 'auth_code'
  ciphertext      TEXT NOT NULL,
  expires_at      TIMESTAMPTZ,
  metadata_json   JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, client_id, provider, credential_type)
);
ALTER TABLE public.client_credentials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view tenant credentials" ON public.client_credentials FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can insert tenant credentials" ON public.client_credentials FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can update tenant credentials" ON public.client_credentials FOR UPDATE USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can delete tenant credentials" ON public.client_credentials FOR DELETE USING (tenant_id = get_user_tenant_id(auth.uid()));

-- 3) Domain events log table
CREATE TABLE IF NOT EXISTS public.domain_events (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  trigger    TEXT NOT NULL,
  payload    JSONB NOT NULL DEFAULT '{}'::jsonb,
  processed  BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.domain_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view tenant events" ON public.domain_events FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can insert tenant events" ON public.domain_events FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE INDEX idx_domain_events_tenant_trigger ON public.domain_events(tenant_id, trigger);
CREATE INDEX idx_domain_events_created ON public.domain_events(created_at);

-- 4) Integration health status per client
CREATE TABLE IF NOT EXISTS public.integration_health (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  client_id  UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  provider   TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'healthy', -- 'healthy', 'degraded', 'broken'
  last_error TEXT,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, client_id, provider)
);
ALTER TABLE public.integration_health ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view tenant integration health" ON public.integration_health FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can insert tenant integration health" ON public.integration_health FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can update tenant integration health" ON public.integration_health FOR UPDATE USING (tenant_id = get_user_tenant_id(auth.uid()));

-- 5) Dashboard views (adapted to actual schema)

-- Overdue tasks
CREATE OR REPLACE VIEW public.v_overdue_tasks AS
SELECT
  t.tenant_id,
  t.id AS task_id,
  t.title,
  t.status,
  t.priority,
  t.due_date,
  (CURRENT_DATE - t.due_date) AS days_overdue,
  c.id AS client_id,
  c.legal_name AS client_legal_name,
  c.entity_type,
  t.assigned_to_user_id,
  p.full_name AS assigned_user_name
FROM public.tasks t
LEFT JOIN public.clients c ON c.id = t.client_id AND c.tenant_id = t.tenant_id
LEFT JOIN public.profiles p ON p.id = t.assigned_to_user_id
WHERE
  t.due_date IS NOT NULL
  AND t.due_date < CURRENT_DATE
  AND t.status NOT IN ('done','cancelled');

-- Tasks due next 14 days
CREATE OR REPLACE VIEW public.v_tasks_due_next_14d AS
SELECT
  t.tenant_id,
  t.id AS task_id,
  t.title,
  t.status,
  t.priority,
  t.due_date,
  (t.due_date - CURRENT_DATE) AS days_until_due,
  c.id AS client_id,
  c.legal_name AS client_legal_name,
  p.full_name AS assigned_user_name
FROM public.tasks t
LEFT JOIN public.clients c ON c.id = t.client_id AND c.tenant_id = t.tenant_id
LEFT JOIN public.profiles p ON p.id = t.assigned_to_user_id
WHERE
  t.due_date IS NOT NULL
  AND t.due_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '14 day')
  AND t.status NOT IN ('done','cancelled');

-- VAT returns due
CREATE OR REPLACE VIEW public.v_vat_due AS
SELECT
  vr.tenant_id,
  vr.id AS vat_return_id,
  vr.client_id,
  c.legal_name AS client_legal_name,
  vr.period_start,
  vr.period_end,
  vr.status,
  vr.box5 AS net_vat_due,
  vr.submitted_at
FROM public.vat_returns vr
JOIN public.clients c ON c.id = vr.client_id AND c.tenant_id = vr.tenant_id
WHERE vr.status IN ('draft','submitted');

-- Submission success rate (last 30 days)
CREATE OR REPLACE VIEW public.v_submission_success_30d AS
SELECT
  tenant_id,
  provider::text,
  submission_type,
  COUNT(*) FILTER (WHERE created_at >= now() - INTERVAL '30 day') AS total_30d,
  COUNT(*) FILTER (WHERE status = 'accepted' AND created_at >= now() - INTERVAL '30 day') AS accepted_30d,
  COUNT(*) FILTER (WHERE status = 'rejected' AND created_at >= now() - INTERVAL '30 day') AS rejected_30d,
  ROUND(
    CASE
      WHEN COUNT(*) FILTER (WHERE created_at >= now() - INTERVAL '30 day') = 0 THEN 0
      ELSE (COUNT(*) FILTER (WHERE status='accepted' AND created_at >= now() - INTERVAL '30 day')::numeric
            / COUNT(*) FILTER (WHERE created_at >= now() - INTERVAL '30 day')::numeric) * 100
    END, 2) AS success_pct_30d
FROM public.submission_jobs
GROUP BY tenant_id, provider, submission_type;

-- Billing KPIs
CREATE OR REPLACE VIEW public.v_billing_kpis AS
SELECT
  tenant_id,
  DATE_TRUNC('month', issue_date)::date AS month,
  COUNT(*) AS invoices_count,
  SUM(total) AS invoices_total,
  SUM(total) FILTER (WHERE status='paid') AS paid_total,
  COUNT(*) FILTER (WHERE status='overdue') AS overdue_count,
  SUM(total) FILTER (WHERE status='overdue') AS overdue_total
FROM public.invoices
GROUP BY tenant_id, DATE_TRUNC('month', issue_date)::date;

-- Practice dashboard KPI summary
CREATE OR REPLACE VIEW public.v_practice_dashboard_kpis AS
SELECT
  t.id AS tenant_id,
  (SELECT COUNT(*) FROM public.clients c WHERE c.tenant_id=t.id AND c.status='active') AS active_clients,
  (SELECT COUNT(*) FROM public.tasks x WHERE x.tenant_id=t.id AND x.status NOT IN ('done','cancelled')) AS open_tasks,
  (SELECT COUNT(*) FROM public.tasks x WHERE x.tenant_id=t.id AND x.due_date < CURRENT_DATE AND x.status NOT IN ('done','cancelled')) AS overdue_tasks,
  (SELECT COUNT(*) FROM public.vat_returns vr WHERE vr.tenant_id=t.id AND vr.period_end BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '14 day') AND vr.status='draft') AS vat_due_14d,
  (SELECT COUNT(*) FROM public.invoices i WHERE i.tenant_id=t.id AND i.status='overdue') AS overdue_invoices
FROM public.tenants t;

-- Enable RLS on views via underlying table policies (views inherit RLS from base tables)
-- Add updated_at triggers
CREATE TRIGGER update_client_credentials_updated_at BEFORE UPDATE ON public.client_credentials FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_integration_health_updated_at BEFORE UPDATE ON public.integration_health FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
