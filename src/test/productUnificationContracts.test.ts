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

  it("keeps one selected client visible across practice modules", () => {
    const layout = read("src/components/layout/AppLayout.tsx");
    const clientBar = read("src/components/layout/ClientWorkspaceBar.tsx");
    expect(layout).toContain("<ClientWorkspaceBar />");
    expect(clientBar).toContain("selectedClientId");
    expect(clientBar).toContain("entityRoutes");
    expect(read("src/pages/ClientDetail.tsx")).toContain("<ClientActivityTimeline");
  });

  it("uses persistent operational records instead of sample dashboards", () => {
    const proposals = read("src/pages/Proposals.tsx");
    const calendar = read("src/pages/Calendar.tsx");
    const currencies = read("src/pages/MultiCurrency.tsx");
    const trialBalance = read("src/pages/TrialBalanceImport.tsx");
    expect(proposals).toContain('from("proposals")');
    expect(calendar).toContain('from("calendar_events")');
    expect(currencies).toContain('from("currencies")');
    expect(currencies).toContain('from("ec_sales_entries")');
    expect(trialBalance).toContain('from("tb_imports")');
    expect(trialBalance).toContain("parseTrialBalance");
    expect(`${proposals}${calendar}${currencies}${trialBalance}`).not.toContain("SAMPLE_");
  });

  it("applies the shared workspace header to specialist workbenches", () => {
    for (const page of ["CharitiesWorkbench", "PartnershipsWorkbench", "AmlWorkbench", "CisWorkbench", "ItsaWorkbench", "PensionWorkbench", "IxbrlTagging", "Incorporations", "Submissions"]) {
      expect(read(`src/pages/${page}.tsx`)).toContain("<WorkspacePageHeader");
    }
  });
});
