
-- ============================================================
-- MESSAGING ENHANCEMENTS: add missing columns + new tables
-- ============================================================

-- Add missing columns to message_threads
ALTER TABLE message_threads
  ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS created_by_user_id UUID,
  ADD COLUMN IF NOT EXISTS last_message_id UUID,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Add missing columns to messages
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS body_html TEXT,
  ADD COLUMN IF NOT EXISTS is_internal BOOLEAN NOT NULL DEFAULT FALSE;

-- Message attachments (links messages to documents)
CREATE TABLE IF NOT EXISTS message_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(message_id, document_id)
);

ALTER TABLE message_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tenant message attachments"
ON message_attachments FOR SELECT
USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can insert tenant message attachments"
ON message_attachments FOR INSERT
WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can delete tenant message attachments"
ON message_attachments FOR DELETE
USING (tenant_id = get_user_tenant_id(auth.uid()));

-- Thread participants
CREATE TABLE IF NOT EXISTS message_thread_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  thread_id UUID NOT NULL REFERENCES message_threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'participant',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(thread_id, user_id)
);

ALTER TABLE message_thread_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tenant thread participants"
ON message_thread_participants FOR SELECT
USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can manage tenant thread participants"
ON message_thread_participants FOR ALL
USING (tenant_id = get_user_tenant_id(auth.uid()))
WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

-- Thread assignments
CREATE TABLE IF NOT EXISTS message_thread_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  thread_id UUID NOT NULL REFERENCES message_threads(id) ON DELETE CASCADE,
  assigned_to_user_id UUID,
  assigned_by_user_id UUID,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(thread_id)
);

ALTER TABLE message_thread_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tenant thread assignments"
ON message_thread_assignments FOR SELECT
USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can manage tenant thread assignments"
ON message_thread_assignments FOR ALL
USING (tenant_id = get_user_tenant_id(auth.uid()))
WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

-- Trigger: update thread last_message_at on new message
CREATE OR REPLACE FUNCTION trg_messages_update_thread_last()
RETURNS trigger AS $$
BEGIN
  UPDATE message_threads
    SET last_message_at = NEW.created_at,
        last_message_id = NEW.id,
        updated_at = now()
  WHERE id = NEW.thread_id AND tenant_id = NEW.tenant_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path TO 'public';

CREATE TRIGGER messages_after_insert_update_thread
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION trg_messages_update_thread_last();

-- ============================================================
-- OCR PIPELINE: jobs, extractions, ledger suggestions
-- ============================================================

CREATE TABLE IF NOT EXISTS ocr_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'queued',
  provider TEXT NOT NULL DEFAULT 'lovable_ai',
  request_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  result_json JSONB,
  attempt_count INT NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ocr_jobs_tenant_status
ON ocr_jobs(tenant_id, status, created_at DESC);

ALTER TABLE ocr_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tenant ocr jobs"
ON ocr_jobs FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can insert tenant ocr jobs"
ON ocr_jobs FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can update tenant ocr jobs"
ON ocr_jobs FOR UPDATE USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE TABLE IF NOT EXISTS receipt_extractions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  supplier_name TEXT,
  supplier_vat_number TEXT,
  invoice_number TEXT,
  receipt_date DATE,
  currency TEXT DEFAULT 'GBP',
  total_gross_pence BIGINT,
  total_vat_pence BIGINT,
  total_net_pence BIGINT,
  confidence NUMERIC(5,2) DEFAULT 0,
  raw_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, document_id)
);

ALTER TABLE receipt_extractions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tenant receipt extractions"
ON receipt_extractions FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can insert tenant receipt extractions"
ON receipt_extractions FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can update tenant receipt extractions"
ON receipt_extractions FOR UPDATE USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE TABLE IF NOT EXISTS ledger_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  extraction_id UUID REFERENCES receipt_extractions(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'suggested',
  suggested_by TEXT NOT NULL DEFAULT 'ocr',
  lines_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  approved_by_user_id UUID,
  approved_at TIMESTAMPTZ,
  posted_journal_id UUID REFERENCES journal_entries(id) ON DELETE SET NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ledger_suggestions_tenant_status
ON ledger_suggestions(tenant_id, status, created_at DESC);

ALTER TABLE ledger_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tenant ledger suggestions"
ON ledger_suggestions FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can insert tenant ledger suggestions"
ON ledger_suggestions FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can update tenant ledger suggestions"
ON ledger_suggestions FOR UPDATE USING (tenant_id = get_user_tenant_id(auth.uid()));

-- ============================================================
-- CLIENT ONBOARDING WIZARD
-- ============================================================

CREATE TABLE IF NOT EXISTS onboarding_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  entity_type TEXT NOT NULL,
  checklist_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  data_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by_user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_onboarding_cases_tenant_status
ON onboarding_cases(tenant_id, status, updated_at DESC);

ALTER TABLE onboarding_cases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tenant onboarding cases"
ON onboarding_cases FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can insert tenant onboarding cases"
ON onboarding_cases FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can update tenant onboarding cases"
ON onboarding_cases FOR UPDATE USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can delete tenant onboarding cases"
ON onboarding_cases FOR DELETE USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE TABLE IF NOT EXISTS onboarding_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  onboarding_case_id UUID NOT NULL REFERENCES onboarding_cases(id) ON DELETE CASCADE,
  step_key TEXT NOT NULL,
  step_status TEXT NOT NULL DEFAULT 'todo',
  required BOOLEAN NOT NULL DEFAULT TRUE,
  data_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(onboarding_case_id, step_key)
);

ALTER TABLE onboarding_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tenant onboarding steps"
ON onboarding_steps FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can insert tenant onboarding steps"
ON onboarding_steps FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can update tenant onboarding steps"
ON onboarding_steps FOR UPDATE USING (tenant_id = get_user_tenant_id(auth.uid()));

-- ============================================================
-- VIEWS
-- ============================================================

CREATE OR REPLACE VIEW v_threads_needing_attention
WITH (security_invoker = true) AS
SELECT
  mt.tenant_id,
  mt.id AS thread_id,
  mt.client_id,
  c.legal_name AS client_legal_name,
  mt.subject,
  mt.status,
  mt.priority,
  mt.last_message_at,
  m.sender_type AS last_sender_type
FROM message_threads mt
LEFT JOIN clients c ON c.id = mt.client_id AND c.tenant_id = mt.tenant_id
LEFT JOIN messages m ON m.id = mt.last_message_id
WHERE
  mt.status = 'open'
  AND mt.last_message_at >= now() - INTERVAL '90 day'
  AND (m.sender_type = 'client' OR m.sender_type IS NULL);
