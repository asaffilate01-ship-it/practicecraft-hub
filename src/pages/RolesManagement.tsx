import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/contexts/AuthContext";
import { PERMISSION_CATALOG, MODULE_LABELS, ACTION_LABELS } from "@/rbac/permissionCatalog";
import { buildBlankPermissions, type PermissionsJSON } from "@/rbac/permissionUtils";
import type { Tables } from "@/integrations/supabase/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, Edit } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

// Convert the historical array format into the boolean-map contract used by RBAC.
function editablePermissions(value: unknown): PermissionsJSON {
  const result = buildBlankPermissions();
  const source = (value || {}) as Record<string, unknown>;
  for (const [module, actions] of Object.entries(PERMISSION_CATALOG)) {
    const permissions = source[module];
    for (const action of actions) result[module][action] = Array.isArray(permissions)
      ? permissions.includes(action) : (permissions as Record<string, unknown> | undefined)?.[action] === true;
  }
  return result;
}

export default function RolesManagement() {
  const { tenantId, role, loading } = usePermissions();
  const { user } = useAuth();
  const qc = useQueryClient();
  const canManage = !loading && ['firm_owner', 'super_admin'].includes(role || '');
  const [saving, setSaving] = useState(false);
  const [editingRole, setEditingRole] = useState<(Omit<Tables<'roles'>, 'permissions_json'> & { permissions_json: PermissionsJSON }) | null>(null);

  const { data: roles = [], isLoading, refetch, error: loadError } = useQuery({
    queryKey: ["roles", user?.id, tenantId],
    enabled: !!user && !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("roles")
        .select("*").eq("tenant_id", tenantId!)
        .order("is_system_role", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const handleToggle = (module: string, action: string) => {
    if (!editingRole) return;
    setEditingRole({ ...editingRole, permissions_json: {
      ...editingRole.permissions_json,
      [module]: { ...editingRole.permissions_json[module], [action]: !editingRole.permissions_json[module]?.[action] },
    } });
  };

  const handleSave = async () => {
    if (!editingRole || !canManage || editingRole.tenant_id !== tenantId) return;
    setSaving(true);
    try {
      const { data, error } = await supabase.from("roles")
        .update({ permissions_json: editingRole.permissions_json }).eq("id", editingRole.id).eq("tenant_id", tenantId!)
        .select("id").single();
      if (error || !data) throw new Error("Role update refused. Confirm owner access and the role-security migration.");
      toast.success("Role updated");
      setEditingRole(null);
      await qc.invalidateQueries({ queryKey: ['role-permissions', tenantId] });
      await refetch();
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not save role'); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Roles & Permissions</h1>
        <p className="text-sm text-muted-foreground">Practice owners manage staff roles and module access</p>
      </div>

      {loadError && <p role="alert" className="text-destructive">Roles could not be loaded.</p>}
      {!canManage && !loading && <p className="text-sm text-muted-foreground">You can view permissions; changes require the practice owner.</p>}
      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />)}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {roles.map((role) => {
            const perms = editablePermissions(role.permissions_json);
            const moduleCount = Object.values(perms).filter(actions => Object.values(actions).some(Boolean)).length;
            return (
              <Card key={role.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center"><Shield className="w-4 h-4 text-primary" /></div>
                    <div>
                      <p className="text-sm font-medium">{role.name}</p>
                      <p className="text-xs text-muted-foreground">{role.description || `${moduleCount} modules`}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {role.is_system_role && <Badge variant="secondary">System</Badge>}
                    <Button aria-label={`Edit ${role.name}`} disabled={!canManage} variant="ghost" size="icon" onClick={() => setEditingRole({ ...role, permissions_json: editablePermissions(role.permissions_json) })}>
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!editingRole} onOpenChange={(o) => !o && setEditingRole(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit: {editingRole?.name}</DialogTitle><DialogDescription>Choose the actions this role can perform in your practice.</DialogDescription></DialogHeader>
          <div className="space-y-3">
            {Object.entries(PERMISSION_CATALOG).map(([mod, actions]) => {
              const perms = editingRole?.permissions_json?.[mod] || {};
              return (
                <div key={mod} className="flex items-center gap-4 py-1 border-b last:border-0">
                  <span className="text-sm font-medium w-32 capitalize">{MODULE_LABELS[mod] || mod}</span>
                  <div className="flex gap-3 flex-wrap">
                    {actions.map((action) => (
                      <label key={action} className="flex items-center gap-1.5 text-xs">
                        <Checkbox checked={perms[action] === true} disabled={!canManage || saving} onCheckedChange={() => handleToggle(mod, action)} />
                        {ACTION_LABELS[action] || action}
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setEditingRole(null)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!canManage || saving}>{saving ? "Saving…" : "Save Changes"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
