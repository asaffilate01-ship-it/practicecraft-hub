import React, { createContext, useContext } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/hooks/usePermissions";

type Features = Record<string, boolean>;
const Ctx = createContext<Features>({});

export function usePracticeFeatures(): Features {
  return useContext(Ctx);
}

/**
 * Replaces fixture-based feature flags with DB-driven plan gating.
 * Reads the tenant's subscription → plan → allowed_modules and builds a boolean map.
 */
export function PracticeFeaturesProvider({ children }: { children: React.ReactNode }) {
  const { tenantId } = usePermissions();

  const { data: features } = useQuery({
    queryKey: ["tenant-features", tenantId],
    queryFn: async () => {
      // Get tenant subscription + plan
      const { data: sub, error: subErr } = await supabase
        .from("tenant_subscriptions")
        .select("plan_id, status, subscription_plans(allowed_modules)")
        .eq("tenant_id", tenantId!)
        .in("status", ["active", "trial"])
        .limit(1)
        .single();

      if (subErr || !sub) {
        // Fallback: no subscription = no modules (except basics)
        return { clients: true, tasks: true } as Features;
      }

      const plan = sub.subscription_plans as any;
      const allowedModules: string[] = plan?.allowed_modules || [];

      // Build boolean map of all known modules
      const allModules = [
        "clients", "tasks", "bookkeeping", "vat", "payroll", "accounts",
        "secretarial", "incorporations", "submissions", "documents",
        "billing", "kyc_aml", "reports", "practice_mgmt",
      ];

      const featureMap: Features = {};
      for (const mod of allModules) {
        featureMap[mod] = allowedModules.includes(mod);
      }
      return featureMap;
    },
    enabled: !!tenantId,
    staleTime: 5 * 60_000,
  });

  // While loading, show all modules to avoid flash of missing nav
  const resolvedFeatures = features ?? {
    clients: true, tasks: true, bookkeeping: true, vat: true,
    payroll: true, accounts: true, secretarial: true, incorporations: true,
    submissions: true, documents: true, billing: true, kyc_aml: true,
    reports: true, practice_mgmt: true,
  };

  return <Ctx.Provider value={resolvedFeatures}>{children}</Ctx.Provider>;
}
