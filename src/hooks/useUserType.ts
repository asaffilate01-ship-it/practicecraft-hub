import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface UserTypeInfo {
  is_staff: boolean;
  is_portal: boolean;
  staff_tenant_id: string | null;
  portal_tenant_id: string | null;
  portal_role: string | null;
  staff_role: string | null;
}

export function useUserType() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["user-type", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_user_type", {
        _user_id: user!.id,
      });
      if (error) throw error;
      return data as unknown as UserTypeInfo;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  return {
    userType: data ?? null,
    loading: isLoading,
    isStaff: data?.is_staff ?? false,
    isPortal: data?.is_portal ?? false,
    redirectPath: data
      ? data.is_staff
        ? "/"
        : data.is_portal
          ? "/portal"
          : "/"
      : null,
  };
}
