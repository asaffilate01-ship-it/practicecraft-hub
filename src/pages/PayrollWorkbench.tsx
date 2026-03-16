import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useClientContext } from "@/contexts/ClientContext";
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
  Calculator, Palmtree, Car,
} from "lucide-react";
import { toast } from "sonner";
import { HmrcConnectButton } from "@/components/HmrcConnectButton";
import { AbsencesTab } from "@/components/payroll/AbsencesTab";
import { BenefitsTab } from "@/components/payroll/BenefitsTab";
import { FormsTab } from "@/components/payroll/FormsTab";
import { PayDetailsGrid } from "@/components/payroll/PayDetailsGrid";
import { RtiSchedule } from "@/components/payroll/RtiSchedule";
import { PaymentsSummary } from "@/components/payroll/PaymentsSummary";
import { PayslipsBatch } from "@/components/payroll/PayslipsBatch";
import { calculatePay, type PayFrequency } from "@/components/payroll/PayCalculationEngine";

const fmt = (pence: number) => `£${(pence / 100).toFixed(2)}`;

const statusVariant = (s: string) => {
  if (s === "finalised" || s === "submitted") return "default" as const;
  if (s === "rejected") return "destructive" as const;
  return "secondary" as const;
};

export default function PayrollWorkbench() {
  const { user } = useAuth();
  const { selectedClientId, selectedClientName } = useClientContext();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showNewEmployer, setShowNewEmployer] = useState(false);
  const [showNewRun, setShowNewRun] = useState(false);
  const [selectedRun, setSelectedRun] = useState<any>(null);
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<any>(null);
  const [showCalcPreview, setShowCalcPreview] = useState(false);
  const [calcResult, setCalcResult] = useState<any>(null);

  // New employer form
  const [newEmployerClientId, setNewEmployerClientId] = useState("");
  const [newEmployerName, setNewEmployerName] = useState("");
  const [newPayeRef, setNewPayeRef] = useState("");
  const [newEmployerFrequency, setNewEmployerFrequency] = useState("monthly");

  // New run form
  const [newRunEmployerId, setNewRunEmployerId] = useState("");
  const [newRunPayDate, setNewRunPayDate] = useState("");
  const [newRunPeriod, setNewRunPeriod] = useState("1");
  const [newRunFrequency, setNewRunFrequency] = useState("monthly");

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("tenant_id").eq("id", user!.id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Employers — scoped to selected client
  const { data: employers = [] } = useQuery({
    queryKey: ["payroll-employers", profile?.tenant_id, selectedClientId],
    queryFn: async () => {
      let q = supabase
        .from("payroll_employers")
        .select("*, clients(legal_name)")
        .order("created_at", { ascending: false });
      if (selectedClientId) q = q.eq("client_id", selectedClientId);
      const { data, error } = await q;
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

  // Pay runs — scoped to selected client's employers
  const { data: payRuns = [], isLoading: runsLoading } = useQuery({
    queryKey: ["pay-runs", profile?.tenant_id, selectedClientId],
    queryFn: async () => {
      let q = supabase
        .from("pay_runs")
        .select("*, payroll_employers!inner(employer_name, paye_reference, client_id, clients(legal_name))")
        .order("pay_date", { ascending: false })
        .limit(100);
      if (selectedClientId) q = q.eq("payroll_employers.client_id", selectedClientId);
      const { data, error } = await q;
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

  // Employees — scoped to selected client's employers
  const { data: employees = [] } = useQuery({
    queryKey: ["payroll-employees", profile?.tenant_id, selectedClientId],
    queryFn: async () => {
      let q = supabase
        .from("payroll_employees")
        .select("*, payroll_employers!inner(employer_name, client_id)")
        .order("last_name");
      if (selectedClientId) q = q.eq("payroll_employers.client_id", selectedClientId);
      const { data, error } = await q;
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

  // Employee form
  const emptyEmployee = {
    first_name: "", last_name: "", title: "", date_of_birth: "", gender: "not_specified",
    ni_number: "", tax_code: "1257L", ni_category: "A", email: "", phone: "",
    start_date: "", leave_date: "", is_director: false, annual_salary_pence: 0,
    hourly_rate_pence: null as number | null, pay_method: "monthly", student_loan_plan: "",
    postgrad_loan: false, pension_opt_out: false, pension_employee_pct: 5, pension_employer_pct: 3,
    is_active: true, notes: "", employer_id: "",
    // New fields
    address_line1: "", address_line2: "", city: "", county: "", postcode: "", country: "GB",
    sort_code: "", account_number: "", account_name: "", payment_method: "bacs",
    payroll_id: "", starter_declaration: "", is_irregular_employment: false,
    week1_month1: false, directors_nic_method: "annual",
    holiday_entitlement_days: 28, holiday_carried_forward: 0,
    p45_previous_pay_pence: 0, p45_previous_tax_pence: 0,
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
      address_line1: emp.address_line1 || "", address_line2: emp.address_line2 || "",
      city: emp.city || "", county: emp.county || "", postcode: emp.postcode || "",
      country: emp.country || "GB", sort_code: emp.sort_code || "",
      account_number: emp.account_number || "", account_name: emp.account_name || "",
      payment_method: emp.payment_method || "bacs", payroll_id: emp.payroll_id || "",
      starter_declaration: emp.starter_declaration || "",
      is_irregular_employment: emp.is_irregular_employment || false,
      week1_month1: emp.week1_month1 || false,
      directors_nic_method: emp.directors_nic_method || "annual",
      holiday_entitlement_days: emp.holiday_entitlement_days ?? 28,
      holiday_carried_forward: emp.holiday_carried_forward ?? 0,
      p45_previous_pay_pence: emp.p45_previous_pay_pence || 0,
      p45_previous_tax_pence: emp.p45_previous_tax_pence || 0,
    });
    setShowEmployeeForm(true);
  };

  const saveEmployee = useMutation({
    mutationFn: async () => {
      const payload: any = {
        tenant_id: profile!.tenant_id,
        employer_id: empForm.employer_id,
        first_name: empForm.first_name, last_name: empForm.last_name,
        title: empForm.title || null, date_of_birth: empForm.date_of_birth || null,
        gender: empForm.gender, ni_number: empForm.ni_number || null,
        tax_code: empForm.tax_code, ni_category: empForm.ni_category,
        email: empForm.email || null, phone: empForm.phone || null,
        start_date: empForm.start_date || null, leave_date: empForm.leave_date || null,
        is_director: empForm.is_director, annual_salary_pence: empForm.annual_salary_pence,
        hourly_rate_pence: empForm.hourly_rate_pence || null, pay_method: empForm.pay_method,
        student_loan_plan: empForm.student_loan_plan || null, postgrad_loan: empForm.postgrad_loan,
        pension_opt_out: empForm.pension_opt_out, pension_employee_pct: empForm.pension_employee_pct,
        pension_employer_pct: empForm.pension_employer_pct, is_active: empForm.is_active,
        notes: empForm.notes || null,
        address_line1: empForm.address_line1 || null, address_line2: empForm.address_line2 || null,
        city: empForm.city || null, county: empForm.county || null, postcode: empForm.postcode || null,
        country: empForm.country || "GB", sort_code: empForm.sort_code || null,
        account_number: empForm.account_number || null, account_name: empForm.account_name || null,
        payment_method: empForm.payment_method || "bacs", payroll_id: empForm.payroll_id || null,
        starter_declaration: empForm.starter_declaration || null,
        is_irregular_employment: empForm.is_irregular_employment,
        week1_month1: empForm.week1_month1,
        directors_nic_method: empForm.directors_nic_method,
        holiday_entitlement_days: empForm.holiday_entitlement_days,
        holiday_carried_forward: empForm.holiday_carried_forward,
        p45_previous_pay_pence: empForm.p45_previous_pay_pence,
        p45_previous_tax_pence: empForm.p45_previous_tax_pence,
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

  // Create employer
  const createEmployer = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("payroll_employers").insert({
        tenant_id: profile!.tenant_id,
        client_id: newEmployerClientId,
        employer_name: newEmployerName,
        paye_reference: newPayeRef || null,
        pay_frequency: newEmployerFrequency,
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

  // Create pay run with auto-generate payslips
  const createPayRun = useMutation({
    mutationFn: async () => {
      const payDate = new Date(newRunPayDate);
      const periodEnd = new Date(payDate);
      const periodStart = new Date(payDate);
      if (newRunFrequency === "weekly") {
        periodStart.setDate(periodStart.getDate() - 6);
      } else if (newRunFrequency === "fortnightly") {
        periodStart.setDate(periodStart.getDate() - 13);
      } else {
        periodStart.setMonth(periodStart.getMonth() - 1);
        periodStart.setDate(periodStart.getDate() + 1);
      }

      const { data: run, error } = await supabase.from("pay_runs").insert({
        tenant_id: profile!.tenant_id,
        employer_id: newRunEmployerId,
        tax_period: parseInt(newRunPeriod),
        pay_date: newRunPayDate,
        period_start: periodStart.toISOString().split("T")[0],
        period_end: periodEnd.toISOString().split("T")[0],
        pay_frequency: newRunFrequency,
      }).select().single();
      if (error) throw error;

      // Auto-generate payslips for active employees
      const activeEmps = employees.filter((e: any) => e.employer_id === newRunEmployerId && e.is_active);
      if (activeEmps.length > 0) {
        let totalGross = 0, totalTax = 0, totalNiEmp = 0, totalNiEr = 0, totalNet = 0, totalPensionEmp = 0, totalPensionEr = 0, totalSL = 0;

        const slips = activeEmps.map((emp: any) => {
          const calc = calculatePay({
            annualSalaryPence: emp.annual_salary_pence || 0,
            hourlyRatePence: emp.hourly_rate_pence || undefined,
            frequency: (emp.pay_method || "monthly") as PayFrequency,
            taxCode: emp.tax_code || "1257L",
            niCategory: emp.ni_category || "A",
            isDirector: emp.is_director,
            studentLoanPlan: emp.student_loan_plan || undefined,
            postgradLoan: emp.postgrad_loan,
            pensionEmployeePct: emp.pension_employee_pct || 5,
            pensionEmployerPct: emp.pension_employer_pct || 3,
            pensionOptOut: emp.pension_opt_out,
            week1Month1: emp.week1_month1,
            currentPeriod: parseInt(newRunPeriod),
          });

          totalGross += calc.grossPence;
          totalTax += calc.taxPence;
          totalNiEmp += calc.niEmployeePence;
          totalNiEr += calc.niEmployerPence;
          totalNet += calc.netPence;
          totalPensionEmp += calc.pensionEmployeePence;
          totalPensionEr += calc.pensionEmployerPence;
          totalSL += calc.studentLoanPence + calc.postgradLoanPence;

          return {
            tenant_id: profile!.tenant_id,
            pay_run_id: run.id,
            employee_id: emp.id,
            employee_name: `${emp.first_name} ${emp.last_name}`,
            ni_number: emp.ni_number,
            tax_code: emp.tax_code,
            gross_pence: calc.grossPence,
            tax_pence: calc.taxPence,
            ni_employee_pence: calc.niEmployeePence,
            ni_employer_pence: calc.niEmployerPence,
            net_pence: calc.netPence,
            student_loan_pence: calc.studentLoanPence + calc.postgradLoanPence,
            pension_employee_pence: calc.pensionEmployeePence,
            pension_employer_pence: calc.pensionEmployerPence,
            holiday_pay_pence: calc.holidayPayPence,
            sick_pay_pence: calc.sickPayPence,
            smp_pence: calc.smpPence,
            spp_pence: calc.sppPence,
            sap_pence: calc.sapPence,
            shpp_pence: calc.shppPence,
            hours_worked: emp.hourly_rate_pence ? 0 : 0,
            deductions_json: [],
            additions_json: [],
          };
        });

        const { error: slipErr } = await supabase.from("payslips").insert(slips);
        if (slipErr) console.error("Payslip insert error:", slipErr);

        // Update run totals
        await supabase.from("pay_runs").update({
          total_gross_pence: totalGross,
          total_tax_pence: totalTax,
          total_ni_employee_pence: totalNiEmp,
          total_ni_employer_pence: totalNiEr,
          total_net_pence: totalNet,
          total_pension_employee_pence: totalPensionEmp,
          total_pension_employer_pence: totalPensionEr,
          total_student_loan_pence: totalSL,
        }).eq("id", run.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pay-runs"] });
      queryClient.invalidateQueries({ queryKey: ["payslips"] });
      setShowNewRun(false);
      toast.success("Pay run created with auto-calculated payslips");
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

  // Preview pay calculation for employee
  const previewCalc = (emp: any) => {
    const result = calculatePay({
      annualSalaryPence: emp.annual_salary_pence || 0,
      hourlyRatePence: emp.hourly_rate_pence || undefined,
      frequency: (emp.pay_method || "monthly") as PayFrequency,
      taxCode: emp.tax_code || "1257L",
      niCategory: emp.ni_category || "A",
      isDirector: emp.is_director,
      studentLoanPlan: emp.student_loan_plan || undefined,
      postgradLoan: emp.postgrad_loan,
      pensionEmployeePct: emp.pension_employee_pct || 5,
      pensionEmployerPct: emp.pension_employer_pct || 3,
      pensionOptOut: emp.pension_opt_out,
      week1Month1: emp.week1_month1,
    });
    setCalcResult({ emp, result });
    setShowCalcPreview(true);
  };

  // KPIs
  const draftRuns = payRuns.filter((r: any) => r.status === "draft").length;
  const finalisedRuns = payRuns.filter((r: any) => r.status === "finalised").length;
  const submittedRuns = payRuns.filter((r: any) => r.status === "submitted").length;
  const totalNet = payRuns.reduce((sum: number, r: any) => sum + (r.total_net_pence || 0), 0);

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
          <p className="text-sm text-muted-foreground">
            {selectedClientName
              ? `Payroll for ${selectedClientName}`
              : "Select a client from the top bar to view payroll"}
          </p>
        </div>
        <div className="flex gap-2">
          {profile?.tenant_id && (
            <HmrcConnectButton clientId="" tenantId={profile.tenant_id} scopes="read:employment-paye write:employment-paye" label="Connect HMRC (PAYE)" />
          )}
          <Button variant="outline" className="gap-1.5" disabled={!selectedClientId} onClick={() => { setNewEmployerClientId(selectedClientId || ""); setShowNewEmployer(true); }}>
            <Users className="w-3.5 h-3.5" /> Add Employer
          </Button>
          <Button className="gap-1.5" onClick={() => {
            const emp = employers[0];
            setNewRunEmployerId(emp?.id || "");
            setNewRunFrequency(emp?.pay_frequency || "monthly");
            setShowNewRun(true);
          }}>
            <Plus className="w-3.5 h-3.5" /> New Pay Run
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Draft Runs" value={draftRuns} change="Awaiting finalisation" changeType={draftRuns ? "negative" : "positive"} icon={FileText} iconColor="bg-warning/10" />
        <KPICard title="Finalised" value={finalisedRuns} change="Ready for FPS" changeType="neutral" icon={CheckCircle2} iconColor="bg-[hsl(var(--success))]/10" />
        <KPICard title="Submitted" value={submittedRuns} change="FPS sent to HMRC" changeType="positive" icon={Send} iconColor="bg-[hsl(var(--info))]/10" />
        <KPICard title="Total Net Pay" value={fmt(totalNet)} change="All runs" changeType="neutral" icon={Banknote} iconColor="bg-primary/10" />
      </div>

      <Tabs defaultValue="runs">
        <TabsList className="flex-wrap">
          <TabsTrigger value="runs">Pay Runs ({payRuns.length})</TabsTrigger>
          <TabsTrigger value="employees">Employees ({employees.length})</TabsTrigger>
          <TabsTrigger value="employers">Employers ({employers.length})</TabsTrigger>
          <TabsTrigger value="absences" className="gap-1"><Palmtree className="w-3 h-3" /> Absences</TabsTrigger>
          <TabsTrigger value="benefits" className="gap-1"><Car className="w-3 h-3" /> P11D Benefits</TabsTrigger>
          <TabsTrigger value="forms" className="gap-1"><FileText className="w-3 h-3" /> Forms</TabsTrigger>
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
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employer</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Frequency</TableHead>
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
                        <TableCell><Badge variant="outline" className="text-xs capitalize">{r.pay_frequency || "monthly"}</Badge></TableCell>
                        <TableCell className="text-sm">{new Date(r.pay_date).toLocaleDateString("en-GB")}</TableCell>
                        <TableCell className="text-sm text-right font-mono">{fmt(r.total_gross_pence)}</TableCell>
                        <TableCell className="text-sm text-right font-mono">{fmt(r.total_tax_pence)}</TableCell>
                        <TableCell className="text-sm text-right font-mono">{fmt(r.total_net_pence)}</TableCell>
                        <TableCell><Badge variant={statusVariant(r.status)} className="text-xs capitalize">{r.status}</Badge></TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onClick={() => setSelectedRun(r)}><Eye className="w-3.5 h-3.5" /></Button>
                            {r.status === "draft" && <Button variant="outline" size="sm" onClick={() => finaliseRun.mutate(r.id)}>Finalise</Button>}
                            {r.status === "finalised" && <Button variant="outline" size="sm" className="gap-1"><Send className="w-3 h-3" /> Submit FPS</Button>}
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
                {employers.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.employer_name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={empStatusFilter} onValueChange={setEmpStatusFilter}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Leavers</SelectItem>
              </SelectContent>
            </Select>
            <Button className="gap-1.5" onClick={openNewEmployee} disabled={employers.length === 0}>
              <UserPlus className="w-3.5 h-3.5" /> Add Employee
            </Button>
          </div>

          {employers.length === 0 ? (
            <Card className="py-12 text-center"><p className="text-sm text-muted-foreground">Add an employer first.</p></Card>
          ) : (
            <Card>
              <CardContent className="pt-4">
                {filteredEmployees.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No employees found.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Employer</TableHead>
                        <TableHead>NI Number</TableHead>
                        <TableHead>Tax Code</TableHead>
                        <TableHead>Pay Method</TableHead>
                        <TableHead className="text-right">Annual Salary</TableHead>
                        <TableHead>Holiday</TableHead>
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
                              <p className="text-xs text-muted-foreground">{emp.payroll_id ? `#${emp.payroll_id} · ` : ""}{emp.email || ""}{emp.is_director ? " · Director" : ""}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{emp.payroll_employers?.employer_name || "—"}</TableCell>
                          <TableCell className="text-sm font-mono">{emp.ni_number || "—"}</TableCell>
                          <TableCell className="text-sm font-mono">{emp.tax_code || "—"}{emp.week1_month1 ? " W1" : ""}</TableCell>
                          <TableCell><Badge variant="outline" className="text-xs capitalize">{emp.pay_method}</Badge></TableCell>
                          <TableCell className="text-sm text-right font-mono">{fmt(emp.annual_salary_pence || 0)}</TableCell>
                          <TableCell className="text-xs">{emp.holiday_taken_days || 0}/{emp.holiday_entitlement_days || 28}d</TableCell>
                          <TableCell>
                            <Badge variant={emp.is_active ? "default" : "secondary"} className="text-xs">
                              {emp.is_active ? "Active" : "Leaver"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" onClick={() => previewCalc(emp)} title="Preview pay">
                                <Calculator className="w-3.5 h-3.5" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => openEditEmployee(emp)} title="Edit">
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => toggleEmployeeActive.mutate({ id: emp.id, active: !emp.is_active })} title={emp.is_active ? "Mark as leaver" : "Re-activate"}>
                                <UserMinus className="w-3.5 h-3.5" />
                              </Button>
                              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => { if (confirm(`Delete ${emp.first_name} ${emp.last_name}?`)) deleteEmployee.mutate(emp.id); }} title="Delete">
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
                      <TableHead>Features</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employers.map((e: any) => (
                      <TableRow key={e.id}>
                        <TableCell className="font-medium">{e.employer_name}</TableCell>
                        <TableCell className="text-sm">{e.clients?.legal_name || "—"}</TableCell>
                        <TableCell className="text-sm font-mono">{e.paye_reference || "—"}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs capitalize">{e.pay_frequency}</Badge></TableCell>
                        <TableCell className="text-sm">{e.tax_year}</TableCell>
                        <TableCell className="text-xs">
                          {e.employment_allowance && <Badge variant="secondary" className="text-xs mr-1">EA</Badge>}
                          {e.small_employer && <Badge variant="secondary" className="text-xs mr-1">Small</Badge>}
                          {e.apprenticeship_levy && <Badge variant="secondary" className="text-xs mr-1">Levy</Badge>}
                          {e.cis_registered && <Badge variant="secondary" className="text-xs">CIS</Badge>}
                        </TableCell>
                        <TableCell><Badge variant={e.is_active ? "default" : "secondary"} className="text-xs">{e.is_active ? "Active" : "Inactive"}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Absences ─────────────────────── */}
        <TabsContent value="absences" className="mt-4">
          {profile?.tenant_id && <AbsencesTab tenantId={profile.tenant_id} employers={employers} employees={employees} />}
        </TabsContent>

        {/* ── Benefits (P11D) ──────────────── */}
        <TabsContent value="benefits" className="mt-4">
          {profile?.tenant_id && <BenefitsTab tenantId={profile.tenant_id} employers={employers} employees={employees} />}
        </TabsContent>

        {/* ── Forms ────────────────────────── */}
        <TabsContent value="forms" className="mt-4">
          {profile?.tenant_id && <FormsTab tenantId={profile.tenant_id} employers={employers} employees={employees} />}
        </TabsContent>
      </Tabs>

      {/* Payslip detail dialog */}
      <Dialog open={!!selectedRun} onOpenChange={(open) => !open && setSelectedRun(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Pay Run — P{selectedRun?.tax_period} · {selectedRun?.payroll_employers?.employer_name}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-4 gap-3 text-sm mb-4">
            <div><span className="text-muted-foreground">Pay Date:</span> {selectedRun?.pay_date}</div>
            <div><span className="text-muted-foreground">Gross:</span> {fmt(selectedRun?.total_gross_pence || 0)}</div>
            <div><span className="text-muted-foreground">Tax:</span> {fmt(selectedRun?.total_tax_pence || 0)}</div>
            <div><span className="text-muted-foreground">Net:</span> {fmt(selectedRun?.total_net_pence || 0)}</div>
          </div>
          <div className="flex gap-2 mb-4">
            <Link to={`/payroll/rti/fps/${selectedRun?.id}`}>
              <Button size="sm" variant="outline"><Send className="h-4 w-4 mr-1" /> Build FPS</Button>
            </Link>
          </div>
          {payslips.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No payslips in this run.</p>
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
                  <TableHead className="text-right">Pension</TableHead>
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
                    <TableCell className="text-sm text-right font-mono">{fmt(p.pension_employee_pence || 0)}</TableCell>
                    <TableCell className="text-sm text-right font-mono font-semibold">{fmt(p.net_pence)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>

      {/* Pay calculation preview */}
      <Dialog open={showCalcPreview} onOpenChange={setShowCalcPreview}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Pay Preview — {calcResult?.emp?.first_name} {calcResult?.emp?.last_name}</DialogTitle>
          </DialogHeader>
          {calcResult?.result && (
            <div className="space-y-3">
              <Card><CardContent className="p-3 space-y-1.5">
                <div className="text-xs font-semibold text-muted-foreground uppercase">Earnings</div>
                <div className="flex justify-between text-sm"><span>Basic Pay</span><span className="font-mono">{fmt(calcResult.result.basicPayPence)}</span></div>
                {calcResult.result.overtimePence > 0 && <div className="flex justify-between text-sm"><span>Overtime</span><span className="font-mono">{fmt(calcResult.result.overtimePence)}</span></div>}
                <div className="flex justify-between text-sm font-semibold border-t pt-1"><span>Gross Pay</span><span className="font-mono">{fmt(calcResult.result.grossPence)}</span></div>
              </CardContent></Card>
              <Card><CardContent className="p-3 space-y-1.5">
                <div className="text-xs font-semibold text-muted-foreground uppercase">Deductions</div>
                <div className="flex justify-between text-sm"><span>Income Tax</span><span className="font-mono text-destructive">-{fmt(calcResult.result.taxPence)}</span></div>
                <div className="flex justify-between text-sm"><span>Employee NI</span><span className="font-mono text-destructive">-{fmt(calcResult.result.niEmployeePence)}</span></div>
                {calcResult.result.pensionEmployeePence > 0 && <div className="flex justify-between text-sm"><span>Pension</span><span className="font-mono text-destructive">-{fmt(calcResult.result.pensionEmployeePence)}</span></div>}
                {calcResult.result.studentLoanPence > 0 && <div className="flex justify-between text-sm"><span>Student Loan</span><span className="font-mono text-destructive">-{fmt(calcResult.result.studentLoanPence)}</span></div>}
              </CardContent></Card>
              <Card className="bg-primary/5 border-primary/20"><CardContent className="p-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold">Net Pay</span>
                  <span className="text-xl font-bold">{fmt(calcResult.result.netPence)}</span>
                </div>
              </CardContent></Card>
              <Card><CardContent className="p-3 space-y-1.5">
                <div className="text-xs font-semibold text-muted-foreground uppercase">Employer Costs</div>
                <div className="flex justify-between text-sm"><span>Employer NI</span><span className="font-mono">{fmt(calcResult.result.niEmployerPence)}</span></div>
                <div className="flex justify-between text-sm"><span>Employer Pension</span><span className="font-mono">{fmt(calcResult.result.pensionEmployerPence)}</span></div>
                <div className="flex justify-between text-sm font-semibold border-t pt-1"><span>Total Cost</span><span className="font-mono">{fmt(calcResult.result.grossPence + calcResult.result.niEmployerPence + calcResult.result.pensionEmployerPence)}</span></div>
              </CardContent></Card>
            </div>
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
                <SelectContent>{clients.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.legal_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Employer Name</Label><Input value={newEmployerName} onChange={(e) => setNewEmployerName(e.target.value)} placeholder="e.g. ABC Ltd Payroll" /></div>
            <div className="space-y-2"><Label>PAYE Reference</Label><Input value={newPayeRef} onChange={(e) => setNewPayeRef(e.target.value)} placeholder="e.g. 123/A456" /></div>
            <div className="space-y-2">
              <Label>Pay Frequency</Label>
              <Select value={newEmployerFrequency} onValueChange={setNewEmployerFrequency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="fortnightly">Fortnightly</SelectItem>
                  <SelectItem value="four_weekly">4-Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={() => createEmployer.mutate()} disabled={!newEmployerClientId || !newEmployerName}>Create Employer</Button>
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
              <Select value={newRunEmployerId} onValueChange={v => {
                setNewRunEmployerId(v);
                const emp = employers.find((e: any) => e.id === v);
                if (emp) setNewRunFrequency(emp.pay_frequency || "monthly");
              }}>
                <SelectTrigger><SelectValue placeholder="Select employer" /></SelectTrigger>
                <SelectContent>{employers.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.employer_name} ({e.pay_frequency})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Pay Date</Label><Input type="date" value={newRunPayDate} onChange={(e) => setNewRunPayDate(e.target.value)} /></div>
              <div className="space-y-2"><Label>Tax Period</Label><Input type="number" min="1" max={newRunFrequency === "weekly" ? "52" : "12"} value={newRunPeriod} onChange={(e) => setNewRunPeriod(e.target.value)} /></div>
            </div>
            <div className="space-y-2">
              <Label>Frequency</Label>
              <Select value={newRunFrequency} onValueChange={setNewRunFrequency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="fortnightly">Fortnightly</SelectItem>
                  <SelectItem value="four_weekly">4-Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">Payslips will be auto-generated for all active employees with UK tax/NI calculations.</p>
            <Button className="w-full" onClick={() => createPayRun.mutate()} disabled={!newRunEmployerId || !newRunPayDate || createPayRun.isPending}>
              {createPayRun.isPending ? "Calculating…" : "Create Pay Run & Calculate"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Employee form dialog - comprehensive */}
      <Dialog open={showEmployeeForm} onOpenChange={setShowEmployeeForm}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingEmployee ? "Edit Employee" : "Add Employee"}</DialogTitle></DialogHeader>
          <div className="space-y-6">
            {/* Personal */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">Personal Details</h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Title</Label>
                  <Select value={empForm.title} onValueChange={(v) => setEmpForm({ ...empForm, title: v })}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Mr">Mr</SelectItem><SelectItem value="Mrs">Mrs</SelectItem>
                      <SelectItem value="Ms">Ms</SelectItem><SelectItem value="Miss">Miss</SelectItem>
                      <SelectItem value="Dr">Dr</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label className="text-xs">First Name *</Label><Input value={empForm.first_name} onChange={(e) => setEmpForm({ ...empForm, first_name: e.target.value })} /></div>
                <div className="space-y-1.5"><Label className="text-xs">Last Name *</Label><Input value={empForm.last_name} onChange={(e) => setEmpForm({ ...empForm, last_name: e.target.value })} /></div>
                <div className="space-y-1.5"><Label className="text-xs">Date of Birth</Label><Input type="date" value={empForm.date_of_birth} onChange={(e) => setEmpForm({ ...empForm, date_of_birth: e.target.value })} /></div>
                <div className="space-y-1.5"><Label className="text-xs">Gender</Label>
                  <Select value={empForm.gender} onValueChange={(v) => setEmpForm({ ...empForm, gender: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="male">Male</SelectItem><SelectItem value="female">Female</SelectItem><SelectItem value="not_specified">Not specified</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label className="text-xs">NI Number</Label><Input value={empForm.ni_number} onChange={(e) => setEmpForm({ ...empForm, ni_number: e.target.value.toUpperCase() })} placeholder="AB123456C" /></div>
                <div className="space-y-1.5"><Label className="text-xs">Email</Label><Input type="email" value={empForm.email} onChange={(e) => setEmpForm({ ...empForm, email: e.target.value })} /></div>
                <div className="space-y-1.5"><Label className="text-xs">Phone</Label><Input value={empForm.phone} onChange={(e) => setEmpForm({ ...empForm, phone: e.target.value })} /></div>
              </div>
            </div>

            {/* Address */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">Address</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label className="text-xs">Address Line 1</Label><Input value={empForm.address_line1} onChange={(e) => setEmpForm({ ...empForm, address_line1: e.target.value })} /></div>
                <div className="space-y-1.5"><Label className="text-xs">Address Line 2</Label><Input value={empForm.address_line2} onChange={(e) => setEmpForm({ ...empForm, address_line2: e.target.value })} /></div>
                <div className="space-y-1.5"><Label className="text-xs">City</Label><Input value={empForm.city} onChange={(e) => setEmpForm({ ...empForm, city: e.target.value })} /></div>
                <div className="space-y-1.5"><Label className="text-xs">County</Label><Input value={empForm.county} onChange={(e) => setEmpForm({ ...empForm, county: e.target.value })} /></div>
                <div className="space-y-1.5"><Label className="text-xs">Postcode</Label><Input value={empForm.postcode} onChange={(e) => setEmpForm({ ...empForm, postcode: e.target.value.toUpperCase() })} /></div>
              </div>
            </div>

            {/* Employment */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">Employment</h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Employer *</Label>
                  <Select value={empForm.employer_id} onValueChange={(v) => setEmpForm({ ...empForm, employer_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{employers.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.employer_name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label className="text-xs">Payroll ID</Label><Input value={empForm.payroll_id} onChange={(e) => setEmpForm({ ...empForm, payroll_id: e.target.value })} placeholder="e.g. EMP001" /></div>
                <div className="space-y-1.5"><Label className="text-xs">Start Date</Label><Input type="date" value={empForm.start_date} onChange={(e) => setEmpForm({ ...empForm, start_date: e.target.value })} /></div>
                <div className="space-y-1.5"><Label className="text-xs">Leave Date</Label><Input type="date" value={empForm.leave_date} onChange={(e) => setEmpForm({ ...empForm, leave_date: e.target.value })} /></div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Starter Declaration</Label>
                  <Select value={empForm.starter_declaration || "none"} onValueChange={(v) => setEmpForm({ ...empForm, starter_declaration: v === "none" ? "" : v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">N/A (existing)</SelectItem>
                      <SelectItem value="A">A — First job since 6 Apr</SelectItem>
                      <SelectItem value="B">B — Only job</SelectItem>
                      <SelectItem value="C">C — Other job(s)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2 pt-5"><Switch checked={empForm.is_director} onCheckedChange={(v) => setEmpForm({ ...empForm, is_director: v })} /><Label className="text-xs">Director</Label></div>
                {empForm.is_director && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Director NIC Method</Label>
                    <Select value={empForm.directors_nic_method} onValueChange={(v) => setEmpForm({ ...empForm, directors_nic_method: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="annual">Annual</SelectItem><SelectItem value="cumulative">Cumulative</SelectItem></SelectContent>
                    </Select>
                  </div>
                )}
                <div className="flex items-center gap-2 pt-5"><Switch checked={empForm.is_irregular_employment} onCheckedChange={(v) => setEmpForm({ ...empForm, is_irregular_employment: v })} /><Label className="text-xs">Irregular employment</Label></div>
              </div>
            </div>

            {/* P45 Previous Employment */}
            {empForm.starter_declaration && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3">P45 Details (from previous employer)</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label className="text-xs">Previous Pay (£)</Label><Input type="number" step="0.01" value={(empForm.p45_previous_pay_pence / 100).toFixed(2)} onChange={(e) => setEmpForm({ ...empForm, p45_previous_pay_pence: Math.round(parseFloat(e.target.value || "0") * 100) })} /></div>
                  <div className="space-y-1.5"><Label className="text-xs">Previous Tax (£)</Label><Input type="number" step="0.01" value={(empForm.p45_previous_tax_pence / 100).toFixed(2)} onChange={(e) => setEmpForm({ ...empForm, p45_previous_tax_pence: Math.round(parseFloat(e.target.value || "0") * 100) })} /></div>
                </div>
              </div>
            )}

            {/* Pay & Tax */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">Pay & Tax</h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5"><Label className="text-xs">Annual Salary (£)</Label><Input type="number" step="0.01" value={(empForm.annual_salary_pence / 100).toFixed(2)} onChange={(e) => setEmpForm({ ...empForm, annual_salary_pence: Math.round(parseFloat(e.target.value || "0") * 100) })} /></div>
                <div className="space-y-1.5"><Label className="text-xs">Hourly Rate (£)</Label><Input type="number" step="0.01" value={empForm.hourly_rate_pence ? (empForm.hourly_rate_pence / 100).toFixed(2) : ""} onChange={(e) => setEmpForm({ ...empForm, hourly_rate_pence: e.target.value ? Math.round(parseFloat(e.target.value) * 100) : null })} /></div>
                <div className="space-y-1.5"><Label className="text-xs">Tax Code</Label><Input value={empForm.tax_code} onChange={(e) => setEmpForm({ ...empForm, tax_code: e.target.value.toUpperCase() })} /></div>
                <div className="space-y-1.5">
                  <Label className="text-xs">NI Category</Label>
                  <Select value={empForm.ni_category} onValueChange={(v) => setEmpForm({ ...empForm, ni_category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{["A", "B", "C", "F", "H", "I", "J", "L", "M", "S", "V", "Z"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Pay Method</Label>
                  <Select value={empForm.pay_method} onValueChange={(v) => setEmpForm({ ...empForm, pay_method: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem><SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="fortnightly">Fortnightly</SelectItem><SelectItem value="four_weekly">4-Weekly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2 pt-5"><Switch checked={empForm.week1_month1} onCheckedChange={(v) => setEmpForm({ ...empForm, week1_month1: v })} /><Label className="text-xs">Week 1/Month 1</Label></div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Student Loan</Label>
                  <Select value={empForm.student_loan_plan || "none"} onValueChange={(v) => setEmpForm({ ...empForm, student_loan_plan: v === "none" ? "" : v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem><SelectItem value="plan_1">Plan 1</SelectItem>
                      <SelectItem value="plan_2">Plan 2</SelectItem><SelectItem value="plan_4">Plan 4</SelectItem>
                      <SelectItem value="plan_5">Plan 5</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2 pt-5"><Switch checked={empForm.postgrad_loan} onCheckedChange={(v) => setEmpForm({ ...empForm, postgrad_loan: v })} /><Label className="text-xs">Postgrad Loan</Label></div>
              </div>
            </div>

            {/* Bank Details */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">Bank & Payment</h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5"><Label className="text-xs">Account Name</Label><Input value={empForm.account_name} onChange={(e) => setEmpForm({ ...empForm, account_name: e.target.value })} /></div>
                <div className="space-y-1.5"><Label className="text-xs">Sort Code</Label><Input value={empForm.sort_code} onChange={(e) => setEmpForm({ ...empForm, sort_code: e.target.value })} placeholder="12-34-56" /></div>
                <div className="space-y-1.5"><Label className="text-xs">Account Number</Label><Input value={empForm.account_number} onChange={(e) => setEmpForm({ ...empForm, account_number: e.target.value })} placeholder="12345678" /></div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Payment Method</Label>
                  <Select value={empForm.payment_method} onValueChange={(v) => setEmpForm({ ...empForm, payment_method: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="bacs">BACS</SelectItem><SelectItem value="cheque">Cheque</SelectItem><SelectItem value="cash">Cash</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Pension */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">Pension (Auto-Enrolment)</h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="flex items-center gap-2"><Switch checked={empForm.pension_opt_out} onCheckedChange={(v) => setEmpForm({ ...empForm, pension_opt_out: v })} /><Label className="text-xs">Opted out</Label></div>
                <div className="space-y-1.5"><Label className="text-xs">Employee %</Label><Input type="number" step="0.1" value={empForm.pension_employee_pct} onChange={(e) => setEmpForm({ ...empForm, pension_employee_pct: parseFloat(e.target.value || "0") })} disabled={empForm.pension_opt_out} /></div>
                <div className="space-y-1.5"><Label className="text-xs">Employer %</Label><Input type="number" step="0.1" value={empForm.pension_employer_pct} onChange={(e) => setEmpForm({ ...empForm, pension_employer_pct: parseFloat(e.target.value || "0") })} disabled={empForm.pension_opt_out} /></div>
              </div>
            </div>

            {/* Holiday */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">Holiday Entitlement</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label className="text-xs">Entitlement (days/year)</Label><Input type="number" step="0.5" value={empForm.holiday_entitlement_days} onChange={(e) => setEmpForm({ ...empForm, holiday_entitlement_days: parseFloat(e.target.value || "28") })} /></div>
                <div className="space-y-1.5"><Label className="text-xs">Carried Forward</Label><Input type="number" step="0.5" value={empForm.holiday_carried_forward} onChange={(e) => setEmpForm({ ...empForm, holiday_carried_forward: parseFloat(e.target.value || "0") })} /></div>
              </div>
            </div>

            {/* Notes & Status */}
            <div className="space-y-3">
              <div className="space-y-1.5"><Label className="text-xs">Notes</Label><Textarea rows={2} value={empForm.notes} onChange={(e) => setEmpForm({ ...empForm, notes: e.target.value })} /></div>
              <div className="flex items-center gap-2"><Switch checked={empForm.is_active} onCheckedChange={(v) => setEmpForm({ ...empForm, is_active: v })} /><Label className="text-xs">Active</Label></div>
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
