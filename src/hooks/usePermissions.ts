import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PERMISSION_CATALOG } from "@/rbac/permissionCatalog";
import type { PermissionsJSON } from "@/rbac/permissionUtils";

/** Maps app_role enum → roles.name in the tenant roles table */
const ROLE_ENUM_TO_NAME: Record<string, string> = {
  super_admin: "Firm Owner", // super admins get full access via Firm Owner perms
  firm_owner: "Firm Owner",
  manager: "Manager",
  staff: "Staff Accountant",
  payroll_officer: "Payroll Officer",
  client_user: "Client User",
  employee: "Employee User",
};

export interface UsePermissionsResult {
  /** Check if the user has a specific module.action permission */
  can: (module: string, action: string) => boolean;
  /** The full permissions JSON object */
  permissions: PermissionsJSON | null;
  /** The user's app_role enum value */
  role: string | null;
  /** The user's tenant_id */
  tenantId: string | null;
  /** Whether permissions are still loading */
  loading: boolean;
}

export function usePermissions(): UsePermissionsResult {
  const { user } = useAuth();

  // Step 1: Get profile (tenant_id) + user_role (app_role)
  const { data: userInfo, isLoading: loadingUserInfo } = useQuery({
    queryKey: ["user-permissions-info", user?.id],
    queryFn: async () => {
      const [profileRes, roleRes] = await Promise.all([
        supabase.from("profiles").select("tenant_id").eq("id", user!.id).single(),
        supabase.from("user_roles").select("role, tenant_id").eq("user_id", user!.id).limit(1).single(),
      ]);

      if (profileRes.error) throw profileRes.error;
      if (roleRes.error) throw roleRes.error;

      return {
        tenantId: profileRes.data.tenant_id,
        appRole: roleRes.data.role as string,
      };
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Step 2: Get the role's permissions_json from the roles table
  const { data: permissions, isLoading: loadingPermissions } = useQuery({
    queryKey: ["role-permissions", userInfo?.tenantId, userInfo?.appRole],
    queryFn: async () => {
      const roleName = ROLE_ENUM_TO_NAME[userInfo!.appRole] || "Staff Accountant";

      const { data, error } = await supabase
        .from("roles")
        .select("permissions_json")
        .eq("tenant_id", userInfo!.tenantId!)
        .eq("name", roleName)
        .limit(1)
        .single();

      if (error) {
        console.warn("Could not load role permissions, falling back to empty", error);
        return null;
      }

      return data.permissions_json as PermissionsJSON;
    },
    enabled: !!userInfo?.tenantId && !!userInfo?.appRole,
    staleTime: 5 * 60 * 1000,
  });

  const can = (module: string, action: string): boolean => {
    // Super admin / firm_owner bypass: grant all permissions
    if (userInfo?.appRole === "super_admin" || userInfo?.appRole === "firm_owner") {
      // Still respect the catalog - only allow known module.action pairs
      return PERMISSION_CATALOG[module]?.includes(action) ?? false;
    }
    return Boolean(permissions?.[module]?.[action]);
  };

  return {
    can,
    permissions: permissions ?? null,
    role: userInfo?.appRole ?? null,
    tenantId: userInfo?.tenantId ?? null,
    loading: loadingUserInfo || loadingPermissions,
  };
}
