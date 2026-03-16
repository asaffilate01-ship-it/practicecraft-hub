
-- CRITICAL: Prevent users from changing their own tenant_id
CREATE OR REPLACE FUNCTION public.prevent_tenant_id_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.tenant_id IS DISTINCT FROM OLD.tenant_id THEN
    RAISE EXCEPTION 'Changing tenant_id is not allowed';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profiles_prevent_tenant_change
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_tenant_id_change();
