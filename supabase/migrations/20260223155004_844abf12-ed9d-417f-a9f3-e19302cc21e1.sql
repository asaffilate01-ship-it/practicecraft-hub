
-- Drop restrictive policies and recreate as permissive
DROP POLICY IF EXISTS "Users can view own tenant" ON public.tenants;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view tenant clients" ON public.clients;
DROP POLICY IF EXISTS "Users can insert tenant clients" ON public.clients;
DROP POLICY IF EXISTS "Users can update tenant clients" ON public.clients;
DROP POLICY IF EXISTS "Users can view tenant tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can insert tenant tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update tenant tasks" ON public.tasks;

-- Tenants
CREATE POLICY "Users can view own tenant" ON public.tenants
  FOR SELECT TO authenticated
  USING (id = public.get_user_tenant_id(auth.uid()));

-- Profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

-- User roles
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Clients
CREATE POLICY "Users can view tenant clients" ON public.clients
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can insert tenant clients" ON public.clients
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can update tenant clients" ON public.clients
  FOR UPDATE TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

-- Tasks
CREATE POLICY "Users can view tenant tasks" ON public.tasks
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can insert tenant tasks" ON public.tasks
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can update tenant tasks" ON public.tasks
  FOR UPDATE TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));
