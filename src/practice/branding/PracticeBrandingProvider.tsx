import React, { createContext, useContext, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/hooks/usePermissions";

export type PracticeTenantBranding = {
  tenantId: string;
  practiceName: string;
  logoUrl?: string;
  primaryColor?: string;
  accentColor?: string;
  supportEmail?: string;
};

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
  const { tenantId } = usePermissions();

  const { data: branding } = useQuery({
    queryKey: ["tenant-branding", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("id, firm_name, logo_url, brand_primary_color, brand_secondary_color, support_email")
        .eq("id", tenantId!)
        .single();

      if (error || !data) return null;

      return {
        tenantId: data.id,
        practiceName: data.firm_name,
        logoUrl: data.logo_url ?? undefined,
        primaryColor: data.brand_primary_color ?? "#111111",
        accentColor: data.brand_secondary_color ?? data.brand_primary_color ?? "#111111",
        supportEmail: data.support_email ?? undefined,
      } as PracticeTenantBranding;
    },
    enabled: !!tenantId,
    staleTime: 5 * 60_000,
  });

  useEffect(() => {
    applyCssVars(branding);
    if (branding?.practiceName) document.title = `${branding.practiceName} — Practice`;
  }, [branding]);

  return <Ctx.Provider value={branding ?? null}>{children}</Ctx.Provider>;
}
