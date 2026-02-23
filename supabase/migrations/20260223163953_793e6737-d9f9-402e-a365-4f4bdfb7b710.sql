
-- 1) Event logs table (audit-grade domain events)
CREATE TABLE IF NOT EXISTS public.event_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  event_type    TEXT NOT NULL,
  source        TEXT NOT NULL DEFAULT 'system',
  actor_user_id UUID,
  client_id     UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  payload_json  JSONB NOT NULL DEFAULT '{}'::jsonb,
  correlation_id TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.event_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view tenant event logs" ON public.event_logs FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can insert tenant event logs" ON public.event_logs FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE INDEX idx_event_logs_tenant_type_time ON public.event_logs(tenant_id, event_type, created_at DESC);
CREATE INDEX idx_event_logs_tenant_client_time ON public.event_logs(tenant_id, client_id, created_at DESC);

-- 2) Notification logs table
CREATE TABLE IF NOT EXISTS public.notification_logs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  client_id           UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  user_id             UUID,
  channel             TEXT NOT NULL,
  template_key        TEXT,
  to_address          TEXT,
  subject             TEXT,
  body_preview        TEXT,
  provider            TEXT,
  provider_message_id TEXT,
  status              TEXT NOT NULL DEFAULT 'queued',
  error_message       TEXT,
  meta_json           JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at             TIMESTAMPTZ
);
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view tenant notification logs" ON public.notification_logs FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can insert tenant notification logs" ON public.notification_logs FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can update tenant notification logs" ON public.notification_logs FOR UPDATE USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE INDEX idx_notification_logs_tenant_time ON public.notification_logs(tenant_id, created_at DESC);
CREATE INDEX idx_notification_logs_tenant_status ON public.notification_logs(tenant_id, status, created_at DESC);

-- 3) Notification queue table (DB-backed queue for auditability)
CREATE TABLE IF NOT EXISTS public.notification_queue (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  client_id     UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  channel       TEXT NOT NULL,
  template_key  TEXT,
  payload_json  JSONB NOT NULL DEFAULT '{}'::jsonb,
  status        TEXT NOT NULL DEFAULT 'queued',
  attempt_count INT NOT NULL DEFAULT 0,
  next_retry_at TIMESTAMPTZ,
  last_error    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notification_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view tenant notification queue" ON public.notification_queue FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can insert tenant notification queue" ON public.notification_queue FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can update tenant notification queue" ON public.notification_queue FOR UPDATE USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE INDEX idx_notification_queue_tenant_status_retry ON public.notification_queue(tenant_id, status, next_retry_at);
CREATE TRIGGER update_notification_queue_updated_at BEFORE UPDATE ON public.notification_queue FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 4) Submission jobs recent view
CREATE OR REPLACE VIEW public.v_submission_jobs_recent AS
SELECT
  sj.tenant_id,
  sj.id AS submission_job_id,
  sj.client_id,
  c.legal_name AS client_legal_name,
  sj.provider::text,
  sj.submission_type,
  sj.status::text,
  sj.attempt_count,
  sj.last_error,
  sj.correlation_id,
  sj.created_at,
  sj.updated_at
FROM public.submission_jobs sj
LEFT JOIN public.clients c ON c.id = sj.client_id AND c.tenant_id = sj.tenant_id
WHERE sj.created_at >= now() - INTERVAL '90 day';
ALTER VIEW public.v_submission_jobs_recent SET (security_invoker = true);
