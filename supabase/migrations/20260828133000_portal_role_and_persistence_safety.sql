-- Portal identity, persistence and document-isolation repair.
-- Staff and portal identities are deliberately separate security domains.

ALTER TABLE public.payroll_employees
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_payroll_employees_user
  ON public.payroll_employees(user_id)
  WHERE user_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.get_portal_tenant_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id
  FROM public.portal_users
  WHERE user_id = _user_id
    AND _user_id = auth.uid()
    AND status = 'active'
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.get_portal_client_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT client_id
  FROM public.portal_users
  WHERE user_id = _user_id
    AND _user_id = auth.uid()
    AND status = 'active'
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.get_portal_role(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT portal_role
  FROM public.portal_users
  WHERE user_id = _user_id
    AND _user_id = auth.uid()
    AND status = 'active'
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.get_portal_tenant_id(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_portal_client_id(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_portal_role(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_portal_tenant_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_portal_client_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_portal_role(uuid) TO authenticated;

-- The original self-update policy allowed a portal user to change their own
-- tenant, client and role columns. Portal profile fields will be updated only
-- through a narrow RPC when that UI is implemented.
DROP POLICY IF EXISTS "Portal users can update own record" ON public.portal_users;

CREATE OR REPLACE FUNCTION public.can_portal_view_pay_run(_run_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _user_id = auth.uid() AND EXISTS (
    SELECT 1
    FROM public.pay_runs run
    JOIN public.payroll_employers employer ON employer.id = run.employer_id
    JOIN public.portal_users portal ON portal.user_id = _user_id AND portal.status = 'active'
    WHERE run.id = _run_id
      AND run.tenant_id = portal.tenant_id
      AND (
        (portal.portal_role IN ('client_admin', 'client_user') AND employer.client_id = portal.client_id)
        OR (
          portal.portal_role = 'employee'
          AND EXISTS (
            SELECT 1
            FROM public.payslips payslip
            JOIN public.payroll_employees employee ON employee.id = payslip.employee_id
            WHERE payslip.pay_run_id = run.id AND employee.user_id = _user_id
          )
        )
      )
  )
$$;

CREATE OR REPLACE FUNCTION public.can_portal_view_payslip(_payslip_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _user_id = auth.uid() AND EXISTS (
    SELECT 1
    FROM public.payslips payslip
    JOIN public.pay_runs run ON run.id = payslip.pay_run_id
    JOIN public.payroll_employers employer ON employer.id = run.employer_id
    LEFT JOIN public.payroll_employees employee ON employee.id = payslip.employee_id
    JOIN public.portal_users portal ON portal.user_id = _user_id AND portal.status = 'active'
    WHERE payslip.id = _payslip_id
      AND payslip.tenant_id = portal.tenant_id
      AND (
        (portal.portal_role IN ('client_admin', 'client_user') AND employer.client_id = portal.client_id)
        OR (portal.portal_role = 'employee' AND employee.user_id = _user_id)
      )
  )
$$;

REVOKE ALL ON FUNCTION public.can_portal_view_pay_run(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_portal_view_payslip(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_portal_view_pay_run(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_portal_view_payslip(uuid, uuid) TO authenticated;

-- Portal sign-ups must not create a practice, profile or firm-owner grant.
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
  IF COALESCE(NEW.raw_user_meta_data->>'user_type', '') = 'portal' THEN
    RETURN NEW;
  END IF;

  firm := COALESCE(NULLIF(NEW.raw_user_meta_data->>'firm_name', ''), 'My Practice');
  INSERT INTO public.tenants (firm_name) VALUES (firm) RETURNING id INTO new_tenant_id;
  INSERT INTO public.profiles (id, tenant_id, full_name, email)
  VALUES (NEW.id, new_tenant_id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), NEW.email);
  INSERT INTO public.user_roles (user_id, tenant_id, role)
  VALUES (NEW.id, new_tenant_id, 'firm_owner');
  PERFORM public.seed_tenant(new_tenant_id);
  RETURN NEW;
END;
$$;

-- Only the signed-in identity may ask the login-routing function about itself.
CREATE OR REPLACE FUNCTION public.get_user_type(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'User type access denied';
  END IF;
  RETURN jsonb_build_object(
    'is_staff', EXISTS (SELECT 1 FROM profiles WHERE id = _user_id),
    'is_portal', EXISTS (SELECT 1 FROM portal_users WHERE user_id = _user_id AND status = 'active'),
    'staff_tenant_id', (SELECT tenant_id FROM profiles WHERE id = _user_id),
    'portal_tenant_id', (SELECT tenant_id FROM portal_users WHERE user_id = _user_id AND status = 'active' LIMIT 1),
    'portal_role', (SELECT portal_role FROM portal_users WHERE user_id = _user_id AND status = 'active' LIMIT 1),
    'staff_role', (SELECT role FROM user_roles WHERE user_id = _user_id LIMIT 1)
  );
END;
$$;

-- Client-scoped read/write policies. Existing tenant policies continue to
-- serve staff users; these policies add the narrower portal path.
CREATE POLICY "Portal can view linked client"
  ON public.clients FOR SELECT TO authenticated
  USING (
    public.get_portal_role(auth.uid()) IN ('client_admin', 'client_user')
    AND id = public.get_portal_client_id(auth.uid())
    AND tenant_id = public.get_portal_tenant_id(auth.uid())
  );

CREATE POLICY "Portal can view client tasks"
  ON public.tasks FOR SELECT TO authenticated
  USING (
    public.get_portal_role(auth.uid()) IN ('client_admin', 'client_user')
    AND client_id = public.get_portal_client_id(auth.uid())
    AND tenant_id = public.get_portal_tenant_id(auth.uid())
  );

CREATE POLICY "Portal can view client VAT returns"
  ON public.vat_returns FOR SELECT TO authenticated
  USING (
    public.get_portal_role(auth.uid()) IN ('client_admin', 'client_user')
    AND client_id = public.get_portal_client_id(auth.uid())
    AND tenant_id = public.get_portal_tenant_id(auth.uid())
  );

CREATE POLICY "Portal can view client invoices"
  ON public.invoices FOR SELECT TO authenticated
  USING (
    public.get_portal_role(auth.uid()) IN ('client_admin', 'client_user')
    AND client_id = public.get_portal_client_id(auth.uid())
    AND tenant_id = public.get_portal_tenant_id(auth.uid())
  );

CREATE POLICY "Portal can view client invoice lines"
  ON public.invoice_lines FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.invoices invoice
    WHERE invoice.id = invoice_id
      AND public.get_portal_role(auth.uid()) IN ('client_admin', 'client_user')
      AND invoice.client_id = public.get_portal_client_id(auth.uid())
      AND invoice.tenant_id = public.get_portal_tenant_id(auth.uid())
  ));

CREATE POLICY "Portal can view document requests"
  ON public.document_requests FOR SELECT TO authenticated
  USING (
    public.get_portal_role(auth.uid()) IN ('client_admin', 'client_user')
    AND client_id = public.get_portal_client_id(auth.uid())
    AND tenant_id = public.get_portal_tenant_id(auth.uid())
  );

CREATE POLICY "Portal can view client submissions"
  ON public.submission_jobs FOR SELECT TO authenticated
  USING (
    public.get_portal_role(auth.uid()) IN ('client_admin', 'client_user')
    AND client_id = public.get_portal_client_id(auth.uid())
    AND tenant_id = public.get_portal_tenant_id(auth.uid())
  );

CREATE POLICY "Portal can view client threads"
  ON public.message_threads FOR SELECT TO authenticated
  USING (
    public.get_portal_role(auth.uid()) IN ('client_admin', 'client_user')
    AND client_id = public.get_portal_client_id(auth.uid())
    AND tenant_id = public.get_portal_tenant_id(auth.uid())
  );

CREATE POLICY "Portal can create client threads"
  ON public.message_threads FOR INSERT TO authenticated
  WITH CHECK (
    public.get_portal_role(auth.uid()) IN ('client_admin', 'client_user')
    AND client_id = public.get_portal_client_id(auth.uid())
    AND tenant_id = public.get_portal_tenant_id(auth.uid())
    AND created_by_user_id = auth.uid()
  );

CREATE POLICY "Portal can view non-internal client messages"
  ON public.messages FOR SELECT TO authenticated
  USING (
    COALESCE(is_internal, false) = false
    AND EXISTS (
      SELECT 1 FROM public.message_threads thread
      WHERE thread.id = thread_id
        AND public.get_portal_role(auth.uid()) IN ('client_admin', 'client_user')
        AND thread.client_id = public.get_portal_client_id(auth.uid())
        AND thread.tenant_id = public.get_portal_tenant_id(auth.uid())
    )
  );

CREATE POLICY "Portal can send client messages"
  ON public.messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_user_id = auth.uid()
    AND sender_type = 'client'
    AND COALESCE(is_internal, false) = false
    AND tenant_id = public.get_portal_tenant_id(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.message_threads thread
      WHERE thread.id = thread_id
        AND thread.client_id = public.get_portal_client_id(auth.uid())
        AND thread.tenant_id = public.get_portal_tenant_id(auth.uid())
    )
  );

CREATE POLICY "Portal can view client documents"
  ON public.documents FOR SELECT TO authenticated
  USING (
    tenant_id = public.get_portal_tenant_id(auth.uid())
    AND (
      (
        public.get_portal_role(auth.uid()) IN ('client_admin', 'client_user')
        AND client_id = public.get_portal_client_id(auth.uid())
      )
      OR (
        public.get_portal_role(auth.uid()) = 'employee'
        AND EXISTS (
          SELECT 1
          FROM public.payslips payslip
          JOIN public.payroll_employees employee ON employee.id = payslip.employee_id
          WHERE payslip.document_id = documents.id
            AND employee.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Portal can upload client documents"
  ON public.documents FOR INSERT TO authenticated
  WITH CHECK (
    public.get_portal_role(auth.uid()) IN ('client_admin', 'client_user')
    AND tenant_id = public.get_portal_tenant_id(auth.uid())
    AND client_id = public.get_portal_client_id(auth.uid())
    AND uploaded_by_user_id = auth.uid()
    AND status = 'pending'
    AND document_type IN ('receipt','invoice','bank_statement','id_document','correspondence','other')
  );

CREATE POLICY "Portal can view client payroll employers"
  ON public.payroll_employers FOR SELECT TO authenticated
  USING (
    tenant_id = public.get_portal_tenant_id(auth.uid())
    AND (
      (
        public.get_portal_role(auth.uid()) IN ('client_admin', 'client_user')
        AND client_id = public.get_portal_client_id(auth.uid())
      )
      OR EXISTS (
        SELECT 1 FROM public.payroll_employees employee
        WHERE employee.employer_id = payroll_employers.id
          AND employee.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Employee can view own payroll record"
  ON public.payroll_employees FOR SELECT TO authenticated
  USING (
    public.get_portal_role(auth.uid()) = 'employee'
    AND user_id = auth.uid()
    AND tenant_id = public.get_portal_tenant_id(auth.uid())
  );

CREATE POLICY "Portal can view scoped pay runs"
  ON public.pay_runs FOR SELECT TO authenticated
  USING (public.can_portal_view_pay_run(id, auth.uid()));

CREATE POLICY "Portal can view scoped payslips"
  ON public.payslips FOR SELECT TO authenticated
  USING (public.can_portal_view_payslip(id, auth.uid()));

-- Replace bucket-wide authenticated access with tenant/client object checks.
DROP POLICY IF EXISTS "Authenticated users can upload to client-documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view client-documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update client-documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete client-documents" ON storage.objects;

UPDATE storage.buckets
SET file_size_limit = 20971520,
    allowed_mime_types = ARRAY[
      'application/pdf', 'image/jpeg', 'image/png', 'image/webp',
      'text/csv', 'application/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
WHERE id = 'client-documents';

CREATE POLICY "Scoped users can view client documents"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'client-documents'
    AND EXISTS (
      SELECT 1 FROM public.documents document
      WHERE document.storage_path = name
        AND (
          document.tenant_id = public.get_user_tenant_id(auth.uid())
          OR (
            document.tenant_id = public.get_portal_tenant_id(auth.uid())
            AND (
              (
                public.get_portal_role(auth.uid()) IN ('client_admin', 'client_user')
                AND document.client_id = public.get_portal_client_id(auth.uid())
              )
              OR EXISTS (
                SELECT 1
                FROM public.payslips payslip
                JOIN public.payroll_employees employee ON employee.id = payslip.employee_id
                WHERE payslip.document_id = document.id
                  AND employee.user_id = auth.uid()
              )
            )
          )
        )
    )
  );

CREATE POLICY "Scoped users can upload client documents"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'client-documents'
    AND (
      (storage.foldername(name))[1] = public.get_user_tenant_id(auth.uid())::text
      OR (
        public.get_portal_role(auth.uid()) IN ('client_admin', 'client_user')
        AND (storage.foldername(name))[1] = public.get_portal_tenant_id(auth.uid())::text
        AND (storage.foldername(name))[2] = public.get_portal_client_id(auth.uid())::text
      )
    )
  );

CREATE POLICY "Staff can update tenant client documents"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'client-documents'
    AND (storage.foldername(name))[1] = public.get_user_tenant_id(auth.uid())::text
  );

CREATE POLICY "Staff can delete tenant client documents"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'client-documents'
    AND (storage.foldername(name))[1] = public.get_user_tenant_id(auth.uid())::text
  );

-- Repair the supplied staging identities without deleting their old,
-- now-orphaned tenants. The client invitation's tenant is canonical because
-- it is the tenant that owns the staged client record.
DO $$
DECLARE
  canonical_tenant uuid;
  manager_id uuid;
  bookkeeper_id uuid;
  portal_id uuid;
BEGIN
  SELECT portal.tenant_id INTO canonical_tenant
  FROM auth.users account
  JOIN public.portal_users portal ON portal.user_id = account.id
  WHERE lower(account.email) = 'client@kitchen313.dev'
    AND portal.status = 'active'
  LIMIT 1;

  IF canonical_tenant IS NULL THEN
    SELECT profile.tenant_id INTO canonical_tenant
    FROM auth.users account
    JOIN public.profiles profile ON profile.id = account.id
    WHERE lower(account.email) = 'manager@taxlounge.dev'
    LIMIT 1;
  END IF;

  SELECT id INTO manager_id FROM auth.users WHERE lower(email) = 'manager@taxlounge.dev' LIMIT 1;
  SELECT id INTO bookkeeper_id FROM auth.users WHERE lower(email) = 'bookkeeper@taxlounge.dev' LIMIT 1;

  IF canonical_tenant IS NOT NULL AND manager_id IS NOT NULL THEN
    UPDATE public.profiles SET tenant_id = canonical_tenant WHERE id = manager_id;
    DELETE FROM public.user_roles WHERE user_id = manager_id;
    INSERT INTO public.user_roles(user_id, tenant_id, role)
    VALUES (manager_id, canonical_tenant, 'manager');
  END IF;

  IF canonical_tenant IS NOT NULL AND bookkeeper_id IS NOT NULL THEN
    UPDATE public.profiles SET tenant_id = canonical_tenant WHERE id = bookkeeper_id;
    DELETE FROM public.user_roles WHERE user_id = bookkeeper_id;
    INSERT INTO public.user_roles(user_id, tenant_id, role)
    VALUES (bookkeeper_id, canonical_tenant, 'staff');
  END IF;

  FOR portal_id IN
    SELECT id FROM auth.users
    WHERE lower(email) IN ('client@kitchen313.dev', 'employee@kitchen313.dev')
  LOOP
    UPDATE public.payroll_employees employee
    SET user_id = portal_id
    FROM public.portal_users portal, auth.users account
    WHERE portal.user_id = portal_id
      AND account.id = portal_id
      AND employee.tenant_id = portal.tenant_id
      AND lower(employee.email) = lower(account.email);

    DELETE FROM public.user_roles WHERE user_id = portal_id;
    DELETE FROM public.profiles WHERE id = portal_id;
  END LOOP;
END;
$$;

COMMENT ON COLUMN public.payroll_employees.user_id IS
  'Optional auth identity used to scope the employee payslip portal.';
