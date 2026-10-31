-- TaxLounge: server-authoritative bank permissions and row lineage.
-- The previous FOR ALL policies allowed any tenant member to edit financial data.
-- This migration refuses inconsistent legacy bank links; do not silently repair data.

CREATE OR REPLACE FUNCTION public.taxlounge_bank_permission(p_tenant_id uuid, p_action text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public, pg_temp
AS $$
 SELECT
   (SELECT auth.uid()) IS NOT NULL
   AND p_action IN ('view','edit')
   AND p_tenant_id = public.get_user_tenant_id((SELECT auth.uid()))
   AND EXISTS (
     SELECT 1
     FROM public.user_roles ur
     LEFT JOIN public.roles r
       ON r.tenant_id = ur.tenant_id
      AND r.name = CASE ur.role::text
        WHEN 'firm_owner' THEN 'Firm Owner'
        WHEN 'super_admin' THEN 'Firm Owner'
        WHEN 'manager' THEN 'Manager'
        WHEN 'staff' THEN 'Staff Accountant'
        WHEN 'payroll_officer' THEN 'Payroll Officer'
        ELSE '' END
     WHERE ur.user_id = (SELECT auth.uid())
       AND ur.tenant_id = p_tenant_id
       AND ur.role::text IN ('super_admin','firm_owner','manager','staff','payroll_officer')
       AND (
         ur.role::text IN ('super_admin','firm_owner')
         OR coalesce((r.permissions_json -> 'ledger' ->> p_action)::boolean, false)
       )
   );
$$;
REVOKE ALL ON FUNCTION public.taxlounge_bank_permission(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.taxlounge_bank_permission(uuid, text) TO authenticated;

-- Composite keys enforce client + tenant ownership in the database, not just React.
-- They do not change existing ids or reassign any financial records.
CREATE UNIQUE INDEX IF NOT EXISTS taxlounge_clients_tenant_id_id_idx
  ON public.clients(tenant_id, id);
CREATE UNIQUE INDEX IF NOT EXISTS taxlounge_accounts_tenant_id_id_idx
  ON public.chart_of_accounts(tenant_id, id);
CREATE UNIQUE INDEX IF NOT EXISTS taxlounge_bank_connections_tenant_client_id_idx
  ON public.bank_connections(tenant_id, client_id, id);

ALTER TABLE public.bank_connections
  ADD CONSTRAINT taxlounge_bank_connections_client_fk
  FOREIGN KEY (tenant_id, client_id) REFERENCES public.clients(tenant_id, id)
  ON DELETE CASCADE NOT VALID;
ALTER TABLE public.bank_connections
  ADD CONSTRAINT taxlounge_bank_connections_account_fk
  FOREIGN KEY (tenant_id, ledger_account_id) REFERENCES public.chart_of_accounts(tenant_id, id)
  ON DELETE SET NULL (ledger_account_id) NOT VALID;

ALTER TABLE public.bank_transactions
  ADD CONSTRAINT taxlounge_bank_transactions_connection_fk
  FOREIGN KEY (tenant_id, client_id, bank_connection_id)
  REFERENCES public.bank_connections(tenant_id, client_id, id)
  ON DELETE CASCADE NOT VALID;
ALTER TABLE public.bank_transactions
  ADD CONSTRAINT taxlounge_bank_transactions_suggested_account_fk
  FOREIGN KEY (tenant_id, suggested_account_id)
  REFERENCES public.chart_of_accounts(tenant_id, id)
  ON DELETE SET NULL (suggested_account_id) NOT VALID;
ALTER TABLE public.bank_transactions
  ADD CONSTRAINT taxlounge_bank_transactions_confirmed_account_fk
  FOREIGN KEY (tenant_id, confirmed_account_id)
  REFERENCES public.chart_of_accounts(tenant_id, id)
  ON DELETE SET NULL (confirmed_account_id) NOT VALID;

-- Validation deliberately fails deployment if legacy rows contain conflicting links.
-- Inspect and reconcile such records on staging first, never cross-migrate them.
ALTER TABLE public.bank_connections VALIDATE CONSTRAINT taxlounge_bank_connections_client_fk;
ALTER TABLE public.bank_connections VALIDATE CONSTRAINT taxlounge_bank_connections_account_fk;
ALTER TABLE public.bank_transactions VALIDATE CONSTRAINT taxlounge_bank_transactions_connection_fk;
ALTER TABLE public.bank_transactions VALIDATE CONSTRAINT taxlounge_bank_transactions_suggested_account_fk;
ALTER TABLE public.bank_transactions VALIDATE CONSTRAINT taxlounge_bank_transactions_confirmed_account_fk;

-- Financial identity is immutable once created. Posted lines cannot be modified
-- through ordinary API updates; only the guarded server-owned posting function
-- may move an unposted transaction to the posted state.
CREATE OR REPLACE FUNCTION public.taxlounge_guard_bank_record()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $$
BEGIN
 IF TG_TABLE_NAME = 'bank_connections' THEN
   IF TG_OP = 'UPDATE' AND (
     NEW.tenant_id IS DISTINCT FROM OLD.tenant_id OR
     NEW.client_id IS DISTINCT FROM OLD.client_id OR
     NEW.provider IS DISTINCT FROM OLD.provider
   ) THEN
     RAISE EXCEPTION 'Bank connection identity and provider are immutable' USING ERRCODE = '42501';
   END IF;
   RETURN NEW;
 END IF;

 IF TG_OP = 'INSERT' THEN
   IF NEW.categorisation_status = 'posted' OR NEW.journal_entry_id IS NOT NULL THEN
     RAISE EXCEPTION 'Create a draft transaction; posting requires approval' USING ERRCODE = '42501';
   END IF;
 ELSE
   IF NEW.tenant_id IS DISTINCT FROM OLD.tenant_id OR
      NEW.client_id IS DISTINCT FROM OLD.client_id OR
      NEW.bank_connection_id IS DISTINCT FROM OLD.bank_connection_id THEN
     RAISE EXCEPTION 'Bank transaction identity is immutable' USING ERRCODE = '42501';
   END IF;
   IF OLD.categorisation_status = 'posted' OR OLD.journal_entry_id IS NOT NULL THEN
     RAISE EXCEPTION 'Posted bank transactions are immutable' USING ERRCODE = '42501';
   END IF;
   IF (NEW.categorisation_status = 'posted' OR NEW.journal_entry_id IS NOT NULL)
      AND CURRENT_USER <> 'postgres' THEN
     RAISE EXCEPTION 'Only the authorised posting function can mark a transaction posted' USING ERRCODE = '42501';
   END IF;
 END IF;
 RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.taxlounge_guard_bank_record() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER taxlounge_bank_connections_identity_guard
 BEFORE UPDATE ON public.bank_connections FOR EACH ROW
 EXECUTE FUNCTION public.taxlounge_guard_bank_record();
CREATE TRIGGER taxlounge_bank_transactions_identity_guard
 BEFORE INSERT OR UPDATE ON public.bank_transactions FOR EACH ROW
 EXECUTE FUNCTION public.taxlounge_guard_bank_record();

DROP POLICY IF EXISTS "Tenant isolation for bank_connections" ON public.bank_connections;
DROP POLICY IF EXISTS "Tenant isolation for bank_transactions" ON public.bank_transactions;
ALTER TABLE public.bank_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.bank_connections, public.bank_transactions FROM anon;
REVOKE DELETE ON public.bank_connections, public.bank_transactions FROM authenticated;
GRANT SELECT, INSERT, UPDATE ON public.bank_connections, public.bank_transactions TO authenticated;

CREATE POLICY "TaxLounge staff view authorised bank connections"
 ON public.bank_connections FOR SELECT TO authenticated
 USING (public.taxlounge_bank_permission(tenant_id, 'view'));
CREATE POLICY "TaxLounge staff create manual bank connections"
 ON public.bank_connections FOR INSERT TO authenticated
 WITH CHECK (
   public.taxlounge_bank_permission(tenant_id, 'edit')
   AND provider = 'manual'
   AND EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_id AND c.tenant_id = tenant_id)
 );
CREATE POLICY "TaxLounge staff edit manual bank connections"
 ON public.bank_connections FOR UPDATE TO authenticated
 USING (provider = 'manual' AND public.taxlounge_bank_permission(tenant_id, 'edit'))
 WITH CHECK (
   provider = 'manual' AND public.taxlounge_bank_permission(tenant_id, 'edit')
   AND EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_id AND c.tenant_id = tenant_id)
 );

CREATE POLICY "TaxLounge staff view authorised bank transactions"
 ON public.bank_transactions FOR SELECT TO authenticated
 USING (public.taxlounge_bank_permission(tenant_id, 'view'));
CREATE POLICY "TaxLounge staff import manual bank transactions"
 ON public.bank_transactions FOR INSERT TO authenticated
 WITH CHECK (
   public.taxlounge_bank_permission(tenant_id, 'edit')
   AND EXISTS (
     SELECT 1 FROM public.bank_connections bc
     WHERE bc.id = bank_connection_id AND bc.tenant_id = tenant_id
       AND bc.client_id = client_id AND bc.provider = 'manual'
   )
 );
CREATE POLICY "TaxLounge staff edit unposted manual bank transactions"
 ON public.bank_transactions FOR UPDATE TO authenticated
 USING (
   categorisation_status <> 'posted'
   AND public.taxlounge_bank_permission(tenant_id, 'edit')
   AND EXISTS (
     SELECT 1 FROM public.bank_connections bc
     WHERE bc.id = bank_connection_id AND bc.tenant_id = tenant_id
       AND bc.client_id = client_id AND bc.provider = 'manual'
   )
 )
 WITH CHECK (
   public.taxlounge_bank_permission(tenant_id, 'edit')
   AND EXISTS (
     SELECT 1 FROM public.bank_connections bc
     WHERE bc.id = bank_connection_id AND bc.tenant_id = tenant_id
       AND bc.client_id = client_id AND bc.provider = 'manual'
   )
 );

-- The only route which can move a transaction to 'posted' is a fully scoped,
-- authorisation-checked, idempotent journal-posting function.
CREATE OR REPLACE FUNCTION public.post_bank_transaction(p_transaction_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_tenant_id uuid := public.get_user_tenant_id(auth.uid());
  v_transaction public.bank_transactions%ROWTYPE;
  v_bank_account_id uuid;
  v_journal_id uuid;
  v_amount numeric(15,2);
BEGIN
  IF auth.uid() IS NULL OR v_tenant_id IS NULL
     OR NOT public.taxlounge_bank_permission(v_tenant_id, 'edit') THEN
    RAISE EXCEPTION 'Ledger edit permission required' USING ERRCODE = '42501';
  END IF;

  SELECT bt.* INTO v_transaction
  FROM public.bank_transactions bt
  WHERE bt.id = p_transaction_id AND bt.tenant_id = v_tenant_id
  FOR UPDATE;
  IF v_transaction.id IS NULL THEN
    RAISE EXCEPTION 'Bank transaction unavailable' USING ERRCODE = '42501';
  END IF;
  IF v_transaction.categorisation_status = 'posted' AND v_transaction.journal_entry_id IS NOT NULL THEN
    RETURN v_transaction.journal_entry_id;
  END IF;
  IF v_transaction.categorisation_status <> 'confirmed' OR v_transaction.confirmed_account_id IS NULL
     OR v_transaction.journal_entry_id IS NOT NULL THEN
    RAISE EXCEPTION 'The transaction must have a confirmed category and no existing journal';
  END IF;

  SELECT bc.ledger_account_id INTO v_bank_account_id
  FROM public.bank_connections bc
  JOIN public.chart_of_accounts bank_coa
    ON bank_coa.id = bc.ledger_account_id AND bank_coa.tenant_id = bc.tenant_id
  WHERE bc.id = v_transaction.bank_connection_id
    AND bc.tenant_id = v_tenant_id
    AND bc.client_id = v_transaction.client_id
    AND bc.provider = 'manual'
  FOR SHARE OF bc;
  IF v_bank_account_id IS NULL THEN
    RAISE EXCEPTION 'A matching manual bank connection with ledger mapping is required';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.chart_of_accounts category
    WHERE category.id = v_transaction.confirmed_account_id AND category.tenant_id = v_tenant_id
  ) THEN
    RAISE EXCEPTION 'Confirmed account must belong to this practice';
  END IF;
  IF v_bank_account_id = v_transaction.confirmed_account_id THEN
    RAISE EXCEPTION 'The category and bank control account cannot be the same';
  END IF;

  v_amount := round(abs(v_transaction.amount_pence)::numeric / 100, 2);
  IF v_amount <= 0 THEN RAISE EXCEPTION 'A zero value transaction cannot be posted'; END IF;

  INSERT INTO public.journal_entries (
    tenant_id, client_id, entry_date, reference, narration, is_posted, created_by
  ) VALUES (
    v_transaction.tenant_id, v_transaction.client_id, v_transaction.transaction_date,
    'BF-' || left(v_transaction.id::text,8), v_transaction.description, false, auth.uid()
  ) RETURNING id INTO v_journal_id;

  IF v_transaction.amount_pence >= 0 THEN
    INSERT INTO public.journal_lines (journal_entry_id, account_id, debit, credit, description)
    VALUES
      (v_journal_id, v_bank_account_id, v_amount, 0, v_transaction.description),
      (v_journal_id, v_transaction.confirmed_account_id, 0, v_amount, v_transaction.description);
  ELSE
    INSERT INTO public.journal_lines (journal_entry_id, account_id, debit, credit, description)
    VALUES
      (v_journal_id, v_transaction.confirmed_account_id, v_amount, 0, v_transaction.description),
      (v_journal_id, v_bank_account_id, 0, v_amount, v_transaction.description);
  END IF;

  UPDATE public.journal_entries SET is_posted = true WHERE id = v_journal_id;
  UPDATE public.bank_transactions
    SET categorisation_status = 'posted', journal_entry_id = v_journal_id
    WHERE id = v_transaction.id AND tenant_id = v_tenant_id;

  INSERT INTO public.event_logs (tenant_id, client_id, actor_user_id, event_type, source, payload_json)
  VALUES (
    v_transaction.tenant_id, v_transaction.client_id, auth.uid(),
    'bank_transaction.posted', 'taxlounge_bank_feeds',
    jsonb_build_object('transaction_id', v_transaction.id, 'journal_id', v_journal_id)
  );
  RETURN v_journal_id;
END;
$$;
REVOKE ALL ON FUNCTION public.post_bank_transaction(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.post_bank_transaction(uuid) TO authenticated;
