-- Accounts Intelligence grants follow-up.
--
-- The schema, policies, indexes and functions are created by
-- 20260827211500_accounts_intelligence.sql. This migration was previously a
-- near-verbatim copy of that migration and made a clean database replay fail
-- on the second CREATE TABLE. Keep only the additional grants that distinguish
-- this migration so both fresh and already-migrated environments are safe.

GRANT SELECT, INSERT, UPDATE, DELETE ON public.document_fingerprints TO authenticated;
GRANT ALL ON public.document_fingerprints TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.evidence_matches TO authenticated;
GRANT ALL ON public.evidence_matches TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.duplicate_candidates TO authenticated;
GRANT ALL ON public.duplicate_candidates TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.accounting_judgements TO authenticated;
GRANT ALL ON public.accounting_judgements TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.year_end_checks TO authenticated;
GRANT ALL ON public.year_end_checks TO service_role;
