/**
 * Portal session helpers.
 * 
 * IMPORTANT: Role & identity are now derived from Supabase auth via usePermissions().
 * These helpers exist for legacy compatibility in components that can't use hooks.
 */

export type PortalRole = "client_admin" | "client_user" | "employee";

export type PortalSession = {
  role: PortalRole;
  userName: string;
  email: string;
};

/**
 * Build a PortalSession from real auth data.
 * Call this with values from usePermissions() and useAuth().
 */
export function buildPortalSession(
  portalRole: string | null,
  fullName: string | null,
  email: string | null
): PortalSession {
  const roleMap: Record<string, PortalRole> = {
    client_admin: "client_admin",
    client_user: "client_user",
    employee: "employee",
  };
  return {
    role: roleMap[portalRole ?? ""] ?? "client_user",
    userName: fullName || "Client User",
    email: email || "",
  };
}

/**
 * @deprecated Use buildPortalSession() with real auth data instead.
 */
export function getPortalSession(): PortalSession {
  return {
    role: "client_user",
    userName: "Client User",
    email: "",
  };
}

export function canAccess(role: PortalRole, feature: string): boolean {
  if (role === "employee") {
    return feature === "payslips" || feature === "settings";
  }
  return true;
}
