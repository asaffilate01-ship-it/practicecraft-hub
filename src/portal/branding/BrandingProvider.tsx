import React, { createContext, useContext, useEffect } from "react";

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

// Mock branding data — later replaced with API call
const MOCK_BRANDING: Branding = {
  practiceName: "IQ Advisory",
  portalName: "IQ Advisory Client Portal",
  logoUrl: "https://dummyimage.com/160x40/000/fff&text=IQ+Advisory",
  primaryColor: "#111111",
  accentColor: "#111111",
  supportEmail: "support@iqadvisory.co.uk",
  supportPhone: "+44 20 0000 0000",
  legalLinks: {
    termsUrl: "https://example.com/terms",
    privacyUrl: "https://example.com/privacy",
  },
};

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const branding = MOCK_BRANDING;

  useEffect(() => {
    if (branding?.portalName) document.title = branding.portalName;
  }, [branding]);

  return <BrandingCtx.Provider value={branding}>{children}</BrandingCtx.Provider>;
}
