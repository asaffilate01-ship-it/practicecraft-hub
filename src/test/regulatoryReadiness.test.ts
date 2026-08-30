import { describe, expect, it } from "vitest";
import { readinessCounts, regulatoryIntegrations, regulatoryReadiness } from "@/lib/regulatoryReadiness";

describe("regulatory readiness catalog", () => {
  it("does not describe a regulatory module as production approved", () => {
    const claims = regulatoryReadiness.filter(item => item.authority !== "Internal").map(item => `${item.current} ${item.next}`.toLowerCase());
    expect(claims.every(claim => !claim.includes("approved"))).toBe(true);
    expect(regulatoryReadiness.some(item => item.status === "blocked")).toBe(true);
  });
  it("assigns every module to a delivery phase", () => {
    expect(regulatoryReadiness.length).toBeGreaterThan(10);
    expect(regulatoryReadiness.every(item => [1,2,3,4].includes(item.phase))).toBe(true);
    expect(Object.values(readinessCounts()).reduce((total,value)=>total+value,0)).toBe(regulatoryReadiness.length);
  });
  it("keeps every regulatory filing out of beta until recognition work is complete", () => {
    expect(regulatoryReadiness.filter(item => item.authority !== "Internal" && item.status === "beta")).toEqual([]);
  });
  it("maps every external module to documented official integration routes", () => {
    const integrationKeys = new Set(regulatoryIntegrations.map(item => item.key));
    const external = regulatoryReadiness.filter(item => item.authority !== "Internal");
    expect(external.every(item => item.integrationKeys?.length)).toBe(true);
    expect(external.flatMap(item => item.integrationKeys ?? []).every(key => integrationKeys.has(key))).toBe(true);
    expect(regulatoryIntegrations.every(item => /^https:\/\//.test(item.officialUrl))).toBe(true);
  });
  it("does not mislabel legacy filing gateways as REST APIs", () => {
    expect(regulatoryIntegrations.find(item => item.key === "hmrc-rti-xml")?.protocol).toContain("XML");
    expect(regulatoryIntegrations.find(item => item.key === "hmrc-corporation-tax-xml")?.protocol).toContain("iXBRL");
    expect(regulatoryIntegrations.find(item => item.key === "charity-commission-register")?.covers.toLowerCase()).toContain("does not submit");
  });
});
