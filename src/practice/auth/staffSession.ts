export type StaffRole = "owner" | "admin" | "manager" | "bookkeeper" | "payroll" | "viewer";

export type StaffSession = {
  role: StaffRole;
  name: string;
  email: string;
};

export function getStaffSession(): StaffSession {
  const role = (localStorage.getItem("staff_role") as StaffRole) || "owner";
  const name = localStorage.getItem("staff_name") || "Staff User";
  const email = localStorage.getItem("staff_email") || "staff@example.com";
  return { role, name, email };
}

/** Role-based module gating — restricts what nav items a role can see */
export function canUseModule(role: StaffRole, moduleKey: string): boolean {
  if (role === "viewer") {
    return ["clients", "documents", "tasks", "submissions", "secretarial"].includes(moduleKey);
  }
  if (role === "payroll") {
    return ["clients", "payroll", "submissions", "documents", "tasks"].includes(moduleKey);
  }
  if (role === "bookkeeper") {
    return ["clients", "vat", "documents", "tasks", "submissions"].includes(moduleKey);
  }
  // owner, admin, manager see everything
  return true;
}
