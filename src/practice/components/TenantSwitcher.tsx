import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { getSelectedTenantId, setSelectedTenantId } from "@/practice/tenancy/tenantStore";
import { practiceTenants } from "@/practice/fixtures";

export function TenantSwitcher() {
  const [selected, setSelected] = useState(getSelectedTenantId());

  if (practiceTenants.length <= 1) return null;

  const handleChange = (id: string) => {
    setSelected(id);
    setSelectedTenantId(id);
    // Reload so branding + features re-render with new tenant
    window.location.reload();
  };

  return (
    <div className="px-3 space-y-1">
      <Label className="text-[10px] uppercase tracking-wider text-sidebar-foreground/60 font-medium">
        Tenant
      </Label>
      <Select value={selected} onValueChange={handleChange}>
        <SelectTrigger className="h-8 text-xs bg-sidebar-accent border-sidebar-border text-sidebar-foreground">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {practiceTenants.map((t) => (
            <SelectItem key={t.id} value={t.id} className="text-xs">
              {t.name} ({t.plan})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
