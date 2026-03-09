import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Label } from "@/components/ui/label";

/**
 * In production multi-tenant, a user belongs to one tenant.
 * This component shows the tenant name (no switching needed for single-tenant users).
 * Multi-tenant staff (super-admins across firms) would need a real switcher — future enhancement.
 */
export function TenantSwitcher() {
  const { user } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ["profile-tenant", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("tenant_id, tenants(firm_name, plan_code)")
        .eq("id", user!.id)
        .single();
      return data;
    },
    enabled: !!user,
    staleTime: 10 * 60_000,
  });

  const tenant = profile?.tenants as any;
  if (!tenant) return null;

  return (
    <div className="px-3 space-y-1">
      <Label className="text-[10px] uppercase tracking-wider text-sidebar-foreground/60 font-medium">
        Firm
      </Label>
      <div className="h-8 flex items-center px-2 text-xs rounded-md bg-sidebar-accent border border-sidebar-border text-sidebar-foreground truncate">
        {tenant.firm_name} {tenant.plan_code ? `(${tenant.plan_code})` : ""}
      </div>
    </div>
  );
}
