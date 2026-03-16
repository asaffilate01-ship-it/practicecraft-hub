import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, Edit, Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { RoleEditor } from "@/components/settings/RoleEditor";

export default function RolesManagement() {
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);

  const { data: roles = [], isLoading } = useQuery({
    queryKey: ["roles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("roles")
        .select("*")
        .order("is_system_role", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const editingRole = roles.find((r: any) => r.id === editingRoleId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Roles & Permissions</h1>
          <p className="text-sm text-muted-foreground">Manage staff roles and module access</p>
        </div>
      </div>

      {editingRole ? (
        <RoleEditor role={editingRole} onClose={() => setEditingRoleId(null)} />
      ) : isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {roles.map((role: any) => {
            const perms = role.permissions_json || {};
            const moduleCount = Object.keys(perms).length;
            return (
              <Card key={role.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Shield className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{role.name}</p>
                      <p className="text-xs text-muted-foreground">{role.description || `${moduleCount} modules`}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {role.is_system_role && <Badge variant="secondary">System</Badge>}
                    <Button variant="ghost" size="icon" onClick={() => setEditingRoleId(role.id)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
