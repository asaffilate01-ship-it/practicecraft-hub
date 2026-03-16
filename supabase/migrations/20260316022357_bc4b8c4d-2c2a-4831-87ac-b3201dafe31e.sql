
-- Fix portal_users privilege escalation
DROP POLICY IF EXISTS "Portal users can update own record" ON public.portal_users;

CREATE POLICY "Portal users can update own safe fields"
ON public.portal_users
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND portal_role IS NOT DISTINCT FROM (SELECT pu.portal_role FROM public.portal_users pu WHERE pu.user_id = auth.uid() LIMIT 1)
  AND client_id IS NOT DISTINCT FROM (SELECT pu.client_id FROM public.portal_users pu WHERE pu.user_id = auth.uid() LIMIT 1)
  AND tenant_id IS NOT DISTINCT FROM (SELECT pu.tenant_id FROM public.portal_users pu WHERE pu.user_id = auth.uid() LIMIT 1)
  AND status IS NOT DISTINCT FROM (SELECT pu.status FROM public.portal_users pu WHERE pu.user_id = auth.uid() LIMIT 1)
);
