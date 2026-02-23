export type PortalRole = "client_admin" | "client_user" | "employee";

export type PortalSession = {
  role: PortalRole;
  userName: string;
  email: string;
};

export function getPortalSession(): PortalSession {
  const role = (localStorage.getItem("portal_role") as PortalRole) || "client_admin";
  const userName = localStorage.getItem("portal_user") || "Client User";
  const email = localStorage.getItem("portal_email") || "client@example.com";
  return { role, userName, email };
}

export function canAccess(role: PortalRole, feature: string): boolean {
  if (role === "employee") {
    return feature === "payslips" || feature === "settings";
  }
  return true;
}
