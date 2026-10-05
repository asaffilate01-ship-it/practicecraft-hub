BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SELECT plan(15);
INSERT INTO public.tenants(id,firm_name) VALUES
 ('11000000-0000-0000-0000-000000000001','Role test'),('11000000-0000-0000-0000-000000000002','Other role test');
INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES
 ('21000000-0000-0000-0000-000000000001','role-staff@example.test','{"user_type":"portal"}'),
 ('21000000-0000-0000-0000-000000000002','role-owner@example.test','{"user_type":"portal"}');
INSERT INTO public.profiles(id,tenant_id) VALUES
 ('21000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000001'),
 ('21000000-0000-0000-0000-000000000002','11000000-0000-0000-0000-000000000001');
INSERT INTO public.user_roles(user_id,tenant_id,role) VALUES
 ('21000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000001','staff'),
 ('21000000-0000-0000-0000-000000000002','11000000-0000-0000-0000-000000000001','firm_owner');
INSERT INTO public.roles(id,tenant_id,name) VALUES
 ('31000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000001','Test role'),
 ('31000000-0000-0000-0000-000000000002','11000000-0000-0000-0000-000000000002','Other test role');
SELECT set_config('request.jwt.claim.sub','21000000-0000-0000-0000-000000000001',true);
SET LOCAL ROLE authenticated;
SELECT is(public.can_manage_practice_roles(),false,'Staff cannot administer permissions');
SELECT throws_ok($$SELECT public.seed_tenant('11000000-0000-0000-0000-000000000002')$$,'42501',NULL,'Staff cannot overwrite another practice through the seeder');
SELECT throws_ok($$SELECT public.seed_templates_and_automations('11000000-0000-0000-0000-000000000002')$$,'42501',NULL,'Staff cannot provision another practice automation');
SELECT is(has_function_privilege('anon','public.seed_tenant(uuid)','EXECUTE'),false,'Anonymous tenant seeding denied');
SELECT throws_ok($$INSERT INTO public.roles(tenant_id,name) VALUES ('11000000-0000-0000-0000-000000000001','Escalation')$$,'42501',NULL,'Staff cannot create permission definitions');
WITH changed AS (UPDATE public.roles SET permissions_json='{"payroll":{"approve":true}}' WHERE name='Test role' RETURNING id) SELECT is((SELECT count(*)::integer FROM changed),0,'Staff cannot grant themselves approval');
WITH changed AS (DELETE FROM public.roles WHERE name='Test role' RETURNING id) SELECT is((SELECT count(*)::integer FROM changed),0,'Staff cannot delete role definitions');
SELECT set_config('request.jwt.claim.sub','21000000-0000-0000-0000-000000000002',true);
SELECT is(public.can_manage_practice_roles(),true,'Practice owner can administer own permissions');
WITH changed AS (UPDATE public.roles SET permissions_json='{"ledger":{"view":true}}' WHERE name='Test role' RETURNING id) SELECT is((SELECT count(*)::integer FROM changed),1,'Owner can update own role definition');
SELECT throws_ok($$INSERT INTO public.roles(tenant_id,name) VALUES ('11000000-0000-0000-0000-000000000002','Cross tenant')$$,'42501',NULL,'Owner cannot create roles in another practice');
WITH changed AS (UPDATE public.roles SET permissions_json='{}' WHERE name='Other test role' RETURNING id) SELECT is((SELECT count(*)::integer FROM changed),0,'Owner cannot change another practice role');
SELECT throws_ok($$UPDATE public.roles SET tenant_id='11000000-0000-0000-0000-000000000002' WHERE name='Test role'$$,'42501',NULL,'Owner cannot move role to another practice');
SELECT lives_ok($$INSERT INTO public.roles(tenant_id,name) VALUES ('11000000-0000-0000-0000-000000000001','New owner role')$$,'Owner can create own role definition');
WITH changed AS (DELETE FROM public.roles WHERE name='New owner role' RETURNING id) SELECT is((SELECT count(*)::integer FROM changed),1,'Owner can delete own role definition');
RESET ROLE;
SELECT lives_ok($$INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES ('21000000-0000-0000-0000-000000000003','role-new-signup@example.test','{"firm_name":"Signup regression"}')$$,'Owner-run signup trigger can still seed a new practice');
SELECT * FROM finish();
ROLLBACK;
