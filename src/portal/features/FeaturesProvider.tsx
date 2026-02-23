import React, { createContext, useContext } from "react";

type Features = Record<string, boolean>;
const FeaturesCtx = createContext<Features>({});

export function useFeatures() {
  return useContext(FeaturesCtx);
}

// Mock feature flags — later replaced with API call
const MOCK_FEATURES: Features = {
  deadlines: true,
  documents: true,
  messages: true,
  invoices: true,
  vat: true,
  payslips: true,
  submissions: true,
};

export function FeaturesProvider({ children }: { children: React.ReactNode }) {
  return <FeaturesCtx.Provider value={MOCK_FEATURES}>{children}</FeaturesCtx.Provider>;
}
