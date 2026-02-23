
-- Portal users table: links auth.users to client entities for portal access
CREATE TABLE public.portal_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  portal_role text NOT NULL DEFAULT 'client_user' CHECK (portal_role IN ('client_admin','client_user','employee')),
  display_name text NOT NULL DEFAULT '',
  phone text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','pending_approval')),
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, tenant_id)
);

ALTER TABLE public.portal_users ENABLE ROW LEVEL SECURITY;

-- Portal users can read their own record
CREATE POLICY "Portal users can view own record"
  ON public.portal_users FOR SELECT
  USING (auth.uid() = user_id);

-- Portal users can update own record (limited fields)
CREATE POLICY "Portal users can update own record"
  ON public.portal_users FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Staff can manage portal users in their tenant
CREATE POLICY "Staff can view portal users in tenant"
  ON public.portal_users FOR SELECT
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Staff can insert portal users in tenant"
  ON public.portal_users FOR INSERT
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Staff can update portal users in tenant"
  ON public.portal_users FOR UPDATE
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Staff can delete portal users in tenant"
  ON public.portal_users FOR DELETE
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_portal_users_updated_at
  BEFORE UPDATE ON public.portal_users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Portal invitations table
CREATE TABLE public.portal_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  email text NOT NULL,
  portal_role text NOT NULL DEFAULT 'client_user' CHECK (portal_role IN ('client_admin','client_user','employee')),
  invited_by uuid REFERENCES auth.users(id),
  token text NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','expired','cancelled')),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '7 days',
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.portal_invitations ENABLE ROW LEVEL SECURITY;

-- Staff can manage invitations in their tenant
CREATE POLICY "Staff can manage invitations"
  ON public.portal_invitations FOR ALL
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

-- Anyone can read invitation by token (for accepting) — handled via edge function, not direct access

-- Helper function: detect user type for login redirect
CREATE OR REPLACE FUNCTION public.get_user_type(_user_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT jsonb_build_object(
    'is_staff', EXISTS (SELECT 1 FROM profiles WHERE id = _user_id),
    'is_portal', EXISTS (SELECT 1 FROM portal_users WHERE user_id = _user_id AND status = 'active'),
    'staff_tenant_id', (SELECT tenant_id FROM profiles WHERE id = _user_id),
    'portal_tenant_id', (SELECT tenant_id FROM portal_users WHERE user_id = _user_id AND status = 'active' LIMIT 1),
    'portal_role', (SELECT portal_role FROM portal_users WHERE user_id = _user_id AND status = 'active' LIMIT 1),
    'staff_role', (SELECT role FROM user_roles WHERE user_id = _user_id LIMIT 1)
  );
$$;
