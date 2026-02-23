
-- Update handle_new_user to auto-create tenant and assign firm_owner role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_tenant_id uuid;
  firm text;
BEGIN
  firm := COALESCE(NEW.raw_user_meta_data->>'firm_name', 'My Practice');
  
  -- Create tenant for the new user
  INSERT INTO public.tenants (firm_name)
  VALUES (firm)
  RETURNING id INTO new_tenant_id;

  -- Create profile linked to tenant
  INSERT INTO public.profiles (id, tenant_id, full_name, email)
  VALUES (
    NEW.id,
    new_tenant_id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email
  );

  -- Assign firm_owner role
  INSERT INTO public.user_roles (user_id, tenant_id, role)
  VALUES (NEW.id, new_tenant_id, 'firm_owner');

  RETURN NEW;
END;
$$;
