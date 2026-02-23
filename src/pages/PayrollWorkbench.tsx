import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { KPICard } from "@/components/dashboard/KPICard";
import { StatusBadge } from "@/components/ui/status-badge";
import { DueDatePill } from "@/components/ui/due-date-pill";
import {
  Users, Search, Plus, FileText, Clock, CheckCircle2,
  AlertTriangle, Banknote, Send, Eye,
} from "lucide-react";
import { toast } from "sonner";

const fmt = (pence: number) => `£${(pence / 100).toFixed(2)}`;

const statusVariant = (s: string) => {
  if (s === "finalised" || s === "submitted") return "default" as const;
  if (s === "rejected") return "destructive" as const;
  return "secondary" as const;
};

export default function PayrollWorkbench() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showNewEmployer, setShowNewEmployer] = useState(false);
  const [showNewRun, setShowNewRun] = useState(false);
  const [selectedRun, setSelectedRun] = useState<any>(null);

  // New employer form
  const [newEmployerClientId, setNewEmployerClientId] = useState("");
  const [newEmployerName, setNewEmployerName] = useState("");
  const [newPayeRef, setNewPayeRef] = useState("");

  // New run form
  const [newRunEmployerId, setNewRunEmployerId] = useState("");
  const [newRunPayDate, setNewRunPayDate] = useState("");
  const [newRunPeriod, setNewRunPeriod] = useState("1");

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("tenant_id").eq("id", user!.id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Employers
  const { data: employers = [] } = useQuery({
    queryKey: ["payroll-employers", profile?.tenant_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payroll_employers")
        .select("*, clients(legal_name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.tenant_id,
  });

  // Clients for dropdown
  const { data: clients = [] } = useQuery({
    queryKey: ["clients-list", profile?.tenant_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, legal_name, paye_reference")
        .eq("status", "active")
        .order("legal_name");
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.tenant_id,
  });

  // Pay runs
  const { data: payRuns = [], isLoading: runsLoading } = useQuery({
    queryKey: ["pay-runs", profile?.tenant_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pay_runs")
        .select("*, payroll_employers(employer_name, paye_reference, clients(legal_name))")
        .order("pay_date", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.tenant_id,
  });

  // Payslips for selected run
  const { data: payslips = [] } = useQuery({
    queryKey: ["payslips", selectedRun?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payslips")
        .select("*")
        .eq("pay_run_id", selectedRun!.id)
        .order("employee_name");
      if (error) throw error;
      return data;
    },
    enabled: !!selectedRun,
  });

  // Mutations
  const createEmployer = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("payroll_employers").insert({
        tenant_id: profile!.tenant_id,
        client_id: newEmployerClientId,
        employer_name: newEmployerName,
        paye_reference: newPayeRef || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll-employers"] });
      setShowNewEmployer(false);
      setNewEmployerName("");
      setNewPayeRef("");
      toast.success("Employer created");
    },
  });

  const createPayRun = useMutation({
    mutationFn: async () => {
      const payDate = new Date(newRunPayDate);
      const periodEnd = new Date(payDate);
      const periodStart = new Date(payDate);
      periodStart.setMonth(periodStart.getMonth() - 1);
      periodStart.setDate(periodStart.getDate() + 1);

      const { error } = await supabase.from("pay_runs").insert({
        tenant_id: profile!.tenant_id,
        employer_id: newRunEmployerId,
        tax_period: parseInt(newRunPeriod),
        pay_date: newRunPayDate,
        period_start: periodStart.toISOString().split("T")[0],
        period_end: periodEnd.toISOString().split("T")[0],
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pay-runs"] });
      setShowNewRun(false);
      toast.success("Pay run created");
    },
  });

  const finaliseRun = useMutation({
    mutationFn: async (runId: string) => {
      const { error } = await supabase.from("pay_runs").update({ status: "finalised" }).eq("id", runId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pay-runs"] });
      toast.success("Pay run finalised");
    },
  });

  // KPIs
  const draftRuns = payRuns.filter((r: any) => r.status === "draft").length;
  const finalisedRuns = payRuns.filter((r: any) => r.status === "finalised").length;
  const submittedRuns = payRuns.filter((r: any) => r.status === "submitted").length;
  const totalNet = payRuns.reduce((sum: number, r: any) => sum + (r.total_net_pence || 0), 0);

  // Filter runs
  const filteredRuns = useMemo(() => {
    return payRuns.filter((r: any) => {
      const matchSearch = !search ||
        (r.payroll_employers?.employer_name || "").toLowerCase().includes(search.toLowerCase()) ||
        (r.payroll_employers?.clients?.legal_name || "").toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "all" || r.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [payRuns, search, statusFilter]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Payroll (RTI)</h1>
          <p className="text-sm text-muted-foreground">HMRC Real Time Information — employers, pay runs, FPS/EPS submissions</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-1.5" onClick={() => setShowNewEmployer(true)}>
            <Users className="w-3.5 h-3.5" /> Add Employer
          </Button>
          <Button className="gap-1.5" onClick={() => setShowNewRun(true)}>
            <Plus className="w-3.5 h-3.5" /> New Pay Run
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Draft Runs" value={draftRuns} change="Awaiting finalisation" changeType={draftRuns ? "negative" : "positive"} icon={FileText} iconColor="bg-warning/10" />
        <KPICard title="Finalised" value={finalisedRuns} change="Ready for FPS" changeType="neutral" icon={CheckCircle2} iconColor="bg-[hsl(var(--success))]/10" />
        <KPICard title="Submitted" value={submittedRuns} change="FPS sent to HMRC" changeType="positive" icon={Send} iconColor="bg-[hsl(var(--info))]/10" />
        <KPICard title="Total Net Pay" value={fmt(totalNet)} change="All runs" changeType="neutral" icon={Banknote} iconColor="bg-primary/10" />
      </div>

      <Tabs defaultValue="runs">
        <TabsList>
          <TabsTrigger value="runs">Pay Runs ({payRuns.length})</TabsTrigger>
          <TabsTrigger value="employers">Employers ({employers.length})</TabsTrigger>
        </TabsList>

        {/* ── Pay Runs ─────────────────────── */}
        <TabsContent value="runs" className="mt-4 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search employer or client..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="All statuses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="finalised">Finalised</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardContent className="pt-4">
              {runsLoading ? (
                <div className="space-y-3 py-6">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-10 rounded bg-muted animate-pulse" />)}</div>
              ) : filteredRuns.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <Banknote className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No pay runs found.</p>
                  <p className="text-xs mt-1">Create a new pay run to get started.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employer</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Pay Date</TableHead>
                      <TableHead className="text-right">Gross</TableHead>
                      <TableHead className="text-right">Tax</TableHead>
                      <TableHead className="text-right">Net</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRuns.map((r: any) => (
                      <TableRow key={r.id}>
                        <TableCell>
                          <div>
                            <p className="text-sm font-medium">{r.payroll_employers?.employer_name || "—"}</p>
                            <p className="text-xs text-muted-foreground">{r.payroll_employers?.clients?.legal_name || ""}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">P{r.tax_period} · {r.tax_year}</TableCell>
                        <TableCell className="text-sm">{new Date(r.pay_date).toLocaleDateString("en-GB")}</TableCell>
                        <TableCell className="text-sm text-right font-mono">{fmt(r.total_gross_pence)}</TableCell>
                        <TableCell className="text-sm text-right font-mono">{fmt(r.total_tax_pence)}</TableCell>
                        <TableCell className="text-sm text-right font-mono">{fmt(r.total_net_pence)}</TableCell>
                        <TableCell><Badge variant={statusVariant(r.status)} className="text-xs capitalize">{r.status}</Badge></TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onClick={() => setSelectedRun(r)}>
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                            {r.status === "draft" && (
                              <Button variant="outline" size="sm" onClick={() => finaliseRun.mutate(r.id)}>
                                Finalise
                              </Button>
                            )}
                            {r.status === "finalised" && (
                              <Button variant="outline" size="sm" className="gap-1">
                                <Send className="w-3 h-3" /> Submit FPS
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Employers ─────────────────────── */}
        <TabsContent value="employers" className="mt-4">
          <Card>
            <CardContent className="pt-4">
              {employers.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No employers set up yet.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employer</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>PAYE Ref</TableHead>
                      <TableHead>Frequency</TableHead>
                      <TableHead>Tax Year</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employers.map((e: any) => (
                      <TableRow key={e.id}>
                        <TableCell className="font-medium">{e.employer_name}</TableCell>
                        <TableCell className="text-sm">{e.clients?.legal_name || "—"}</TableCell>
                        <TableCell className="text-sm font-mono">{e.paye_reference || "—"}</TableCell>
                        <TableCell className="text-sm capitalize">{e.pay_frequency}</TableCell>
                        <TableCell className="text-sm">{e.tax_year}</TableCell>
                        <TableCell><Badge variant={e.is_active ? "default" : "secondary"} className="text-xs">{e.is_active ? "Active" : "Inactive"}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Payslip detail dialog */}
      <Dialog open={!!selectedRun} onOpenChange={(open) => !open && setSelectedRun(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              Pay Run — P{selectedRun?.tax_period} · {selectedRun?.payroll_employers?.employer_name}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-4 gap-3 text-sm mb-4">
            <div><span className="text-muted-foreground">Pay Date:</span> {selectedRun?.pay_date}</div>
            <div><span className="text-muted-foreground">Gross:</span> {fmt(selectedRun?.total_gross_pence || 0)}</div>
            <div><span className="text-muted-foreground">Tax:</span> {fmt(selectedRun?.total_tax_pence || 0)}</div>
            <div><span className="text-muted-foreground">Net:</span> {fmt(selectedRun?.total_net_pence || 0)}</div>
          </div>
          {payslips.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No payslips in this run yet. Add employees to generate payslips.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>NI No</TableHead>
                  <TableHead>Tax Code</TableHead>
                  <TableHead className="text-right">Gross</TableHead>
                  <TableHead className="text-right">Tax</TableHead>
                  <TableHead className="text-right">NI</TableHead>
                  <TableHead className="text-right">Net</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payslips.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.employee_name}</TableCell>
                    <TableCell className="text-sm font-mono">{p.ni_number || "—"}</TableCell>
                    <TableCell className="text-sm font-mono">{p.tax_code || "—"}</TableCell>
                    <TableCell className="text-sm text-right font-mono">{fmt(p.gross_pence)}</TableCell>
                    <TableCell className="text-sm text-right font-mono">{fmt(p.tax_pence)}</TableCell>
                    <TableCell className="text-sm text-right font-mono">{fmt(p.ni_employee_pence)}</TableCell>
                    <TableCell className="text-sm text-right font-mono">{fmt(p.net_pence)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>

      {/* New employer dialog */}
      <Dialog open={showNewEmployer} onOpenChange={setShowNewEmployer}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Employer</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Client</Label>
              <Select value={newEmployerClientId} onValueChange={setNewEmployerClientId}>
                <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent>
                  {clients.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.legal_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Employer Name</Label>
              <Input value={newEmployerName} onChange={(e) => setNewEmployerName(e.target.value)} placeholder="e.g. ABC Ltd Payroll" />
            </div>
            <div className="space-y-2">
              <Label>PAYE Reference</Label>
              <Input value={newPayeRef} onChange={(e) => setNewPayeRef(e.target.value)} placeholder="e.g. 123/A456" />
            </div>
            <Button className="w-full" onClick={() => createEmployer.mutate()} disabled={!newEmployerClientId || !newEmployerName}>
              Create Employer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* New pay run dialog */}
      <Dialog open={showNewRun} onOpenChange={setShowNewRun}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Pay Run</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Employer</Label>
              <Select value={newRunEmployerId} onValueChange={setNewRunEmployerId}>
                <SelectTrigger><SelectValue placeholder="Select employer" /></SelectTrigger>
                <SelectContent>
                  {employers.map((e: any) => (
                    <SelectItem key={e.id} value={e.id}>{e.employer_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Pay Date</Label>
              <Input type="date" value={newRunPayDate} onChange={(e) => setNewRunPayDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Tax Period</Label>
              <Input type="number" min="1" max="12" value={newRunPeriod} onChange={(e) => setNewRunPeriod(e.target.value)} />
            </div>
            <Button className="w-full" onClick={() => createPayRun.mutate()} disabled={!newRunEmployerId || !newRunPayDate}>
              Create Pay Run
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
