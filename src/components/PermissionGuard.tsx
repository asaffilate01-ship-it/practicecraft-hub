import { usePermissions } from "@/hooks/usePermissions";
import { Navigate } from "react-router-dom";
import { ShieldX } from "lucide-react";

interface PermissionGuardProps {
  module: string;
  action: string;
  children: React.ReactNode;
}

export function PermissionGuard({ module, action, children }: PermissionGuardProps) {
  const { can, loading, userKind } = usePermissions();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // Portal users trying to access staff routes → redirect to portal
  if (userKind === "portal") {
    return <Navigate to="/portal" replace />;
  }

  if (!can(module, action)) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-muted-foreground">
        <ShieldX className="w-12 h-12" />
        <h2 className="text-lg font-semibold text-foreground">Access Denied</h2>
        <p className="text-sm">You don't have permission to access this page.</p>
      </div>
    );
  }

  return <>{children}</>;
}
