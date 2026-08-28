import { describe, expect, it } from "vitest";
import { resolveLoginDestination } from "@/lib/authRouting";

describe("role dashboard routing", () => {
  it("routes staff to the practice dashboard", () => {
    expect(resolveLoginDestination({ is_staff: true }, "staff")).toBe("/");
  });

  it("routes a client administrator to the client portal", () => {
    expect(resolveLoginDestination({ is_portal: true, portal_role: "client_admin" }, "client")).toBe("/portal");
  });

  it("routes an employee to the isolated payslip dashboard", () => {
    expect(resolveLoginDestination({ is_portal: true, portal_role: "employee" }, "client")).toBe("/employee");
  });

  it("honours the selected audience for a legacy dual identity", () => {
    const dual = { is_staff: true, is_portal: true, portal_role: "client_admin" };
    expect(resolveLoginDestination(dual, "staff")).toBe("/");
    expect(resolveLoginDestination(dual, "client")).toBe("/portal");
  });

  it("never sends a dual employee identity to the client-admin home", () => {
    expect(resolveLoginDestination({ is_staff: true, is_portal: true, portal_role: "employee" }, "client")).toBe("/employee");
  });
});
