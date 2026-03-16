import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/hooks/usePermissions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, CheckCircle2, XCircle, Clock } from "lucide-react";

export function WorkflowExecutionLog() {
  const { tenantId } = usePermissions();

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["automation-log", tenantId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("automation_execution_log")
        .select("*, automation_rules(name)")
        .order("executed_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  const statusIcon = (status: string) => {
    switch (status) {
      case "success": return <CheckCircle2 className="w-3.5 h-3.5 text-[hsl(var(--success))]" />;
      case "failed": return <XCircle className="w-3.5 h-3.5 text-destructive" />;
      default: return <Clock className="w-3.5 h-3.5 text-muted-foreground" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="w-4 h-4" /> Execution Log
        </CardTitle>
        <CardDescription>Recent automation rule executions</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : logs.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">No executions yet. Automations will appear here when triggered.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rule</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Result</TableHead>
                <TableHead>Executed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log: any) => (
                <TableRow key={log.id}>
                  <TableCell className="font-medium text-sm">{log.automation_rules?.name || "—"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      {statusIcon(log.status)}
                      <span className="text-xs capitalize">{log.status}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                    {log.result_message || "—"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(log.executed_at).toLocaleString("en-GB")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
