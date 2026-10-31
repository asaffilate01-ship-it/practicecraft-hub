BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SELECT plan(25);

INSERT INTO public.tenants(id,firm_name) VALUES
('71000000-0000-0000-0000-000000000001','TaxLounge bank test'),
('71000000-0000-0000-0000-000000000002','Other bank test');

INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES
('72000000-0000-0000-0000-000000000001','bank-owner@example.test','{"user_type":"portal"}'),
('72000000-0000-0000-0000-000000000002','bank-editor@example.test','{"user_type":"portal"}'),
('72000000-0000-0000-0000-000000000003','bank-viewer@example.test','{"user_type":"portal"}'),
('72000000-0000-0000-0000-000000000004','bank-outsider@example.test','{"user_type":"portal"}'),
('72000000-0000-0000-0000-000000000005','bank-portal@example.test','{"user_type":"portal"}');
INSERT INTO public.profiles(id,tenant_id) VALUES
('72000000-0000-0000-0000-000000000001','71000000-0000-0000-0000-000000000001'),
('72000000-0000-0000-0000-000000000002','71000000-0000-0000-0000-000000000001'),
('72000000-0000-0000-0000-000000000003','71000000-0000-0000-0000-000000000001'),
('72000000-0000-0000-0000-000000000004','71000000-0000-0000-0000-000000000002'),
('72000000-0000-0000-0000-000000000005','71000000-0000-0000-0000-000000000001');
INSERT INTO public.user_roles(user_id,tenant_id,role) VALUES
('72000000-0000-0000-0000-000000000001','71000000-0000-0000-0000-000000000001','firm_owner'),
('72000000-0000-0000-0000-000000000002','71000000-0000-0000-0000-000000000001','staff'),
('72000000-0000-0000-0000-000000000003','71000000-0000-0000-0000-000000000001','manager'),
('72000000-0000-0000-0000-000000000004','71000000-0000-0000-0000-000000000002','firm_owner');
INSERT INTO public.roles(tenant_id,name,permissions_json) VALUES
('71000000-0000-0000-0000-000000000001','Staff Accountant','{"ledger":{"view":true,"edit":true}}'),
('71000000-0000-0000-0000-000000000001','Manager','{"ledger":{"view":true,"edit":false}}');

INSERT INTO public.clients(id,tenant_id,legal_name) VALUES
('73000000-0000-0000-0000-000000000001','71000000-0000-0000-0000-000000000001','Client A'),
('73000000-0000-0000-0000-000000000002','71000000-0000-0000-0000-000000000001','Client B'),
('73000000-0000-0000-0000-000000000003','71000000-0000-0000-0000-000000000002','Other tenant client');
INSERT INTO public.chart_of_accounts(id,tenant_id,code,name) VALUES
('74000000-0000-0000-0000-000000000001','71000000-0000-0000-0000-000000000001','1000','Bank current'),
('74000000-0000-0000-0000-000000000002','71000000-0000-0000-0000-000000000001','4000','Sales'),
('74000000-0000-0000-0000-000000000003','71000000-0000-0000-0000-000000000002','1001','Other tenant cash');
INSERT INTO public.bank_connections(id,tenant_id,client_id,account_name,ledger_account_id) VALUES
('75000000-0000-0000-0000-000000000001','71000000-0000-0000-0000-000000000001','73000000-0000-0000-0000-000000000001','Manual current','74000000-0000-0000-0000-000000000001');
INSERT INTO public.bank_transactions(
id,tenant_id,client_id,bank_connection_id,transaction_date,description,amount_pence,categorisation_status,confirmed_account_id
) VALUES (
'76000000-0000-0000-0000-000000000001','71000000-0000-0000-0000-000000000001',
'73000000-0000-0000-0000-000000000001','75000000-0000-0000-0000-000000000001',
'2026-10-31','Test sale',12345,'confirmed','74000000-0000-0000-0000-000000000002'
);

SELECT set_config('request.jwt.claim.sub','72000000-0000-0000-0000-000000000001',true);
SET LOCAL ROLE authenticated;
SELECT is(public.taxlounge_bank_permission('71000000-0000-0000-0000-000000000001','view'),true,'Owner can view bank data');
SELECT is(public.taxlounge_bank_permission('71000000-0000-0000-0000-000000000001','edit'),true,'Owner can edit bank data');
SELECT is(has_function_privilege('anon','public.post_bank_transaction(uuid)','EXECUTE'),false,'Anonymous posting not executable');
SELECT set_config('request.jwt.claim.sub','72000000-0000-0000-0000-000000000003',true);
SELECT is(public.taxlounge_bank_permission('71000000-0000-0000-0000-000000000001','view'),true,'Manager can read bank data');
SELECT is(public.taxlounge_bank_permission('71000000-0000-0000-0000-000000000001','edit'),false,'Read-only manager cannot edit');
SELECT throws_ok($$INSERT INTO public.bank_connections(tenant_id,client_id,account_name) VALUES ('71000000-0000-0000-0000-000000000001','73000000-0000-0000-0000-000000000001','Unauthorized')$$,'42501',NULL,'Viewer cannot add bank connection');
SELECT throws_ok($$SELECT public.post_bank_transaction('76000000-0000-0000-0000-000000000001')$$,'42501','Ledger edit permission required','Viewer cannot post a journal');
WITH changed AS (UPDATE public.bank_transactions SET description='Unauthorized' WHERE id='76000000-0000-0000-0000-000000000001' RETURNING id)
SELECT is((SELECT count(*)::integer FROM changed),0,'Viewer cannot mutate a bank transaction');

SELECT set_config('request.jwt.claim.sub','72000000-0000-0000-0000-000000000005',true);
SELECT is(public.taxlounge_bank_permission('71000000-0000-0000-0000-000000000001','view'),false,'User without staff role cannot view');
SELECT is((SELECT count(*)::integer FROM public.bank_transactions),0,'Portal-only identity sees no bank rows');

SELECT set_config('request.jwt.claim.sub','72000000-0000-0000-0000-000000000002',true);
SELECT is(public.taxlounge_bank_permission('71000000-0000-0000-0000-000000000001','edit'),true,'Bookkeeper has edit permission');
SELECT throws_ok($$INSERT INTO public.bank_connections(tenant_id,client_id,account_name,provider) VALUES ('71000000-0000-0000-0000-000000000001','73000000-0000-0000-0000-000000000001','Fake consent','truelayer')$$,'42501',NULL,'Staff cannot fabricate an active provider connection');
SELECT throws_ok($$INSERT INTO public.bank_connections(tenant_id,client_id,account_name) VALUES ('71000000-0000-0000-0000-000000000001','73000000-0000-0000-0000-000000000003','Cross tenant')$$,'42501',NULL,'Bank connection client and tenant must match');
SELECT throws_ok($$INSERT INTO public.bank_connections(tenant_id,client_id,account_name,ledger_account_id) VALUES ('71000000-0000-0000-0000-000000000001','73000000-0000-0000-0000-000000000001','Wrong ledger','74000000-0000-0000-0000-000000000003')$$,'23503',NULL,'Bank control account tenant must match');
SELECT throws_ok($$INSERT INTO public.bank_transactions(tenant_id,client_id,bank_connection_id,transaction_date,description,amount_pence) VALUES ('71000000-0000-0000-0000-000000000001','73000000-0000-0000-0000-000000000002','75000000-0000-0000-0000-000000000001','2026-10-31','Wrong client',100)$$,'23503',NULL,'Bank transaction must match connection client');
SELECT throws_ok($$INSERT INTO public.bank_transactions(tenant_id,client_id,bank_connection_id,transaction_date,description,amount_pence,confirmed_account_id) VALUES ('71000000-0000-0000-0000-000000000001','73000000-0000-0000-0000-000000000001','75000000-0000-0000-0000-000000000001','2026-10-31','Wrong category',100,'74000000-0000-0000-0000-000000000003')$$,'23503',NULL,'Confirmed category tenant must match');
SELECT throws_ok($$UPDATE public.bank_transactions SET client_id='73000000-0000-0000-0000-000000000002' WHERE id='76000000-0000-0000-0000-000000000001'$$,'42501','Bank transaction identity is immutable','Cannot reassign a bank line');
SELECT throws_ok($$UPDATE public.bank_transactions SET categorisation_status='posted' WHERE id='76000000-0000-0000-0000-000000000001'$$,'42501','Only the authorised posting function can mark a transaction posted','Cannot pretend a journal was posted');
SELECT throws_ok($$UPDATE public.bank_transactions SET journal_entry_id='77000000-0000-0000-0000-000000000001' WHERE id='76000000-0000-0000-0000-000000000001'$$,'42501','Only the authorised posting function can mark a transaction posted','Cannot forge a journal link');
SELECT throws_ok($$DELETE FROM public.bank_transactions WHERE id='76000000-0000-0000-0000-000000000001'$$,'42501',NULL,'Direct bank line deletion denied');

SELECT set_config('request.jwt.claim.sub','72000000-0000-0000-0000-000000000001',true);
SELECT lives_ok($$SELECT public.post_bank_transaction('76000000-0000-0000-0000-000000000001')$$,'Authorised owner can post a balanced journal');
SELECT is((SELECT categorisation_status FROM public.bank_transactions WHERE id='76000000-0000-0000-0000-000000000001'),'posted','Posting records accepted journal link');
SELECT is((SELECT count(*)::integer FROM public.journal_lines WHERE journal_entry_id=(SELECT journal_entry_id FROM public.bank_transactions WHERE id='76000000-0000-0000-0000-000000000001')),2,'Posting creates two journal lines');
SELECT is(public.post_bank_transaction('76000000-0000-0000-0000-000000000001'),(SELECT journal_entry_id FROM public.bank_transactions WHERE id='76000000-0000-0000-0000-000000000001'),'Retry returns same journal id');
SELECT set_config('request.jwt.claim.sub','72000000-0000-0000-0000-000000000004',true);
SELECT throws_ok($$SELECT public.post_bank_transaction('76000000-0000-0000-0000-000000000001')$$,'42501','Bank transaction unavailable','Other tenant cannot post foreign bank record');

RESET ROLE;
SELECT * FROM finish();
ROLLBACK;
