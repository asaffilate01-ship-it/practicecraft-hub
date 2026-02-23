import { getPortalSession, canAccess } from "@/portal/auth/session";

export function PermissionGate({ feature, children }: { feature: string; children: React.ReactNode }) {
  const s = getPortalSession();
  if (!canAccess(s.role, feature)) return null;
  return <>{children}</>;
}
