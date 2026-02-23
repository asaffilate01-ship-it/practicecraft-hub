
-- =============================================
-- SUBSCRIPTION PLANS & TENANT SUBSCRIPTIONS
-- =============================================

-- Subscription plans define what a tenant can access
CREATE TABLE public.subscription_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  max_clients INTEGER NOT NULL DEFAULT 5,
  max_users INTEGER NOT NULL DEFAULT 2,
  allowed_modules TEXT[] NOT NULL DEFAULT '{}',
  price_monthly_pence INTEGER NOT NULL DEFAULT 0,
  price_annual_pence INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger
CREATE TRIGGER update_subscription_plans_updated_at
  BEFORE UPDATE ON public.subscription_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- RLS: plans are readable by all authenticated
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Plans readable by authenticated"
  ON public.subscription_plans FOR SELECT
  TO authenticated USING (true);

-- Seed the 3 tiers
INSERT INTO public.subscription_plans (code, name, description, max_clients, max_users, allowed_modules, price_monthly_pence, price_annual_pence, sort_order)
VALUES
  ('starter', 'Starter', 'For small practices getting started', 10, 3,
   ARRAY['clients','tasks','bookkeeping','vat','documents','billing','kyc_aml'],
   2900, 29000, 1),
  ('pro', 'Professional', 'Full-featured for growing practices', 100, 15,
   ARRAY['clients','tasks','bookkeeping','vat','payroll','accounts','secretarial','incorporations','submissions','documents','billing','kyc_aml','reports','practice_mgmt'],
   7900, 79000, 2),
  ('enterprise', 'Enterprise', 'Unlimited access for large firms', 999999, 999999,
   ARRAY['clients','tasks','bookkeeping','vat','payroll','accounts','secretarial','incorporations','submissions','documents','billing','kyc_aml','reports','practice_mgmt'],
   14900, 149000, 3);

-- Tenant subscriptions (links a tenant to a plan)
CREATE TABLE public.tenant_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) UNIQUE,
  plan_id UUID NOT NULL REFERENCES public.subscription_plans(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','trial','past_due','cancelled','suspended')),
  billing_cycle TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly','annual')),
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_period_end TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days'),
  trial_ends_at TIMESTAMPTZ,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER update_tenant_subscriptions_updated_at
  BEFORE UPDATE ON public.tenant_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- RLS: tenant isolation
ALTER TABLE public.tenant_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant can view own subscription"
  ON public.tenant_subscriptions FOR SELECT
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Tenant can update own subscription"
  ON public.tenant_subscriptions FOR UPDATE
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

-- Helper function: get tenant's allowed modules
CREATE OR REPLACE FUNCTION public.get_tenant_allowed_modules(p_tenant_id UUID)
RETURNS TEXT[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(sp.allowed_modules, '{}')
  FROM tenant_subscriptions ts
  JOIN subscription_plans sp ON sp.id = ts.plan_id
  WHERE ts.tenant_id = p_tenant_id
    AND ts.status IN ('active', 'trial')
  LIMIT 1;
$$;

-- Helper function: get tenant limits
CREATE OR REPLACE FUNCTION public.get_tenant_plan_limits(p_tenant_id UUID)
RETURNS TABLE(max_clients INTEGER, max_users INTEGER, plan_code TEXT, plan_name TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT sp.max_clients, sp.max_users, sp.code, sp.name
  FROM tenant_subscriptions ts
  JOIN subscription_plans sp ON sp.id = ts.plan_id
  WHERE ts.tenant_id = p_tenant_id
    AND ts.status IN ('active', 'trial')
  LIMIT 1;
$$;

-- Auto-create a trial subscription when a new tenant is created
-- Update handle_new_user to also create subscription
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_tenant_id uuid;
  firm text;
  starter_plan_id uuid;
BEGIN
  firm := COALESCE(NEW.raw_user_meta_data->>'firm_name', 'My Practice');
  
  INSERT INTO public.tenants (firm_name)
  VALUES (firm)
  RETURNING id INTO new_tenant_id;

  INSERT INTO public.profiles (id, tenant_id, full_name, email)
  VALUES (
    NEW.id,
    new_tenant_id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email
  );

  INSERT INTO public.user_roles (user_id, tenant_id, role)
  VALUES (NEW.id, new_tenant_id, 'firm_owner');

  -- Create trial subscription on starter plan
  SELECT id INTO starter_plan_id FROM subscription_plans WHERE code = 'starter' LIMIT 1;
  IF starter_plan_id IS NOT NULL THEN
    INSERT INTO public.tenant_subscriptions (tenant_id, plan_id, status, trial_ends_at, current_period_end)
    VALUES (new_tenant_id, starter_plan_id, 'trial', now() + interval '14 days', now() + interval '14 days');
  END IF;

  PERFORM seed_tenant(new_tenant_id);
  PERFORM seed_templates_and_automations(new_tenant_id);

  RETURN NEW;
END;
$$;
