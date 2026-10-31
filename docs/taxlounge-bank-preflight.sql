-- TaxLounge bank pre-deployment integrity audit (read-only).
-- Run as a privileged reviewer on an isolated STAGING/RESTORED copy of the
-- correct TaxLounge database. No DELETE/UPDATE/INSERT/DDL is performed.
-- A missing result for a tenant means zero violations in that category.
-- DO NOT execute against Dishbee, TaxNuvia or Finvessa.

SELECT current_database() AS database_name, current_user AS reviewer_role,
       current_timestamp AS inspected_at;

WITH violations AS (
  SELECT bc.tenant_id, 'bank_connection_client'::text AS finding,
         count(*)::bigint AS invalid_rows
  FROM public.bank_connections bc
  LEFT JOIN public.clients c ON c.id=bc.client_id AND c.tenant_id=bc.tenant_id
  WHERE c.id IS NULL
  GROUP BY bc.tenant_id

  UNION ALL
  SELECT bc.tenant_id, 'bank_connection_ledger_account', count(*)::bigint
  FROM public.bank_connections bc
  LEFT JOIN public.chart_of_accounts a
    ON a.id=bc.ledger_account_id AND a.tenant_id=bc.tenant_id
  WHERE bc.ledger_account_id IS NOT NULL AND a.id IS NULL
  GROUP BY bc.tenant_id

  UNION ALL
  SELECT bt.tenant_id, 'bank_transaction_connection_client', count(*)::bigint
  FROM public.bank_transactions bt
  LEFT JOIN public.bank_connections bc
    ON bc.id=bt.bank_connection_id
   AND bc.tenant_id=bt.tenant_id AND bc.client_id=bt.client_id
  WHERE bc.id IS NULL
  GROUP BY bt.tenant_id

  UNION ALL
  SELECT bt.tenant_id, 'bank_transaction_confirmed_account', count(*)::bigint
  FROM public.bank_transactions bt
  LEFT JOIN public.chart_of_accounts a
    ON a.id=bt.confirmed_account_id AND a.tenant_id=bt.tenant_id
  WHERE bt.confirmed_account_id IS NOT NULL AND a.id IS NULL
  GROUP BY bt.tenant_id

  UNION ALL
  SELECT bt.tenant_id, 'bank_transaction_suggested_account', count(*)::bigint
  FROM public.bank_transactions bt
  LEFT JOIN public.chart_of_accounts a
    ON a.id=bt.suggested_account_id AND a.tenant_id=bt.tenant_id
  WHERE bt.suggested_account_id IS NOT NULL AND a.id IS NULL
  GROUP BY bt.tenant_id

  UNION ALL
  SELECT bt.tenant_id, 'posted_without_journal', count(*)::bigint
  FROM public.bank_transactions bt
  WHERE bt.categorisation_status = 'posted' AND bt.journal_entry_id IS NULL
  GROUP BY bt.tenant_id
)
SELECT tenant_id, finding, invalid_rows
FROM violations
WHERE invalid_rows > 0
ORDER BY tenant_id, finding;

-- Record but do not auto-migrate legacy provider records. The newly-secured
-- application does not activate/refresh their consents.
SELECT tenant_id, provider, status, count(*)::bigint AS connection_records
FROM public.bank_connections
WHERE provider <> 'manual'
GROUP BY tenant_id, provider, status
ORDER BY tenant_id, provider, status;

-- Confirm the security migration is installed before enabling the UI.
SELECT c.conname AS constraint_name, c.convalidated AS validated
FROM pg_constraint c
WHERE c.conname LIKE 'taxlounge_bank_%'
ORDER BY c.conname;

SELECT schemaname, tablename, policyname, cmd, roles
FROM pg_policies
WHERE schemaname='public'
  AND tablename IN ('bank_connections','bank_transactions')
ORDER BY tablename, policyname;
