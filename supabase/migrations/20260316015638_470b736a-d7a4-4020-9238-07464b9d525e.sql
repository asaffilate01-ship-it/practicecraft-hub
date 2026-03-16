
-- Fix: Restrict profiles INSERT to only allow tenant_id from handle_new_user trigger
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid() AND tenant_id = get_user_tenant_id(auth.uid()));

-- Fix: Restrict profiles UPDATE to prevent tenant_id changes
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid() AND tenant_id = get_user_tenant_id(auth.uid()));

-- Ensure the trigger also exists as a safety net
DROP TRIGGER IF EXISTS trg_profiles_prevent_tenant_change ON public.profiles;
CREATE TRIGGER trg_profiles_prevent_tenant_change
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_tenant_id_change();
