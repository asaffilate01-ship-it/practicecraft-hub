BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SELECT plan(17);

INSERT INTO public.tenants(id,firm_name) VALUES
 ('91000000-0000-0000-0000-000000000001','Consent sandbox tenant'),
 ('91000000-0000-0000-0000-000000000002','Other consent tenant');
INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES
 ('92000000-0000-0000-0000-000000000001','consent-owner@example.test','{"user_type":"portal"}'),
 ('92000000-0000-0000-0000-000000000002','consent-viewer@example.test','{"user_type":"portal"}'),
 ('92000000-0000-0000-0000-000000000003','consent-other@example.test','{"user_type":"portal"}'),
 ('92000000-0000-0000-0000-000000000004','consent-portal@example.test','{"user_type":"portal"}');
INSERT INTO public.profiles(id,tenant_id) VALUES
 ('92000000-0000-0000-0000-000000000001','91000000-0000-0000-0000-000000000001'),
 ('92000000-0000-0000-0000-000000000002','91000000-0000-0000-0000-000000000001'),
 ('92000000-0000-0000-0000-000000000003','91000000-0000-0000-0000-000000000002'),
 ('92000000-0000-0000-0000-000000000004','91000000-0000-0000-0000-000000000001');
INSERT INTO public.user_roles(user_id,tenant_id,role) VALUES
 ('92000000-0000-0000-0000-000000000001','91000000-0000-0000-0000-000000000001','firm_owner'),
 ('92000000-0000-0000-0000-000000000002','91000000-0000-0000-0000-000000000001','staff'),
 ('92000000-0000-0000-0000-000000000003','91000000-0000-0000-0000-000000000002','firm_owner');
INSERT INTO public.roles(tenant_id,name,permissions_json) VALUES
 ('91000000-0000-0000-0000-000000000001','Staff Accountant','{"ledger":{"view":true,"edit":false}}');
INSERT INTO public.clients(id,tenant_id,legal_name) VALUES
 ('93000000-0000-0000-0000-000000000001','91000000-0000-0000-0000-000000000001','Consent A'),
 ('93000000-0000-0000-0000-000000000002','91000000-0000-0000-0000-000000000002','Other practice');

INSERT INTO public.bank_oauth_intents(
 id,tenant_id,client_id,initiated_by,state_digest,verifier_ciphertext,
 redirect_uri,expires_at
) VALUES (
 '94000000-0000-0000-0000-000000000001',
 '91000000-0000-0000-0000-000000000001',
 '93000000-0000-0000-0000-000000000001',
 '92000000-0000-0000-0000-000000000001',
 repeat('a',64),repeat('C',70),
 'https://taxlounge.example.test/banking/callback',now()+interval '5 minutes'
);
SELECT set_config('request.jwt.claim.sub','92000000-0000-0000-0000-000000000001',true);
SET LOCAL ROLE authenticated;
SELECT is(has_table_privilege('authenticated','public.bank_oauth_intents','SELECT'),false,'Browser staff cannot view state digests');
SELECT is(has_table_privilege('authenticated','public.bank_oauth_intents','INSERT'),false,'Browser staff cannot create OAuth sessions');
SELECT is(has_table_privilege('authenticated','public.bank_oauth_consents','INSERT'),false,'Browser staff cannot fabricate consent');
SELECT is(has_schema_privilege('authenticated','bank_private','USAGE'),false,'Browser cannot access private token schema');
SELECT is(has_function_privilege('authenticated','public.taxlounge_save_sandbox_consent(uuid,uuid,uuid,uuid,text,timestamptz,integer)','EXECUTE'),false,'User cannot call privileged token writer');

RESET ROLE;
-- Atomic "consume once": the same conditional UPDATE is used by the Edge
-- service client.  RLS/write privileges are unavailable to the browser.
WITH consumed AS (
 UPDATE public.bank_oauth_intents SET status='consuming', consumed_at=now()
 WHERE state_digest=repeat('a',64) AND status='pending'
   AND tenant_id='91000000-0000-0000-0000-000000000001'
   AND initiated_by='92000000-0000-0000-0000-000000000001'
   AND expires_at > now()
 RETURNING id
)
SELECT is((SELECT count(*)::integer FROM consumed),1,'First correctly scoped callback consumes state');
WITH consumed AS (
 UPDATE public.bank_oauth_intents SET status='consuming', consumed_at=now()
 WHERE state_digest=repeat('a',64) AND status='pending'
 RETURNING id
)
SELECT is((SELECT count(*)::integer FROM consumed),0,'Replay of consumed state fails');
WITH consumed AS (
 UPDATE public.bank_oauth_intents SET status='consuming',consumed_at=now()
 WHERE state_digest=repeat('a',64) AND status='pending'
   AND tenant_id='91000000-0000-0000-0000-000000000002'
 RETURNING id
)
SELECT is((SELECT count(*)::integer FROM consumed),0,'Wrong tenant cannot claim a session');

SELECT throws_ok($$SELECT public.taxlounge_save_sandbox_consent(
 '94000000-0000-0000-0000-000000000001',
 '91000000-0000-0000-0000-000000000002',
 '93000000-0000-0000-0000-000000000001',
 '92000000-0000-0000-0000-000000000001',
 repeat('C',90),now()+interval '30 minutes',1)$$,'42501',
 'Sandbox authorisation session is unavailable','Different tenant may not finalize consent');
SELECT lives_ok($$SELECT public.taxlounge_save_sandbox_consent(
 '94000000-0000-0000-0000-000000000001',
 '91000000-0000-0000-0000-000000000001',
 '93000000-0000-0000-0000-000000000001',
 '92000000-0000-0000-0000-000000000001',
 repeat('C',90),now()+interval '30 minutes',1)$$,
 'Server-only service can store encrypted token after claimed OAuth state');
SELECT is((SELECT count(*)::integer FROM public.bank_oauth_consents),1,'Consent is recorded with no provider bank connection yet');
SELECT is((SELECT count(*)::integer FROM bank_private.bank_sandbox_credentials),1,'Encrypted sandbox token stored in private schema');
SELECT throws_ok($$SELECT public.taxlounge_save_sandbox_consent(
 '94000000-0000-0000-0000-000000000001',
 '91000000-0000-0000-0000-000000000001',
 '93000000-0000-0000-0000-000000000001',
 '92000000-0000-0000-0000-000000000001',
 repeat('C',90),now()+interval '30 minutes',1)$$,'42501',
 'Sandbox authorisation session is unavailable','Consumed code cannot be saved twice');

SELECT set_config('request.jwt.claim.sub','92000000-0000-0000-0000-000000000002',true);
SET LOCAL ROLE authenticated;
SELECT is((SELECT count(*)::integer FROM public.bank_oauth_consents),1,'Authorised ledger viewer sees safe consent metadata');
SELECT set_config('request.jwt.claim.sub','92000000-0000-0000-0000-000000000004',true);
SELECT is((SELECT count(*)::integer FROM public.bank_oauth_consents),0,'Portal user sees no bank consent details');
RESET ROLE;
SELECT lives_ok($$SELECT public.taxlounge_disconnect_sandbox_consent(
 (SELECT id FROM public.bank_oauth_consents LIMIT 1),
 '91000000-0000-0000-0000-000000000001',
 '92000000-0000-0000-0000-000000000001')$$,'Initiating staff can locally disconnect consent');
SELECT is((SELECT count(*)::integer FROM bank_private.bank_sandbox_credentials),0,'Disconnect destroys saved sandbox access credential');

SELECT * FROM finish();
ROLLBACK;
