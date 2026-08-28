export type LoginAudience = "staff" | "client";

export type LoginUserType = {
  is_staff?: boolean;
  is_portal?: boolean;
  portal_role?: string | null;
};

export function resolveLoginDestination(info: LoginUserType, audience: LoginAudience): string {
  if (info.is_staff && info.is_portal) {
    if (audience === "staff") return "/";
    return info.portal_role === "employee" ? "/employee" : "/portal";
  }
  if (info.is_staff) return "/";
  if (info.is_portal) return info.portal_role === "employee" ? "/employee" : "/portal";
  return "/";
}
