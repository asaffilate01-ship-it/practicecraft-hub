import { Users, CheckSquare, Receipt, Wallet, Calendar, TrendingUp, AlertTriangle } from "lucide-react";
import { KPICard } from "@/components/dashboard/KPICard";
import { StatusCard } from "@/components/dashboard/StatusCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { useDashboardKPIs, useOverdueTasks, useUpcomingTasks, useBillingKPIs } from "@/hooks/useDashboardData";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

const entityColors: Record<string, string> = {
  ltd: "hsl(199, 89%, 48%)",
  sole_trader: "hsl(142, 71%, 45%)",
  partnership: "hsl(38, 92%, 50%)",
  llp: "hsl(280, 65%, 60%)",
  charity: "hsl(350, 65%, 55%)",
  trust: "hsl(215, 25%, 65%)",
};

const entityLabels: Record<string, string> = {
  ltd: "Ltd",
  sole_trader: "Sole Trader",
  partnership: "Partnership",
  llp: "LLP",
  charity: "Charity",
  trust: "Trust",
};

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  submitted: { label: "Submitted", variant: "default" },
  draft: { label: "Draft", variant: "secondary" },
  overdue: { label: "Overdue", variant: "destructive" },
  todo: { label: "To Do", variant: "secondary" },
  in_progress: { label: "In Progress", variant: "outline" },
  blocked: { label: "Blocked", variant: "destructive" },
  awaiting_client: { label: "Awaiting Client", variant: "outline" },
  awaiting_hmrc: { label: "Awaiting HMRC", variant: "outline" },
};

const priorityColors: Record<string, string> = {
  urgent: "destructive",
  high: "destructive",
  medium: "secondary",
  low: "outline",
};

export default function Dashboard() {
  const { data: kpis, isLoading: kpisLoading } = useDashboardKPIs();
  const { data: overdueTasks } = useOverdueTasks();
  const { data: upcomingTasks } = useUpcomingTasks();
  const { data: billingKPIs } = useBillingKPIs();

  // Client entity breakdown
  const { data: entityData } = useQuery({
    queryKey: ["client-entity-breakdown"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("entity_type")
        .eq("status", "active");
      if (error) throw error;

      const counts: Record<string, number> = {};
      for (const c of data || []) {
        counts[c.entity_type] = (counts[c.entity_type] || 0) + 1;
      }
      return Object.entries(counts).map(([name, value]) => ({
        name: entityLabels[name] || name,
        value,
        color: entityColors[name] || "hsl(215, 25%, 65%)",
      }));
    },
    staleTime: 5 * 60_000,
  });

  // Task status breakdown for status cards
  const { data: taskStatusCounts } = useQuery({
    queryKey: ["task-status-breakdown"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("status")
        .not("status", "in", '("done","cancelled")');
      if (error) throw error;

      const counts: Record<string, number> = {};
      for (const t of data || []) {
        counts[t.status] = (counts[t.status] || 0) + 1;
      }
      return counts;
    },
    staleTime: 60_000,
  });

  // Combine overdue + upcoming for deadlines table
  const deadlines = [
    ...(overdueTasks || []).map((t) => ({
      date: t.due_date,
      client: t.client_legal_name || "—",
      type: t.title,
      status: "overdue" as const,
      priority: t.priority,
      assigned: t.assigned_user_name || "—",
    })),
    ...(upcomingTasks || []).map((t) => ({
      date: t.due_date,
      client: t.client_legal_name || "—",
      type: t.title,
      status: t.status,
      priority: t.priority,
      assigned: t.assigned_user_name || "—",
    })),
  ].slice(0, 10);

  // Revenue chart from billing KPIs
  const revenueData = (billingKPIs || []).map((b) => ({
    month: new Date(b.month + "-01").toLocaleDateString("en-GB", { month: "short" }),
    revenue: b.invoices_total,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Overview of your practice at a glance</p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpisLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-5"><Skeleton className="h-16 w-full" /></Card>
          ))
        ) : (
          <>
            <KPICard title="Active Clients" value={kpis?.active_clients ?? 0} change={`${kpis?.open_tasks ?? 0} open tasks`} changeType="neutral" icon={Users} iconColor="bg-accent" />
            <KPICard title="Tasks Overdue" value={kpis?.overdue_tasks ?? 0} change={kpis?.overdue_tasks ? `${kpis.overdue_tasks} need attention` : "All clear"} changeType={kpis?.overdue_tasks ? "negative" : "positive"} icon={CheckSquare} iconColor="bg-destructive/10" />
            <KPICard title="VAT Returns Due" value={kpis?.vat_due_14d ?? 0} change="Draft returns" changeType="neutral" icon={Receipt} iconColor="bg-[hsl(var(--warning))]/10" />
            <KPICard title="Overdue Invoices" value={kpis?.overdue_invoices ?? 0} change={kpis?.overdue_invoices ? "Action required" : "None outstanding"} changeType={kpis?.overdue_invoices ? "negative" : "positive"} icon={Wallet} iconColor="bg-[hsl(var(--success))]/10" />
          </>
        )}
      </div>

      {/* Status cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatusCard label="In Progress" count={taskStatusCounts?.in_progress || 0} color="green" />
        <StatusCard label="To Do" count={taskStatusCounts?.todo || 0} color="yellow" />
        <StatusCard label="Blocked" count={taskStatusCounts?.blocked || 0} color="red" />
        <StatusCard label="Awaiting Client" count={taskStatusCounts?.awaiting_client || 0} color="blue" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
              Monthly Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            {revenueData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `£${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value: number) => [`£${value.toLocaleString()}`, "Revenue"]} />
                  <Bar dataKey="revenue" fill="hsl(199, 89%, 48%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[240px] flex items-center justify-center text-muted-foreground text-sm">
                No invoice data yet — revenue will appear here once invoices are created.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Client Entities</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            {(entityData?.length ?? 0) > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={entityData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" stroke="none">
                    {(entityData || []).map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[240px] flex items-center justify-center text-muted-foreground text-sm">
                No clients yet
              </div>
            )}
          </CardContent>
          {(entityData?.length ?? 0) > 0 && (
            <div className="px-6 pb-4 flex flex-wrap gap-3">
              {(entityData || []).map((e) => (
                <div key={e.name} className="flex items-center gap-1.5 text-xs">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: e.color }} />
                  <span className="text-muted-foreground">{e.name}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Deadlines table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            Upcoming Deadlines & Overdue Tasks
          </CardTitle>
        </CardHeader>
        <CardContent>
          {deadlines.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Task</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deadlines.map((d, i) => {
                  const s = statusMap[d.status] || { label: d.status, variant: "secondary" as const };
                  return (
                    <TableRow key={i} className="cursor-pointer hover:bg-muted/50">
                      <TableCell className="font-medium text-sm">{new Date(d.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</TableCell>
                      <TableCell className="text-sm">{d.client}</TableCell>
                      <TableCell className="text-sm">{d.type}</TableCell>
                      <TableCell>
                        <Badge variant={s.variant} className="text-xs">{s.label}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={(priorityColors[d.priority] || "secondary") as any} className="text-xs capitalize">{d.priority}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="py-8 text-center text-muted-foreground text-sm">
              <AlertTriangle className="w-5 h-5 mx-auto mb-2 opacity-50" />
              No upcoming deadlines — create tasks with due dates to see them here.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
