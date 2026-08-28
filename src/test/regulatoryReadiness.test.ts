import { describe, expect, it } from "vitest";
import { readinessCounts, regulatoryReadiness } from "@/lib/regulatoryReadiness";

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
});
