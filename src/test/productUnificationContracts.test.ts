import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("product unification contracts", () => {
  const app = read("src/App.tsx");
  const sidebar = read("src/components/layout/AppSidebar.tsx");
  const companiesHouse = read("supabase/functions/companies-house/index.ts");

  it("routes the sidebar entry to a real company secretarial portfolio", () => {
    expect(sidebar).toContain('url: "/secretarial"');
    expect(app).toContain('path="/secretarial"');
    expect(app).toContain('path="/secretarial/companies/:clientId"');
    expect(read("src/pages/Secretarial.tsx")).toContain("<CompanyPortfolio />");
  });

  it("keeps secondary navigation groups collapsed until requested", () => {
    expect(sidebar).toContain("g.defaultOpen ?? false");
    expect(sidebar).not.toContain("[g.label, true]");
  });

  it("provides one human-controlled AI review entry point", () => {
    expect(sidebar).toContain('title: "AI Review Centre"');
    expect(sidebar).toContain('url: "/review-centre"');
    expect(app).toContain('path="/review-centre"');
    expect(read("src/pages/AccountsIntelligence.tsx")).toContain("Suggestions require human approval");
  });

  it("syncs Companies House records only for the authenticated tenant client", () => {
    expect(companiesHouse).toContain('path === "sync-company"');
    expect(companiesHouse).toContain("callerTenantId");
    expect(companiesHouse).toContain('event_type: "companies_house_company_synced"');
    expect(companiesHouse).toContain('.eq("tenant_id",callerTenantId)');
  });
});
