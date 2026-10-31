import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { TAXLOUNGE } from "@/lib/productIdentity";
import { visibleMobileNavigation } from "@/lib/mobileNavigation";
import { clearLegacySupabaseResponseCache } from "@/lib/legacyApiCache";

describe("TaxLounge identity", () => {
  it("keeps its own product name", () => {
    expect(TAXLOUNGE.name).toBe("TaxLounge");
    expect(TAXLOUNGE.displaySlug).toBe("taxlounge");
  });
});

describe("mobile navigation parity", () => {
  const all = () => true;
  const features = { clients: true, tasks: true, accounts: true };
  it("fails closed while permissions and entitlements are unresolved", () => {
    expect(visibleMobileNavigation({ can: () => false, features: {}, role: "viewer" }).map(x => x.id)).toEqual(["home"]);
  });
  it("shows authorised owner shortcuts", () => {
    expect(visibleMobileNavigation({ can: all, features, role: "owner" }).map(x => x.id))
      .toEqual(["home", "clients", "tasks", "review", "accounts"]);
  });
  it("hides disabled paid modules", () => {
    expect(visibleMobileNavigation({ can: all, features: { clients: true, tasks: true, accounts: false }, role: "owner" }).map(x => x.id))
      .toEqual(["home", "clients", "tasks"]);
  });
  it("enforces role module limits", () => {
    expect(visibleMobileNavigation({ can: all, features, role: "viewer" }).map(x => x.id))
      .toEqual(["home", "clients", "tasks"]);
  });
});

describe("legacy authenticated response cache", () => {
  it("deletes the old API cache", async () => {
    const remove = vi.fn(async () => true);
    expect(await clearLegacySupabaseResponseCache({ delete: remove })).toBe(true);
    expect(remove).toHaveBeenCalledWith("supabase-api");
  });
  it("does not block startup if Cache Storage cannot be used", async () => {
    expect(await clearLegacySupabaseResponseCache({ delete: async () => { throw Error("disabled"); } })).toBe(false);
  });
});

describe("release safety source contracts", () => {
  it("does not cache Supabase API responses in the PWA", () => {
    const config = readFileSync("vite.config.ts", "utf8");
    expect(config).not.toContain('cacheName: "supabase-api"');
    expect(config).toContain('cacheName: "taxlounge-route-modules"');
  });
  it("allows pinch-zoom and does not claim an unverified canonical domain", () => {
    const html = readFileSync("index.html", "utf8");
    expect(html).not.toContain("user-scalable=no");
    expect(html).not.toContain("iqpracticecloud.com");
    expect(html).toContain("TaxLounge");
  });
});
