
-- Fix all existing RESTRICTIVE policies to PERMISSIVE
-- Clients
DROP POLICY IF EXISTS "Users can view tenant clients" ON public.clients;
DROP POLICY IF EXISTS "Users can insert tenant clients" ON public.clients;
DROP POLICY IF EXISTS "Users can update tenant clients" ON public.clients;
CREATE POLICY "Users can view tenant clients" ON public.clients FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can insert tenant clients" ON public.clients FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can update tenant clients" ON public.clients FOR UPDATE USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can delete tenant clients" ON public.clients FOR DELETE USING (tenant_id = get_user_tenant_id(auth.uid()));

-- Tasks
DROP POLICY IF EXISTS "Users can view tenant tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can insert tenant tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update tenant tasks" ON public.tasks;
CREATE POLICY "Users can view tenant tasks" ON public.tasks FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can insert tenant tasks" ON public.tasks FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can update tenant tasks" ON public.tasks FOR UPDATE USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can delete tenant tasks" ON public.tasks FOR DELETE USING (tenant_id = get_user_tenant_id(auth.uid()));

-- Profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (id = auth.uid());

-- Tenants
DROP POLICY IF EXISTS "Users can view own tenant" ON public.tenants;
CREATE POLICY "Users can view own tenant" ON public.tenants FOR SELECT USING (id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can update own tenant" ON public.tenants FOR UPDATE USING (id = get_user_tenant_id(auth.uid()));

-- User Roles
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (user_id = auth.uid());

-- Storage bucket for tenant assets
INSERT INTO storage.buckets (id, name, public) VALUES ('tenant-assets', 'tenant-assets', true) ON CONFLICT (id) DO NOTHING;
CREATE POLICY "Tenant assets are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'tenant-assets');
CREATE POLICY "Authenticated users can upload tenant assets" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'tenant-assets' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update tenant assets" ON storage.objects FOR UPDATE USING (bucket_id = 'tenant-assets' AND auth.role() = 'authenticated');

-- ========== BOOKKEEPING MODULE ==========

-- Chart of Accounts
CREATE TABLE public.chart_of_accounts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  code text NOT NULL,
  name text NOT NULL,
  account_type text NOT NULL DEFAULT 'expense',
  parent_id uuid REFERENCES public.chart_of_accounts(id),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, code)
);
ALTER TABLE public.chart_of_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view tenant accounts" ON public.chart_of_accounts FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can insert tenant accounts" ON public.chart_of_accounts FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can update tenant accounts" ON public.chart_of_accounts FOR UPDATE USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can delete tenant accounts" ON public.chart_of_accounts FOR DELETE USING (tenant_id = get_user_tenant_id(auth.uid()));

-- Journal Entries
CREATE TABLE public.journal_entries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  client_id uuid REFERENCES public.clients(id),
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  reference text,
  narration text,
  is_posted boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view tenant journals" ON public.journal_entries FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can insert tenant journals" ON public.journal_entries FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can update tenant journals" ON public.journal_entries FOR UPDATE USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can delete tenant journals" ON public.journal_entries FOR DELETE USING (tenant_id = get_user_tenant_id(auth.uid()));

-- Journal Lines (debit/credit)
CREATE TABLE public.journal_lines (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  journal_entry_id uuid NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES public.chart_of_accounts(id),
  debit numeric(15,2) NOT NULL DEFAULT 0,
  credit numeric(15,2) NOT NULL DEFAULT 0,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.journal_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view tenant journal lines" ON public.journal_lines FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.journal_entries je WHERE je.id = journal_entry_id AND je.tenant_id = get_user_tenant_id(auth.uid()))
);
CREATE POLICY "Users can insert tenant journal lines" ON public.journal_lines FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.journal_entries je WHERE je.id = journal_entry_id AND je.tenant_id = get_user_tenant_id(auth.uid()))
);
CREATE POLICY "Users can update tenant journal lines" ON public.journal_lines FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.journal_entries je WHERE je.id = journal_entry_id AND je.tenant_id = get_user_tenant_id(auth.uid()))
);
CREATE POLICY "Users can delete tenant journal lines" ON public.journal_lines FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.journal_entries je WHERE je.id = journal_entry_id AND je.tenant_id = get_user_tenant_id(auth.uid()))
);

-- ========== VAT MTD MODULE ==========

CREATE TABLE public.vat_returns (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  client_id uuid REFERENCES public.clients(id),
  period_start date NOT NULL,
  period_end date NOT NULL,
  box1 numeric(15,2) NOT NULL DEFAULT 0,
  box2 numeric(15,2) NOT NULL DEFAULT 0,
  box3 numeric(15,2) NOT NULL DEFAULT 0,
  box4 numeric(15,2) NOT NULL DEFAULT 0,
  box5 numeric(15,2) NOT NULL DEFAULT 0,
  box6 numeric(15,2) NOT NULL DEFAULT 0,
  box7 numeric(15,2) NOT NULL DEFAULT 0,
  box8 numeric(15,2) NOT NULL DEFAULT 0,
  box9 numeric(15,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  submitted_at timestamptz,
  hmrc_receipt text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.vat_returns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view tenant vat returns" ON public.vat_returns FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can insert tenant vat returns" ON public.vat_returns FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can update tenant vat returns" ON public.vat_returns FOR UPDATE USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can delete tenant vat returns" ON public.vat_returns FOR DELETE USING (tenant_id = get_user_tenant_id(auth.uid()));

-- ========== BILLING MODULE ==========

CREATE TABLE public.invoices (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  client_id uuid REFERENCES public.clients(id),
  invoice_number text NOT NULL,
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date,
  subtotal numeric(15,2) NOT NULL DEFAULT 0,
  vat_amount numeric(15,2) NOT NULL DEFAULT 0,
  total numeric(15,2) NOT NULL DEFAULT 0,
  amount_paid numeric(15,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  stripe_invoice_id text,
  stripe_payment_intent_id text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, invoice_number)
);
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view tenant invoices" ON public.invoices FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can insert tenant invoices" ON public.invoices FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can update tenant invoices" ON public.invoices FOR UPDATE USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can delete tenant invoices" ON public.invoices FOR DELETE USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE TABLE public.invoice_lines (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity numeric(10,2) NOT NULL DEFAULT 1,
  unit_price numeric(15,2) NOT NULL DEFAULT 0,
  vat_rate numeric(5,2) NOT NULL DEFAULT 20,
  line_total numeric(15,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.invoice_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view tenant invoice lines" ON public.invoice_lines FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_id AND i.tenant_id = get_user_tenant_id(auth.uid()))
);
CREATE POLICY "Users can insert tenant invoice lines" ON public.invoice_lines FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_id AND i.tenant_id = get_user_tenant_id(auth.uid()))
);
CREATE POLICY "Users can update tenant invoice lines" ON public.invoice_lines FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_id AND i.tenant_id = get_user_tenant_id(auth.uid()))
);
CREATE POLICY "Users can delete tenant invoice lines" ON public.invoice_lines FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_id AND i.tenant_id = get_user_tenant_id(auth.uid()))
);

-- Triggers for updated_at
CREATE TRIGGER update_chart_of_accounts_updated_at BEFORE UPDATE ON public.chart_of_accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_journal_entries_updated_at BEFORE UPDATE ON public.journal_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_vat_returns_updated_at BEFORE UPDATE ON public.vat_returns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
