-- Charity, Gift Aid, partnership and LLP preparation foundations.
-- Submission statuses are controlled and do not imply regulator acceptance.

CREATE TABLE IF NOT EXISTS public.charity_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  client_id uuid NOT NULL UNIQUE REFERENCES public.clients(id) ON DELETE CASCADE,
  charity_number text,
  hmrc_charities_reference text,
  legal_structure text NOT NULL DEFAULT 'cio',
  governing_document_type text,
  public_benefit_summary text,
  registration_status text NOT NULL DEFAULT 'not_started'
    CHECK (registration_status IN ('not_started','draft','trustee_review','submitted_manually','registered','rejected')),
  commission_last_synced_at timestamptz,
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.charity_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  charity_profile_id uuid NOT NULL REFERENCES public.charity_profiles(id) ON DELETE CASCADE,
  application_type text NOT NULL DEFAULT 'registration',
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','trustee_review','ready_for_manual_submission','submitted_manually','registered','rejected')),
  application_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  trustee_declaration_at timestamptz,
  trustee_declaration_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  evidence_document_id uuid REFERENCES public.documents(id) ON DELETE SET NULL,
  external_reference text,
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.gift_aid_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  charity_profile_id uuid NOT NULL REFERENCES public.charity_profiles(id) ON DELETE CASCADE,
  claim_reference text NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  donation_count integer NOT NULL DEFAULT 0,
  donation_total_pence bigint NOT NULL DEFAULT 0,
  tax_reclaim_pence bigint NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','review','ready','queued','sent','accepted','rejected','cancelled')),
  submission_job_id uuid REFERENCES public.submission_jobs(id) ON DELETE SET NULL,
  hmrc_response_json jsonb,
  finalised_at timestamptz,
  finalised_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (period_end >= period_start),
  CHECK (status NOT IN ('sent','accepted','rejected') OR submission_job_id IS NOT NULL),
  CHECK (status <> 'accepted' OR hmrc_response_json IS NOT NULL),
  UNIQUE (tenant_id, client_id, claim_reference)
);

CREATE TABLE IF NOT EXISTS public.gift_aid_donations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  claim_id uuid NOT NULL REFERENCES public.gift_aid_claims(id) ON DELETE CASCADE,
  donor_name text NOT NULL,
  donor_house text,
  donor_postcode text,
  donation_date date NOT NULL,
  donation_pence bigint NOT NULL CHECK (donation_pence > 0),
  sponsored_event boolean NOT NULL DEFAULT false,
  declaration_confirmed boolean NOT NULL DEFAULT false,
  declaration_document_id uuid REFERENCES public.documents(id) ON DELETE SET NULL,
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.charity_annual_returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  charity_profile_id uuid NOT NULL REFERENCES public.charity_profiles(id) ON DELETE CASCADE,
  financial_year_end date NOT NULL,
  gross_income_pence bigint NOT NULL DEFAULT 0,
  gross_expenditure_pence bigint NOT NULL DEFAULT 0,
  return_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','trustee_review','ready_for_manual_submission','submitted_manually','accepted','returned')),
  submission_method text NOT NULL DEFAULT 'charity_commission_online'
    CHECK (submission_method IN ('charity_commission_online','other_regulator')),
  evidence_document_id uuid REFERENCES public.documents(id) ON DELETE SET NULL,
  external_reference text,
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (status NOT IN ('submitted_manually','accepted') OR (submitted_at IS NOT NULL AND external_reference IS NOT NULL AND evidence_document_id IS NOT NULL)),
  UNIQUE (client_id, financial_year_end)
);

CREATE TABLE IF NOT EXISTS public.partnership_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  client_id uuid NOT NULL UNIQUE REFERENCES public.clients(id) ON DELETE CASCADE,
  partnership_type text NOT NULL CHECK (partnership_type IN ('partnership','llp')),
  partnership_utr text,
  companies_house_number text,
  accounting_date date,
  nominated_partner_id uuid,
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  partnership_profile_id uuid NOT NULL REFERENCES public.partnership_profiles(id) ON DELETE CASCADE,
  partner_type text NOT NULL DEFAULT 'individual' CHECK (partner_type IN ('individual','company','trust','other')),
  display_name text NOT NULL,
  utr text,
  ni_number text,
  profit_share_percent numeric(7,4),
  loss_share_percent numeric(7,4),
  joined_at date,
  left_at date,
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (profit_share_percent IS NULL OR profit_share_percent BETWEEN 0 AND 100),
  CHECK (loss_share_percent IS NULL OR loss_share_percent BETWEEN 0 AND 100)
);

ALTER TABLE public.partnership_profiles
  DROP CONSTRAINT IF EXISTS partnership_profiles_nominated_partner_id_fkey;
ALTER TABLE public.partnership_profiles
  ADD CONSTRAINT partnership_profiles_nominated_partner_id_fkey
  FOREIGN KEY (nominated_partner_id) REFERENCES public.partners(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.partnership_returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  partnership_profile_id uuid NOT NULL REFERENCES public.partnership_profiles(id) ON DELETE CASCADE,
  tax_year text NOT NULL,
  accounts_period_id uuid REFERENCES public.accounts_periods(id) ON DELETE SET NULL,
  return_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  allocations_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','review','partner_approval','ready','queued','sent','accepted','rejected','amended')),
  submission_job_id uuid REFERENCES public.submission_jobs(id) ON DELETE SET NULL,
  hmrc_response_json jsonb,
  approved_at timestamptz,
  approved_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (status NOT IN ('sent','accepted','rejected') OR submission_job_id IS NOT NULL),
  CHECK (status <> 'accepted' OR hmrc_response_json IS NOT NULL),
  UNIQUE (client_id, tax_year)
);

CREATE TABLE IF NOT EXISTS public.llp_accounts_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  accounts_period_id uuid NOT NULL REFERENCES public.accounts_periods(id) ON DELETE CASCADE,
  members_approval_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  filing_checklist_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','review','members_approved','ixbrl_validation','ready_for_test','test_accepted','production_ready','filed')),
  submission_job_id uuid REFERENCES public.submission_jobs(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (status <> 'filed' OR submission_job_id IS NOT NULL),
  UNIQUE (accounts_period_id)
);

CREATE INDEX IF NOT EXISTS ix_gift_aid_claims_review ON public.gift_aid_claims(tenant_id, status, period_end);
CREATE INDEX IF NOT EXISTS ix_gift_aid_donations_claim ON public.gift_aid_donations(claim_id, donation_date);
CREATE INDEX IF NOT EXISTS ix_charity_returns_review ON public.charity_annual_returns(tenant_id, status, financial_year_end);
CREATE INDEX IF NOT EXISTS ix_partners_profile ON public.partners(partnership_profile_id, left_at);
CREATE INDEX IF NOT EXISTS ix_partnership_returns_review ON public.partnership_returns(tenant_id, status, tax_year);

ALTER TABLE public.charity_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.charity_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gift_aid_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gift_aid_donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.charity_annual_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partnership_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partnership_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.llp_accounts_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant staff manage charity profiles" ON public.charity_profiles FOR ALL TO authenticated USING (tenant_id = public.get_user_tenant_id(auth.uid())) WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant staff manage charity applications" ON public.charity_applications FOR ALL TO authenticated USING (tenant_id = public.get_user_tenant_id(auth.uid())) WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant staff manage Gift Aid claims" ON public.gift_aid_claims FOR ALL TO authenticated USING (tenant_id = public.get_user_tenant_id(auth.uid())) WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant staff manage Gift Aid donations" ON public.gift_aid_donations FOR ALL TO authenticated USING (tenant_id = public.get_user_tenant_id(auth.uid())) WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant staff manage charity annual returns" ON public.charity_annual_returns FOR ALL TO authenticated USING (tenant_id = public.get_user_tenant_id(auth.uid())) WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant staff manage partnership profiles" ON public.partnership_profiles FOR ALL TO authenticated USING (tenant_id = public.get_user_tenant_id(auth.uid())) WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant staff manage partners" ON public.partners FOR ALL TO authenticated USING (tenant_id = public.get_user_tenant_id(auth.uid())) WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant staff manage partnership returns" ON public.partnership_returns FOR ALL TO authenticated USING (tenant_id = public.get_user_tenant_id(auth.uid())) WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant staff manage LLP accounts reviews" ON public.llp_accounts_reviews FOR ALL TO authenticated USING (tenant_id = public.get_user_tenant_id(auth.uid())) WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE TRIGGER update_charity_profiles_updated_at BEFORE UPDATE ON public.charity_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_charity_applications_updated_at BEFORE UPDATE ON public.charity_applications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_gift_aid_claims_updated_at BEFORE UPDATE ON public.gift_aid_claims FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_gift_aid_donations_updated_at BEFORE UPDATE ON public.gift_aid_donations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_charity_annual_returns_updated_at BEFORE UPDATE ON public.charity_annual_returns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_partnership_profiles_updated_at BEFORE UPDATE ON public.partnership_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_partners_updated_at BEFORE UPDATE ON public.partners FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_partnership_returns_updated_at BEFORE UPDATE ON public.partnership_returns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_llp_accounts_reviews_updated_at BEFORE UPDATE ON public.llp_accounts_reviews FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

COMMENT ON TABLE public.charity_annual_returns IS 'Prepared Charity Commission annual-return workspaces. Filing remains manual unless a regulator submission interface is separately approved.';
COMMENT ON TABLE public.gift_aid_claims IS 'Charities Online claim workspaces. A sent or accepted state requires an immutable submission job and provider evidence.';
COMMENT ON TABLE public.partnership_returns IS 'SA800 preparation and partner allocation workspaces. Production transmission requires current-year HMRC XML testing.';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.charity_profiles, public.charity_applications, public.gift_aid_claims, public.gift_aid_donations, public.charity_annual_returns, public.partnership_profiles, public.partners, public.partnership_returns, public.llp_accounts_reviews TO authenticated;
GRANT ALL ON public.charity_profiles, public.charity_applications, public.gift_aid_claims, public.gift_aid_donations, public.charity_annual_returns, public.partnership_profiles, public.partners, public.partnership_returns, public.llp_accounts_reviews TO service_role;
