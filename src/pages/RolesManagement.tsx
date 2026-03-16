import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, Edit } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

const ALL_MODULES = [
  "clients", "tasks", "ledger", "vat", "payroll", "accounts",
  "secretarial", "incorporations", "aml", "kyc_aml", "submissions",
  "billing", "documents", "reports", "settings", "automations",
  "integrations", "templates", "notifications", "practice_mgmt",
];

const ALL_ACTIONS = ["view", "create", "edit", "delete", "approve", "submit"];

export default function RolesManagement() {
  const [editingRole, setEditingRole] = useState<any>(null);

  const { data: roles = [], isLoading, refetch } = useQuery({
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

  const handleToggle = (module: string, action: string) => {
    if (!editingRole) return;
    const perms = { ...(editingRole.permissions_json || {}) };
    const modulePerms: string[] = perms[module] || [];
    if (modulePerms.includes(action)) {
      perms[module] = modulePerms.filter((a: string) => a !== action);
    } else {
      perms[module] = [...modulePerms, action];
    }
    setEditingRole({ ...editingRole, permissions_json: perms });
  };

  const handleSave = async () => {
    if (!editingRole) return;
    const { error } = await supabase
      .from("roles")
      .update({ permissions_json: editingRole.permissions_json })
      .eq("id", editingRole.id);
    if (error) { toast.error("Failed to save"); return; }
    toast.success("Role updated");
    setEditingRole(null);
    refetch();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Roles & Permissions</h1>
        <p className="text-sm text-muted-foreground">Manage staff roles and module access</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />)}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {roles.map((role) => {
            const perms = (role.permissions_json as Record<string, string[]>) || {};
            const moduleCount = Object.keys(perms).length;
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
                    <Button variant="ghost" size="icon" onClick={() => setEditingRole({ ...role, permissions_json: { ...(role.permissions_json as Record<string, string[]> || {}) } })}>
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
          <DialogHeader><DialogTitle>Edit: {editingRole?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {ALL_MODULES.map((mod) => {
              const perms: string[] = editingRole?.permissions_json?.[mod] || [];
              return (
                <div key={mod} className="flex items-center gap-4 py-1 border-b last:border-0">
                  <span className="text-sm font-medium w-32 capitalize">{mod.replace(/_/g, " ")}</span>
                  <div className="flex gap-3 flex-wrap">
                    {ALL_ACTIONS.map((action) => (
                      <label key={action} className="flex items-center gap-1.5 text-xs">
                        <Checkbox checked={perms.includes(action)} onCheckedChange={() => handleToggle(mod, action)} />
                        {action}
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setEditingRole(null)}>Cancel</Button>
            <Button onClick={handleSave}>Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
