import React, { createContext, useContext } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/hooks/usePermissions";

type Features = Record<string, boolean>;
const FeaturesCtx = createContext<Features>({});

export function useFeatures() {
  return useContext(FeaturesCtx);
}

/**
 * DB-driven portal feature flags.
 * Reads the tenant's subscription → plan → allowed_modules.
 */
export function FeaturesProvider({ children }: { children: React.ReactNode }) {
  const { tenantId } = usePermissions();

  const { data: features } = useQuery({
    queryKey: ["portal-features", tenantId],
    queryFn: async () => {
      const { data: sub, error } = await supabase
        .from("tenant_subscriptions")
        .select("plan_id, status, subscription_plans(allowed_modules)")
        .eq("tenant_id", tenantId!)
        .in("status", ["active", "trial"])
        .limit(1)
        .single();

      if (error || !sub) {
        // Fallback: show basic features
        return { deadlines: true, documents: true, messages: true, settings: true } as Features;
      }

      const plan = sub.subscription_plans as any;
      const allowed: string[] = plan?.allowed_modules || [];

      // Map plan modules to portal features
      const portalFeatureMap: Record<string, string[]> = {
        vat: ["vat"],
        payroll: ["payslips"],
        documents: ["documents"],
        billing: ["invoices"],
        submissions: ["submissions"],
        clients: ["deadlines", "messages"],
      };

      const result: Features = {
        deadlines: true,
        documents: true,
        messages: true,
        settings: true,
      };

      for (const mod of allowed) {
        const mapped = portalFeatureMap[mod];
        if (mapped) {
          for (const f of mapped) result[f] = true;
        }
      }

      return result;
    },
    enabled: !!tenantId,
    staleTime: 5 * 60_000,
  });

  // While loading show all features to avoid flash
  const resolved = features ?? {
    deadlines: true, documents: true, messages: true,
    invoices: true, vat: true, payslips: true, submissions: true,
  };

  return <FeaturesCtx.Provider value={resolved}>{children}</FeaturesCtx.Provider>;
}
