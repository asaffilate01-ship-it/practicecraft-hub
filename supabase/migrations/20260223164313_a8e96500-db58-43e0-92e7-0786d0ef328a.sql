
-- Template versions (audit trail for email template changes)
CREATE TABLE IF NOT EXISTS template_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  template_type TEXT NOT NULL DEFAULT 'email',
  template_key TEXT NOT NULL,
  version INT NOT NULL,
  subject TEXT,
  body_html TEXT,
  body_text TEXT,
  variables_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by_user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, template_type, template_key, version)
);

CREATE INDEX IF NOT EXISTS idx_template_versions_tenant_key
ON template_versions(tenant_id, template_key, version DESC);

ALTER TABLE template_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tenant template versions"
ON template_versions FOR SELECT
USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can insert tenant template versions"
ON template_versions FOR INSERT
WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

-- Template variable whitelist (security: controls which vars are allowed)
CREATE TABLE IF NOT EXISTS template_variable_whitelist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  template_type TEXT NOT NULL DEFAULT 'email',
  key TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, template_type, key)
);

ALTER TABLE template_variable_whitelist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tenant variable whitelist"
ON template_variable_whitelist FOR SELECT
USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can manage tenant variable whitelist"
ON template_variable_whitelist FOR ALL
USING (tenant_id = get_user_tenant_id(auth.uid()))
WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

-- Documents table (for portal uploads, receipt scans, etc.)
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  uploaded_by_user_id UUID,
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL DEFAULT 0,
  storage_path TEXT NOT NULL,
  document_type TEXT NOT NULL DEFAULT 'other',
  status TEXT NOT NULL DEFAULT 'pending',
  tags TEXT[] DEFAULT '{}',
  ocr_text TEXT,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_documents_tenant_client ON documents(tenant_id, client_id, created_at DESC);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tenant documents"
ON documents FOR SELECT
USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can insert tenant documents"
ON documents FOR INSERT
WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can update tenant documents"
ON documents FOR UPDATE
USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can delete tenant documents"
ON documents FOR DELETE
USING (tenant_id = get_user_tenant_id(auth.uid()));

-- Message threads (portal messaging between client and staff)
CREATE TABLE IF NOT EXISTS message_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_message_threads_tenant_client ON message_threads(tenant_id, client_id, last_message_at DESC);

ALTER TABLE message_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tenant message threads"
ON message_threads FOR SELECT
USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can insert tenant message threads"
ON message_threads FOR INSERT
WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can update tenant message threads"
ON message_threads FOR UPDATE
USING (tenant_id = get_user_tenant_id(auth.uid()));

-- Messages within threads
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES message_threads(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL DEFAULT 'staff',
  sender_user_id UUID,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_thread ON messages(thread_id, created_at);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tenant messages"
ON messages FOR SELECT
USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can insert tenant messages"
ON messages FOR INSERT
WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

-- Mobile push tokens
CREATE TABLE IF NOT EXISTS push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  platform TEXT NOT NULL,
  token TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, user_id, platform, token)
);

ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own push tokens"
ON push_tokens FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Seed default template variable whitelist into seed_templates_and_automations
-- We'll add baseline whitelist entries via a helper insert in the seed function
-- For now, create a function to seed whitelist for a tenant
CREATE OR REPLACE FUNCTION seed_template_whitelist(p_tenant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO template_variable_whitelist (tenant_id, template_type, key, description) VALUES
    (p_tenant_id, 'email', 'tenant.firm_name', 'Practice firm name'),
    (p_tenant_id, 'email', 'tenant.support_email', 'Practice support email'),
    (p_tenant_id, 'email', 'client.legal_name', 'Client legal name'),
    (p_tenant_id, 'email', 'client.trading_name', 'Client trading name'),
    (p_tenant_id, 'email', 'client.contact_name', 'Client primary contact'),
    (p_tenant_id, 'email', 'task.title', 'Task title'),
    (p_tenant_id, 'email', 'task.due_date', 'Task due date'),
    (p_tenant_id, 'email', 'vat.period', 'VAT period description'),
    (p_tenant_id, 'email', 'vat.due_date', 'VAT due date'),
    (p_tenant_id, 'email', 'payroll.period', 'Payroll period'),
    (p_tenant_id, 'email', 'invoice.number', 'Invoice number'),
    (p_tenant_id, 'email', 'invoice.total_gbp', 'Invoice total (GBP)'),
    (p_tenant_id, 'email', 'invoice.pay_url', 'Invoice payment URL'),
    (p_tenant_id, 'email', 'hmrc.receipt_id', 'HMRC submission receipt'),
    (p_tenant_id, 'email', 'portal.login_url', 'Client portal login URL')
  ON CONFLICT (tenant_id, template_type, key) DO NOTHING;
END;
$$;
