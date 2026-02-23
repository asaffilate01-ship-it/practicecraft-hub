
-- Create the reusable updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ══════════════════════════════════════════════════════════
-- Phase 3: Document Requests, e-Signatures, AML Monitoring
-- ══════════════════════════════════════════════════════════

-- ── Document Requests ─────────────────────────────────────
CREATE TABLE public.document_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  client_id UUID NOT NULL REFERENCES public.clients(id),
  requested_by_user_id UUID,
  title TEXT NOT NULL,
  description TEXT,
  document_types TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending',
  due_date DATE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.document_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for document_requests"
  ON public.document_requests FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE TRIGGER update_document_requests_updated_at
  BEFORE UPDATE ON public.document_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS request_id UUID REFERENCES public.document_requests(id);

-- ── Signature Requests ────────────────────────────────────
CREATE TABLE public.signature_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  client_id UUID NOT NULL REFERENCES public.clients(id),
  document_id UUID REFERENCES public.documents(id),
  title TEXT NOT NULL,
  signer_name TEXT NOT NULL,
  signer_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  signed_at TIMESTAMPTZ,
  declined_at TIMESTAMPTZ,
  decline_reason TEXT,
  reminder_count INT NOT NULL DEFAULT 0,
  last_reminder_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  signed_document_path TEXT,
  created_by_user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.signature_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for signature_requests"
  ON public.signature_requests FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE TRIGGER update_signature_requests_updated_at
  BEFORE UPDATE ON public.signature_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── AML Monitoring Alerts ─────────────────────────────────
CREATE TABLE public.aml_monitoring_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  case_id UUID NOT NULL REFERENCES public.kyc_cases(id),
  client_id UUID NOT NULL REFERENCES public.clients(id),
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium',
  title TEXT NOT NULL,
  description TEXT,
  source TEXT NOT NULL DEFAULT 'system',
  status TEXT NOT NULL DEFAULT 'open',
  resolved_at TIMESTAMPTZ,
  resolved_by_user_id UUID,
  resolution_notes TEXT,
  metadata_json JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.aml_monitoring_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for aml_monitoring_alerts"
  ON public.aml_monitoring_alerts FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE TRIGGER update_aml_monitoring_alerts_updated_at
  BEFORE UPDATE ON public.aml_monitoring_alerts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add monitoring fields to kyc_cases
ALTER TABLE public.kyc_cases ADD COLUMN IF NOT EXISTS monitoring_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.kyc_cases ADD COLUMN IF NOT EXISTS last_monitored_at TIMESTAMPTZ;
ALTER TABLE public.kyc_cases ADD COLUMN IF NOT EXISTS next_review_date DATE;
ALTER TABLE public.kyc_cases ADD COLUMN IF NOT EXISTS id_verification_provider TEXT;
ALTER TABLE public.kyc_cases ADD COLUMN IF NOT EXISTS id_verification_reference TEXT;
ALTER TABLE public.kyc_cases ADD COLUMN IF NOT EXISTS id_verification_status TEXT;
ALTER TABLE public.kyc_cases ADD COLUMN IF NOT EXISTS id_verification_result_json JSONB NOT NULL DEFAULT '{}';
