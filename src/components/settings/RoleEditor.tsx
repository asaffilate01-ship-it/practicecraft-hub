import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/hooks/usePermissions";
import {
  PERMISSION_CATALOG,
  MODULE_LABELS,
  ACTION_LABELS,
} from "@/rbac/permissionCatalog";
import {
  buildBlankPermissions,
  normalizePermissions,
  toggleModule,
  isModuleFullyEnabled,
  type PermissionsJSON,
} from "@/rbac/permissionUtils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Copy, RotateCcw, Save, Shield, CheckSquare } from "lucide-react";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";

type Role = {
  id: string;
  name: string;
  description: string | null;
  permissions_json: Json;
  is_system_role: boolean | null;
  tenant_id: string;
};

export function RoleEditor() {
  const queryClient = useQueryClient();
  const { tenantId } = usePermissions();
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [editedPermissions, setEditedPermissions] = useState<PermissionsJSON | null>(null);
  const [copyFromRoleId, setCopyFromRoleId] = useState<string>("");

  const { data: roles = [], isLoading } = useQuery({
    queryKey: ["tenant-roles", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("roles")
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("name");
      if (error) throw error;
      return data as Role[];
    },
    enabled: !!tenantId,
  });

  const { data: presets = [] } = useQuery({
    queryKey: ["permission-presets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("permission_presets")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const selectedRole = roles.find((r) => r.id === selectedRoleId);
  const currentPermissions: PermissionsJSON =
    editedPermissions ??
    (selectedRole
      ? { ...buildBlankPermissions(), ...(selectedRole.permissions_json as PermissionsJSON) }
      : buildBlankPermissions());

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedRoleId) return;
      const normalized = normalizePermissions(currentPermissions);
      const { error } = await supabase
        .from("roles")
        .update({ permissions_json: normalized as unknown as Json })
        .eq("id", selectedRoleId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-roles"] });
      queryClient.invalidateQueries({ queryKey: ["role-permissions"] });
      setEditedPermissions(null);
      toast.success("Role permissions saved");
    },
    onError: (e) => toast.error(e.message),
  });

  const handleToggleAction = (module: string, action: string) => {
    const perms = { ...currentPermissions };
    perms[module] = { ...perms[module] };
    perms[module][action] = !perms[module][action];
    setEditedPermissions(perms);
  };

  const handleToggleModule = (module: string) => {
    const allEnabled = isModuleFullyEnabled(currentPermissions, module);
    setEditedPermissions(toggleModule(currentPermissions, module, !allEnabled));
  };

  const handleSelectAll = (enabled: boolean) => {
    const perms = buildBlankPermissions();
    if (enabled) {
      for (const [mod, actions] of Object.entries(PERMISSION_CATALOG)) {
        for (const a of actions) perms[mod][a] = true;
      }
    }
    setEditedPermissions(perms);
  };

  const handleCopyFromRole = () => {
    const source = roles.find((r) => r.id === copyFromRoleId);
    if (!source) return;
    const base = buildBlankPermissions();
    const merged = { ...base, ...(source.permissions_json as PermissionsJSON) };
    setEditedPermissions(merged);
    toast.info(`Copied permissions from ${source.name}`);
  };

  const handleResetToPreset = (presetName: string) => {
    const preset = presets.find((p) => p.name === presetName);
    if (!preset) return;
    const base = buildBlankPermissions();
    const merged = { ...base, ...(preset.permissions_json as PermissionsJSON) };
    setEditedPermissions(merged);
    toast.info(`Reset to ${presetName} preset`);
  };

  const isDirty = editedPermissions !== null;
  const modules = Object.keys(PERMISSION_CATALOG);

  // Collect all unique actions across all modules for column headers
  const allActions = Array.from(
    new Set(Object.values(PERMISSION_CATALOG).flat())
  );

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-10 flex justify-center">
          <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Role selector + actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="w-4 h-4" /> Role Permission Editor
          </CardTitle>
          <CardDescription>
            Select a role to edit its module-level permissions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5 min-w-[200px]">
              <label className="text-xs font-medium text-muted-foreground">Role</label>
              <Select
                value={selectedRoleId ?? ""}
                onValueChange={(v) => {
                  setSelectedRoleId(v);
                  setEditedPermissions(null);
                }}
              >
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Select a role…" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                      {r.is_system_role && (
                        <span className="ml-1 text-xs text-muted-foreground">(system)</span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedRoleId && (
              <>
                {/* Copy from role */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Copy from</label>
                  <div className="flex gap-1.5">
                    <Select value={copyFromRoleId} onValueChange={setCopyFromRoleId}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Another role…" />
                      </SelectTrigger>
                      <SelectContent>
                        {roles
                          .filter((r) => r.id !== selectedRoleId)
                          .map((r) => (
                            <SelectItem key={r.id} value={r.id}>
                              {r.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="icon"
                      disabled={!copyFromRoleId}
                      onClick={handleCopyFromRole}
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Reset to preset */}
                {presets.length > 0 && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Preset</label>
                    <Select onValueChange={handleResetToPreset}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Reset to preset…" />
                      </SelectTrigger>
                      <SelectContent>
                        {presets.map((p) => (
                          <SelectItem key={p.id} value={p.name}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Select / Deselect All */}
                <div className="flex gap-1.5 pb-0.5">
                  <Button variant="outline" size="sm" onClick={() => handleSelectAll(true)}>
                    <CheckSquare className="w-3.5 h-3.5 mr-1" /> All
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleSelectAll(false)}>
                    <RotateCcw className="w-3.5 h-3.5 mr-1" /> None
                  </Button>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Permission grid */}
      {selectedRoleId && (
        <Card>
          <CardContent className="p-0">
            <ScrollArea className="max-h-[60vh]">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-card">
                  <tr className="border-b">
                    <th className="text-left py-2.5 px-4 font-medium text-muted-foreground w-[200px]">
                      Module
                    </th>
                    {allActions.map((a) => (
                      <th
                        key={a}
                        className="text-center py-2.5 px-2 font-medium text-muted-foreground text-xs"
                      >
                        {ACTION_LABELS[a] || a}
                      </th>
                    ))}
                    <th className="text-center py-2.5 px-2 font-medium text-muted-foreground text-xs w-[60px]">
                      All
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {modules.map((mod) => {
                    const moduleActions = PERMISSION_CATALOG[mod];
                    const allEnabled = isModuleFullyEnabled(currentPermissions, mod);
                    return (
                      <tr key={mod} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="py-2 px-4">
                          <span className="font-medium text-foreground text-xs">
                            {MODULE_LABELS[mod] || mod}
                          </span>
                        </td>
                        {allActions.map((action) => {
                          const hasAction = moduleActions.includes(action);
                          return (
                            <td key={action} className="text-center py-2 px-2">
                              {hasAction ? (
                                <Checkbox
                                  checked={!!currentPermissions[mod]?.[action]}
                                  onCheckedChange={() => handleToggleAction(mod, action)}
                                  className="mx-auto"
                                />
                              ) : (
                                <span className="text-muted-foreground/30">—</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="text-center py-2 px-2">
                          <Checkbox
                            checked={allEnabled}
                            onCheckedChange={() => handleToggleModule(mod)}
                            className="mx-auto"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </ScrollArea>
          </CardContent>

          {/* Save bar */}
          <div className="border-t px-4 py-3 flex items-center justify-between bg-muted/20">
            <div className="flex items-center gap-2">
              {isDirty && (
                <Badge variant="secondary" className="text-xs">
                  Unsaved changes
                </Badge>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!isDirty}
                onClick={() => setEditedPermissions(null)}
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" /> Discard
              </Button>
              <Button
                size="sm"
                disabled={!isDirty || saveMutation.isPending}
                onClick={() => saveMutation.mutate()}
              >
                <Save className="w-3.5 h-3.5 mr-1" />
                {saveMutation.isPending ? "Saving…" : "Save Permissions"}
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
