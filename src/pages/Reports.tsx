import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/hooks/usePermissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KPICard } from "@/components/dashboard/KPICard";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from "recharts";
import { Users, CheckSquare, Receipt, TrendingUp, Clock, Briefcase } from "lucide-react";

const COLORS = [
  "hsl(199, 89%, 48%)", "hsl(142, 71%, 45%)", "hsl(38, 92%, 50%)",
  "hsl(280, 65%, 60%)", "hsl(350, 65%, 55%)", "hsl(215, 25%, 65%)"
];

export default function ReportsPage() {
  const { tenantId } = usePermissions();

  // KPIs
  const kpisQ = useQuery({
    queryKey: ["reports-kpis", tenantId],
    queryFn: async () => {
      const [clients, tasks, overdue, invoices, timeEntries] = await Promise.all([
        supabase.from("clients").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("tasks").select("id", { count: "exact", head: true }).not("status", "in", '("done","cancelled")'),
        supabase.from("tasks").select("id", { count: "exact", head: true }).lt("due_date", new Date().toISOString().slice(0, 10)).not("status", "in", '("done","cancelled")'),
        supabase.from("invoices").select("total, status"),
        supabase.from("time_entries").select("duration_minutes, is_billable"),
      ]);
      const inv = invoices.data || [];
      const totalRevenue = inv.reduce((s, i: any) => s + Number(i.total || 0), 0);
      const paidRevenue = inv.filter((i: any) => i.status === "paid").reduce((s, i: any) => s + Number(i.total || 0), 0);
      const te = timeEntries.data || [];
      const totalMins = te.reduce((s, t: any) => s + t.duration_minutes, 0);
      const billMins = te.filter((t: any) => t.is_billable).reduce((s, t: any) => s + t.duration_minutes, 0);
      return {
        activeClients: clients.count || 0,
        openTasks: tasks.count || 0,
        overdueTasks: overdue.count || 0,
        totalRevenue,
        paidRevenue,
        totalHours: Math.round(totalMins / 60),
        billablePct: totalMins > 0 ? Math.round((billMins / totalMins) * 100) : 0,
      };
    },
    enabled: !!tenantId,
    staleTime: 60_000,
  });

  // Revenue by month
  const revenueQ = useQuery({
    queryKey: ["reports-revenue", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from("invoices").select("issue_date, total, status").order("issue_date");
      const byMonth: Record<string, { month: string; invoiced: number; paid: number }> = {};
      for (const inv of data || []) {
        const m = (inv as any).issue_date?.slice(0, 7);
        if (!m) continue;
        if (!byMonth[m]) byMonth[m] = { month: m, invoiced: 0, paid: 0 };
        byMonth[m].invoiced += Number((inv as any).total || 0);
        if ((inv as any).status === "paid") byMonth[m].paid += Number((inv as any).total || 0);
      }
      return Object.values(byMonth).slice(-12);
    },
    enabled: !!tenantId,
  });

  // Task breakdown by service
  const taskBreakdownQ = useQuery({
    queryKey: ["reports-task-breakdown", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from("tasks").select("service_id, status").not("status", "in", '("done","cancelled")');
      const byStatus: Record<string, number> = {};
      for (const t of data || []) {
        byStatus[(t as any).status] = (byStatus[(t as any).status] || 0) + 1;
      }
      return Object.entries(byStatus).map(([name, value]) => ({ name, value }));
    },
    enabled: !!tenantId,
  });

  // Entity type breakdown
  const entityQ = useQuery({
    queryKey: ["reports-entity-breakdown", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from("clients").select("entity_type").eq("status", "active");
      const counts: Record<string, number> = {};
      for (const c of data || []) counts[(c as any).entity_type] = (counts[(c as any).entity_type] || 0) + 1;
      const labels: Record<string, string> = { ltd: "Ltd", sole_trader: "Sole Trader", partnership: "Partnership", llp: "LLP", charity: "Charity", trust: "Trust" };
      return Object.entries(counts).map(([k, v]) => ({ name: labels[k] || k, value: v }));
    },
    enabled: !!tenantId,
  });

  // Submission success
  const submQ = useQuery({
    queryKey: ["reports-submissions", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from("submission_jobs").select("provider, status, submission_type").limit(500);
      const byProvider: Record<string, { provider: string; total: number; accepted: number; rejected: number }> = {};
      for (const s of data || []) {
        const p = (s as any).provider || "unknown";
        if (!byProvider[p]) byProvider[p] = { provider: p, total: 0, accepted: 0, rejected: 0 };
        byProvider[p].total++;
        if ((s as any).status === "accepted") byProvider[p].accepted++;
        if ((s as any).status === "rejected") byProvider[p].rejected++;
      }
      return Object.values(byProvider);
    },
    enabled: !!tenantId,
  });

  // Revenue forecast (simple linear projection)
  const forecastQ = useQuery({
    queryKey: ["reports-forecast", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from("invoices").select("issue_date, total, status").order("issue_date");
      const byMonth: Record<string, number> = {};
      for (const inv of data || []) {
        const m = (inv as any).issue_date?.slice(0, 7);
        if (m) byMonth[m] = (byMonth[m] || 0) + Number((inv as any).total || 0);
      }
      const months = Object.entries(byMonth).sort(([a], [b]) => a.localeCompare(b)).slice(-6);
      if (months.length < 2) return [];

      // Simple moving average forecast
      const vals = months.map(([, v]) => v);
      const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
      const trend = vals.length > 1 ? (vals[vals.length - 1] - vals[0]) / (vals.length - 1) : 0;

      const result = months.map(([m, v]) => ({ month: m, actual: v, forecast: null as number | null }));
      const lastMonth = months[months.length - 1][0];
      for (let i = 1; i <= 3; i++) {
        const d = new Date(lastMonth + "-01");
        d.setMonth(d.getMonth() + i);
        const fm = d.toISOString().slice(0, 7);
        result.push({ month: fm, actual: null as any, forecast: Math.max(0, avg + trend * i) });
      }
      return result;
    },
    enabled: !!tenantId,
  });

  // Client profitability
  const profitabilityQ = useQuery({
    queryKey: ["reports-profitability", tenantId],
    queryFn: async () => {
      const [invoicesRes, timeRes, clientsRes] = await Promise.all([
        supabase.from("invoices").select("client_id, total, status"),
        supabase.from("time_entries").select("client_id, duration_minutes, is_billable, hourly_rate_pence"),
        supabase.from("clients").select("id, legal_name").eq("status", "active"),
      ]);

      const nameMap: Record<string, string> = {};
      for (const c of clientsRes.data || []) nameMap[c.id] = c.legal_name;

      const byClient: Record<string, { revenue: number; cost: number; hours: number }> = {};
      for (const inv of invoicesRes.data || []) {
        const cid = (inv as any).client_id;
        if (!cid) continue;
        if (!byClient[cid]) byClient[cid] = { revenue: 0, cost: 0, hours: 0 };
        if ((inv as any).status === "paid") byClient[cid].revenue += Number((inv as any).total || 0);
      }
      for (const te of timeRes.data || []) {
        const cid = (te as any).client_id;
        if (!cid) continue;
        if (!byClient[cid]) byClient[cid] = { revenue: 0, cost: 0, hours: 0 };
        byClient[cid].hours += (te as any).duration_minutes / 60;
        // Approximate cost at £40/hr internal rate
        byClient[cid].cost += ((te as any).duration_minutes / 60) * 4000;
      }

      return Object.entries(byClient)
        .map(([id, d]) => ({
          client: nameMap[id] || "Unknown",
          revenue: d.revenue,
          cost: d.cost,
          profit: d.revenue - d.cost,
          margin: d.revenue > 0 ? Math.round(((d.revenue - d.cost) / d.revenue) * 100) : 0,
          hours: Math.round(d.hours * 10) / 10,
        }))
        .filter(c => c.revenue > 0 || c.hours > 0)
        .sort((a, b) => b.profit - a.profit)
        .slice(0, 20);
    },
    enabled: !!tenantId,
  });

  // Staff utilisation
  const utilisationQ = useQuery({
    queryKey: ["reports-utilisation", tenantId],
    queryFn: async () => {
      const { data: entries } = await supabase
        .from("time_entries")
        .select("user_id, duration_minutes, is_billable")
        .gte("date", new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name");

      const nameMap: Record<string, string> = {};
      for (const p of profiles || []) nameMap[p.id] = p.full_name || "Unknown";

      const byUser: Record<string, { name: string; total: number; billable: number }> = {};
      for (const e of entries || []) {
        const uid = e.user_id;
        if (!byUser[uid]) byUser[uid] = { name: nameMap[uid] || "Unknown", total: 0, billable: 0 };
        byUser[uid].total += e.duration_minutes;
        if (e.is_billable) byUser[uid].billable += e.duration_minutes;
      }

      return Object.values(byUser)
        .map((u) => ({
          ...u,
          totalHours: (u.total / 60).toFixed(1),
          billableHours: (u.billable / 60).toFixed(1),
          utilisation: u.total > 0 ? Math.round((u.billable / u.total) * 100) : 0,
        }))
        .sort((a, b) => b.utilisation - a.utilisation);
    },
    enabled: !!tenantId,
  });

  const kpis = kpisQ.data;
  const loading = kpisQ.isLoading;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "var(--font-heading)" }}>Practice Reports</h1>
        <p className="text-sm text-muted-foreground">KPIs, revenue analysis, compliance metrics, and workforce utilisation.</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => <Card key={i} className="p-5"><Skeleton className="h-16 w-full" /></Card>)
        ) : (
          <>
            <KPICard title="Active Clients" value={kpis?.activeClients ?? 0} icon={Users} iconColor="bg-accent" />
            <KPICard title="Open Tasks" value={kpis?.openTasks ?? 0} change={`${kpis?.overdueTasks ?? 0} overdue`} changeType={kpis?.overdueTasks ? "negative" : "positive"} icon={CheckSquare} iconColor="bg-destructive/10" />
            <KPICard title="Total Revenue" value={`£${((kpis?.totalRevenue ?? 0) / 100).toLocaleString()}`} icon={TrendingUp} iconColor="bg-primary/10" />
            <KPICard title="Paid Revenue" value={`£${((kpis?.paidRevenue ?? 0) / 100).toLocaleString()}`} icon={Receipt} iconColor="bg-[hsl(var(--success))]/10" />
            <KPICard title="Hours Logged" value={kpis?.totalHours ?? 0} icon={Clock} iconColor="bg-secondary" />
            <KPICard title="Billable %" value={`${kpis?.billablePct ?? 0}%`} changeType={kpis?.billablePct && kpis.billablePct >= 70 ? "positive" : "neutral"} icon={Briefcase} iconColor="bg-accent" />
          </>
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Monthly Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            {(revenueQ.data?.length ?? 0) > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={revenueQ.data}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `£${(v / 100).toFixed(0)}`} />
                  <Tooltip formatter={(v: number) => [`£${(v / 100).toLocaleString()}`, ""]} />
                  <Bar dataKey="invoiced" fill="hsl(199, 89%, 48%)" radius={[3, 3, 0, 0]} name="Invoiced" />
                  <Bar dataKey="paid" fill="hsl(142, 71%, 45%)" radius={[3, 3, 0, 0]} name="Paid" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[260px] flex items-center justify-center text-muted-foreground text-sm">No invoice data yet.</div>
            )}
          </CardContent>
        </Card>

        {/* Entity breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Client Entity Mix</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            {(entityQ.data?.length ?? 0) > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={entityQ.data} cx="50%" cy="50%" innerRadius={55} outerRadius={90} dataKey="value" stroke="none">
                    {(entityQ.data || []).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[260px] flex items-center justify-center text-muted-foreground text-sm">No clients yet.</div>
            )}
          </CardContent>
          {(entityQ.data?.length ?? 0) > 0 && (
            <div className="px-6 pb-4 flex flex-wrap gap-3">
              {(entityQ.data || []).map((e, i) => (
                <div key={e.name} className="flex items-center gap-1.5 text-xs">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                  <span className="text-muted-foreground">{e.name} ({e.value})</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Task breakdown + submissions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Open Tasks by Status</CardTitle>
          </CardHeader>
          <CardContent>
            {(taskBreakdownQ.data?.length ?? 0) > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={taskBreakdownQ.data} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" width={100} />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(199, 89%, 48%)" radius={[0, 4, 4, 0]} name="Tasks" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">No open tasks.</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Submission Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            {(submQ.data?.length ?? 0) > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Provider</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Accepted</TableHead>
                    <TableHead>Rejected</TableHead>
                    <TableHead>Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(submQ.data || []).map((s) => (
                    <TableRow key={s.provider}>
                      <TableCell className="text-sm font-medium capitalize">{s.provider}</TableCell>
                      <TableCell className="text-sm">{s.total}</TableCell>
                      <TableCell className="text-sm">{s.accepted}</TableCell>
                      <TableCell className="text-sm">{s.rejected}</TableCell>
                      <TableCell>
                        <Badge variant={s.total > 0 && s.accepted / s.total >= 0.9 ? "default" : "destructive"} className="text-xs">
                          {s.total > 0 ? `${Math.round((s.accepted / s.total) * 100)}%` : "—"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">No submissions yet.</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Revenue Forecast */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Revenue Forecast (3-Month Projection)</CardTitle>
        </CardHeader>
        <CardContent>
          {(forecastQ.data?.length ?? 0) > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={forecastQ.data}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `£${(v / 100).toFixed(0)}`} />
                <Tooltip formatter={(v: number) => [`£${(v / 100).toLocaleString()}`, ""]} />
                <Line type="monotone" dataKey="actual" stroke="hsl(199, 89%, 48%)" strokeWidth={2} dot name="Actual" connectNulls={false} />
                <Line type="monotone" dataKey="forecast" stroke="hsl(38, 92%, 50%)" strokeWidth={2} strokeDasharray="6 3" dot={{ r: 4 }} name="Forecast" connectNulls={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[260px] flex items-center justify-center text-muted-foreground text-sm">Need at least 2 months of invoice data for forecasting.</div>
          )}
        </CardContent>
      </Card>

      {/* Client Profitability */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Client Profitability (Top 20)</CardTitle>
        </CardHeader>
        <CardContent>
          {(profitabilityQ.data?.length ?? 0) > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Est. Cost</TableHead>
                  <TableHead className="text-right">Profit</TableHead>
                  <TableHead className="text-right">Margin</TableHead>
                  <TableHead className="text-right">Hours</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(profitabilityQ.data || []).map((c) => (
                  <TableRow key={c.client}>
                    <TableCell className="text-sm font-medium">{c.client}</TableCell>
                    <TableCell className="text-right font-mono text-sm">£{(c.revenue / 100).toLocaleString()}</TableCell>
                    <TableCell className="text-right font-mono text-sm text-muted-foreground">£{(c.cost / 100).toLocaleString()}</TableCell>
                    <TableCell className={`text-right font-mono text-sm ${c.profit < 0 ? "text-destructive" : ""}`}>
                      £{(c.profit / 100).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={c.margin >= 50 ? "default" : c.margin >= 20 ? "secondary" : "destructive"} className="text-xs">
                        {c.margin}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">{c.hours}h</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="h-[120px] flex items-center justify-center text-muted-foreground text-sm">No client revenue data yet.</div>
          )}
        </CardContent>
      </Card>

      {/* Staff Utilisation */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Staff Utilisation (Last 30 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          {(utilisationQ.data?.length ?? 0) > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff Member</TableHead>
                  <TableHead className="text-right">Total Hours</TableHead>
                  <TableHead className="text-right">Billable Hours</TableHead>
                  <TableHead className="text-right">Utilisation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(utilisationQ.data || []).map((u) => (
                  <TableRow key={u.name}>
                    <TableCell className="text-sm font-medium">{u.name}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{u.totalHours}h</TableCell>
                    <TableCell className="text-right font-mono text-sm">{u.billableHours}h</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={u.utilisation >= 70 ? "default" : u.utilisation >= 50 ? "secondary" : "destructive"} className="text-xs">
                        {u.utilisation}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="h-[120px] flex items-center justify-center text-muted-foreground text-sm">
              No time entries in the last 30 days.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
