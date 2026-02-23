
-- Fix security definer views by setting security_invoker = true
ALTER VIEW public.v_secretarial_due SET (security_invoker = true);
ALTER VIEW public.v_secretarial_changes_pending SET (security_invoker = true);
ALTER VIEW public.v_company_register_health SET (security_invoker = true);
