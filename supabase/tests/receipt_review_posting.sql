BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SELECT plan(21);
INSERT INTO public.tenants(id,firm_name) VALUES
 ('81000000-0000-0000-0000-000000000001','Receipt test practice'),
 ('81000000-0000-0000-0000-000000000002','Other receipt practice');
INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES
 ('82000000-0000-0000-0000-000000000001','receipt-owner@example.test','{"user_type":"portal"}'),
 ('82000000-0000-0000-0000-000000000002','receipt-editor@example.test','{"user_type":"portal"}'),
 ('82000000-0000-0000-0000-000000000003','receipt-viewer@example.test','{"user_type":"portal"}'),
 ('82000000-0000-0000-0000-000000000004','receipt-other@example.test','{"user_type":"portal"}'),
 ('82000000-0000-0000-0000-000000000005','receipt-portal@example.test','{"user_type":"portal"}');
INSERT INTO public.profiles(id,tenant_id)
 SELECT id, CASE WHEN id='82000000-0000-0000-0000-000000000004'::uuid
 THEN '81000000-0000-0000-0000-000000000002'::uuid
 ELSE '81000000-0000-0000-0000-000000000001'::uuid END
 FROM auth.users WHERE id::text LIKE '82000000-%';
INSERT INTO public.user_roles(user_id,tenant_id,role) VALUES
 ('82000000-0000-0000-0000-000000000001','81000000-0000-0000-0000-000000000001','firm_owner'),
 ('82000000-0000-0000-0000-000000000002','81000000-0000-0000-0000-000000000001','staff'),
 ('82000000-0000-0000-0000-000000000003','81000000-0000-0000-0000-000000000001','manager'),
 ('82000000-0000-0000-0000-000000000004','81000000-0000-0000-0000-000000000002','firm_owner');
INSERT INTO public.roles(tenant_id,name,permissions_json) VALUES
 ('81000000-0000-0000-0000-000000000001','Staff Accountant',
  '{"ledger":{"view":true,"edit":true},"ocr":{"view":true,"approve":true}}'),
 ('81000000-0000-0000-0000-000000000001','Manager',
  '{"ledger":{"view":true,"edit":false},"ocr":{"view":true,"approve":false}}');
INSERT INTO public.clients(id,tenant_id,legal_name) VALUES
 ('83000000-0000-0000-0000-000000000001','81000000-0000-0000-0000-000000000001','Receipt client'),
 ('83000000-0000-0000-0000-000000000002','81000000-0000-0000-0000-000000000002','Foreign client');
INSERT INTO public.chart_of_accounts(id,tenant_id,code,name,account_type) VALUES
 ('84000000-0000-0000-0000-000000000001','81000000-0000-0000-0000-000000000001','1000','Bank cash','asset'),
 ('84000000-0000-0000-0000-000000000002','81000000-0000-0000-0000-000000000001','5000','Operating expenses','expense'),
 ('84000000-0000-0000-0000-000000000003','81000000-0000-0000-0000-000000000001','1300','VAT input control','asset'),
 ('84000000-0000-0000-0000-000000000004','81000000-0000-0000-0000-000000000002','1001','Foreign bank','asset');
INSERT INTO public.documents(id,tenant_id,client_id,filename,mime_type,size_bytes,storage_path,document_type,status) VALUES
 ('85000000-0000-0000-0000-000000000001','81000000-0000-0000-0000-000000000001','83000000-0000-0000-0000-000000000001',
  'receipt.png','image/png',1024,'81000000/83000000/receipt.png','receipt','processed');
INSERT INTO public.receipt_extractions(id,tenant_id,client_id,document_id,supplier_name,receipt_date,currency,total_gross_pence,total_net_pence,total_vat_pence)
 VALUES ('86000000-0000-0000-0000-000000000001','81000000-0000-0000-0000-000000000001',
 '83000000-0000-0000-0000-000000000001','85000000-0000-0000-0000-000000000001',
 'Office supplies','2026-10-30','GBP',1200,1000,200);

SELECT set_config('request.jwt.claim.sub','82000000-0000-0000-0000-000000000001',true);
SET LOCAL ROLE authenticated;
SELECT is(public.taxlounge_receipt_permission('81000000-0000-0000-0000-000000000001','approve'),true,'Owner may approve receipts');
SELECT is(has_function_privilege('anon','public.post_receipt_review(uuid,uuid,uuid,text)','EXECUTE'),false,'Anonymous posting RPC blocked');
SELECT set_config('request.jwt.claim.sub','82000000-0000-0000-0000-000000000003',true);
SELECT is(public.taxlounge_receipt_permission('81000000-0000-0000-0000-000000000001','view'),true,'Viewer can review extraction data');
SELECT is(public.taxlounge_receipt_permission('81000000-0000-0000-0000-000000000001','approve'),false,'Viewer cannot approve');
SELECT throws_ok($$SELECT public.post_receipt_review('85000000-0000-0000-0000-000000000001','84000000-0000-0000-0000-000000000002','84000000-0000-0000-0000-000000000001','Reviewer checked evidence')$$,'42501','Receipt approval requires ledger.edit and ocr.approve','Viewer cannot post');
SELECT set_config('request.jwt.claim.sub','82000000-0000-0000-0000-000000000005',true);
SELECT is(public.taxlounge_receipt_permission('81000000-0000-0000-0000-000000000001','view'),false,'Portal identity cannot review receipts');
SELECT is((SELECT count(*)::integer FROM public.receipt_posting_reviews),0,'Portal cannot view posting reviews');

SELECT set_config('request.jwt.claim.sub','82000000-0000-0000-0000-000000000002',true);
SELECT is(public.taxlounge_receipt_permission('81000000-0000-0000-0000-000000000001','approve'),true,'Approved bookkeeper has delegated rights');
SELECT throws_ok($$SELECT public.post_receipt_review('85000000-0000-0000-0000-000000000001','84000000-0000-0000-0000-000000000002','84000000-0000-0000-0000-000000000001','short')$$,'P0001','Provide a reviewer note (12 to 1000 characters)','Review note required');
SELECT throws_ok($$SELECT public.post_receipt_review('85000000-0000-0000-0000-000000000001','84000000-0000-0000-0000-000000000001','84000000-0000-0000-0000-000000000002','Reviewed supplier receipt')$$,'P0001','Choose an active expense account in this practice','Bank cannot be expense category');
SELECT throws_ok($$SELECT public.post_receipt_review('85000000-0000-0000-0000-000000000001','84000000-0000-0000-0000-000000000002','84000000-0000-0000-0000-000000000004','Reviewed supplier receipt')$$,'P0001','Choose an active bank/cash account in this practice','Foreign bank account blocked');
SELECT throws_ok($$INSERT INTO public.receipt_posting_reviews(tenant_id,client_id,document_id,extraction_id,expense_account_id,payment_account_id,gross_pence,net_pence,vat_pence,journal_entry_id,reviewer_user_id,review_note,source_snapshot)
 VALUES ('81000000-0000-0000-0000-000000000001','83000000-0000-0000-0000-000000000001','85000000-0000-0000-0000-000000000001','86000000-0000-0000-0000-000000000001',
 '84000000-0000-0000-0000-000000000002','84000000-0000-0000-0000-000000000001',1200,1000,200,'87000000-0000-0000-0000-000000000001','82000000-0000-0000-0000-000000000002','I reviewed all evidence','{}')$$,'42501',NULL,'Direct review record writes denied');
SELECT lives_ok($$SELECT public.post_receipt_review('85000000-0000-0000-0000-000000000001','84000000-0000-0000-0000-000000000002','84000000-0000-0000-0000-000000000001','Reviewed receipt evidence and VAT eligibility')$$,'Delegated reviewer posts an atomic balanced receipt journal');
SELECT is((SELECT count(*)::integer FROM public.receipt_posting_reviews),1,'One audit review persisted');
SELECT is((SELECT count(*)::integer FROM public.journal_lines WHERE journal_entry_id=(SELECT journal_entry_id FROM public.receipt_posting_reviews)),3,'VAT receipt creates three journal lines');
SELECT is((SELECT sum(debit)::numeric FROM public.journal_lines WHERE journal_entry_id=(SELECT journal_entry_id FROM public.receipt_posting_reviews)),12::numeric,'Journal debits total £12');
SELECT is((SELECT sum(credit)::numeric FROM public.journal_lines WHERE journal_entry_id=(SELECT journal_entry_id FROM public.receipt_posting_reviews)),12::numeric,'Journal credits total £12');
SELECT is(public.post_receipt_review('85000000-0000-0000-0000-000000000001','84000000-0000-0000-0000-000000000002','84000000-0000-0000-0000-000000000001','Reviewed receipt evidence and VAT eligibility'),(SELECT journal_entry_id FROM public.receipt_posting_reviews),'Same review can be retried idempotently');
SELECT throws_ok($$SELECT public.post_receipt_review('85000000-0000-0000-0000-000000000001','84000000-0000-0000-0000-000000000001','84000000-0000-0000-0000-000000000002','Reviewed receipt evidence and VAT eligibility')$$,'P0001','Receipt already posted using different accounts; manual reconciliation required','Different mapping cannot be reposted');
SELECT set_config('request.jwt.claim.sub','82000000-0000-0000-0000-000000000004',true);
SELECT throws_ok($$SELECT public.post_receipt_review('85000000-0000-0000-0000-000000000001','84000000-0000-0000-0000-000000000002','84000000-0000-0000-0000-000000000001','Reviewer checked evidence')$$,'42501','Receipt extraction unavailable','Other tenant cannot repost receipt');
SELECT is((SELECT count(*)::integer FROM public.receipt_posting_reviews),0,'Other tenant cannot view review records');
SELECT * FROM finish();
ROLLBACK;
