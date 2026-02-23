import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { KPICard } from "@/components/dashboard/KPICard";
import { Plus, Palmtree, HeartPulse, Baby, Calendar } from "lucide-react";
import { toast } from "sonner";

interface Props {
  tenantId: string;
  employers: any[];
  employees: any[];
}

const ABSENCE_TYPES = [
  { value: "holiday", label: "Holiday", icon: "🌴" },
  { value: "sick", label: "Sick Leave", icon: "🤒" },
  { value: "maternity", label: "Maternity", icon: "👶" },
  { value: "paternity", label: "Paternity", icon: "👨‍👧" },
  { value: "adoption", label: "Adoption", icon: "🏠" },
  { value: "shared_parental", label: "Shared Parental", icon: "👨‍👩‍👧" },
  { value: "unpaid", label: "Unpaid Leave", icon: "📋" },
  { value: "compassionate", label: "Compassionate", icon: "💛" },
  { value: "jury_service", label: "Jury Service", icon: "⚖️" },
  { value: "other", label: "Other", icon: "📝" },
];

const STATUTORY_TYPES = [
  { value: "", label: "None" },
  { value: "ssp", label: "SSP (Sick)" },
  { value: "smp", label: "SMP (Maternity)" },
  { value: "spp", label: "SPP (Paternity)" },
  { value: "sap", label: "SAP (Adoption)" },
  { value: "shpp", label: "ShPP (Shared Parental)" },
];

const typeColor = (t: string) => {
  if (t === "holiday") return "default" as const;
  if (t === "sick") return "destructive" as const;
  if (["maternity", "paternity", "adoption", "shared_parental"].includes(t)) return "secondary" as const;
  return "outline" as const;
};

export function AbsencesTab({ tenantId, employers, employees }: Props) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [employerFilter, setEmployerFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const [form, setForm] = useState({
    employee_id: "", employer_id: "", absence_type: "holiday",
    start_date: "", end_date: "", days: 1, hours: 0,
    is_paid: true, statutory_pay_type: "", notes: "", status: "approved",
  });

  const { data: absences = [], isLoading } = useQuery({
    queryKey: ["payroll-absences", tenantId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("payroll_absences")
        .select("*, payroll_employees(first_name, last_name), payroll_employers(employer_name)")
        .order("start_date", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!tenantId,
  });

  const filtered = useMemo(() => absences.filter((a: any) => {
    const matchEmployer = employerFilter === "all" || a.employer_id === employerFilter;
    const matchType = typeFilter === "all" || a.absence_type === typeFilter;
    return matchEmployer && matchType;
  }), [absences, employerFilter, typeFilter]);

  const holidayUsed = absences.filter((a: any) => a.absence_type === "holiday" && a.status === "approved").reduce((s: number, a: any) => s + (a.days || 0), 0);
  const sickDays = absences.filter((a: any) => a.absence_type === "sick").reduce((s: number, a: any) => s + (a.days || 0), 0);
  const maternityCount = absences.filter((a: any) => ["maternity", "paternity", "adoption", "shared_parental"].includes(a.absence_type)).length;

  const saveAbsence = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).from("payroll_absences").insert({
        tenant_id: tenantId,
        employee_id: form.employee_id,
        employer_id: form.employer_id,
        absence_type: form.absence_type,
        start_date: form.start_date,
        end_date: form.end_date || null,
        days: form.days,
        hours: form.hours || 0,
        is_paid: form.is_paid,
        statutory_pay_type: form.statutory_pay_type || null,
        notes: form.notes || null,
        status: form.status,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll-absences"] });
      setShowForm(false);
      toast.success("Absence recorded");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const empForEmployer = form.employer_id
    ? employees.filter((e: any) => e.employer_id === form.employer_id)
    : employees;

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <KPICard title="Holiday Taken" value={`${holidayUsed} days`} change="All employees" changeType="neutral" icon={Palmtree} iconColor="bg-primary/10" />
        <KPICard title="Sick Days" value={`${sickDays} days`} change="This tax year" changeType={sickDays > 20 ? "negative" : "neutral"} icon={HeartPulse} iconColor="bg-destructive/10" />
        <KPICard title="Family Leave" value={maternityCount} change="Active records" changeType="neutral" icon={Baby} iconColor="bg-secondary/80" />
        <KPICard title="Total Records" value={absences.length} change="All absence types" changeType="neutral" icon={Calendar} iconColor="bg-muted" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={employerFilter} onValueChange={setEmployerFilter}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="All employers" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All employers</SelectItem>
            {employers.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.employer_name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="All types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {ABSENCE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.icon} {t.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button className="gap-1.5 ml-auto" onClick={() => {
          setForm({ employee_id: "", employer_id: employers[0]?.id || "", absence_type: "holiday", start_date: "", end_date: "", days: 1, hours: 0, is_paid: true, statutory_pay_type: "", notes: "", status: "approved" });
          setShowForm(true);
        }}>
          <Plus className="w-3.5 h-3.5" /> Record Absence
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="pt-4">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Calendar className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No absence records found.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>End</TableHead>
                  <TableHead className="text-right">Days</TableHead>
                  <TableHead>Statutory</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((a: any) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium text-sm">
                      {a.payroll_employees?.first_name} {a.payroll_employees?.last_name}
                    </TableCell>
                    <TableCell>
                      <Badge variant={typeColor(a.absence_type)} className="text-xs capitalize">
                        {ABSENCE_TYPES.find(t => t.value === a.absence_type)?.icon} {a.absence_type.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{new Date(a.start_date).toLocaleDateString("en-GB")}</TableCell>
                    <TableCell className="text-sm">{a.end_date ? new Date(a.end_date).toLocaleDateString("en-GB") : "—"}</TableCell>
                    <TableCell className="text-sm text-right font-mono">{a.days}</TableCell>
                    <TableCell className="text-xs font-mono uppercase">{a.statutory_pay_type || "—"}</TableCell>
                    <TableCell>{a.is_paid ? <Badge variant="default" className="text-xs">Paid</Badge> : <Badge variant="outline" className="text-xs">Unpaid</Badge>}</TableCell>
                    <TableCell><Badge variant="secondary" className="text-xs capitalize">{a.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Record Absence</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Employer</Label>
                <Select value={form.employer_id} onValueChange={v => setForm({ ...form, employer_id: v, employee_id: "" })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{employers.map(e => <SelectItem key={e.id} value={e.id}>{e.employer_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Employee</Label>
                <Select value={form.employee_id} onValueChange={v => setForm({ ...form, employee_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{empForEmployer.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Absence Type</Label>
              <Select value={form.absence_type} onValueChange={v => setForm({ ...form, absence_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ABSENCE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.icon} {t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">Start Date</Label><Input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} /></div>
              <div className="space-y-1.5"><Label className="text-xs">End Date</Label><Input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Days</Label><Input type="number" step="0.5" value={form.days} onChange={e => setForm({ ...form, days: parseFloat(e.target.value || "0") })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Statutory Pay</Label>
                <Select value={form.statutory_pay_type || ""} onValueChange={v => setForm({ ...form, statutory_pay_type: v })}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>{STATUTORY_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 pt-5">
                <Switch checked={form.is_paid} onCheckedChange={v => setForm({ ...form, is_paid: v })} />
                <Label className="text-xs">Paid</Label>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Notes</Label>
              <Textarea rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            </div>
            <Button className="w-full" onClick={() => saveAbsence.mutate()} disabled={!form.employee_id || !form.start_date || saveAbsence.isPending}>
              Record Absence
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
