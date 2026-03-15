import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/hooks/usePermissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { KPICard } from "@/components/dashboard/KPICard";
import { PoundSterling, Clock, TrendingUp, Users } from "lucide-react";

export function WipReport() {
  const { tenantId } = usePermissions();

  const { data, isLoading } = useQuery({
    queryKey: ["wip-report", tenantId],
    queryFn: async () => {
      // Fetch unbilled time entries grouped by client
      const { data: entries, error } = await supabase
        .from("time_entries")
        .select("client_id, clients(legal_name), duration_minutes, rate_pence, is_billable, status")
        .eq("is_billable", true)
        .in("status", ["draft", "approved"])
        .order("client_id");

      if (error) throw error;

      const byClient: Record<string, {
        clientName: string;
        totalMins: number;
        totalValue: number;
        entryCount: number;
      }> = {};

      for (const e of entries || []) {
        const cid = e.client_id || "unassigned";
        if (!byClient[cid]) {
          byClient[cid] = {
            clientName: (e as any).clients?.legal_name || "Unassigned",
            totalMins: 0,
            totalValue: 0,
            entryCount: 0,
          };
        }
        byClient[cid].totalMins += e.duration_minutes;
        byClient[cid].totalValue += (e.duration_minutes / 60) * ((e.rate_pence || 15000) / 100);
        byClient[cid].entryCount++;
      }

      const rows = Object.values(byClient).sort((a, b) => b.totalValue - a.totalValue);
      const totalWip = rows.reduce((s, r) => s + r.totalValue, 0);
      const totalHours = rows.reduce((s, r) => s + r.totalMins, 0) / 60;

      return { rows, totalWip, totalHours, clientCount: rows.length };
    },
    enabled: !!tenantId,
    staleTime: 60_000,
  });

  const { rows = [], totalWip = 0, totalHours = 0, clientCount = 0 } = data || {};

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPICard title="Total WIP" value={`£${totalWip.toFixed(0)}`} icon={PoundSterling} iconColor="bg-primary/10" />
        <KPICard title="Unbilled Hours" value={totalHours.toFixed(1)} icon={Clock} iconColor="bg-accent" />
        <KPICard title="Clients with WIP" value={clientCount} icon={Users} iconColor="bg-secondary" />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Work in Progress by Client</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center text-muted-foreground py-6">Loading...</p>
          ) : rows.length === 0 ? (
            <p className="text-center text-muted-foreground py-6">No unbilled time entries — log time to see WIP here.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead className="text-right">Hours</TableHead>
                  <TableHead className="text-right">Entries</TableHead>
                  <TableHead className="text-right">WIP Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.clientName}>
                    <TableCell className="font-medium text-sm">{r.clientName}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{(r.totalMins / 60).toFixed(1)}</TableCell>
                    <TableCell className="text-right text-sm">{r.entryCount}</TableCell>
                    <TableCell className="text-right font-mono text-sm font-medium">
                      £{r.totalValue.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-bold border-t-2">
                  <TableCell>Total</TableCell>
                  <TableCell className="text-right font-mono">{totalHours.toFixed(1)}</TableCell>
                  <TableCell className="text-right">{rows.reduce((s, r) => s + r.entryCount, 0)}</TableCell>
                  <TableCell className="text-right font-mono">£{totalWip.toFixed(2)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
