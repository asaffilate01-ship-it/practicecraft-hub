
-- Fix security definer views by recreating with security_invoker = true
ALTER VIEW public.v_overdue_tasks SET (security_invoker = true);
ALTER VIEW public.v_tasks_due_next_14d SET (security_invoker = true);
ALTER VIEW public.v_vat_due SET (security_invoker = true);
ALTER VIEW public.v_submission_success_30d SET (security_invoker = true);
ALTER VIEW public.v_billing_kpis SET (security_invoker = true);
ALTER VIEW public.v_practice_dashboard_kpis SET (security_invoker = true);
