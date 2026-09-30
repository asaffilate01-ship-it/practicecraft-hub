BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SELECT plan(10);
INSERT INTO public.tenants(id,firm_name) VALUES ('10000000-0000-0000-0000-000000000001','Review test'),('10000000-0000-0000-0000-000000000002','Other test');
INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES
 ('20000000-0000-0000-0000-000000000001','preparer@example.test','{"user_type":"portal"}'),
 ('20000000-0000-0000-0000-000000000002','reviewer@example.test','{"user_type":"portal"}'),
 ('20000000-0000-0000-0000-000000000003','other@example.test','{"user_type":"portal"}');
INSERT INTO public.profiles(id,tenant_id) VALUES
 ('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001'),
 ('20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001'),
 ('20000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000002');
INSERT INTO public.user_roles(user_id,tenant_id,role) SELECT id,tenant_id,'firm_owner' FROM public.profiles WHERE id::text LIKE '20000000-%';
INSERT INTO public.clients(id,tenant_id,legal_name) VALUES ('30000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','Test client');
INSERT INTO public.payroll_employers(id,tenant_id,client_id,employer_name,paye_reference,accounts_office_ref) VALUES ('40000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','Test employer','123/AB456','123PA00000000');
INSERT INTO public.pay_runs(id,tenant_id,employer_id,tax_period,pay_date,period_start,period_end,total_pension_employee_pence,total_pension_employer_pence,total_student_loan_pence) VALUES ('50000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001',6,'2026-09-30','2026-09-01','2026-09-30',0,0,0);
SELECT set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000001',true);
SET LOCAL ROLE authenticated;
SELECT throws_ok($$SELECT public.request_payroll_preparation_review('50000000-0000-0000-0000-000000000001','{}','evidence-01')$$,'P0001','Complete all four preparation checks','Incomplete checks rejected');
SELECT throws_ok($$SELECT public.request_payroll_preparation_review('50000000-0000-0000-0000-000000000001','{"inputs_checked":true,"changes_checked":true,"independent_calculation_checked":true,"funding_checked":true}','evidence-01')$$,'P0001','Generate payslips before requesting review','Empty payroll rejected');
RESET ROLE;
INSERT INTO public.payslips(tenant_id,pay_run_id,employee_name) VALUES ('10000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000001','Test employee');
SET LOCAL ROLE authenticated;
SELECT lives_ok($$SELECT public.request_payroll_preparation_review('50000000-0000-0000-0000-000000000001','{"inputs_checked":true,"changes_checked":true,"independent_calculation_checked":true,"funding_checked":true}','evidence-01')$$,'Prepared payroll review persists');
SELECT throws_ok($$SELECT public.decide_payroll_preparation_review((SELECT id FROM public.payroll_preparation_reviews LIMIT 1),'approved','Reviewed evidence')$$,'P0001','A different reviewer must decide','Self approval rejected');
SELECT throws_ok($$UPDATE public.payroll_preparation_reviews SET status='approved'$$,'42501',NULL,'Direct review writes denied');
SELECT set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000003',true);
SELECT is((SELECT count(*)::integer FROM public.payroll_preparation_reviews),0,'Other tenant cannot read history');
SELECT throws_ok($$SELECT public.get_payroll_preparation_reviews('50000000-0000-0000-0000-000000000001')$$,'P0001','Payroll run unavailable','Cross-tenant RPC denied');
RESET ROLE;
UPDATE public.payslips SET tax_code='BR' WHERE pay_run_id='50000000-0000-0000-0000-000000000001';
SELECT set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000002',true);
SET LOCAL ROLE authenticated;
SELECT throws_ok($$SELECT public.decide_payroll_preparation_review((SELECT id FROM public.payroll_preparation_reviews LIMIT 1),'approved','Reviewed evidence')$$,'P0001','Payroll changed. Request changes and prepare a fresh review','Changed source blocks approval');
SELECT lives_ok($$SELECT public.decide_payroll_preparation_review((SELECT id FROM public.payroll_preparation_reviews LIMIT 1),'changes_requested','Please recheck tax code')$$,'Reviewer can return changed payroll');
SELECT throws_ok($$SELECT public.decide_payroll_preparation_review((SELECT id FROM public.payroll_preparation_reviews LIMIT 1),'approved','Reviewed evidence')$$,'P0001','Review already decided','Decision cannot be overwritten');
SELECT * FROM finish();
ROLLBACK;
