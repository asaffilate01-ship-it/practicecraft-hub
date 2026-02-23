
-- Drop existing views first to avoid column rename conflict
DROP VIEW IF EXISTS v_secretarial_due CASCADE;
DROP VIEW IF EXISTS v_secretarial_changes_pending CASCADE;

-- Create secretarial_changes table
CREATE TABLE IF NOT EXISTS secretarial_changes (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id             UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  change_type           TEXT NOT NULL,
  status                TEXT NOT NULL DEFAULT 'draft',
  title                 TEXT NOT NULL,
  description           TEXT,
  payload_json          JSONB NOT NULL DEFAULT '{}'::jsonb,
  validation_json       JSONB NOT NULL DEFAULT '{}'::jsonb,
  requires_auth_code    BOOLEAN NOT NULL DEFAULT TRUE,
  approved_by_user_id   UUID,
  approved_at           TIMESTAMPTZ,
  submission_job_id     UUID REFERENCES submission_jobs(id) ON DELETE SET NULL,
  created_by_user_id    UUID,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE secretarial_changes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tenant secretarial changes"
  ON secretarial_changes FOR SELECT
  USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can insert tenant secretarial changes"
  ON secretarial_changes FOR INSERT
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can update tenant secretarial changes"
  ON secretarial_changes FOR UPDATE
  USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can delete tenant secretarial changes"
  ON secretarial_changes FOR DELETE
  USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_secretarial_changes_tenant_status
  ON secretarial_changes(tenant_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_secretarial_changes_tenant_client
  ON secretarial_changes(tenant_id, client_id);

-- Recreate views using secretarial_changes
CREATE OR REPLACE VIEW v_secretarial_due WITH (security_invoker = true) AS
SELECT
  c.tenant_id,
  c.id AS client_id,
  c.legal_name AS client_legal_name,
  cp.company_number,
  cp.company_status,
  cp.last_synced_at AS ch_last_synced_at,
  (SELECT MIN(cs.due_date) FROM confirmation_statement_cycles cs 
   WHERE cs.tenant_id = c.tenant_id AND cs.client_id = c.id 
   AND cs.status IN ('upcoming','in_progress')) AS next_confirmation_statement_due,
  (SELECT COUNT(*) FROM secretarial_changes sc 
   WHERE sc.tenant_id = c.tenant_id AND sc.client_id = c.id 
   AND sc.status IN ('draft','awaiting_approval','ready_to_file','rejected'))::int AS open_secretarial_changes
FROM clients c
LEFT JOIN company_profiles cp ON cp.tenant_id = c.tenant_id AND cp.client_id = c.id
WHERE c.entity_type = 'ltd';

CREATE OR REPLACE VIEW v_secretarial_changes_pending WITH (security_invoker = true) AS
SELECT
  sc.tenant_id,
  sc.id AS change_id,
  sc.client_id,
  c.legal_name AS client_legal_name,
  sc.change_type,
  sc.status,
  sc.title,
  sc.requires_auth_code,
  sc.updated_at
FROM secretarial_changes sc
JOIN clients c ON c.id = sc.client_id AND c.tenant_id = sc.tenant_id
WHERE sc.status IN ('draft','awaiting_approval','ready_to_file','rejected');

-- share_transactions RLS
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'share_transactions' AND policyname = 'Users can view tenant share txns') THEN
    ALTER TABLE share_transactions ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Users can view tenant share txns"
      ON share_transactions FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));
    CREATE POLICY "Users can insert tenant share txns"
      ON share_transactions FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
    CREATE POLICY "Users can update tenant share txns"
      ON share_transactions FOR UPDATE USING (tenant_id = get_user_tenant_id(auth.uid()));
    CREATE POLICY "Users can delete tenant share txns"
      ON share_transactions FOR DELETE USING (tenant_id = get_user_tenant_id(auth.uid()));
  END IF;
END $$;
