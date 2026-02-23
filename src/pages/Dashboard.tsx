import { Users, CheckSquare, Receipt, Wallet, Calendar, FileText, TrendingUp, AlertTriangle } from "lucide-react";
import { KPICard } from "@/components/dashboard/KPICard";
import { StatusCard } from "@/components/dashboard/StatusCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const revenueData = [
  { month: "Sep", revenue: 12400 },
  { month: "Oct", revenue: 14200 },
  { month: "Nov", revenue: 13800 },
  { month: "Dec", revenue: 15600 },
  { month: "Jan", revenue: 16200 },
  { month: "Feb", revenue: 17800 },
];

const entityData = [
  { name: "Ltd", value: 42, color: "hsl(199, 89%, 48%)" },
  { name: "Sole Trader", value: 18, color: "hsl(142, 71%, 45%)" },
  { name: "Partnership", value: 8, color: "hsl(38, 92%, 50%)" },
  { name: "Charity", value: 5, color: "hsl(280, 65%, 60%)" },
  { name: "Trust", value: 3, color: "hsl(215, 25%, 65%)" },
];

const deadlines = [
  { date: "28 Feb 2026", client: "ACME Ltd", type: "VAT Return", status: "overdue", assigned: "Sarah J." },
  { date: "01 Mar 2026", client: "Smith & Co", type: "CT600", status: "draft", assigned: "James W." },
  { date: "05 Mar 2026", client: "Green Charity", type: "Annual Return", status: "awaiting", assigned: "Sarah J." },
  { date: "07 Mar 2026", client: "Bright LLP", type: "Confirmation Statement", status: "submitted", assigned: "Mark T." },
  { date: "15 Mar 2026", client: "Apex Trading", type: "Payroll FPS", status: "draft", assigned: "Lisa K." },
];

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  submitted: { label: "Submitted", variant: "default" },
  draft: { label: "Draft", variant: "secondary" },
  overdue: { label: "Overdue", variant: "destructive" },
  awaiting: { label: "Awaiting Info", variant: "outline" },
};

export default function Dashboard() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Overview of your practice at a glance</p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Clients" value={76} change="+3 this month" changeType="positive" icon={Users} iconColor="bg-accent" />
        <KPICard title="Tasks Overdue" value={12} change="5 urgent" changeType="negative" icon={CheckSquare} iconColor="bg-destructive/10" />
        <KPICard title="VAT Returns Due" value={8} change="Next: 28 Feb" changeType="neutral" icon={Receipt} iconColor="bg-[hsl(var(--warning))]/10" />
        <KPICard title="Payroll Runs" value={4} change="March processing" changeType="neutral" icon={Wallet} iconColor="bg-[hsl(var(--success))]/10" />
      </div>

      {/* Status cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatusCard label="Submitted" count={23} color="green" />
        <StatusCard label="Draft" count={14} color="yellow" />
        <StatusCard label="Overdue" count={12} color="red" />
        <StatusCard label="Awaiting Info" count={7} color="blue" />
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
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `£${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value: number) => [`£${value.toLocaleString()}`, "Revenue"]} />
                <Bar dataKey="revenue" fill="hsl(199, 89%, 48%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Client Entities</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={entityData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" stroke="none">
                  {entityData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
          <div className="px-6 pb-4 flex flex-wrap gap-3">
            {entityData.map((e) => (
              <div key={e.name} className="flex items-center gap-1.5 text-xs">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: e.color }} />
                <span className="text-muted-foreground">{e.name}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Deadlines table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            Upcoming Deadlines
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Due Date</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assigned</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deadlines.map((d, i) => {
                const s = statusMap[d.status];
                return (
                  <TableRow key={i} className="cursor-pointer hover:bg-muted/50">
                    <TableCell className="font-medium text-sm">{d.date}</TableCell>
                    <TableCell className="text-sm">{d.client}</TableCell>
                    <TableCell className="text-sm">{d.type}</TableCell>
                    <TableCell>
                      <Badge variant={s.variant} className="text-xs">{s.label}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{d.assigned}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
