
-- ============================================================
-- ENUMS
-- ============================================================
DO $$ BEGIN
  CREATE TYPE integration_provider AS ENUM ('hmrc', 'companies_house', 'charity_commission', 'open_banking', 'stripe', 'gocardless');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE submission_status AS ENUM ('draft', 'queued', 'sent', 'accepted', 'rejected', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- EMAIL TEMPLATES
-- ============================================================
CREATE TABLE IF NOT EXISTS email_templates (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  key            TEXT NOT NULL,
  name           TEXT NOT NULL,
  subject        TEXT NOT NULL,
  body_html      TEXT NOT NULL,
  body_text       TEXT,
  variables_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active      BOOLEAN DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, key)
);

ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tenant email templates" ON email_templates FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can insert tenant email templates" ON email_templates FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can update tenant email templates" ON email_templates FOR UPDATE USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can delete tenant email templates" ON email_templates FOR DELETE USING (tenant_id = get_user_tenant_id(auth.uid()));

-- ============================================================
-- INVOICE TEMPLATES
-- ============================================================
CREATE TABLE IF NOT EXISTS invoice_templates (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  key          TEXT NOT NULL,
  name         TEXT NOT NULL,
  layout_json  JSONB NOT NULL DEFAULT '{}'::jsonb,
  terms_text   TEXT,
  footer_text  TEXT,
  is_default   BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, key)
);

ALTER TABLE invoice_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tenant invoice templates" ON invoice_templates FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can insert tenant invoice templates" ON invoice_templates FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can update tenant invoice templates" ON invoice_templates FOR UPDATE USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can delete tenant invoice templates" ON invoice_templates FOR DELETE USING (tenant_id = get_user_tenant_id(auth.uid()));

-- ============================================================
-- DOCUMENT TAGS
-- ============================================================
CREATE TABLE IF NOT EXISTS document_tags (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  color      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, name)
);

ALTER TABLE document_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tenant document tags" ON document_tags FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can insert tenant document tags" ON document_tags FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can update tenant document tags" ON document_tags FOR UPDATE USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can delete tenant document tags" ON document_tags FOR DELETE USING (tenant_id = get_user_tenant_id(auth.uid()));

-- ============================================================
-- AUTOMATION RULES
-- ============================================================
CREATE TABLE IF NOT EXISTS automation_rules (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name                 TEXT NOT NULL,
  is_enabled           BOOLEAN DEFAULT TRUE,
  trigger_type         TEXT NOT NULL,
  trigger_filter_json  JSONB NOT NULL DEFAULT '{}'::jsonb,
  action_type          TEXT NOT NULL,
  action_payload_json  JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_automation_rules_tenant_trigger ON automation_rules(tenant_id, trigger_type);

ALTER TABLE automation_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tenant automation rules" ON automation_rules FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can insert tenant automation rules" ON automation_rules FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can update tenant automation rules" ON automation_rules FOR UPDATE USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can delete tenant automation rules" ON automation_rules FOR DELETE USING (tenant_id = get_user_tenant_id(auth.uid()));

-- ============================================================
-- NOTIFICATION RULES
-- ============================================================
CREATE TABLE IF NOT EXISTS notification_rules (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  is_enabled       BOOLEAN DEFAULT TRUE,
  channel          TEXT NOT NULL,
  template_key     TEXT,
  days_before_due  INT NOT NULL DEFAULT 7,
  applies_to_json  JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, name)
);

ALTER TABLE notification_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tenant notification rules" ON notification_rules FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can insert tenant notification rules" ON notification_rules FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can update tenant notification rules" ON notification_rules FOR UPDATE USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can delete tenant notification rules" ON notification_rules FOR DELETE USING (tenant_id = get_user_tenant_id(auth.uid()));

-- ============================================================
-- WEBHOOK ENDPOINTS
-- ============================================================
CREATE TABLE IF NOT EXISTS webhook_endpoints (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  url        TEXT NOT NULL,
  secret     TEXT NOT NULL,
  events     TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  is_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE webhook_endpoints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tenant webhooks" ON webhook_endpoints FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can insert tenant webhooks" ON webhook_endpoints FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can update tenant webhooks" ON webhook_endpoints FOR UPDATE USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can delete tenant webhooks" ON webhook_endpoints FOR DELETE USING (tenant_id = get_user_tenant_id(auth.uid()));

-- ============================================================
-- SUBMISSION JOBS (queue worker / idempotency)
-- ============================================================
CREATE TABLE IF NOT EXISTS submission_jobs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id         UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  provider          integration_provider NOT NULL,
  submission_type   TEXT NOT NULL,
  idempotency_key   TEXT NOT NULL,
  status            submission_status NOT NULL DEFAULT 'queued',
  request_json      JSONB NOT NULL DEFAULT '{}'::jsonb,
  response_json     JSONB,
  attempt_count     INT NOT NULL DEFAULT 0,
  last_error        TEXT,
  next_retry_at     TIMESTAMPTZ,
  correlation_id    TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_submission_jobs_tenant_status ON submission_jobs(tenant_id, status, next_retry_at);

ALTER TABLE submission_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tenant submission jobs" ON submission_jobs FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can insert tenant submission jobs" ON submission_jobs FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can update tenant submission jobs" ON submission_jobs FOR UPDATE USING (tenant_id = get_user_tenant_id(auth.uid()));

-- ============================================================
-- AUDIT LOG (for submission tracking)
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id      UUID,
  action       TEXT NOT NULL,
  entity_name  TEXT NOT NULL,
  entity_id    UUID,
  before_json  JSONB,
  after_json   JSONB,
  ip_address   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_tenant ON audit_log(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(tenant_id, entity_name, entity_id);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tenant audit log" ON audit_log FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users can insert tenant audit log" ON audit_log FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

-- ============================================================
-- SEED FUNCTION: templates + tags + automation rules
-- ============================================================
CREATE OR REPLACE FUNCTION seed_templates_and_automations(p_tenant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Document Tags
  INSERT INTO document_tags (tenant_id, name, color) VALUES
    (p_tenant_id,'VAT','blue'),
    (p_tenant_id,'Payroll','purple'),
    (p_tenant_id,'Accounts','green'),
    (p_tenant_id,'Self Assessment','orange'),
    (p_tenant_id,'Corporation Tax','red'),
    (p_tenant_id,'Company Secretarial','teal'),
    (p_tenant_id,'KYC/AML','pink'),
    (p_tenant_id,'Bank Statements','gray'),
    (p_tenant_id,'Invoices','yellow'),
    (p_tenant_id,'Receipts','slate')
  ON CONFLICT (tenant_id, name) DO NOTHING;

  -- Email Templates
  INSERT INTO email_templates (tenant_id, key, name, subject, body_html, body_text, variables_json) VALUES
    (p_tenant_id,'welcome_client_portal','Welcome email - Client Portal',
     'Welcome to {{tenant.firm_name}} Portal',
     '<p>Hello {{client.contact_name}},</p><p>Your portal is ready. You can upload receipts, view deadlines, and track submissions.</p><p>Login: {{portal.login_url}}</p><p>Thanks,<br/>{{tenant.firm_name}}</p>',
     'Hello {{client.contact_name}}, Your portal is ready. Login: {{portal.login_url}}. Thanks, {{tenant.firm_name}}',
     '["tenant.firm_name","client.contact_name","portal.login_url"]'::jsonb),

    (p_tenant_id,'vat_due_reminder_14d','VAT reminder - 14 days',
     'VAT return due soon for {{client.legal_name}}',
     '<p>VAT period {{vat.period}} is due on <b>{{vat.due_date}}</b>.</p><p>Please upload any missing invoices/receipts.</p>',
     'VAT period {{vat.period}} is due on {{vat.due_date}}. Please upload missing invoices/receipts.',
     '["client.legal_name","vat.period","vat.due_date"]'::jsonb),

    (p_tenant_id,'vat_submitted','VAT submitted confirmation',
     'VAT submitted to HMRC for {{client.legal_name}}',
     '<p>We have submitted your VAT return to HMRC.</p><p>HMRC receipt: {{hmrc.receipt_id}}</p>',
     'We have submitted your VAT return to HMRC. Receipt: {{hmrc.receipt_id}}',
     '["client.legal_name","hmrc.receipt_id"]'::jsonb),

    (p_tenant_id,'payroll_payslips_ready','Payroll - payslips ready',
     'Payslips are ready ({{payroll.period}})',
     '<p>Payslips for {{payroll.period}} have been published to the portal.</p>',
     'Payslips for {{payroll.period}} have been published to the portal.',
     '["payroll.period"]'::jsonb),

    (p_tenant_id,'invoice_issued','Invoice issued',
     'Invoice {{invoice.number}} from {{tenant.firm_name}}',
     '<p>Invoice <b>{{invoice.number}}</b> total <b>{{invoice.total_gbp}}</b> is now available.</p><p>Pay: {{invoice.pay_url}}</p>',
     'Invoice {{invoice.number}} total {{invoice.total_gbp}}. Pay: {{invoice.pay_url}}',
     '["invoice.number","invoice.total_gbp","invoice.pay_url","tenant.firm_name"]'::jsonb),

    (p_tenant_id,'invoice_overdue','Invoice overdue',
     'Invoice {{invoice.number}} is overdue',
     '<p>Your invoice <b>{{invoice.number}}</b> is overdue. Please pay using {{invoice.pay_url}}.</p>',
     'Your invoice {{invoice.number}} is overdue. Pay: {{invoice.pay_url}}',
     '["invoice.number","invoice.pay_url"]'::jsonb)
  ON CONFLICT (tenant_id, key) DO UPDATE
    SET subject=EXCLUDED.subject, body_html=EXCLUDED.body_html, body_text=EXCLUDED.body_text,
        variables_json=EXCLUDED.variables_json, updated_at=now();

  -- Invoice Template (default)
  INSERT INTO invoice_templates (tenant_id, key, name, layout_json, terms_text, footer_text, is_default)
  VALUES
    (p_tenant_id,'default_invoice_v1','Default Invoice Template v1',
     '{"header":{"showLogo":true,"showAddress":true,"showFirmName":true},"table":{"showVatColumn":true,"showQuantity":true},"totals":{"showSubtotal":true,"showVat":true,"showTotal":true},"style":{"font":"Inter","fontSize":10,"accentColor":"{{tenant.brand_primary_color}}"}}'::jsonb,
     'Payment due within 7 days unless agreed otherwise.',
     'Thank you for your business. {{tenant.firm_name}}',
     true)
  ON CONFLICT (tenant_id, key) DO UPDATE
    SET layout_json=EXCLUDED.layout_json, terms_text=EXCLUDED.terms_text, footer_text=EXCLUDED.footer_text, updated_at=now();

  -- Automation Rules
  INSERT INTO automation_rules (tenant_id, name, trigger_type, trigger_filter_json, action_type, action_payload_json) VALUES
    (p_tenant_id,'Auto-create onboarding task','client_created','{}','create_task',
     '{"task_template_name":"Client Onboarding - Company (Ltd)","fallback_title":"Client Onboarding","priority":"high","assign_to":"assigned_manager"}'::jsonb),

    (p_tenant_id,'Create VAT prep task','vat_obligation_detected','{"services":["VAT (MTD)"]}','create_task',
     '{"task_template_name":"VAT - Prepare return from ledger","days_before_due":14,"priority":"high","assign_to":"assigned_manager"}'::jsonb),

    (p_tenant_id,'Create VAT submit task','vat_obligation_detected','{"services":["VAT (MTD)"]}','create_task',
     '{"task_template_name":"VAT - Submit return to HMRC","days_before_due":3,"priority":"urgent","assign_to":"manager_or_owner"}'::jsonb),

    (p_tenant_id,'Create payroll prep task','payroll_schedule','{"services":["Payroll (RTI)"]}','create_task',
     '{"task_template_name":"Payroll - Monthly run preparation","days_before_due":7,"priority":"high","assign_to":"payroll_officer_or_manager"}'::jsonb),

    (p_tenant_id,'Create FPS submission task','payroll_schedule','{"services":["Payroll (RTI)"]}','create_task',
     '{"task_template_name":"Payroll - Submit FPS (RTI)","days_before_due":1,"priority":"urgent","assign_to":"manager_or_owner"}'::jsonb),

    (p_tenant_id,'Create year-end record request task','accounts_year_end','{"services":["Accounts Production"]}','create_task',
     '{"task_template_name":"Year-end - Request records","days_before_due":60,"priority":"high","assign_to":"assigned_manager"}'::jsonb),

    (p_tenant_id,'Create year-end adjustments task','accounts_year_end','{"services":["Accounts Production"]}','create_task',
     '{"task_template_name":"Year-end - Journals & adjustments","days_before_due":30,"priority":"high","assign_to":"staff_or_manager"}'::jsonb),

    (p_tenant_id,'Invoice overdue email','invoice_overdue','{}','send_email',
     '{"template_key":"invoice_overdue","to":"client.primary_email"}'::jsonb)
  ON CONFLICT DO NOTHING;

  -- Notification Rules
  INSERT INTO notification_rules (tenant_id, name, channel, template_key, days_before_due, applies_to_json) VALUES
    (p_tenant_id,'VAT reminder 14d','email','vat_due_reminder_14d',14,'{"services":["VAT (MTD)"],"task_status":["todo","in_progress","awaiting_client"]}'::jsonb),
    (p_tenant_id,'Invoice issued email','email','invoice_issued',0,'{"events":["invoice.issued"]}'::jsonb)
  ON CONFLICT (tenant_id, name) DO UPDATE
    SET template_key=EXCLUDED.template_key, days_before_due=EXCLUDED.days_before_due, applies_to_json=EXCLUDED.applies_to_json;
END;
$$;

-- ============================================================
-- Update seed_tenant to also call seed_templates_and_automations
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_tenant_id uuid;
  firm text;
BEGIN
  firm := COALESCE(NEW.raw_user_meta_data->>'firm_name', 'My Practice');
  
  INSERT INTO public.tenants (firm_name)
  VALUES (firm)
  RETURNING id INTO new_tenant_id;

  INSERT INTO public.profiles (id, tenant_id, full_name, email)
  VALUES (
    NEW.id,
    new_tenant_id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email
  );

  INSERT INTO public.user_roles (user_id, tenant_id, role)
  VALUES (NEW.id, new_tenant_id, 'firm_owner');

  -- Seed default roles, services, templates, COA
  PERFORM seed_tenant(new_tenant_id);

  -- Seed email templates, invoice templates, tags, automations
  PERFORM seed_templates_and_automations(new_tenant_id);

  RETURN NEW;
END;
$$;
