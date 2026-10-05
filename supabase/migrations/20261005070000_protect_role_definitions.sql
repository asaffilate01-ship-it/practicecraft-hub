-- Permission definitions must not be writable by the staff they constrain.
CREATE OR REPLACE FUNCTION public.can_manage_practice_roles()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT EXISTS (
  SELECT 1 FROM public.user_roles
  WHERE user_id = auth.uid()
    AND tenant_id = public.get_user_tenant_id(auth.uid())
    AND role::text IN ('firm_owner', 'super_admin')
 );
$$;
REVOKE ALL ON FUNCTION public.can_manage_practice_roles() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_manage_practice_roles() TO authenticated;

DROP POLICY IF EXISTS "Users can insert tenant roles" ON public.roles;
DROP POLICY IF EXISTS "Users can update tenant roles" ON public.roles;
DROP POLICY IF EXISTS "Users can delete tenant roles" ON public.roles;
CREATE POLICY "Practice owners insert role definitions" ON public.roles FOR INSERT TO authenticated
 WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()) AND public.can_manage_practice_roles());
CREATE POLICY "Practice owners update role definitions" ON public.roles FOR UPDATE TO authenticated
 USING (tenant_id = public.get_user_tenant_id(auth.uid()) AND public.can_manage_practice_roles())
 WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()) AND public.can_manage_practice_roles());
CREATE POLICY "Practice owners delete role definitions" ON public.roles FOR DELETE TO authenticated
 USING (tenant_id = public.get_user_tenant_id(auth.uid()) AND public.can_manage_practice_roles());

-- These SECURITY DEFINER seeders accept arbitrary tenant IDs and can bypass
-- the policies above. Auth signup triggers run as their owner and retain
-- access; interactive provisioning must go through a scoped server workflow.
REVOKE ALL ON FUNCTION public.seed_tenant(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.seed_templates_and_automations(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.seed_tenant(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.seed_templates_and_automations(uuid) TO service_role;
