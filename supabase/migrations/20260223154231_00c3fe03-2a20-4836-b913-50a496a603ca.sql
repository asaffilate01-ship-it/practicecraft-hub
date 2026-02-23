
-- ============================================================
-- IQ PRACTICE CLOUD - PHASE 1 SCHEMA
-- Core: Auth profiles, Tenants, Roles, Clients, Tasks
-- ============================================================

-- Enable citext for case-insensitive emails
CREATE EXTENSION IF NOT EXISTS citext WITH SCHEMA extensions;

-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE public.entity_type AS ENUM ('ltd','sole_trader','partnership','llp','charity','trust');
CREATE TYPE public.client_status AS ENUM ('prospect','active','dormant','ceased');
CREATE TYPE public.task_status AS ENUM ('todo','in_progress','blocked','awaiting_client','awaiting_hmrc','done','cancelled');
CREATE TYPE public.priority AS ENUM ('low','medium','high','urgent');
CREATE TYPE public.app_role AS ENUM ('super_admin','firm_owner','manager','staff','payroll_officer','client_user','employee');

-- ============================================================
-- TENANTS
-- ============================================================
CREATE TABLE public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_name TEXT NOT NULL,
  trading_name TEXT,
  primary_domain TEXT,
  support_email TEXT,
  phone TEXT,
  address_json JSONB DEFAULT '{}'::jsonb,
  logo_url TEXT,
  brand_primary_color TEXT DEFAULT '#0EA5E9',
  brand_secondary_color TEXT DEFAULT '#0F172A',
  timezone TEXT DEFAULT 'Europe/London',
  plan_code TEXT DEFAULT 'starter',
  is_white_label_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PROFILES (linked to auth.users)
-- ============================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- USER ROLES (separate table per security guidelines)
-- ============================================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL DEFAULT 'staff',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, tenant_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Get user's tenant_id
CREATE OR REPLACE FUNCTION public.get_user_tenant_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.profiles WHERE id = _user_id LIMIT 1
$$;

-- ============================================================
-- CLIENTS
-- ============================================================
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  entity_type public.entity_type NOT NULL DEFAULT 'ltd',
  status public.client_status NOT NULL DEFAULT 'active',
  legal_name TEXT NOT NULL,
  trading_name TEXT,
  email TEXT,
  phone TEXT,
  address_json JSONB DEFAULT '{}'::jsonb,
  company_number TEXT,
  charity_number TEXT,
  utr TEXT,
  nino TEXT,
  vat_number TEXT,
  paye_reference TEXT,
  assigned_manager_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ
);
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_clients_tenant ON public.clients(tenant_id);

-- ============================================================
-- TASKS
-- ============================================================
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status public.task_status NOT NULL DEFAULT 'todo',
  priority public.priority NOT NULL DEFAULT 'medium',
  due_date DATE,
  assigned_to_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  color_tag TEXT,
  checklist_json JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_tasks_tenant ON public.tasks(tenant_id);
CREATE INDEX idx_tasks_status ON public.tasks(tenant_id, status, due_date);

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- Tenants: users can see their own tenant
CREATE POLICY "Users can view own tenant"
  ON public.tenants FOR SELECT
  TO authenticated
  USING (id = public.get_user_tenant_id(auth.uid()));

-- Profiles: users can view/update their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- User roles: users can view their own roles
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Clients: tenant isolation
CREATE POLICY "Users can view tenant clients"
  ON public.clients FOR SELECT
  TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can insert tenant clients"
  ON public.clients FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can update tenant clients"
  ON public.clients FOR UPDATE
  TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

-- Tasks: tenant isolation
CREATE POLICY "Users can view tenant tasks"
  ON public.tasks FOR SELECT
  TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can insert tenant tasks"
  ON public.tasks FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can update tenant tasks"
  ON public.tasks FOR UPDATE
  TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

-- ============================================================
-- TRIGGER: Auto-create profile on signup
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- TRIGGER: updated_at auto-update
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON public.tenants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
