import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/hooks/usePermissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { KPICard } from "@/components/dashboard/KPICard";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { CheckCircle2, AlertTriangle, Clock, Target } from "lucide-react";

const COLORS = ["hsl(142, 71%, 45%)", "hsl(38, 92%, 50%)", "hsl(350, 65%, 55%)"];

export function DeadlineComplianceReport() {
  const { tenantId } = usePermissions();

  const { data, isLoading } = useQuery({
    queryKey: ["deadline-compliance", tenantId],
    queryFn: async () => {
      const { data: tasks } = await supabase
        .from("tasks")
        .select("id, title, status, due_date, completed_at, clients(legal_name)")
        .not("due_date", "is", null)
        .order("due_date", { ascending: false })
        .limit(500);

      let onTime = 0, late = 0, pending = 0;
      const lateItems: any[] = [];

      for (const t of tasks || []) {
        if (t.status === "done") {
          if (t.completed_at && t.due_date && new Date(t.completed_at) <= new Date(t.due_date)) {
            onTime++;
          } else {
            late++;
          }
        } else if (["todo", "in_progress", "awaiting_client"].includes(t.status)) {
          if (t.due_date && new Date(t.due_date) < new Date()) {
            late++;
            lateItems.push(t);
          } else {
            pending++;
          }
        }
      }

      const total = onTime + late + pending;
      const complianceRate = total > 0 ? Math.round((onTime / (onTime + late)) * 100) : 100;

      return {
        onTime,
        late,
        pending,
        complianceRate,
        lateItems: lateItems.slice(0, 15),
        pieData: [
          { name: "On Time", value: onTime },
          { name: "Pending", value: pending },
          { name: "Late", value: late },
        ].filter(d => d.value > 0),
      };
    },
    enabled: !!tenantId,
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <KPICard title="Compliance Rate" value={`${data?.complianceRate ?? 0}%`} icon={Target}
          changeType={(data?.complianceRate ?? 0) >= 90 ? "positive" : "negative"}
          iconColor="bg-primary/10" />
        <KPICard title="On Time" value={data?.onTime ?? 0} icon={CheckCircle2} iconColor="bg-[hsl(var(--success))]/10" />
        <KPICard title="Pending" value={data?.pending ?? 0} icon={Clock} iconColor="bg-secondary" />
        <KPICard title="Late/Overdue" value={data?.late ?? 0} icon={AlertTriangle} iconColor="bg-destructive/10" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Deadline Status Mix</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            {(data?.pieData?.length ?? 0) > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={data!.pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" stroke="none">
                    {(data!.pieData).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">No deadline data</div>
            )}
          </CardContent>
          {(data?.pieData?.length ?? 0) > 0 && (
            <div className="px-6 pb-4 flex flex-wrap gap-3">
              {(data!.pieData).map((e, i) => (
                <div key={e.name} className="flex items-center gap-1.5 text-xs">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                  <span className="text-muted-foreground">{e.name} ({e.value})</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Overdue Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            {(data?.lateItems?.length ?? 0) === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-8">No overdue tasks 🎉</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Task</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Due</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data!.lateItems.map((t: any) => (
                    <TableRow key={t.id}>
                      <TableCell className="text-sm">{t.title}</TableCell>
                      <TableCell className="text-xs">{t.clients?.legal_name || "—"}</TableCell>
                      <TableCell className="text-xs text-destructive">{new Date(t.due_date).toLocaleDateString("en-GB")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
