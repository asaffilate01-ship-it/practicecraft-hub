import React, { createContext, useContext, useEffect, useState } from "react";
import { getSelectedTenantId } from "@/practice/tenancy/tenantStore";
import { practiceBranding, type PracticeTenantBranding } from "@/practice/fixtures";

const Ctx = createContext<PracticeTenantBranding | null>(null);

export function usePracticeBranding() {
  return useContext(Ctx);
}

function applyCssVars(b?: PracticeTenantBranding | null) {
  const root = document.documentElement;
  const primary = b?.primaryColor || "#111111";
  const accent = b?.accentColor || primary;
  root.style.setProperty("--brand-primary", primary);
  root.style.setProperty("--brand-accent", accent);
}

export function PracticeBrandingProvider({ children }: { children: React.ReactNode }) {
  const tenantId = getSelectedTenantId();
  const branding = practiceBranding.tenants[tenantId] ?? practiceBranding.tenants["t-001"] ?? null;

  useEffect(() => {
    applyCssVars(branding);
    if (branding?.practiceName) document.title = `${branding.practiceName} — Practice`;
  }, [branding]);

  return <Ctx.Provider value={branding}>{children}</Ctx.Provider>;
}
