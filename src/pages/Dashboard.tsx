import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight, BookOpenCheck, Calendar, CheckCircle2, FileSearch,
  Receipt, Sparkles, TrendingUp, Users, Wallet,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useBillingKPIs, useDashboardKPIs, useOverdueTasks, useUpcomingTasks } from "@/hooks/useDashboardData";
import { cn } from "@/lib/utils";

const entityColors: Record<string, string> = {
  ltd: "#17221f", sole_trader: "#91a91e", partnership: "#d9a441",
  llp: "#64748b", charity: "#b55c69", trust: "#94a3b8",
};

const entityLabels: Record<string, string> = {
  ltd: "Ltd", sole_trader: "Sole trader", partnership: "Partnership",
  llp: "LLP", charity: "Charity", trust: "Trust",
};

const taskStatus: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  overdue: { label: "Overdue", variant: "destructive" },
  todo: { label: "To do", variant: "secondary" },
  in_progress: { label: "In progress", variant: "outline" },
  blocked: { label: "Blocked", variant: "destructive" },
  awaiting_client: { label: "Awaiting client", variant: "outline" },
  awaiting_hmrc: { label: "Awaiting HMRC", variant: "outline" },
};

type MetricProps = {
  label: string;
  value: string | number;
  helper: string;
  icon: typeof Users;
  tone?: "plain" | "lime" | "amber";
  onClick?: () => void;
};

function MetricCard({ label, value, helper, icon: Icon, tone = "plain", onClick }: MetricProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "workspace-panel min-h-40 w-full p-5 text-left transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_36px_rgba(23,34,31,0.08)]",
        tone === "lime" && "border-[#e1e8c2] bg-[#f0f3e4]",
        tone === "amber" && "border-[#eee2c7] bg-[#faf5e9]",
      )}
    >
      <div className="flex items-center justify-between">
        <span className="workspace-eyebrow">{label}</span>
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-foreground/5 text-muted-foreground"><Icon className="h-4 w-4" /></span>
      </div>
      <div className="mt-5 font-serif text-3xl font-semibold tracking-tight text-foreground">{value}</div>
      <p className="mt-3 text-xs text-muted-foreground">{helper}</p>
    </button>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { data: kpis, isLoading: kpisLoading } = useDashboardKPIs();
  const { data: overdueTasks } = useOverdueTasks();
  const { data: upcomingTasks } = useUpcomingTasks();
  const { data: billingKPIs } = useBillingKPIs();

  const { data: entityData = [] } = useQuery({
    queryKey: ["client-entity-breakdown"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("entity_type").eq("status", "active");
      if (error) throw error;
      const counts = data.reduce<Record<string, number>>((result, client) => {
        result[client.entity_type] = (result[client.entity_type] ?? 0) + 1;
        return result;
      }, {});
      return Object.entries(counts).map(([name, value]) => ({ name: entityLabels[name] ?? name, value, color: entityColors[name] ?? "#94a3b8" }));
    },
    staleTime: 5 * 60_000,
  });

  const { data: accountsControl } = useQuery({
    queryKey: ["dashboard-accounts-control"],
    queryFn: async () => {
      const [matches, duplicates, judgements, checks] = await Promise.all([
        supabase.from("evidence_matches").select("status"),
        supabase.from("duplicate_candidates").select("status"),
        supabase.from("accounting_judgements").select("status"),
        supabase.from("year_end_checks").select("status"),
      ]);
      const error = matches.error ?? duplicates.error ?? judgements.error ?? checks.error;
      if (error) throw error;
      const openMatches = matches.data.filter((item) => item.status === "suggested").length;
      const openDuplicates = duplicates.data.filter((item) => item.status === "open").length;
      const openJudgements = judgements.data.filter((item) => item.status === "proposed").length;
      const completedChecks = checks.data.filter((item) => ["complete", "not_applicable"].includes(item.status)).length;
      return {
        decisions: openMatches + openDuplicates + openJudgements,
        openMatches,
        openDuplicates,
        openJudgements,
        checklistProgress: checks.data.length ? Math.round((completedChecks / checks.data.length) * 100) : 0,
      };
    },
  });

  const deadlines = useMemo(() => [
    ...(overdueTasks ?? []).map((task) => ({ date: task.due_date, client: task.client_legal_name ?? "—", title: task.title, status: "overdue", priority: task.priority })),
    ...(upcomingTasks ?? []).map((task) => ({ date: task.due_date, client: task.client_legal_name ?? "—", title: task.title, status: task.status, priority: task.priority })),
  ].slice(0, 10), [overdueTasks, upcomingTasks]);

  const revenueData = (billingKPIs ?? []).map((item) => ({
    month: new Date(`${item.month}-01`).toLocaleDateString("en-GB", { month: "short" }),
    revenue: item.invoices_total,
  }));

  const control = accountsControl ?? { decisions: 0, openMatches: 0, openDuplicates: 0, openJudgements: 0, checklistProgress: 0 };

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-medium text-[#667914]"><span className="h-2 w-2 rounded-full bg-[#91a91e] shadow-[0_0_0_4px_#eaf1cf]" /> Practice is live</div>
          <h1 className="max-w-3xl font-serif text-3xl leading-tight tracking-tight text-foreground md:text-4xl">One clear view of the practice, from client work to final accounts.</h1>
          <p className="mt-2 text-sm text-muted-foreground">Deadlines, evidence decisions, bookkeeping and accounts production—prioritised for action.</p>
        </div>
        <Card className="workspace-panel w-full border-border/80 lg:w-[350px]">
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-xs"><span className="font-medium">Accounts control readiness</span><span className="font-semibold">{control.checklistProgress}%</span></div>
            <Progress value={control.checklistProgress} className="mt-3 h-2" />
            <div className="mt-3 flex items-center justify-between"><p className="text-[11px] text-muted-foreground">{control.decisions} evidence or accounting decisions remain.</p><Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => navigate("/review-centre")}>Review <ArrowRight className="ml-1 h-3.5 w-3.5" /></Button></div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpisLoading ? Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-40 rounded-[1.25rem]" />) : (
          <>
            <MetricCard label="Active clients" value={kpis?.active_clients ?? 0} helper={`${kpis?.open_tasks ?? 0} open tasks across the practice`} icon={Users} tone="lime" onClick={() => navigate("/clients")} />
            <MetricCard label="Overdue work" value={kpis?.overdue_tasks ?? 0} helper={kpis?.overdue_tasks ? "Requires attention today" : "All current deadlines are clear"} icon={Calendar} onClick={() => navigate("/tasks")} />
            <MetricCard label="VAT returns due" value={kpis?.vat_due_14d ?? 0} helper="Due within the next 14 days" icon={Receipt} tone="amber" onClick={() => navigate("/vat")} />
            <MetricCard label="AI review queue" value={control.decisions} helper={`${control.openMatches} matches · ${control.openDuplicates} duplicates · ${control.openJudgements} judgements`} icon={FileSearch} onClick={() => navigate("/review-centre")} />
          </>
        )}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.45fr_.85fr]">
        <Card className="workspace-panel overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between border-b border-border/70 pb-4">
            <div><p className="workspace-eyebrow">Practice workflow</p><CardTitle className="mt-1 text-base">Upcoming deadlines and overdue tasks</CardTitle></div>
            <Button variant="ghost" size="sm" onClick={() => navigate("/tasks")}>View all <ArrowRight className="ml-1 h-4 w-4" /></Button>
          </CardHeader>
          <CardContent className="p-0">
            {deadlines.length === 0 ? <div className="flex min-h-56 flex-col items-center justify-center p-6 text-center text-sm text-muted-foreground"><CheckCircle2 className="mb-3 h-8 w-8 text-[#91a91e]" />No upcoming deadlines. Create tasks with due dates to see them here.</div> : (
              <>
                <div className="divide-y divide-border/60 md:hidden">
                  {deadlines.slice(0, 6).map((item, index) => {
                    const status = taskStatus[item.status] ?? { label: item.status, variant: "secondary" as const };
                    return <button type="button" key={`${item.title}-${index}`} onClick={() => navigate("/tasks")} className="flex w-full items-start gap-3 p-4 text-left active:bg-muted"><span className={cn("mt-1 h-2.5 w-2.5 shrink-0 rounded-full", item.status === "overdue" ? "bg-destructive" : "bg-[#91a91e]")} /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{item.title}</span><span className="mt-1 block text-xs text-muted-foreground">{item.client} · {new Date(item.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</span></span><Badge variant={status.variant} className="text-[10px]">{status.label}</Badge></button>;
                  })}
                </div>
                <div className="hidden md:block">
                  <Table><TableHeader><TableRow><TableHead>Due</TableHead><TableHead>Client</TableHead><TableHead>Task</TableHead><TableHead>Status</TableHead><TableHead>Priority</TableHead></TableRow></TableHeader><TableBody>{deadlines.map((item, index) => {
                    const status = taskStatus[item.status] ?? { label: item.status, variant: "secondary" as const };
                    return <TableRow key={`${item.title}-${index}`} className="cursor-pointer" onClick={() => navigate("/tasks")}><TableCell className="font-medium">{new Date(item.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</TableCell><TableCell>{item.client}</TableCell><TableCell>{item.title}</TableCell><TableCell><Badge variant={status.variant}>{status.label}</Badge></TableCell><TableCell className="capitalize text-muted-foreground">{item.priority}</TableCell></TableRow>;
                  })}</TableBody></Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <button type="button" onClick={() => navigate("/review-centre")} className="group workspace-panel flex min-h-72 flex-col bg-[#17221f] p-6 text-left text-white shadow-[0_16px_40px_rgba(23,34,31,0.18)] transition hover:-translate-y-0.5">
          <div className="flex items-center justify-between"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10"><Sparkles className="h-5 w-5 text-[#d7f560]" /></span><ArrowRight className="h-5 w-5 text-white/40 transition group-hover:translate-x-1" /></div>
          <div className="mt-auto"><p className="text-2xl font-semibold">{control.decisions} decisions need review</p><p className="mt-3 max-w-sm text-sm leading-6 text-white/55">Invoice matches, possible duplicates, capex and year-end judgements are separated into one controlled queue.</p><div className="mt-5 flex flex-wrap gap-2"><span className="rounded-full bg-white/10 px-3 py-1 text-[11px]">{control.openMatches} evidence matches</span><span className="rounded-full bg-white/10 px-3 py-1 text-[11px]">{control.openDuplicates} duplicates</span></div></div>
        </button>
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        <Card className="workspace-panel lg:col-span-2">
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><TrendingUp className="h-4 w-4 text-muted-foreground" /> Monthly revenue</CardTitle></CardHeader>
          <CardContent>{revenueData.length ? <ResponsiveContainer width="100%" height={250}><BarChart data={revenueData}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" /><XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} /><YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(value) => `£${(Number(value) / 1000).toFixed(0)}k`} /><Tooltip formatter={(value: number) => [`£${value.toLocaleString()}`, "Revenue"]} /><Bar dataKey="revenue" fill="#91a91e" radius={[8, 8, 0, 0]} /></BarChart></ResponsiveContainer> : <div className="flex h-[250px] items-center justify-center text-sm text-muted-foreground">Revenue will appear when invoices are created.</div>}</CardContent>
        </Card>
        <Card className="workspace-panel">
          <CardHeader><CardTitle className="text-base">Client entities</CardTitle></CardHeader>
          <CardContent>{entityData.length ? <><ResponsiveContainer width="100%" height={190}><PieChart><Pie data={entityData} cx="50%" cy="50%" innerRadius={52} outerRadius={78} dataKey="value" stroke="none">{entityData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer><div className="flex flex-wrap justify-center gap-3">{entityData.map((entry) => <span key={entry.name} className="flex items-center gap-1.5 text-xs text-muted-foreground"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />{entry.name}</span>)}</div></> : <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">No clients yet.</div>}</CardContent>
        </Card>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <Button variant="outline" className="workspace-panel h-auto justify-start p-4" onClick={() => navigate("/accounts")}><BookOpenCheck className="mr-3 h-5 w-5 text-[#667914]" /><span className="text-left"><span className="block font-semibold">Accounts production</span><span className="text-xs font-normal text-muted-foreground">Prepare, review and finalise statements</span></span></Button>
        <Button variant="outline" className="workspace-panel h-auto justify-start p-4" onClick={() => navigate("/billing")}><Wallet className="mr-3 h-5 w-5 text-[#667914]" /><span className="text-left"><span className="block font-semibold">Billing and payments</span><span className="text-xs font-normal text-muted-foreground">Overdue invoices: {kpis?.overdue_invoices ?? 0}</span></span></Button>
        <Button variant="outline" className="workspace-panel h-auto justify-start p-4" onClick={() => navigate("/reports")}><TrendingUp className="mr-3 h-5 w-5 text-[#667914]" /><span className="text-left"><span className="block font-semibold">Practice reports</span><span className="text-xs font-normal text-muted-foreground">Workload, billing and client insights</span></span></Button>
      </section>
    </div>
  );
}
