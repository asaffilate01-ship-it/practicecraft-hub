import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { KPICard } from "@/components/dashboard/KPICard";
import { Plus, Car, Gift, FileText } from "lucide-react";
import { toast } from "sonner";

interface Props { tenantId: string; employers: any[]; employees: any[] }

const fmt = (pence: number) => `£${(pence / 100).toFixed(2)}`;

const BENEFIT_TYPES = [
  { value: "company_car", label: "Company Car", section: "A" },
  { value: "fuel", label: "Car Fuel", section: "A" },
  { value: "medical", label: "Medical Insurance", section: "I" },
  { value: "accommodation", label: "Living Accommodation", section: "D" },
  { value: "loan", label: "Beneficial Loan", section: "J" },
  { value: "vouchers", label: "Vouchers/Credit Cards", section: "C" },
  { value: "mileage", label: "Mileage Allowance", section: "E" },
  { value: "entertainment", label: "Entertainment", section: "N" },
  { value: "telephone", label: "Telephone", section: "N" },
  { value: "subscriptions", label: "Subscriptions", section: "N" },
  { value: "relocation", label: "Relocation", section: "L" },
  { value: "other", label: "Other", section: "N" },
];

export function BenefitsTab({ tenantId, employers, employees }: Props) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [yearFilter, setYearFilter] = useState("2025-26");

  const [form, setForm] = useState({
    employee_id: "", employer_id: "", tax_year: "2025-26",
    benefit_type: "company_car", description: "", cash_equivalent_pence: 0,
    amount_made_good_pence: 0, payrolled: false, start_date: "", end_date: "",
  });

  const { data: benefits = [] } = useQuery({
    queryKey: ["payroll-benefits", tenantId, yearFilter],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("payroll_benefits")
        .select("*, payroll_employees(first_name, last_name), payroll_employers(employer_name)")
        .eq("tax_year", yearFilter)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!tenantId,
  });

  const totalValue = benefits.reduce((s: number, b: any) => s + (b.cash_equivalent_pence || 0), 0);
  const totalMadeGood = benefits.reduce((s: number, b: any) => s + (b.amount_made_good_pence || 0), 0);
  const payrolledCount = benefits.filter((b: any) => b.payrolled).length;

  const saveBenefit = useMutation({
    mutationFn: async () => {
      const bt = BENEFIT_TYPES.find(t => t.value === form.benefit_type);
      const { error } = await (supabase as any).from("payroll_benefits").insert({
        tenant_id: tenantId, employee_id: form.employee_id, employer_id: form.employer_id,
        tax_year: form.tax_year, benefit_type: form.benefit_type, description: form.description,
        cash_equivalent_pence: form.cash_equivalent_pence, amount_made_good_pence: form.amount_made_good_pence,
        payrolled: form.payrolled, section: bt?.section || "N",
        start_date: form.start_date || null, end_date: form.end_date || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll-benefits"] });
      setShowForm(false);
      toast.success("Benefit recorded");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const empForEmployer = form.employer_id ? employees.filter((e: any) => e.employer_id === form.employer_id) : employees;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <KPICard title="Total P11D Value" value={fmt(totalValue)} change={yearFilter} changeType="neutral" icon={Gift} iconColor="bg-primary/10" />
        <KPICard title="Made Good" value={fmt(totalMadeGood)} change="Amount repaid" changeType="positive" icon={Gift} iconColor="bg-[hsl(var(--success))]/10" />
        <KPICard title="Payrolled" value={payrolledCount} change="Benefits via payroll" changeType="neutral" icon={FileText} iconColor="bg-muted" />
        <KPICard title="Total Benefits" value={benefits.length} change="All records" changeType="neutral" icon={Car} iconColor="bg-secondary/80" />
      </div>

      <div className="flex items-center gap-3">
        <Select value={yearFilter} onValueChange={setYearFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="2025-26">2025/26</SelectItem>
            <SelectItem value="2024-25">2024/25</SelectItem>
            <SelectItem value="2023-24">2023/24</SelectItem>
          </SelectContent>
        </Select>
        <Button className="gap-1.5 ml-auto" onClick={() => {
          setForm({ employee_id: "", employer_id: employers[0]?.id || "", tax_year: yearFilter, benefit_type: "company_car", description: "", cash_equivalent_pence: 0, amount_made_good_pence: 0, payrolled: false, start_date: "", end_date: "" });
          setShowForm(true);
        }}>
          <Plus className="w-3.5 h-3.5" /> Add Benefit
        </Button>
      </div>

      <Card>
        <CardContent className="pt-4">
          {benefits.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Gift className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No benefits recorded for {yearFilter}.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Section</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Cash Equiv.</TableHead>
                  <TableHead className="text-right">Made Good</TableHead>
                  <TableHead>Payrolled</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {benefits.map((b: any) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium text-sm">{b.payroll_employees?.first_name} {b.payroll_employees?.last_name}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs capitalize">{b.benefit_type.replace("_", " ")}</Badge></TableCell>
                    <TableCell className="text-sm font-mono">{b.section || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{b.description}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{fmt(b.cash_equivalent_pence)}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{fmt(b.amount_made_good_pence || 0)}</TableCell>
                    <TableCell>{b.payrolled ? <Badge variant="default" className="text-xs">Yes</Badge> : <Badge variant="secondary" className="text-xs">No</Badge>}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add Benefit (P11D)</DialogTitle></DialogHeader>
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
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Benefit Type</Label>
                <Select value={form.benefit_type} onValueChange={v => setForm({ ...form, benefit_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{BENEFIT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>§{t.section} {t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Tax Year</Label>
                <Select value={form.tax_year} onValueChange={v => setForm({ ...form, tax_year: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2025-26">2025/26</SelectItem>
                    <SelectItem value="2024-25">2024/25</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Description</Label><Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="e.g. BMW 320d, list price £35,000" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">Cash Equivalent (£)</Label><Input type="number" step="0.01" value={(form.cash_equivalent_pence / 100).toFixed(2)} onChange={e => setForm({ ...form, cash_equivalent_pence: Math.round(parseFloat(e.target.value || "0") * 100) })} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Made Good (£)</Label><Input type="number" step="0.01" value={(form.amount_made_good_pence / 100).toFixed(2)} onChange={e => setForm({ ...form, amount_made_good_pence: Math.round(parseFloat(e.target.value || "0") * 100) })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">Start Date</Label><Input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} /></div>
              <div className="space-y-1.5"><Label className="text-xs">End Date</Label><Input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} /></div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.payrolled} onCheckedChange={v => setForm({ ...form, payrolled: v })} />
              <Label className="text-xs">Payrolled (taxed through payroll)</Label>
            </div>
            <Button className="w-full" onClick={() => saveBenefit.mutate()} disabled={!form.employee_id || !form.description || saveBenefit.isPending}>
              Add Benefit
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
