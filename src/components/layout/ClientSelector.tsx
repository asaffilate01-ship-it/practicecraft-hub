import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/hooks/usePermissions";
import { useClientContext } from "@/contexts/ClientContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { X, Building2 } from "lucide-react";

/**
 * Global client selector shown in the top bar.
 * When a client is selected, client-scoped pages (bank feeds, documents, etc.)
 * filter their data to that client only.
 */
export function ClientSelector() {
  const { tenantId } = usePermissions();
  const { selectedClientId, selectedClientName, selectClient, clearClient } = useClientContext();

  const { data: clients } = useQuery({
    queryKey: ["clients-selector", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, legal_name")
        .eq("status", "active")
        .order("legal_name")
        .limit(200);
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
    staleTime: 2 * 60_000,
  });

  return (
    <div className="flex items-center gap-1.5">
      <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
      <Select
        value={selectedClientId ?? "__none__"}
        onValueChange={(v) => {
          if (v === "__none__") {
            clearClient();
          } else {
            const c = (clients || []).find((c: any) => c.id === v);
            if (c) selectClient(c.id, (c as any).legal_name);
          }
        }}
      >
        <SelectTrigger className="h-7 w-[180px] text-xs border-dashed">
          <SelectValue placeholder="All clients" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none__">All clients</SelectItem>
          {(clients || []).map((c: any) => (
            <SelectItem key={c.id} value={c.id}>{c.legal_name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {selectedClientId && (
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={clearClient}>
          <X className="w-3 h-3" />
        </Button>
      )}
    </div>
  );
}
