import React, { createContext, useContext } from "react";
import { getSelectedTenantId } from "@/practice/tenancy/tenantStore";
import { practiceFeaturesByTenant } from "@/practice/fixtures";

type Features = Record<string, boolean>;
const Ctx = createContext<Features>({});

export function usePracticeFeatures(): Features {
  return useContext(Ctx);
}

export function PracticeFeaturesProvider({ children }: { children: React.ReactNode }) {
  const tenantId = getSelectedTenantId();
  const features = practiceFeaturesByTenant[tenantId] ?? practiceFeaturesByTenant["t-001"] ?? {};

  return <Ctx.Provider value={features}>{children}</Ctx.Provider>;
}
