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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { KPICard } from "@/components/dashboard/KPICard";
import {
  Users, Search, Plus, FileText, CheckCircle2,
  Banknote, Send, Eye, Pencil, Trash2, UserPlus, UserMinus,
} from "lucide-react";
import { toast } from "sonner";
import { HmrcConnectButton } from "@/components/HmrcConnectButton";

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
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<any>(null);

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

  // Employees
  const [empSearch, setEmpSearch] = useState("");
  const [empStatusFilter, setEmpStatusFilter] = useState("active");
  const [empEmployerFilter, setEmpEmployerFilter] = useState("all");

  const { data: employees = [] } = useQuery({
    queryKey: ["payroll-employees", profile?.tenant_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payroll_employees")
        .select("*, payroll_employers(employer_name)")
        .order("last_name");
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.tenant_id,
  });

  const filteredEmployees = useMemo(() => {
    return employees.filter((e: any) => {
      const name = `${e.first_name} ${e.last_name}`.toLowerCase();
      const matchSearch = !empSearch || name.includes(empSearch.toLowerCase()) || (e.ni_number || "").toLowerCase().includes(empSearch.toLowerCase());
      const matchStatus = empStatusFilter === "all" || (empStatusFilter === "active" ? e.is_active : !e.is_active);
      const matchEmployer = empEmployerFilter === "all" || e.employer_id === empEmployerFilter;
      return matchSearch && matchStatus && matchEmployer;
    });
  }, [employees, empSearch, empStatusFilter, empEmployerFilter]);

  // Employee form defaults
  const emptyEmployee = {
    first_name: "", last_name: "", title: "", date_of_birth: "", gender: "not_specified",
    ni_number: "", tax_code: "1257L", ni_category: "A", email: "", phone: "",
    start_date: "", leave_date: "", is_director: false, annual_salary_pence: 0,
    hourly_rate_pence: null as number | null, pay_method: "monthly", student_loan_plan: "",
    postgrad_loan: false, pension_opt_out: false, pension_employee_pct: 5, pension_employer_pct: 3,
    is_active: true, notes: "", employer_id: "",
  };
  const [empForm, setEmpForm] = useState(emptyEmployee);

  const openNewEmployee = () => {
    setEditingEmployee(null);
    setEmpForm({ ...emptyEmployee, employer_id: employers[0]?.id || "" });
    setShowEmployeeForm(true);
  };

  const openEditEmployee = (emp: any) => {
    setEditingEmployee(emp);
    setEmpForm({
      first_name: emp.first_name, last_name: emp.last_name, title: emp.title || "",
      date_of_birth: emp.date_of_birth || "", gender: emp.gender || "not_specified",
      ni_number: emp.ni_number || "", tax_code: emp.tax_code || "1257L", ni_category: emp.ni_category || "A",
      email: emp.email || "", phone: emp.phone || "", start_date: emp.start_date || "",
      leave_date: emp.leave_date || "", is_director: emp.is_director, annual_salary_pence: emp.annual_salary_pence || 0,
      hourly_rate_pence: emp.hourly_rate_pence, pay_method: emp.pay_method || "monthly",
      student_loan_plan: emp.student_loan_plan || "", postgrad_loan: emp.postgrad_loan,
      pension_opt_out: emp.pension_opt_out, pension_employee_pct: emp.pension_employee_pct || 5,
      pension_employer_pct: emp.pension_employer_pct || 3, is_active: emp.is_active,
      notes: emp.notes || "", employer_id: emp.employer_id,
    });
    setShowEmployeeForm(true);
  };

  const saveEmployee = useMutation({
    mutationFn: async () => {
      const payload = {
        tenant_id: profile!.tenant_id,
        employer_id: empForm.employer_id,
        first_name: empForm.first_name,
        last_name: empForm.last_name,
        title: empForm.title || null,
        date_of_birth: empForm.date_of_birth || null,
        gender: empForm.gender,
        ni_number: empForm.ni_number || null,
        tax_code: empForm.tax_code,
        ni_category: empForm.ni_category,
        email: empForm.email || null,
        phone: empForm.phone || null,
        start_date: empForm.start_date || null,
        leave_date: empForm.leave_date || null,
        is_director: empForm.is_director,
        annual_salary_pence: empForm.annual_salary_pence,
        hourly_rate_pence: empForm.hourly_rate_pence || null,
        pay_method: empForm.pay_method,
        student_loan_plan: empForm.student_loan_plan || null,
        postgrad_loan: empForm.postgrad_loan,
        pension_opt_out: empForm.pension_opt_out,
        pension_employee_pct: empForm.pension_employee_pct,
        pension_employer_pct: empForm.pension_employer_pct,
        is_active: empForm.is_active,
        notes: empForm.notes || null,
      };
      if (editingEmployee) {
        const { error } = await supabase.from("payroll_employees").update(payload).eq("id", editingEmployee.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("payroll_employees").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll-employees"] });
      setShowEmployeeForm(false);
      toast.success(editingEmployee ? "Employee updated" : "Employee added");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteEmployee = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("payroll_employees").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll-employees"] });
      toast.success("Employee deleted");
    },
  });

  const toggleEmployeeActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("payroll_employees").update({ is_active: active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll-employees"] });
      toast.success("Employee status updated");
    },
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
          {profile?.tenant_id && (
            <HmrcConnectButton
              clientId=""
              tenantId={profile.tenant_id}
              scopes="read:employment-paye write:employment-paye"
              label="Connect HMRC (PAYE)"
            />
          )}
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
          <TabsTrigger value="employees">Employees ({employees.length})</TabsTrigger>
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

        {/* ── Employees ─────────────────────── */}
        <TabsContent value="employees" className="mt-4 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search name or NI number..." className="pl-9" value={empSearch} onChange={(e) => setEmpSearch(e.target.value)} />
            </div>
            <Select value={empEmployerFilter} onValueChange={setEmpEmployerFilter}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="All employers" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All employers</SelectItem>
                {employers.map((e: any) => (
                  <SelectItem key={e.id} value={e.id}>{e.employer_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={empStatusFilter} onValueChange={setEmpStatusFilter}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive / Leavers</SelectItem>
              </SelectContent>
            </Select>
            <Button className="gap-1.5" onClick={openNewEmployee} disabled={employers.length === 0}>
              <UserPlus className="w-3.5 h-3.5" /> Add Employee
            </Button>
          </div>

          {employers.length === 0 ? (
            <Card className="py-12 text-center">
              <p className="text-sm text-muted-foreground">Add an employer first before adding employees.</p>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-4">
                {filteredEmployees.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No employees found.</p>
                    <p className="text-xs mt-1">Add employees to your employer payrolls.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Employer</TableHead>
                        <TableHead>NI Number</TableHead>
                        <TableHead>Tax Code</TableHead>
                        <TableHead className="text-right">Annual Salary</TableHead>
                        <TableHead>Start Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEmployees.map((emp: any) => (
                        <TableRow key={emp.id} className={!emp.is_active ? "opacity-60" : ""}>
                          <TableCell>
                            <div>
                              <p className="text-sm font-medium">{emp.title ? `${emp.title} ` : ""}{emp.first_name} {emp.last_name}</p>
                              <p className="text-xs text-muted-foreground">{emp.email || ""}{emp.is_director ? " · Director" : ""}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{emp.payroll_employers?.employer_name || "—"}</TableCell>
                          <TableCell className="text-sm font-mono">{emp.ni_number || "—"}</TableCell>
                          <TableCell className="text-sm font-mono">{emp.tax_code || "—"}</TableCell>
                          <TableCell className="text-sm text-right font-mono">{fmt(emp.annual_salary_pence || 0)}</TableCell>
                          <TableCell className="text-sm">{emp.start_date ? new Date(emp.start_date).toLocaleDateString("en-GB") : "—"}</TableCell>
                          <TableCell>
                            <Badge variant={emp.is_active ? "default" : "secondary"} className="text-xs">
                              {emp.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" onClick={() => openEditEmployee(emp)} title="Edit">
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => toggleEmployeeActive.mutate({ id: emp.id, active: !emp.is_active })} title={emp.is_active ? "Make inactive" : "Make active"}>
                                <UserMinus className="w-3.5 h-3.5" />
                              </Button>
                              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => {
                                if (confirm(`Delete ${emp.first_name} ${emp.last_name}?`)) deleteEmployee.mutate(emp.id);
                              }} title="Delete">
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}
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

      {/* Employee form dialog */}
      <Dialog open={showEmployeeForm} onOpenChange={setShowEmployeeForm}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingEmployee ? "Edit Employee" : "Add Employee"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {/* Personal */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">Personal Details</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Title</Label>
                  <Select value={empForm.title} onValueChange={(v) => setEmpForm({ ...empForm, title: v })}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Mr">Mr</SelectItem>
                      <SelectItem value="Mrs">Mrs</SelectItem>
                      <SelectItem value="Ms">Ms</SelectItem>
                      <SelectItem value="Miss">Miss</SelectItem>
                      <SelectItem value="Dr">Dr</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Gender</Label>
                  <Select value={empForm.gender} onValueChange={(v) => setEmpForm({ ...empForm, gender: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="not_specified">Not specified</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">First Name *</Label>
                  <Input value={empForm.first_name} onChange={(e) => setEmpForm({ ...empForm, first_name: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Last Name *</Label>
                  <Input value={empForm.last_name} onChange={(e) => setEmpForm({ ...empForm, last_name: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Date of Birth</Label>
                  <Input type="date" value={empForm.date_of_birth} onChange={(e) => setEmpForm({ ...empForm, date_of_birth: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">NI Number</Label>
                  <Input value={empForm.ni_number} onChange={(e) => setEmpForm({ ...empForm, ni_number: e.target.value.toUpperCase() })} placeholder="AB123456C" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Email</Label>
                  <Input type="email" value={empForm.email} onChange={(e) => setEmpForm({ ...empForm, email: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Phone</Label>
                  <Input value={empForm.phone} onChange={(e) => setEmpForm({ ...empForm, phone: e.target.value })} />
                </div>
              </div>
            </div>

            {/* Employment */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">Employment</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Employer *</Label>
                  <Select value={empForm.employer_id} onValueChange={(v) => setEmpForm({ ...empForm, employer_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select employer" /></SelectTrigger>
                    <SelectContent>
                      {employers.map((e: any) => (
                        <SelectItem key={e.id} value={e.id}>{e.employer_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Start Date</Label>
                  <Input type="date" value={empForm.start_date} onChange={(e) => setEmpForm({ ...empForm, start_date: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Leave Date</Label>
                  <Input type="date" value={empForm.leave_date} onChange={(e) => setEmpForm({ ...empForm, leave_date: e.target.value })} />
                </div>
                <div className="flex items-center gap-2 pt-5">
                  <Switch checked={empForm.is_director} onCheckedChange={(v) => setEmpForm({ ...empForm, is_director: v })} />
                  <Label className="text-xs">Director</Label>
                </div>
              </div>
            </div>

            {/* Pay & Tax */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">Pay & Tax</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Annual Salary (£)</Label>
                  <Input type="number" step="0.01" value={(empForm.annual_salary_pence / 100).toFixed(2)} onChange={(e) => setEmpForm({ ...empForm, annual_salary_pence: Math.round(parseFloat(e.target.value || "0") * 100) })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Hourly Rate (£, if applicable)</Label>
                  <Input type="number" step="0.01" value={empForm.hourly_rate_pence ? (empForm.hourly_rate_pence / 100).toFixed(2) : ""} onChange={(e) => setEmpForm({ ...empForm, hourly_rate_pence: e.target.value ? Math.round(parseFloat(e.target.value) * 100) : null })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Tax Code</Label>
                  <Input value={empForm.tax_code} onChange={(e) => setEmpForm({ ...empForm, tax_code: e.target.value.toUpperCase() })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">NI Category</Label>
                  <Select value={empForm.ni_category} onValueChange={(v) => setEmpForm({ ...empForm, ni_category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["A", "B", "C", "F", "H", "I", "J", "L", "M", "S", "V", "Z"].map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Pay Method</Label>
                  <Select value={empForm.pay_method} onValueChange={(v) => setEmpForm({ ...empForm, pay_method: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="fortnightly">Fortnightly</SelectItem>
                      <SelectItem value="four_weekly">4-Weekly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Student Loan</Label>
                  <Select value={empForm.student_loan_plan || "none"} onValueChange={(v) => setEmpForm({ ...empForm, student_loan_plan: v === "none" ? "" : v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="plan_1">Plan 1</SelectItem>
                      <SelectItem value="plan_2">Plan 2</SelectItem>
                      <SelectItem value="plan_4">Plan 4</SelectItem>
                      <SelectItem value="plan_5">Plan 5</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2 pt-5">
                  <Switch checked={empForm.postgrad_loan} onCheckedChange={(v) => setEmpForm({ ...empForm, postgrad_loan: v })} />
                  <Label className="text-xs">Postgrad Loan</Label>
                </div>
              </div>
            </div>

            {/* Pension */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">Pension</h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="flex items-center gap-2">
                  <Switch checked={empForm.pension_opt_out} onCheckedChange={(v) => setEmpForm({ ...empForm, pension_opt_out: v })} />
                  <Label className="text-xs">Opted out</Label>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Employee %</Label>
                  <Input type="number" step="0.1" value={empForm.pension_employee_pct} onChange={(e) => setEmpForm({ ...empForm, pension_employee_pct: parseFloat(e.target.value || "0") })} disabled={empForm.pension_opt_out} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Employer %</Label>
                  <Input type="number" step="0.1" value={empForm.pension_employer_pct} onChange={(e) => setEmpForm({ ...empForm, pension_employer_pct: parseFloat(e.target.value || "0") })} disabled={empForm.pension_opt_out} />
                </div>
              </div>
            </div>

            {/* Notes & Status */}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Notes</Label>
                <Textarea rows={2} value={empForm.notes} onChange={(e) => setEmpForm({ ...empForm, notes: e.target.value })} />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={empForm.is_active} onCheckedChange={(v) => setEmpForm({ ...empForm, is_active: v })} />
                <Label className="text-xs">Active</Label>
              </div>
            </div>

            <Button className="w-full" onClick={() => saveEmployee.mutate()} disabled={!empForm.first_name || !empForm.last_name || !empForm.employer_id || saveEmployee.isPending}>
              {editingEmployee ? "Update Employee" : "Add Employee"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
