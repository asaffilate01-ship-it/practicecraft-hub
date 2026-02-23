import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PERMISSION_CATALOG } from "@/rbac/permissionCatalog";
import type { PermissionsJSON } from "@/rbac/permissionUtils";

/** Maps app_role enum → roles.name in the tenant roles table */
const ROLE_ENUM_TO_NAME: Record<string, string> = {
  super_admin: "Firm Owner",
  firm_owner: "Firm Owner",
  manager: "Manager",
  staff: "Staff Accountant",
  payroll_officer: "Payroll Officer",
  client_user: "Client User",
  employee: "Employee User",
};

export type UserKind = "staff" | "portal" | "unknown";

export interface UsePermissionsResult {
  /** Check if the user has a specific module.action permission */
  can: (module: string, action: string) => boolean;
  /** The full permissions JSON object */
  permissions: PermissionsJSON | null;
  /** The user's app_role enum value (staff) or portal_role (portal) */
  role: string | null;
  /** The user's tenant_id */
  tenantId: string | null;
  /** Whether permissions are still loading */
  loading: boolean;
  /** Whether the user is staff, portal, or unknown */
  userKind: UserKind;
}

export function usePermissions(): UsePermissionsResult {
  const { user } = useAuth();

  // Step 1: Detect user type using the RPC (handles both staff & portal)
  const { data: userType, isLoading: loadingType } = useQuery({
    queryKey: ["user-type-permissions", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_user_type", {
        _user_id: user!.id,
      });
      if (error) throw error;
      return data as any;
    },
    enabled: !!user,
    staleTime: 5 * 60_000,
  });

  const isStaff = userType?.is_staff === true;
  const isPortal = userType?.is_portal === true;
  const appRole = userType?.staff_role as string | null;
  const portalRole = userType?.portal_role as string | null;
  const tenantId = (isStaff ? userType?.staff_tenant_id : userType?.portal_tenant_id) as string | null;

  const userKind: UserKind = isStaff ? "staff" : isPortal ? "portal" : "unknown";

  // Step 2: For staff users, get role permissions from the roles table
  const { data: permissions, isLoading: loadingPermissions } = useQuery({
    queryKey: ["role-permissions", tenantId, appRole],
    queryFn: async () => {
      const roleName = ROLE_ENUM_TO_NAME[appRole!] || "Staff Accountant";

      const { data, error } = await supabase
        .from("roles")
        .select("permissions_json")
        .eq("tenant_id", tenantId!)
        .eq("name", roleName)
        .limit(1)
        .single();

      if (error) {
        console.warn("Could not load role permissions, falling back to empty", error);
        return null;
      }

      return data.permissions_json as PermissionsJSON;
    },
    enabled: isStaff && !!tenantId && !!appRole,
    staleTime: 5 * 60_000,
  });

  const can = (module: string, action: string): boolean => {
    // Staff: firm_owner / super_admin → full access to all known modules
    if (isStaff && (appRole === "super_admin" || appRole === "firm_owner")) {
      return PERMISSION_CATALOG[module]?.includes(action) ?? false;
    }

    // Staff: other roles → check permissions JSON
    if (isStaff) {
      return Boolean(permissions?.[module]?.[action]);
    }

    // Portal users: only allow portal-specific modules
    if (isPortal) {
      if (portalRole === "employee") {
        // Employees can only see payslips and settings
        return (module === "employee_portal" || module === "payslips") && action === "view";
      }
      // client_admin / client_user: portal modules
      const portalModules = ["client_portal", "portal", "documents", "messages", "payslips"];
      return portalModules.includes(module) && (action === "view" || action === "upload");
    }

    return false;
  };

  return {
    can,
    permissions: permissions ?? null,
    role: isStaff ? appRole : portalRole,
    tenantId,
    loading: loadingType || (isStaff && loadingPermissions),
    userKind,
  };
}
