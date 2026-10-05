import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Brain, AlertTriangle, Users, TrendingUp, Loader2, RefreshCw } from "lucide-react";

export function AIIntelligencePanel() {
  const { user } = useAuth();
  const { tenantId, can } = usePermissions();
  const [activeTab, setActiveTab] = useState<"churn" | "staff" | "revenue">("churn");

  const churnQ = useQuery({
    queryKey: ["ai-intelligence", user?.id, tenantId, "churn_risk"],
    enabled: !!user && !!tenantId && can("reports", "view") && can("clients", "view") && can("tasks", "view") && can("billing", "view") && activeTab === "churn",
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("ai-intelligence", { body: { action: "churn_risk" } });
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60_000,
  });

  const staffQ = useQuery({
    queryKey: ["ai-intelligence", user?.id, tenantId, "staff_utilisation"],
    enabled: !!user && !!tenantId && can("reports", "view") && activeTab === "staff",
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("ai-intelligence", { body: { action: "staff_utilisation" } });
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60_000,
  });

  const revenueQ = useQuery({
    queryKey: ["ai-intelligence", user?.id, tenantId, "revenue_insights"],
    enabled: !!user && !!tenantId && can("reports", "view") && can("billing", "view") && activeTab === "revenue",
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("ai-intelligence", { body: { action: "revenue_insights" } });
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60_000,
  });

  const tabs = [
    { key: "churn" as const, label: "Churn Risk", icon: AlertTriangle, query: churnQ },
    { key: "staff" as const, label: "Staff Utilisation", icon: Users, query: staffQ },
    { key: "revenue" as const, label: "Invoice Insights", icon: TrendingUp, query: revenueQ },
  ];

  const activeQ = tabs.find(t => t.key === activeTab)?.query;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Brain className="w-4 h-4 text-primary" />
            Practice Intelligence
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => activeQ?.refetch()} disabled={activeQ?.isFetching || !activeQ?.isEnabled} className="gap-1 text-xs">
            {activeQ?.isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">Churn uses Lovable AI suggestions. Invoice totals (including unpaid invoices) and utilisation are limited local summaries; utilisation covers this month, capped at 500 entries, with an assumed 160-hour capacity.</p>
        {/* Tab bar */}
        <div className="flex gap-1 border-b">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
                activeTab === t.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        {activeQ?.isError && <p role="alert" className="text-sm text-destructive">Analysis unavailable. No conclusion can be drawn; retry after checking the AI connection and permissions.</p>}
        {/* Churn Risk */}
        {activeTab === "churn" && !churnQ.isError && churnQ.isEnabled && (
          churnQ.isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : (churnQ.data?.risks?.length || 0) === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No risk suggestions returned. This is not assurance of client health.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Risk</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Signals</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(churnQ.data?.risks || []).map((r: any) => (
                  <TableRow key={r.clientName}>
                    <TableCell className="font-medium text-sm">{r.clientName}</TableCell>
                    <TableCell>
                      <Badge variant={r.riskLevel === "high" ? "destructive" : r.riskLevel === "medium" ? "secondary" : "outline"} className="text-xs capitalize">
                        {r.riskLevel}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={r.riskScore} className="w-16 h-1.5" />
                        <span className="text-xs text-muted-foreground">{r.riskScore}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{r.signals.join(", ")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )
        )}

        {/* Staff Utilisation */}
        {activeTab === "staff" && !staffQ.isError && staffQ.isEnabled && (
          staffQ.isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : (staffQ.data?.utilisation?.length || 0) === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No time entries found — start logging time to see utilisation.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff Member</TableHead>
                  <TableHead className="text-right">Total Hrs</TableHead>
                  <TableHead className="text-right">Billable Hrs</TableHead>
                  <TableHead>Utilisation</TableHead>
                  <TableHead>Capacity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(staffQ.data?.utilisation || []).map((s: any) => (
                  <TableRow key={s.userId}>
                    <TableCell className="font-medium text-sm">{s.name}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{s.totalHours}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{s.billableHours}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={s.utilisation} className="w-16 h-1.5" />
                        <span className="text-xs">{s.utilisation}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={s.capacity > 80 ? "destructive" : s.capacity > 50 ? "secondary" : "outline"} className="text-xs">
                        {s.capacity}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )
        )}

        {/* Invoice Insights */}
        {activeTab === "revenue" && !revenueQ.isError && revenueQ.isEnabled && (
          revenueQ.isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="space-y-4">
              {(revenueQ.data?.forecast?.length || 0) > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Illustrative 3-Month Average Projection</h4>
                  <div className="grid grid-cols-3 gap-3">
                    {(revenueQ.data?.forecast || []).map((f: any) => (
                      <Card key={f.month} className="p-3">
                        <p className="text-xs text-muted-foreground">{f.month}</p>
                        <p className="text-lg font-semibold">£{Number(f.projected).toLocaleString()}</p>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
              {(revenueQ.data?.topClients?.length || 0) > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Top Clients by Invoiced Total</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Client</TableHead>
                        <TableHead className="text-right">Invoiced total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(revenueQ.data?.topClients || []).slice(0, 5).map((c: any) => (
                        <TableRow key={c.clientId}>
                          <TableCell className="font-medium text-sm">{c.clientName}</TableCell>
                          <TableCell className="text-right font-mono text-sm">£{Number(c.totalRevenue).toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              {(revenueQ.data?.topClients?.length || 0) === 0 && (revenueQ.data?.forecast?.length || 0) === 0 && (
                <p className="text-sm text-muted-foreground py-4 text-center">No invoice data — revenue insights will appear once invoices are created.</p>
              )}
            </div>
          )
        )}
      </CardContent>
    </Card>
  );
}
