/**
 * Staff session helpers.
 * 
 * IMPORTANT: Role & identity are now derived from Supabase auth via usePermissions().
 * These helpers exist only for legacy compatibility and module-gating logic.
 * They should NOT be used as a source of truth for access control.
 */

export type StaffRole = "owner" | "admin" | "manager" | "bookkeeper" | "payroll" | "viewer";

export type StaffSession = {
  role: StaffRole;
  name: string;
  email: string;
};

/**
 * Maps the DB app_role values to the StaffRole type used in module gating.
 */
const ROLE_MAP: Record<string, StaffRole> = {
  super_admin: "owner",
  firm_owner: "owner",
  manager: "manager",
  staff: "bookkeeper",
  payroll_officer: "payroll",
  client_user: "viewer",
  employee: "viewer",
};

/**
 * Build a StaffSession from real auth data.
 * Call this with values from usePermissions() and useAuth().
 */
export function buildStaffSession(
  appRole: string | null,
  fullName: string | null,
  email: string | null
): StaffSession {
  return {
    role: ROLE_MAP[appRole ?? ""] ?? "owner",
    name: fullName || "Staff User",
    email: email || "",
  };
}

/**
 * @deprecated Use buildStaffSession() with real auth data instead.
 * Kept only for edge cases where hooks aren't available.
 */
export function getStaffSession(): StaffSession {
  return {
    role: "owner",
    name: "Staff User",
    email: "",
  };
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
    return ["clients", "vat", "bookkeeping", "documents", "tasks", "submissions"].includes(moduleKey);
  }
  // owner, admin, manager see everything
  return true;
}
