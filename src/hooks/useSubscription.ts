import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/hooks/usePermissions";

export interface TenantSubscription {
  id: string;
  status: string;
  billing_cycle: string;
  current_period_start: string;
  current_period_end: string;
  trial_ends_at: string | null;
  plan: {
    code: string;
    name: string;
    max_clients: number;
    max_users: number;
    allowed_modules: string[];
    price_monthly_pence: number;
    price_annual_pence: number;
  };
}

export interface TenantUsage {
  clients_count: number;
  users_count: number;
  max_clients: number;
  max_users: number;
  plan_code: string;
  plan_name: string;
}

export function useSubscription() {
  const { tenantId } = usePermissions();

  return useQuery({
    queryKey: ["tenant-subscription", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenant_subscriptions")
        .select(`
          id, status, billing_cycle, current_period_start, current_period_end, trial_ends_at,
          subscription_plans(code, name, max_clients, max_users, allowed_modules, price_monthly_pence, price_annual_pence)
        `)
        .eq("tenant_id", tenantId!)
        .limit(1)
        .single();

      if (error) throw error;
      const plan = data.subscription_plans as any;
      return {
        id: data.id,
        status: data.status,
        billing_cycle: data.billing_cycle,
        current_period_start: data.current_period_start,
        current_period_end: data.current_period_end,
        trial_ends_at: data.trial_ends_at,
        plan: {
          code: plan.code,
          name: plan.name,
          max_clients: plan.max_clients,
          max_users: plan.max_users,
          allowed_modules: plan.allowed_modules,
          price_monthly_pence: plan.price_monthly_pence,
          price_annual_pence: plan.price_annual_pence,
        },
      } as TenantSubscription;
    },
    enabled: !!tenantId,
    staleTime: 5 * 60_000,
  });
}

export function useTenantUsage() {
  const { tenantId } = usePermissions();

  return useQuery({
    queryKey: ["tenant-usage", tenantId],
    queryFn: async () => {
      const [clientsRes, usersRes, subRes] = await Promise.all([
        supabase.from("clients").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase
          .from("tenant_subscriptions")
          .select("subscription_plans(max_clients, max_users, code, name)")
          .eq("tenant_id", tenantId!)
          .limit(1)
          .single(),
      ]);

      const plan = (subRes.data?.subscription_plans as any) || {};
      return {
        clients_count: clientsRes.count || 0,
        users_count: usersRes.count || 0,
        max_clients: plan.max_clients || 5,
        max_users: plan.max_users || 2,
        plan_code: plan.code || "starter",
        plan_name: plan.name || "Starter",
      } as TenantUsage;
    },
    enabled: !!tenantId,
    staleTime: 60_000,
  });
}
