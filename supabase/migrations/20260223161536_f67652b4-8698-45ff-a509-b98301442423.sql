
-- ============================================================
-- IQ PRACTICE CLOUD - SEED INFRASTRUCTURE
-- New tables: roles, engagement_services, task_templates,
-- coa_templates, coa_template_accounts, permission_presets
-- Plus seed_tenant() function
-- ============================================================

-- 1) ROLES table (tenant-level roles with permissions JSON)
CREATE TABLE IF NOT EXISTS public.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  permissions_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_system_role BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, name)
);

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tenant roles" ON public.roles
  FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can insert tenant roles" ON public.roles
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can update tenant roles" ON public.roles
  FOR UPDATE TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can delete tenant roles" ON public.roles
  FOR DELETE TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));

-- 2) ENGAGEMENT SERVICES
CREATE TABLE IF NOT EXISTS public.engagement_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, name)
);

ALTER TABLE public.engagement_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tenant services" ON public.engagement_services
  FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can insert tenant services" ON public.engagement_services
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can update tenant services" ON public.engagement_services
  FOR UPDATE TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can delete tenant services" ON public.engagement_services
  FOR DELETE TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));

-- 3) TASK TEMPLATES
CREATE TABLE IF NOT EXISTS public.task_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  entity_types entity_type[],
  service_id UUID REFERENCES public.engagement_services(id) ON DELETE SET NULL,
  default_priority priority NOT NULL DEFAULT 'medium',
  default_days_before_due INT DEFAULT 0,
  checklist_json JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, name)
);

ALTER TABLE public.task_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tenant task templates" ON public.task_templates
  FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can insert tenant task templates" ON public.task_templates
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can update tenant task templates" ON public.task_templates
  FOR UPDATE TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can delete tenant task templates" ON public.task_templates
  FOR DELETE TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));

-- 4) COA TEMPLATES
CREATE TABLE IF NOT EXISTS public.coa_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  entity_type entity_type NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, entity_type, name)
);

ALTER TABLE public.coa_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tenant coa templates" ON public.coa_templates
  FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can insert tenant coa templates" ON public.coa_templates
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can update tenant coa templates" ON public.coa_templates
  FOR UPDATE TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can delete tenant coa templates" ON public.coa_templates
  FOR DELETE TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));

-- 5) COA TEMPLATE ACCOUNTS
CREATE TABLE IF NOT EXISTS public.coa_template_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  coa_template_id UUID NOT NULL REFERENCES public.coa_templates(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  subtype TEXT,
  is_control BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, coa_template_id, code)
);

ALTER TABLE public.coa_template_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tenant coa template accounts" ON public.coa_template_accounts
  FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can insert tenant coa template accounts" ON public.coa_template_accounts
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can update tenant coa template accounts" ON public.coa_template_accounts
  FOR UPDATE TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can delete tenant coa template accounts" ON public.coa_template_accounts
  FOR DELETE TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));

-- 6) PERMISSION PRESETS (system-level reference table)
CREATE TABLE IF NOT EXISTS public.permission_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  permissions_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.permission_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view presets" ON public.permission_presets
  FOR SELECT TO authenticated
  USING (true);

-- Seed permission presets
INSERT INTO public.permission_presets (name, description, permissions_json)
VALUES
('super_admin', 'Platform owner: all tenants, all modules',
 '{"tenants":{"view":true,"edit":true,"billing":true,"impersonate":true},"users":{"view":true,"edit":true},"clients":{"view":true,"edit":true,"delete":true},"tasks":{"view":true,"edit":true,"approve":true},"documents":{"view":true,"upload":true,"delete":true,"export":true},"ledger":{"view":true,"edit":true,"lock_period":true},"vat":{"view":true,"prepare":true,"submit":true},"payroll":{"view":true,"prepare":true,"submit":true},"accounts":{"view":true,"prepare":true,"submit":true},"secretarial":{"view":true,"prepare":true,"submit":true},"aml":{"view":true,"edit":true,"approve":true},"billing":{"view":true,"edit":true,"collect":true},"integrations":{"view":true,"edit":true},"reports":{"view":true,"export":true},"settings":{"view":true,"edit":true}}'::jsonb),
('firm_owner', 'Practice owner: full access within tenant',
 '{"users":{"view":true,"edit":true},"clients":{"view":true,"edit":true,"delete":false},"tasks":{"view":true,"edit":true,"approve":true},"documents":{"view":true,"upload":true,"delete":false,"export":true},"ledger":{"view":true,"edit":true,"lock_period":true},"vat":{"view":true,"prepare":true,"submit":true},"payroll":{"view":true,"prepare":true,"submit":true},"accounts":{"view":true,"prepare":true,"submit":true},"secretarial":{"view":true,"prepare":true,"submit":true},"aml":{"view":true,"edit":true,"approve":true},"billing":{"view":true,"edit":true,"collect":true},"integrations":{"view":true,"edit":true},"reports":{"view":true,"export":true},"settings":{"view":true,"edit":true}}'::jsonb),
('manager', 'Manager: manage team + approve/submissions',
 '{"users":{"view":true,"edit":false},"clients":{"view":true,"edit":true},"tasks":{"view":true,"edit":true,"approve":true},"documents":{"view":true,"upload":true,"delete":false,"export":true},"ledger":{"view":true,"edit":true,"lock_period":false},"vat":{"view":true,"prepare":true,"submit":true},"payroll":{"view":true,"prepare":true,"submit":true},"accounts":{"view":true,"prepare":true,"submit":true},"secretarial":{"view":true,"prepare":true,"submit":true},"aml":{"view":true,"edit":true,"approve":true},"billing":{"view":true,"edit":true,"collect":false},"integrations":{"view":true,"edit":false},"reports":{"view":true,"export":true},"settings":{"view":true,"edit":false}}'::jsonb),
('staff_accountant', 'Staff accountant: assigned clients + prep work',
 '{"clients":{"view":true,"edit":true},"tasks":{"view":true,"edit":true,"approve":false},"documents":{"view":true,"upload":true,"delete":false,"export":true},"ledger":{"view":true,"edit":true,"lock_period":false},"vat":{"view":true,"prepare":true,"submit":false},"payroll":{"view":true,"prepare":false,"submit":false},"accounts":{"view":true,"prepare":true,"submit":false},"secretarial":{"view":true,"prepare":false,"submit":false},"aml":{"view":true,"edit":true,"approve":false},"billing":{"view":true,"edit":false,"collect":false},"integrations":{"view":true,"edit":false},"reports":{"view":true,"export":true},"settings":{"view":false,"edit":false}}'::jsonb),
('payroll_officer', 'Payroll: employee/payroll only',
 '{"clients":{"view":true,"edit":false},"tasks":{"view":true,"edit":true,"approve":false},"documents":{"view":true,"upload":true,"delete":false,"export":true},"payroll":{"view":true,"prepare":true,"submit":false},"vat":{"view":false,"prepare":false,"submit":false},"ledger":{"view":false,"edit":false,"lock_period":false},"accounts":{"view":false,"prepare":false,"submit":false},"secretarial":{"view":false,"prepare":false,"submit":false},"reports":{"view":true,"export":true}}'::jsonb),
('compliance_officer', 'AML/KYC + oversight',
 '{"clients":{"view":true,"edit":false},"tasks":{"view":true,"edit":true,"approve":true},"documents":{"view":true,"upload":true,"delete":false,"export":true},"aml":{"view":true,"edit":true,"approve":true},"integrations":{"view":true,"edit":false},"reports":{"view":true,"export":true}}'::jsonb),
('client_user', 'Client portal: view status, upload docs, pay invoices',
 '{"client_portal":{"view":true},"documents":{"view":true,"upload":true,"delete":false,"export":true},"billing":{"view":true,"pay":true},"vat":{"view":true},"accounts":{"view":true},"payroll":{"view":true},"tasks":{"view":true}}'::jsonb),
('employee_user', 'Employee portal: payslips only',
 '{"employee_portal":{"view":true},"payslips":{"view":true,"download":true}}'::jsonb)
ON CONFLICT (name) DO NOTHING;

-- 7) SEED FUNCTION
CREATE OR REPLACE FUNCTION public.seed_tenant(p_tenant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_svc_bookkeeping uuid;
  v_svc_vat uuid;
  v_svc_payroll uuid;
  v_svc_accounts uuid;
  v_svc_sa uuid;
  v_svc_ct uuid;
  v_svc_secretarial uuid;
  v_svc_aml uuid;
  v_svc_billing uuid;
  v_svc_mtd_it uuid;
  v_svc_charity uuid;
  v_svc_trust uuid;

  v_coa_ltd uuid;
  v_coa_sole uuid;
  v_coa_partnership uuid;
  v_coa_llp uuid;
  v_coa_charity uuid;
  v_coa_trust uuid;
BEGIN
  -- ROLES (tenant-level)
  INSERT INTO roles (tenant_id, name, description, permissions_json, is_system_role)
  SELECT p_tenant_id, 'Firm Owner', 'Full practice access', (SELECT permissions_json FROM permission_presets WHERE name='firm_owner'), true
  ON CONFLICT (tenant_id, name) DO UPDATE SET permissions_json=EXCLUDED.permissions_json;

  INSERT INTO roles (tenant_id, name, description, permissions_json, is_system_role)
  SELECT p_tenant_id, 'Manager', 'Manager: approve & submit', (SELECT permissions_json FROM permission_presets WHERE name='manager'), true
  ON CONFLICT (tenant_id, name) DO UPDATE SET permissions_json=EXCLUDED.permissions_json;

  INSERT INTO roles (tenant_id, name, description, permissions_json, is_system_role)
  SELECT p_tenant_id, 'Staff Accountant', 'Prep work & assigned clients', (SELECT permissions_json FROM permission_presets WHERE name='staff_accountant'), true
  ON CONFLICT (tenant_id, name) DO UPDATE SET permissions_json=EXCLUDED.permissions_json;

  INSERT INTO roles (tenant_id, name, description, permissions_json, is_system_role)
  SELECT p_tenant_id, 'Payroll Officer', 'Payroll only', (SELECT permissions_json FROM permission_presets WHERE name='payroll_officer'), true
  ON CONFLICT (tenant_id, name) DO UPDATE SET permissions_json=EXCLUDED.permissions_json;

  INSERT INTO roles (tenant_id, name, description, permissions_json, is_system_role)
  SELECT p_tenant_id, 'Compliance Officer', 'AML/KYC oversight', (SELECT permissions_json FROM permission_presets WHERE name='compliance_officer'), true
  ON CONFLICT (tenant_id, name) DO UPDATE SET permissions_json=EXCLUDED.permissions_json;

  INSERT INTO roles (tenant_id, name, description, permissions_json, is_system_role)
  SELECT p_tenant_id, 'Client User', 'Client portal access', (SELECT permissions_json FROM permission_presets WHERE name='client_user'), true
  ON CONFLICT (tenant_id, name) DO UPDATE SET permissions_json=EXCLUDED.permissions_json;

  INSERT INTO roles (tenant_id, name, description, permissions_json, is_system_role)
  SELECT p_tenant_id, 'Employee User', 'Employee payslip access', (SELECT permissions_json FROM permission_presets WHERE name='employee_user'), true
  ON CONFLICT (tenant_id, name) DO UPDATE SET permissions_json=EXCLUDED.permissions_json;

  -- ENGAGEMENT SERVICES
  INSERT INTO engagement_services (tenant_id, name, description) VALUES
    (p_tenant_id,'Bookkeeping','Ongoing bookkeeping, reconciliations, journals'),
    (p_tenant_id,'VAT (MTD)','VAT obligations, return prep, submission'),
    (p_tenant_id,'Payroll (RTI)','Payroll runs, payslips, RTI submissions'),
    (p_tenant_id,'Accounts Production','Year-end accounts prep, adjustments'),
    (p_tenant_id,'Self Assessment','SA100/SA800/SA900 prep and filing'),
    (p_tenant_id,'Corporation Tax','CT600 prep and filing'),
    (p_tenant_id,'Company Secretarial','Confirmation statement and CH changes'),
    (p_tenant_id,'AML/KYC','Identity checks, risk assessment, monitoring'),
    (p_tenant_id,'Billing & Collections','Invoicing, DD, Stripe payments'),
    (p_tenant_id,'MTD Income Tax','MTD IT (future/phase)'),
    (p_tenant_id,'Charity Compliance','SORP reporting, trustees report, annual return'),
    (p_tenant_id,'Trust Compliance','Trust accounting and returns')
  ON CONFLICT (tenant_id, name) DO NOTHING;

  SELECT id INTO v_svc_bookkeeping FROM engagement_services WHERE tenant_id=p_tenant_id AND name='Bookkeeping';
  SELECT id INTO v_svc_vat FROM engagement_services WHERE tenant_id=p_tenant_id AND name='VAT (MTD)';
  SELECT id INTO v_svc_payroll FROM engagement_services WHERE tenant_id=p_tenant_id AND name='Payroll (RTI)';
  SELECT id INTO v_svc_accounts FROM engagement_services WHERE tenant_id=p_tenant_id AND name='Accounts Production';
  SELECT id INTO v_svc_sa FROM engagement_services WHERE tenant_id=p_tenant_id AND name='Self Assessment';
  SELECT id INTO v_svc_ct FROM engagement_services WHERE tenant_id=p_tenant_id AND name='Corporation Tax';
  SELECT id INTO v_svc_secretarial FROM engagement_services WHERE tenant_id=p_tenant_id AND name='Company Secretarial';
  SELECT id INTO v_svc_aml FROM engagement_services WHERE tenant_id=p_tenant_id AND name='AML/KYC';
  SELECT id INTO v_svc_billing FROM engagement_services WHERE tenant_id=p_tenant_id AND name='Billing & Collections';
  SELECT id INTO v_svc_mtd_it FROM engagement_services WHERE tenant_id=p_tenant_id AND name='MTD Income Tax';
  SELECT id INTO v_svc_charity FROM engagement_services WHERE tenant_id=p_tenant_id AND name='Charity Compliance';
  SELECT id INTO v_svc_trust FROM engagement_services WHERE tenant_id=p_tenant_id AND name='Trust Compliance';

  -- TASK TEMPLATES (named high-value ones)
  INSERT INTO task_templates (tenant_id, name, description, entity_types, service_id, default_priority, default_days_before_due, checklist_json)
  VALUES
    (p_tenant_id,'Client Onboarding - Company (Ltd)','Collect IDs, engagement letter, access, accounts setup', ARRAY['ltd']::entity_type[], v_svc_aml, 'high', 0,
      '["Engagement letter signed","ID & address collected","Companies House auth code stored","HMRC agent authorisation requested","Open Banking consent (optional)"]'::jsonb),
    (p_tenant_id,'Client Onboarding - Sole Trader','Collect SA info, records, access, AML', ARRAY['sole_trader']::entity_type[], v_svc_aml, 'high', 0,
      '["Engagement letter signed","ID & address collected","UTR confirmed or requested","Record-keeping method agreed","MTD readiness checked"]'::jsonb),
    (p_tenant_id,'Client Onboarding - Charity','Trustees, SORP basis, restricted funds plan', ARRAY['charity']::entity_type[], v_svc_charity, 'high', 0,
      '["Trustee list confirmed","Governing document uploaded","Fund structure agreed","Annual return dates confirmed","Bank feed consent (optional)"]'::jsonb),
    (p_tenant_id,'VAT - Pull HMRC obligations','Check obligations and status in HMRC', NULL, v_svc_vat, 'medium', 21,
      '["Pull obligations","Create VAT period task","Check previous submissions"]'::jsonb),
    (p_tenant_id,'VAT - Prepare return from ledger','Review VAT codes, exceptions, build boxes 1-9', NULL, v_svc_vat, 'high', 14,
      '["Reconcile bank","Review VAT exceptions","Run VAT report","Validate boxes","Attach working papers"]'::jsonb),
    (p_tenant_id,'VAT - Submit return to HMRC','Submit and store receipt', NULL, v_svc_vat, 'urgent', 3,
      '["Final approval","Submit to HMRC","Store response","Notify client"]'::jsonb),
    (p_tenant_id,'Payroll - Monthly run preparation','Collect changes, starters/leavers, hours', ARRAY['ltd','charity','llp']::entity_type[], v_svc_payroll, 'high', 7,
      '["Collect timesheets/changes","Update starters/leavers","Validate tax codes","Run payroll calc"]'::jsonb),
    (p_tenant_id,'Payroll - Generate payslips','Generate PDF payslips and publish to portal', ARRAY['ltd','charity','llp']::entity_type[], v_svc_payroll, 'high', 3,
      '["Generate payslips PDFs","Publish to employee portal","Send notifications"]'::jsonb),
    (p_tenant_id,'Payroll - Submit FPS (RTI)','Submit FPS and store HMRC response', ARRAY['ltd','charity','llp']::entity_type[], v_svc_payroll, 'urgent', 1,
      '["Validate totals","Submit FPS","Check acceptance","Resolve rejections"]'::jsonb),
    (p_tenant_id,'Payroll - Submit EPS (if needed)','EPS for reclaim/statutory etc', ARRAY['ltd','charity','llp']::entity_type[], v_svc_payroll, 'medium', 5,
      '["Identify EPS requirement","Prepare EPS","Submit EPS","Store response"]'::jsonb),
    (p_tenant_id,'Year-end - Request records','Request missing docs and bank statements', ARRAY['ltd','sole_trader','partnership','llp','charity','trust']::entity_type[], v_svc_accounts, 'high', 60,
      '["Chase missing docs","Confirm bank accounts","Confirm debtors/creditors","Confirm payroll reports"]'::jsonb),
    (p_tenant_id,'Year-end - Journals & adjustments','Accruals, prepayments, depreciation, provisions', ARRAY['ltd','sole_trader','partnership','llp','charity','trust']::entity_type[], v_svc_accounts, 'high', 30,
      '["Accruals/prepayments","Fixed asset depreciation","Review VAT control","Director loan review (if Ltd)"]'::jsonb),
    (p_tenant_id,'Year-end - Draft accounts pack','Produce accounts draft and review', ARRAY['ltd','llp']::entity_type[], v_svc_accounts, 'high', 21,
      '["Draft P&L/BS","Disclosure checks","Review comparatives","Internal manager review"]'::jsonb),
    (p_tenant_id,'CT600 - Prepare & review','Prepare CT600 + computations', ARRAY['ltd']::entity_type[], v_svc_ct, 'high', 21,
      '["Compute taxable profit","Capital allowances","Losses/reliefs","Final review"]'::jsonb),
    (p_tenant_id,'CT600 - Submit','Submit CT600, store receipt', ARRAY['ltd']::entity_type[], v_svc_ct, 'urgent', 7,
      '["Client approval","Submit","Store receipt","Payment reminder"]'::jsonb),
    (p_tenant_id,'SA100 - Prepare','Prepare self assessment', ARRAY['sole_trader']::entity_type[], v_svc_sa, 'high', 45,
      '["Income sources confirmed","Expenses review","Capital gains check","Pension/gift aid check","Final approval"]'::jsonb),
    (p_tenant_id,'SA800 - Partnership return prep','Prepare partnership return', ARRAY['partnership']::entity_type[], v_svc_sa, 'high', 45,
      '["Partners list confirmed","Profit share confirmed","Submit draft to partners","Final approval"]'::jsonb),
    (p_tenant_id,'SA900 - Trust return prep','Prepare trust return', ARRAY['trust']::entity_type[], v_svc_trust, 'high', 45,
      '["Trust income confirmed","Beneficiaries confirmed","Tax pools reviewed","Final approval"]'::jsonb),
    (p_tenant_id,'Companies House - Confirmation Statement prep','Prepare and confirm PSC, SIC, shareholders', ARRAY['ltd','llp']::entity_type[], v_svc_secretarial, 'high', 21,
      '["PSC reviewed","Directors reviewed","Share capital checked","SIC codes confirmed","Submit"]'::jsonb),
    (p_tenant_id,'Companies House - Director appointment/resignation','Process director changes', ARRAY['ltd']::entity_type[], v_svc_secretarial, 'medium', 7,
      '["Collect details","Prepare filing","Submit","Store receipt"]'::jsonb),
    (p_tenant_id,'AML - KYC verification','Run ID/address checks', NULL, v_svc_aml, 'high', 0,
      '["Upload ID documents","Run verification provider","Resolve failures","Approve case"]'::jsonb),
    (p_tenant_id,'AML - Risk assessment','Risk score and record rationale', NULL, v_svc_aml, 'medium', 0,
      '["Set risk score","Record PEP/sanctions","Set monitoring frequency"]'::jsonb),
    (p_tenant_id,'Billing - Issue monthly invoice','Generate invoice for client subscriptions', NULL, v_svc_billing, 'medium', 0,
      '["Generate invoice","Send to client","Collect via DD/Stripe","Reconcile payment"]'::jsonb),
    (p_tenant_id,'Billing - Dunning (failed payment)','Retry and chase failed payments', NULL, v_svc_billing, 'high', 0,
      '["Retry payment","Send reminder #1","#2","#3","Escalate"]'::jsonb)
  ON CONFLICT (tenant_id, name) DO NOTHING;

  -- Pattern A: Monthly bookkeeping (12)
  INSERT INTO task_templates (tenant_id, name, description, entity_types, service_id, default_priority, default_days_before_due, checklist_json)
  SELECT p_tenant_id, 'Bookkeeping - Monthly close M' || gs::text, 'Monthly close activities for month ' || gs::text, NULL, v_svc_bookkeeping, 'medium'::priority, 7,
    '["Bank reconciliation","Review uncategorised","Review VAT codes","Post journals","Management notes"]'::jsonb
  FROM generate_series(1,12) gs
  ON CONFLICT (tenant_id, name) DO NOTHING;

  -- Pattern B: VAT quarterly (20)
  INSERT INTO task_templates (tenant_id, name, description, entity_types, service_id, default_priority, default_days_before_due, checklist_json)
  SELECT p_tenant_id, 'VAT - Quarter pack Q' || gs::text, 'Quarterly VAT pack workflow variant ' || gs::text, NULL, v_svc_vat, 'high'::priority, 14,
    '["Reconcile bank","Run VAT exceptions","Review EC sales (if any)","Validate boxes 1-9","Client approval"]'::jsonb
  FROM generate_series(1,20) gs
  ON CONFLICT (tenant_id, name) DO NOTHING;

  -- Pattern C: Payroll monthly (24)
  INSERT INTO task_templates (tenant_id, name, description, entity_types, service_id, default_priority, default_days_before_due, checklist_json)
  SELECT p_tenant_id, 'Payroll - Monthly run variant ' || gs::text, 'Payroll run workflow variant ' || gs::text, ARRAY['ltd','charity','llp']::entity_type[], v_svc_payroll, 'high'::priority, 5,
    '["Collect changes","Run calc","Generate payslips","Submit FPS","Resolve HMRC errors"]'::jsonb
  FROM generate_series(1,24) gs
  ON CONFLICT (tenant_id, name) DO NOTHING;

  -- Pattern D: Year-end packs (30)
  INSERT INTO task_templates (tenant_id, name, description, entity_types, service_id, default_priority, default_days_before_due, checklist_json)
  SELECT p_tenant_id, 'Year-end Pack ' || et::text || ' variant ' || gs::text, 'Year-end workflow for ' || et::text || ' variant ' || gs::text, ARRAY[et]::entity_type[], v_svc_accounts, 'high'::priority, 45,
    CASE WHEN et='ltd'::entity_type THEN '["Request records","DL account review","PAYE/VAT control review","Draft accounts","Client approval","Filing prep"]'::jsonb
         WHEN et='charity'::entity_type THEN '["Request records","Funds review","SORP disclosures","Trustees report","Draft accounts","Approval"]'::jsonb
         ELSE '["Request records","Adjustments","Draft statements","Review","Client approval"]'::jsonb END
  FROM (VALUES ('ltd'::entity_type),('sole_trader'::entity_type),('partnership'::entity_type),('llp'::entity_type),('charity'::entity_type),('trust'::entity_type)) t(et)
  CROSS JOIN generate_series(1,5) gs
  ON CONFLICT (tenant_id, name) DO NOTHING;

  -- Pattern E: AML recurring (14)
  INSERT INTO task_templates (tenant_id, name, description, entity_types, service_id, default_priority, default_days_before_due, checklist_json)
  SELECT p_tenant_id, 'AML - Ongoing monitoring check ' || gs::text, 'Periodic AML monitoring workflow ' || gs::text, NULL, v_svc_aml, 'medium'::priority, 0,
    '["PEP/sanctions refresh","Risk score review","Record outcome","Escalate if needed"]'::jsonb
  FROM generate_series(1,14) gs
  ON CONFLICT (tenant_id, name) DO NOTHING;

  -- Pattern F: Secretarial (20)
  INSERT INTO task_templates (tenant_id, name, description, entity_types, service_id, default_priority, default_days_before_due, checklist_json)
  SELECT p_tenant_id, 'Secretarial - Filing workflow ' || gs::text, 'Companies House filing workflow variant ' || gs::text, ARRAY['ltd','llp']::entity_type[], v_svc_secretarial, 'medium'::priority, 14,
    '["Confirm details","Prepare filing","Submit to CH","Store receipt","Notify client"]'::jsonb
  FROM generate_series(1,20) gs
  ON CONFLICT (tenant_id, name) DO NOTHING;

  -- Pattern G: Billing chase (10)
  INSERT INTO task_templates (tenant_id, name, description, entity_types, service_id, default_priority, default_days_before_due, checklist_json)
  SELECT p_tenant_id, 'Billing - Chase sequence ' || gs::text, 'Billing chase flow variant ' || gs::text, NULL, v_svc_billing, 'high'::priority, 0,
    '["Email reminder","SMS/WhatsApp reminder (optional)","Call log","Final notice","Suspend service if required"]'::jsonb
  FROM generate_series(1,10) gs
  ON CONFLICT (tenant_id, name) DO NOTHING;

  -- COA TEMPLATES
  INSERT INTO coa_templates (tenant_id, entity_type, name, description, is_default) VALUES
    (p_tenant_id,'ltd','UK Ltd Standard COA','Default UK Ltd chart of accounts (starter)', true),
    (p_tenant_id,'sole_trader','UK Sole Trader COA','Default sole trader COA (starter)', true),
    (p_tenant_id,'partnership','UK Partnership COA','Default partnership COA (starter)', true),
    (p_tenant_id,'llp','UK LLP COA','Default LLP COA (starter)', true),
    (p_tenant_id,'charity','UK Charity COA (SORP-lite)','Default charity COA (starter SORP-friendly)', true),
    (p_tenant_id,'trust','UK Trust COA','Default trust COA (starter)', true)
  ON CONFLICT (tenant_id, entity_type, name) DO NOTHING;

  SELECT id INTO v_coa_ltd FROM coa_templates WHERE tenant_id=p_tenant_id AND entity_type='ltd' AND name='UK Ltd Standard COA';
  SELECT id INTO v_coa_sole FROM coa_templates WHERE tenant_id=p_tenant_id AND entity_type='sole_trader' AND name='UK Sole Trader COA';
  SELECT id INTO v_coa_partnership FROM coa_templates WHERE tenant_id=p_tenant_id AND entity_type='partnership' AND name='UK Partnership COA';
  SELECT id INTO v_coa_llp FROM coa_templates WHERE tenant_id=p_tenant_id AND entity_type='llp' AND name='UK LLP COA';
  SELECT id INTO v_coa_charity FROM coa_templates WHERE tenant_id=p_tenant_id AND entity_type='charity' AND name='UK Charity COA (SORP-lite)';
  SELECT id INTO v_coa_trust FROM coa_templates WHERE tenant_id=p_tenant_id AND entity_type='trust' AND name='UK Trust COA';

  -- COA TEMPLATE ACCOUNTS - LTD
  INSERT INTO coa_template_accounts (tenant_id, coa_template_id, code, name, type, subtype, is_control, sort_order) VALUES
    (p_tenant_id, v_coa_ltd,'1000','Bank - Current Account','asset','bank',true,10),
    (p_tenant_id, v_coa_ltd,'1010','Bank - Savings','asset','bank',false,11),
    (p_tenant_id, v_coa_ltd,'1100','Accounts Receivable (Debtors)','asset','receivable',true,20),
    (p_tenant_id, v_coa_ltd,'1200','Prepayments','asset','prepayment',false,30),
    (p_tenant_id, v_coa_ltd,'1300','VAT Control','asset','tax',true,40),
    (p_tenant_id, v_coa_ltd,'1400','Fixed Assets - Cost','asset','fixed_asset',true,50),
    (p_tenant_id, v_coa_ltd,'1401','Fixed Assets - Accum Depreciation','asset','fixed_asset',true,51),
    (p_tenant_id, v_coa_ltd,'2000','Accounts Payable (Creditors)','liability','payable',true,100),
    (p_tenant_id, v_coa_ltd,'2100','Accruals','liability','accrual',false,110),
    (p_tenant_id, v_coa_ltd,'2200','PAYE/NIC Control','liability','payroll_tax',true,120),
    (p_tenant_id, v_coa_ltd,'2300','Corporation Tax Provision','liability','tax',false,130),
    (p_tenant_id, v_coa_ltd,'2400','Director Loan Account','liability','director_loan',false,140),
    (p_tenant_id, v_coa_ltd,'2500','Loans','liability','loan',false,150),
    (p_tenant_id, v_coa_ltd,'3000','Share Capital','equity','share_capital',false,200),
    (p_tenant_id, v_coa_ltd,'3100','Retained Earnings','equity','retained',false,210),
    (p_tenant_id, v_coa_ltd,'4000','Sales','income','sales',false,300),
    (p_tenant_id, v_coa_ltd,'4100','Other Income','income','other',false,310),
    (p_tenant_id, v_coa_ltd,'5000','Cost of Sales','expense','cos',false,400),
    (p_tenant_id, v_coa_ltd,'6000','Staff Wages','expense','payroll',false,500),
    (p_tenant_id, v_coa_ltd,'6001','Employer NIC','expense','payroll',false,501),
    (p_tenant_id, v_coa_ltd,'6002','Pension Costs','expense','payroll',false,502),
    (p_tenant_id, v_coa_ltd,'6100','Rent','expense','overheads',false,510),
    (p_tenant_id, v_coa_ltd,'6200','Utilities','expense','overheads',false,520),
    (p_tenant_id, v_coa_ltd,'6300','Telephone & Internet','expense','overheads',false,530),
    (p_tenant_id, v_coa_ltd,'6400','Insurance','expense','overheads',false,540),
    (p_tenant_id, v_coa_ltd,'6500','Professional Fees','expense','overheads',false,550),
    (p_tenant_id, v_coa_ltd,'6600','Travel & Subsistence','expense','overheads',false,560),
    (p_tenant_id, v_coa_ltd,'6700','Marketing','expense','overheads',false,570),
    (p_tenant_id, v_coa_ltd,'6800','Repairs & Maintenance','expense','overheads',false,580),
    (p_tenant_id, v_coa_ltd,'6900','Depreciation','expense','non_cash',false,590)
  ON CONFLICT (tenant_id, coa_template_id, code) DO NOTHING;

  -- SOLE TRADER COA
  INSERT INTO coa_template_accounts (tenant_id, coa_template_id, code, name, type, subtype, is_control, sort_order) VALUES
    (p_tenant_id, v_coa_sole,'1000','Bank','asset','bank',true,10),
    (p_tenant_id, v_coa_sole,'1100','Debtors','asset','receivable',true,20),
    (p_tenant_id, v_coa_sole,'1300','VAT Control','asset','tax',true,30),
    (p_tenant_id, v_coa_sole,'2000','Creditors','liability','payable',true,100),
    (p_tenant_id, v_coa_sole,'2100','Accruals','liability','accrual',false,110),
    (p_tenant_id, v_coa_sole,'3000','Owner Capital','equity','capital',false,200),
    (p_tenant_id, v_coa_sole,'4000','Sales','income','sales',false,300),
    (p_tenant_id, v_coa_sole,'5000','Cost of Sales','expense','cos',false,400),
    (p_tenant_id, v_coa_sole,'6000','Motor/Travel','expense','overheads',false,500),
    (p_tenant_id, v_coa_sole,'6100','Phone/Internet','expense','overheads',false,510),
    (p_tenant_id, v_coa_sole,'6200','Rent/Use of Home','expense','overheads',false,520),
    (p_tenant_id, v_coa_sole,'6300','Professional Fees','expense','overheads',false,530),
    (p_tenant_id, v_coa_sole,'6400','Advertising','expense','overheads',false,540)
  ON CONFLICT (tenant_id, coa_template_id, code) DO NOTHING;

  -- PARTNERSHIP COA
  INSERT INTO coa_template_accounts (tenant_id, coa_template_id, code, name, type, subtype, is_control, sort_order) VALUES
    (p_tenant_id, v_coa_partnership,'1000','Bank','asset','bank',true,10),
    (p_tenant_id, v_coa_partnership,'1100','Debtors','asset','receivable',true,20),
    (p_tenant_id, v_coa_partnership,'1300','VAT Control','asset','tax',true,30),
    (p_tenant_id, v_coa_partnership,'2000','Creditors','liability','payable',true,100),
    (p_tenant_id, v_coa_partnership,'3000','Partner Capital - A','equity','capital',false,200),
    (p_tenant_id, v_coa_partnership,'3001','Partner Capital - B','equity','capital',false,201),
    (p_tenant_id, v_coa_partnership,'4000','Sales','income','sales',false,300),
    (p_tenant_id, v_coa_partnership,'5000','Cost of Sales','expense','cos',false,400),
    (p_tenant_id, v_coa_partnership,'6300','Professional Fees','expense','overheads',false,530)
  ON CONFLICT (tenant_id, coa_template_id, code) DO NOTHING;

  -- LLP COA
  INSERT INTO coa_template_accounts (tenant_id, coa_template_id, code, name, type, subtype, is_control, sort_order) VALUES
    (p_tenant_id, v_coa_llp,'1000','Bank','asset','bank',true,10),
    (p_tenant_id, v_coa_llp,'1100','Debtors','asset','receivable',true,20),
    (p_tenant_id, v_coa_llp,'1300','VAT Control','asset','tax',true,30),
    (p_tenant_id, v_coa_llp,'2000','Creditors','liability','payable',true,100),
    (p_tenant_id, v_coa_llp,'2200','PAYE/NIC Control','liability','payroll_tax',true,120),
    (p_tenant_id, v_coa_llp,'3000','Members Capital','equity','capital',false,200),
    (p_tenant_id, v_coa_llp,'4000','Fees/Income','income','sales',false,300),
    (p_tenant_id, v_coa_llp,'6000','Staff Wages','expense','payroll',false,500),
    (p_tenant_id, v_coa_llp,'6500','Professional Fees','expense','overheads',false,550)
  ON CONFLICT (tenant_id, coa_template_id, code) DO NOTHING;

  -- CHARITY COA
  INSERT INTO coa_template_accounts (tenant_id, coa_template_id, code, name, type, subtype, is_control, sort_order) VALUES
    (p_tenant_id, v_coa_charity,'1000','Bank','asset','bank',true,10),
    (p_tenant_id, v_coa_charity,'1100','Debtors','asset','receivable',true,20),
    (p_tenant_id, v_coa_charity,'1300','VAT Control','asset','tax',true,30),
    (p_tenant_id, v_coa_charity,'2000','Creditors','liability','payable',true,100),
    (p_tenant_id, v_coa_charity,'2200','PAYE/NIC Control','liability','payroll_tax',true,120),
    (p_tenant_id, v_coa_charity,'3000','Unrestricted Funds','equity','funds',false,200),
    (p_tenant_id, v_coa_charity,'3001','Restricted Funds','equity','funds',false,201),
    (p_tenant_id, v_coa_charity,'4000','Donations & Gifts','income','donations',false,300),
    (p_tenant_id, v_coa_charity,'4100','Grants Income','income','grants',false,310),
    (p_tenant_id, v_coa_charity,'4200','Charitable Activities Income','income','activities',false,320),
    (p_tenant_id, v_coa_charity,'6000','Staff Costs','expense','staff',false,500),
    (p_tenant_id, v_coa_charity,'6100','Charitable Activities Costs','expense','activities',false,510),
    (p_tenant_id, v_coa_charity,'6200','Governance Costs','expense','governance',false,520),
    (p_tenant_id, v_coa_charity,'6500','Professional Fees','expense','overheads',false,550)
  ON CONFLICT (tenant_id, coa_template_id, code) DO NOTHING;

  -- TRUST COA
  INSERT INTO coa_template_accounts (tenant_id, coa_template_id, code, name, type, subtype, is_control, sort_order) VALUES
    (p_tenant_id, v_coa_trust,'1000','Bank','asset','bank',true,10),
    (p_tenant_id, v_coa_trust,'1100','Debtors/Income Receivable','asset','receivable',true,20),
    (p_tenant_id, v_coa_trust,'2000','Creditors','liability','payable',true,100),
    (p_tenant_id, v_coa_trust,'3000','Trust Capital','equity','capital',false,200),
    (p_tenant_id, v_coa_trust,'4000','Investment Income','income','investment',false,300),
    (p_tenant_id, v_coa_trust,'4100','Other Income','income','other',false,310),
    (p_tenant_id, v_coa_trust,'6000','Trust Expenses','expense','overheads',false,500),
    (p_tenant_id, v_coa_trust,'6500','Professional Fees','expense','overheads',false,550)
  ON CONFLICT (tenant_id, coa_template_id, code) DO NOTHING;

END;
$$;

-- Auto-seed on new tenant signup by updating handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
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

  -- Auto-seed tenant with default roles, services, templates, COA
  PERFORM seed_tenant(new_tenant_id);

  RETURN NEW;
END;
$$;
