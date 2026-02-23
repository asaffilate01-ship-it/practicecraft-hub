
-- ============================================================
-- SECRETARIAL MODULE: Company profiles, registers, filings
-- ============================================================

-- Company profiles (synced CH snapshot)
CREATE TABLE IF NOT EXISTS public.company_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  company_number TEXT NOT NULL,
  company_name TEXT NOT NULL,
  company_status TEXT NOT NULL DEFAULT 'active',
  registered_office_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  sic_codes TEXT[] NOT NULL DEFAULT '{}'::text[],
  incorporation_date DATE,
  last_accounts_due DATE,
  next_accounts_due DATE,
  last_confirmation_statement_date DATE,
  next_confirmation_statement_due DATE,
  officers_snapshot_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  psc_snapshot_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  last_synced_at TIMESTAMPTZ,
  sync_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, client_id)
);

CREATE INDEX IF NOT EXISTS idx_company_profiles_tenant ON public.company_profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_company_profiles_company_number ON public.company_profiles(company_number);

-- Directors register
CREATE TABLE IF NOT EXISTS public.company_register_directors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  date_of_birth DATE,
  nationality TEXT,
  occupation TEXT,
  service_address_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  residential_address_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  appointed_on DATE,
  resigned_on DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  ch_officer_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_register_directors_tenant_client ON public.company_register_directors(tenant_id, client_id);

-- PSC register
CREATE TABLE IF NOT EXISTS public.company_register_psc (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  date_of_birth DATE,
  nationality TEXT,
  country_of_residence TEXT,
  service_address_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  natures_of_control TEXT[] NOT NULL DEFAULT '{}'::text[],
  notified_on DATE,
  ceased_on DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  ch_psc_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_register_psc_tenant_client ON public.company_register_psc(tenant_id, client_id);

-- Share classes
CREATE TABLE IF NOT EXISTS public.share_classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  class_name TEXT NOT NULL DEFAULT 'Ordinary',
  nominal_value_pence BIGINT NOT NULL DEFAULT 100,
  currency TEXT NOT NULL DEFAULT 'GBP',
  voting_rights BOOLEAN NOT NULL DEFAULT true,
  dividend_rights BOOLEAN NOT NULL DEFAULT true,
  total_issued BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_share_classes_tenant_client ON public.share_classes(tenant_id, client_id);

-- Members (shareholders) register
CREATE TABLE IF NOT EXISTS public.company_register_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  address_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  share_class_id UUID REFERENCES public.share_classes(id) ON DELETE SET NULL,
  shares_held BIGINT NOT NULL DEFAULT 0,
  date_became_member DATE,
  date_ceased_member DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_register_members_tenant_client ON public.company_register_members(tenant_id, client_id);

-- Share transactions (allotments, transfers)
CREATE TABLE IF NOT EXISTS public.share_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL DEFAULT 'allotment',
  share_class_id UUID REFERENCES public.share_classes(id) ON DELETE SET NULL,
  from_member_id UUID REFERENCES public.company_register_members(id) ON DELETE SET NULL,
  to_member_id UUID REFERENCES public.company_register_members(id) ON DELETE SET NULL,
  num_shares BIGINT NOT NULL,
  price_per_share_pence BIGINT,
  consideration_text TEXT,
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  resolution_document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_share_transactions_tenant_client ON public.share_transactions(tenant_id, client_id);

-- Secretarial events / change requests
CREATE TABLE IF NOT EXISTS public.secretarial_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  description TEXT,
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  effective_date DATE,
  filed_at TIMESTAMPTZ,
  filing_id UUID,
  created_by_user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_secretarial_events_tenant_client ON public.secretarial_events(tenant_id, client_id);
CREATE INDEX IF NOT EXISTS idx_secretarial_events_status ON public.secretarial_events(tenant_id, status);

-- CH filings (linked to submission_jobs)
CREATE TABLE IF NOT EXISTS public.ch_filings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  filing_type TEXT NOT NULL,
  filing_description TEXT,
  ch_transaction_id TEXT,
  ch_barcode TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  request_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  response_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  submitted_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  rejected_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ch_filings_tenant_client ON public.ch_filings(tenant_id, client_id);
CREATE INDEX IF NOT EXISTS idx_ch_filings_status ON public.ch_filings(tenant_id, status);

-- Confirmation statement cycles
CREATE TABLE IF NOT EXISTS public.confirmation_statement_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  review_period_start DATE NOT NULL,
  review_period_end DATE NOT NULL,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'upcoming',
  filed_at TIMESTAMPTZ,
  ch_filing_id UUID REFERENCES public.ch_filings(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cs_cycles_tenant_due ON public.confirmation_statement_cycles(tenant_id, due_date);

-- Minutes/resolution documents
CREATE TABLE IF NOT EXISTS public.minutes_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL DEFAULT 'board_minutes',
  title TEXT NOT NULL,
  template_key TEXT,
  content_html TEXT,
  document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
  secretarial_event_id UUID REFERENCES public.secretarial_events(id) ON DELETE SET NULL,
  signed_at TIMESTAMPTZ,
  created_by_user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_minutes_docs_tenant_client ON public.minutes_documents(tenant_id, client_id);

-- ============================================================
-- INCORPORATION MODULE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.incorporation_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'draft',
  proposed_name TEXT,
  entity_type TEXT NOT NULL DEFAULT 'ltd',
  registered_office_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  sail_address_json JSONB,
  sic_codes TEXT[] NOT NULL DEFAULT '{}'::text[],
  articles_type TEXT NOT NULL DEFAULT 'model',
  payment_status TEXT NOT NULL DEFAULT 'unpaid',
  payment_reference TEXT,
  payment_amount_pence BIGINT,
  ch_submission_id TEXT,
  ch_company_number TEXT,
  ch_incorporation_date DATE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  created_by_user_id UUID,
  data_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_incorp_apps_tenant ON public.incorporation_applications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_incorp_apps_status ON public.incorporation_applications(tenant_id, status);

-- Incorporation people (directors, PSCs, subscribers)
CREATE TABLE IF NOT EXISTS public.incorp_people (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  application_id UUID NOT NULL REFERENCES public.incorporation_applications(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  title TEXT,
  first_name TEXT NOT NULL,
  middle_names TEXT,
  last_name TEXT NOT NULL,
  date_of_birth DATE,
  nationality TEXT,
  occupation TEXT,
  country_of_residence TEXT,
  service_address_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  residential_address_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  natures_of_control TEXT[] DEFAULT '{}'::text[],
  consent_to_act BOOLEAN NOT NULL DEFAULT false,
  kyc_status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_incorp_people_app ON public.incorp_people(application_id);

-- Incorporation share structure
CREATE TABLE IF NOT EXISTS public.incorp_share_structure (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  application_id UUID NOT NULL REFERENCES public.incorporation_applications(id) ON DELETE CASCADE,
  class_name TEXT NOT NULL DEFAULT 'Ordinary',
  nominal_value_pence BIGINT NOT NULL DEFAULT 100,
  currency TEXT NOT NULL DEFAULT 'GBP',
  total_shares BIGINT NOT NULL DEFAULT 1,
  subscriber_person_id UUID REFERENCES public.incorp_people(id) ON DELETE SET NULL,
  shares_subscribed BIGINT NOT NULL DEFAULT 1,
  amount_paid_pence BIGINT NOT NULL DEFAULT 100,
  amount_unpaid_pence BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_incorp_shares_app ON public.incorp_share_structure(application_id);

-- Incorporation documents (ID, proofs, signed statements)
CREATE TABLE IF NOT EXISTS public.incorp_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  application_id UUID NOT NULL REFERENCES public.incorporation_applications(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  person_id UUID REFERENCES public.incorp_people(id) ON DELETE SET NULL,
  document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_incorp_docs_app ON public.incorp_documents(application_id);

-- Incorporation status history
CREATE TABLE IF NOT EXISTS public.incorp_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  application_id UUID NOT NULL REFERENCES public.incorporation_applications(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  notes TEXT,
  changed_by_user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_incorp_history_app ON public.incorp_status_history(application_id);

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- company_profiles
ALTER TABLE public.company_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view tenant company profiles" ON public.company_profiles FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can insert tenant company profiles" ON public.company_profiles FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can update tenant company profiles" ON public.company_profiles FOR UPDATE USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can delete tenant company profiles" ON public.company_profiles FOR DELETE USING (tenant_id = get_user_tenant_id(auth.uid()));

-- company_register_directors
ALTER TABLE public.company_register_directors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view tenant directors" ON public.company_register_directors FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can insert tenant directors" ON public.company_register_directors FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can update tenant directors" ON public.company_register_directors FOR UPDATE USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can delete tenant directors" ON public.company_register_directors FOR DELETE USING (tenant_id = get_user_tenant_id(auth.uid()));

-- company_register_psc
ALTER TABLE public.company_register_psc ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view tenant psc" ON public.company_register_psc FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can insert tenant psc" ON public.company_register_psc FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can update tenant psc" ON public.company_register_psc FOR UPDATE USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can delete tenant psc" ON public.company_register_psc FOR DELETE USING (tenant_id = get_user_tenant_id(auth.uid()));

-- share_classes
ALTER TABLE public.share_classes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view tenant share classes" ON public.share_classes FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can insert tenant share classes" ON public.share_classes FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can update tenant share classes" ON public.share_classes FOR UPDATE USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can delete tenant share classes" ON public.share_classes FOR DELETE USING (tenant_id = get_user_tenant_id(auth.uid()));

-- company_register_members
ALTER TABLE public.company_register_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view tenant members" ON public.company_register_members FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can insert tenant members" ON public.company_register_members FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can update tenant members" ON public.company_register_members FOR UPDATE USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can delete tenant members" ON public.company_register_members FOR DELETE USING (tenant_id = get_user_tenant_id(auth.uid()));

-- share_transactions
ALTER TABLE public.share_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view tenant share transactions" ON public.share_transactions FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can insert tenant share transactions" ON public.share_transactions FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

-- secretarial_events
ALTER TABLE public.secretarial_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view tenant secretarial events" ON public.secretarial_events FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can insert tenant secretarial events" ON public.secretarial_events FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can update tenant secretarial events" ON public.secretarial_events FOR UPDATE USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can delete tenant secretarial events" ON public.secretarial_events FOR DELETE USING (tenant_id = get_user_tenant_id(auth.uid()));

-- ch_filings
ALTER TABLE public.ch_filings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view tenant ch filings" ON public.ch_filings FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can insert tenant ch filings" ON public.ch_filings FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can update tenant ch filings" ON public.ch_filings FOR UPDATE USING (tenant_id = get_user_tenant_id(auth.uid()));

-- confirmation_statement_cycles
ALTER TABLE public.confirmation_statement_cycles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view tenant cs cycles" ON public.confirmation_statement_cycles FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can insert tenant cs cycles" ON public.confirmation_statement_cycles FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can update tenant cs cycles" ON public.confirmation_statement_cycles FOR UPDATE USING (tenant_id = get_user_tenant_id(auth.uid()));

-- minutes_documents
ALTER TABLE public.minutes_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view tenant minutes" ON public.minutes_documents FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can insert tenant minutes" ON public.minutes_documents FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can update tenant minutes" ON public.minutes_documents FOR UPDATE USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can delete tenant minutes" ON public.minutes_documents FOR DELETE USING (tenant_id = get_user_tenant_id(auth.uid()));

-- incorporation_applications
ALTER TABLE public.incorporation_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view tenant incorp apps" ON public.incorporation_applications FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can insert tenant incorp apps" ON public.incorporation_applications FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can update tenant incorp apps" ON public.incorporation_applications FOR UPDATE USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can delete tenant incorp apps" ON public.incorporation_applications FOR DELETE USING (tenant_id = get_user_tenant_id(auth.uid()));

-- incorp_people
ALTER TABLE public.incorp_people ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view tenant incorp people" ON public.incorp_people FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can insert tenant incorp people" ON public.incorp_people FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can update tenant incorp people" ON public.incorp_people FOR UPDATE USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can delete tenant incorp people" ON public.incorp_people FOR DELETE USING (tenant_id = get_user_tenant_id(auth.uid()));

-- incorp_share_structure
ALTER TABLE public.incorp_share_structure ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view tenant incorp shares" ON public.incorp_share_structure FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can insert tenant incorp shares" ON public.incorp_share_structure FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can update tenant incorp shares" ON public.incorp_share_structure FOR UPDATE USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can delete tenant incorp shares" ON public.incorp_share_structure FOR DELETE USING (tenant_id = get_user_tenant_id(auth.uid()));

-- incorp_documents
ALTER TABLE public.incorp_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view tenant incorp docs" ON public.incorp_documents FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can insert tenant incorp docs" ON public.incorp_documents FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can update tenant incorp docs" ON public.incorp_documents FOR UPDATE USING (tenant_id = get_user_tenant_id(auth.uid()));

-- incorp_status_history
ALTER TABLE public.incorp_status_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view tenant incorp history" ON public.incorp_status_history FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can insert tenant incorp history" ON public.incorp_status_history FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

-- ============================================================
-- KEY VIEWS
-- ============================================================

-- Secretarial due items (confirmation statements + accounts deadlines)
CREATE OR REPLACE VIEW public.v_secretarial_due AS
SELECT
  cp.tenant_id,
  cp.client_id,
  c.legal_name AS client_legal_name,
  cp.company_number,
  cp.next_confirmation_statement_due,
  cp.next_accounts_due,
  CASE
    WHEN cp.next_confirmation_statement_due <= CURRENT_DATE THEN 'overdue'
    WHEN cp.next_confirmation_statement_due <= CURRENT_DATE + INTERVAL '30 days' THEN 'due_soon'
    ELSE 'ok'
  END AS cs_urgency,
  CASE
    WHEN cp.next_accounts_due <= CURRENT_DATE THEN 'overdue'
    WHEN cp.next_accounts_due <= CURRENT_DATE + INTERVAL '30 days' THEN 'due_soon'
    ELSE 'ok'
  END AS accounts_urgency
FROM public.company_profiles cp
JOIN public.clients c ON c.id = cp.client_id AND c.tenant_id = cp.tenant_id
WHERE c.archived_at IS NULL;

-- Pending secretarial changes (unfiled)
CREATE OR REPLACE VIEW public.v_secretarial_changes_pending AS
SELECT
  se.tenant_id,
  se.client_id,
  c.legal_name AS client_legal_name,
  se.id AS event_id,
  se.event_type,
  se.description,
  se.status,
  se.effective_date,
  se.created_at
FROM public.secretarial_events se
JOIN public.clients c ON c.id = se.client_id AND c.tenant_id = se.tenant_id
WHERE se.status IN ('draft', 'ready_to_file', 'rejected');

-- Company register health (missing data indicators)
CREATE OR REPLACE VIEW public.v_company_register_health AS
SELECT
  cp.tenant_id,
  cp.client_id,
  c.legal_name AS client_legal_name,
  cp.company_number,
  (SELECT COUNT(*) FROM public.company_register_directors d WHERE d.client_id = cp.client_id AND d.tenant_id = cp.tenant_id AND d.is_active) AS active_directors,
  (SELECT COUNT(*) FROM public.company_register_psc p WHERE p.client_id = cp.client_id AND p.tenant_id = cp.tenant_id AND p.is_active) AS active_pscs,
  (SELECT COUNT(*) FROM public.company_register_members m WHERE m.client_id = cp.client_id AND m.tenant_id = cp.tenant_id AND m.is_active) AS active_members,
  EXISTS(SELECT 1 FROM public.client_credentials cc WHERE cc.client_id = cp.client_id AND cc.tenant_id = cp.tenant_id AND cc.provider = 'companies_house' AND cc.credential_type = 'auth_code') AS has_auth_code
FROM public.company_profiles cp
JOIN public.clients c ON c.id = cp.client_id AND c.tenant_id = cp.tenant_id
WHERE c.archived_at IS NULL;
