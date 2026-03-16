
-- Fix views by dropping and recreating with SECURITY INVOKER

DROP VIEW IF EXISTS public.v_tasks_due_next_14d CASCADE;
CREATE VIEW public.v_tasks_due_next_14d
WITH (security_invoker = true)
AS
SELECT t.tenant_id,
    t.id AS task_id,
    t.title,
    t.status,
    t.priority,
    t.due_date,
    (t.due_date - CURRENT_DATE) AS days_until_due,
    c.id AS client_id,
    c.legal_name AS client_legal_name,
    p.full_name AS assigned_user_name
FROM tasks t
LEFT JOIN clients c ON c.id = t.client_id AND c.tenant_id = t.tenant_id
LEFT JOIN profiles p ON p.id = t.assigned_to_user_id
WHERE t.due_date IS NOT NULL
  AND t.due_date >= CURRENT_DATE
  AND t.due_date <= (CURRENT_DATE + interval '14 days')
  AND t.status NOT IN ('done', 'cancelled');

-- Recreate v_practice_dashboard_kpis with SECURITY INVOKER
DROP VIEW IF EXISTS public.v_practice_dashboard_kpis CASCADE;
CREATE VIEW public.v_practice_dashboard_kpis
WITH (security_invoker = true)
AS
SELECT t.id AS tenant_id,
    (SELECT count(*) FROM clients c WHERE c.tenant_id = t.id AND c.status = 'active') AS active_clients,
    (SELECT count(*) FROM tasks x WHERE x.tenant_id = t.id AND x.status NOT IN ('done', 'cancelled')) AS open_tasks,
    (SELECT count(*) FROM tasks x WHERE x.tenant_id = t.id AND x.due_date < CURRENT_DATE AND x.status NOT IN ('done', 'cancelled')) AS overdue_tasks,
    (SELECT count(*) FROM vat_returns vr WHERE vr.tenant_id = t.id AND vr.period_end >= CURRENT_DATE AND vr.period_end <= (CURRENT_DATE + '14 days'::interval) AND vr.status = 'draft') AS vat_due_14d,
    (SELECT count(*) FROM invoices i WHERE i.tenant_id = t.id AND i.status = 'overdue') AS overdue_invoices
FROM tenants t;
