
-- ══════════════════════════════════════════════════════════
-- Phase 2: Bank Feeds, Auto-categorisation, Client Onboarding
-- ══════════════════════════════════════════════════════════

-- 1. Bank Connections (Open Banking / manual)
CREATE TABLE public.bank_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'manual', -- truelayer, plaid, manual
  provider_connection_id TEXT,
  account_name TEXT NOT NULL,
  account_number_masked TEXT, -- last 4 digits
  sort_code TEXT,
  currency TEXT NOT NULL DEFAULT 'GBP',
  balance_pence BIGINT DEFAULT 0,
  balance_updated_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active', -- active, expired, revoked, error
  consent_expires_at TIMESTAMPTZ,
  metadata_json JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.bank_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for bank_connections"
  ON public.bank_connections FOR ALL
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE TRIGGER update_bank_connections_updated_at
  BEFORE UPDATE ON public.bank_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 2. Bank Transactions (imported from feeds)
CREATE TABLE public.bank_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  bank_connection_id UUID NOT NULL REFERENCES public.bank_connections(id) ON DELETE CASCADE,
  transaction_date DATE NOT NULL,
  description TEXT NOT NULL,
  amount_pence BIGINT NOT NULL, -- positive=credit, negative=debit
  running_balance_pence BIGINT,
  reference TEXT,
  transaction_type TEXT, -- debit, credit, transfer, etc.
  provider_transaction_id TEXT, -- de-dupe key from provider
  categorisation_status TEXT NOT NULL DEFAULT 'uncategorised', -- uncategorised, suggested, confirmed, posted
  suggested_account_id UUID REFERENCES public.chart_of_accounts(id),
  confirmed_account_id UUID REFERENCES public.chart_of_accounts(id),
  journal_entry_id UUID REFERENCES public.journal_entries(id),
  matched_rule_id UUID,
  metadata_json JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for bank_transactions"
  ON public.bank_transactions FOR ALL
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE INDEX idx_bank_txn_client ON public.bank_transactions(client_id, transaction_date DESC);
CREATE INDEX idx_bank_txn_status ON public.bank_transactions(categorisation_status);
CREATE UNIQUE INDEX idx_bank_txn_provider_dedup ON public.bank_transactions(bank_connection_id, provider_transaction_id) WHERE provider_transaction_id IS NOT NULL;

CREATE TRIGGER update_bank_transactions_updated_at
  BEFORE UPDATE ON public.bank_transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 3. Categorisation Rules
CREATE TABLE public.categorisation_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE, -- NULL = tenant-wide
  name TEXT NOT NULL,
  priority INT NOT NULL DEFAULT 100, -- lower = higher priority
  is_active BOOLEAN NOT NULL DEFAULT true,
  match_type TEXT NOT NULL DEFAULT 'contains', -- contains, exact, regex, starts_with
  match_field TEXT NOT NULL DEFAULT 'description', -- description, reference, amount
  match_value TEXT NOT NULL,
  target_account_id UUID NOT NULL REFERENCES public.chart_of_accounts(id),
  vat_code TEXT, -- standard, reduced, zero, exempt, outside
  auto_post BOOLEAN NOT NULL DEFAULT false, -- auto-create journal entry
  hit_count INT NOT NULL DEFAULT 0,
  last_matched_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.categorisation_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for categorisation_rules"
  ON public.categorisation_rules FOR ALL
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE INDEX idx_cat_rules_tenant ON public.categorisation_rules(tenant_id, is_active, priority);

CREATE TRIGGER update_categorisation_rules_updated_at
  BEFORE UPDATE ON public.categorisation_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 4. Client Onboarding Checklists
CREATE TABLE public.client_onboarding (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'in_progress', -- in_progress, completed, cancelled
  current_step TEXT NOT NULL DEFAULT 'engagement', -- engagement, aml, coa, services, review
  steps_json JSONB NOT NULL DEFAULT '{}', -- stores completion state per step
  engagement_signed BOOLEAN NOT NULL DEFAULT false,
  engagement_document_id UUID REFERENCES public.documents(id),
  aml_case_id UUID,
  coa_template_id UUID REFERENCES public.coa_templates(id),
  selected_services TEXT[] NOT NULL DEFAULT '{}',
  notes TEXT,
  started_by UUID REFERENCES auth.users(id),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.client_onboarding ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for client_onboarding"
  ON public.client_onboarding FOR ALL
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE UNIQUE INDEX idx_client_onboarding_active ON public.client_onboarding(client_id) WHERE status = 'in_progress';

CREATE TRIGGER update_client_onboarding_updated_at
  BEFORE UPDATE ON public.client_onboarding
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
