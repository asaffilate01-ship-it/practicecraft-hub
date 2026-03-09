import React, { createContext, useContext, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/hooks/usePermissions";

type Branding = {
  portalName: string;
  practiceName: string;
  logoUrl?: string;
  primaryColor?: string;
  accentColor?: string;
  supportEmail?: string;
  supportPhone?: string;
  legalLinks?: { termsUrl?: string; privacyUrl?: string };
};

const BrandingCtx = createContext<Branding | null>(null);

export function useBranding() {
  return useContext(BrandingCtx);
}

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const { tenantId } = usePermissions();

  const { data: branding } = useQuery({
    queryKey: ["portal-branding", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("firm_name, trading_name, logo_url, brand_primary_color, brand_secondary_color, support_email, phone")
        .eq("id", tenantId!)
        .single();

      if (error || !data) {
        return {
          practiceName: "Practice",
          portalName: "Client Portal",
        } as Branding;
      }

      const name = data.trading_name || data.firm_name;
      return {
        practiceName: name,
        portalName: `${name} Client Portal`,
        logoUrl: data.logo_url ?? undefined,
        primaryColor: data.brand_primary_color ?? "#111111",
        accentColor: data.brand_secondary_color ?? data.brand_primary_color ?? "#111111",
        supportEmail: data.support_email ?? undefined,
        supportPhone: data.phone ?? undefined,
      } as Branding;
    },
    enabled: !!tenantId,
    staleTime: 5 * 60_000,
  });

  useEffect(() => {
    if (branding?.portalName) document.title = branding.portalName;
  }, [branding]);

  return <BrandingCtx.Provider value={branding ?? null}>{children}</BrandingCtx.Provider>;
}
