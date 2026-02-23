
-- Document versions for versioning support
CREATE TABLE public.document_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  version_number INT NOT NULL DEFAULT 1,
  storage_path TEXT NOT NULL,
  size_bytes BIGINT NOT NULL DEFAULT 0,
  uploaded_by_user_id UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view document versions in their tenant"
ON public.document_versions FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.documents d
    WHERE d.id = document_versions.document_id
    AND d.tenant_id = public.get_user_tenant_id(auth.uid())
  )
);

CREATE POLICY "Users can insert document versions in their tenant"
ON public.document_versions FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.documents d
    WHERE d.id = document_versions.document_id
    AND d.tenant_id = public.get_user_tenant_id(auth.uid())
  )
);

-- KYC Cases table
CREATE TABLE public.kyc_cases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  client_id UUID NOT NULL REFERENCES public.clients(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','approved','rejected','expired')),
  risk_level TEXT NOT NULL DEFAULT 'standard' CHECK (risk_level IN ('low','standard','high','very_high')),
  risk_score INT DEFAULT 0,
  risk_notes TEXT,
  pep_check BOOLEAN DEFAULT false,
  sanctions_check BOOLEAN DEFAULT false,
  adverse_media_check BOOLEAN DEFAULT false,
  assigned_to_user_id UUID,
  approved_by_user_id UUID,
  approved_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.kyc_cases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for kyc_cases"
ON public.kyc_cases FOR ALL TO authenticated
USING (tenant_id = public.get_user_tenant_id(auth.uid()))
WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE TRIGGER update_kyc_cases_updated_at
BEFORE UPDATE ON public.kyc_cases
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- KYC Checks (individual verification items within a case)
CREATE TABLE public.kyc_checks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  case_id UUID NOT NULL REFERENCES public.kyc_cases(id) ON DELETE CASCADE,
  check_type TEXT NOT NULL CHECK (check_type IN ('id_document','proof_of_address','source_of_funds','pep_screening','sanctions_screening','adverse_media','beneficial_ownership','occupation_check')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','passed','failed','needs_review')),
  document_id UUID REFERENCES public.documents(id),
  result_json JSONB NOT NULL DEFAULT '{}',
  notes TEXT,
  checked_by_user_id UUID,
  checked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.kyc_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for kyc_checks"
ON public.kyc_checks FOR ALL TO authenticated
USING (tenant_id = public.get_user_tenant_id(auth.uid()))
WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE TRIGGER update_kyc_checks_updated_at
BEFORE UPDATE ON public.kyc_checks
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Add a folder_path column to documents for folder structure
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS folder_path TEXT NOT NULL DEFAULT '/';

-- Storage bucket for client documents
INSERT INTO storage.buckets (id, name, public) VALUES ('client-documents', 'client-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for client-documents bucket
CREATE POLICY "Authenticated users can upload to client-documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'client-documents');

CREATE POLICY "Authenticated users can view client-documents"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'client-documents');

CREATE POLICY "Authenticated users can update client-documents"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'client-documents');

CREATE POLICY "Authenticated users can delete client-documents"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'client-documents');
