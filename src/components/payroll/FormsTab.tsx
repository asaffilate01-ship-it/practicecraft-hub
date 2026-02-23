import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { KPICard } from "@/components/dashboard/KPICard";
import { FileText, Plus, Download, Send, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface Props { tenantId: string; employers: any[]; employees: any[] }

const FORM_TYPES = [
  { value: "p45", label: "P45 — Leaver", description: "Employee leaving — details of pay and tax" },
  { value: "p60", label: "P60 — Year End", description: "End of year certificate for employees" },
  { value: "p11d", label: "P11D — Benefits", description: "Return of benefits and expenses" },
  { value: "p11d_b", label: "P11D(b) — Class 1A NIC", description: "Return of Class 1A NIC on benefits" },
  { value: "fps", label: "FPS — Full Payment Submission", description: "Real-time pay information to HMRC" },
  { value: "eps", label: "EPS — Employer Payment Summary", description: "Adjustments, recoveries, nil payments" },
  { value: "p32", label: "P32 — Employer Payment Record", description: "Monthly/quarterly payment summary" },
  { value: "p46_car", label: "P46(Car) — Company Car", description: "Notify HMRC of car changes" },
  { value: "eas", label: "EAS — Earlier Year Update", description: "Correct previous year submissions" },
];

const statusConfig: Record<string, { color: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
  draft: { color: "secondary", label: "Draft" },
  generated: { color: "outline", label: "Generated" },
  sent: { color: "default", label: "Sent" },
  submitted: { color: "default", label: "Submitted" },
  accepted: { color: "default", label: "Accepted" },
  rejected: { color: "destructive", label: "Rejected" },
};

export function FormsTab({ tenantId, employers, employees }: Props) {
  const queryClient = useQueryClient();
  const [showGenerate, setShowGenerate] = useState(false);
  const [yearFilter, setYearFilter] = useState("2025-26");
  const [typeFilter, setTypeFilter] = useState("all");

  const [genForm, setGenForm] = useState({
    form_type: "p60", employer_id: "", employee_id: "", tax_year: "2025-26",
  });

  const { data: forms = [] } = useQuery({
    queryKey: ["payroll-forms", tenantId, yearFilter],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("payroll_forms")
        .select("*, payroll_employees(first_name, last_name), payroll_employers(employer_name)")
        .eq("tax_year", yearFilter)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!tenantId,
  });

  const filtered = typeFilter === "all" ? forms : forms.filter((f: any) => f.form_type === typeFilter);
  const draftCount = forms.filter((f: any) => f.status === "draft" || f.status === "generated").length;
  const submittedCount = forms.filter((f: any) => f.status === "submitted" || f.status === "accepted").length;
  const rejectedCount = forms.filter((f: any) => f.status === "rejected").length;

  const generateForm = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).from("payroll_forms").insert({
        tenant_id: tenantId,
        employer_id: genForm.employer_id,
        employee_id: ["p45", "p60", "p11d"].includes(genForm.form_type) ? genForm.employee_id : null,
        form_type: genForm.form_type,
        tax_year: genForm.tax_year,
        status: "draft",
        form_data_json: {},
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll-forms"] });
      setShowGenerate(false);
      toast.success("Form created");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const needsEmployee = ["p45", "p60", "p11d"].includes(genForm.form_type);
  const empForEmployer = genForm.employer_id ? employees.filter((e: any) => e.employer_id === genForm.employer_id) : employees;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <KPICard title="Total Forms" value={forms.length} change={yearFilter} changeType="neutral" icon={FileText} iconColor="bg-primary/10" />
        <KPICard title="Pending" value={draftCount} change="Draft/generated" changeType={draftCount > 0 ? "negative" : "positive"} icon={FileText} iconColor="bg-warning/10" />
        <KPICard title="Submitted" value={submittedCount} change="Accepted by HMRC" changeType="positive" icon={CheckCircle2} iconColor="bg-[hsl(var(--success))]/10" />
        <KPICard title="Rejected" value={rejectedCount} change="Needs attention" changeType={rejectedCount > 0 ? "negative" : "positive"} icon={AlertTriangle} iconColor="bg-destructive/10" />
      </div>

      <div className="flex items-center gap-3">
        <Select value={yearFilter} onValueChange={setYearFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="2025-26">2025/26</SelectItem>
            <SelectItem value="2024-25">2024/25</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="All forms" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All forms</SelectItem>
            {FORM_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button className="gap-1.5 ml-auto" onClick={() => {
          setGenForm({ form_type: "p60", employer_id: employers[0]?.id || "", employee_id: "", tax_year: yearFilter });
          setShowGenerate(true);
        }}>
          <Plus className="w-3.5 h-3.5" /> Generate Form
        </Button>
      </div>

      {/* Form types reference */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {FORM_TYPES.map(ft => {
          const count = forms.filter((f: any) => f.form_type === ft.value).length;
          return (
            <Card key={ft.value} className="cursor-pointer hover:border-primary/40 transition-colors" onClick={() => setTypeFilter(ft.value)}>
              <CardContent className="p-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold">{ft.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{ft.description}</p>
                  </div>
                  {count > 0 && <Badge variant="secondary" className="text-xs">{count}</Badge>}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Forms table */}
      <Card>
        <CardHeader><CardTitle className="text-base">Generated Forms</CardTitle></CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No forms generated yet.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Form</TableHead>
                  <TableHead>Employer</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Tax Year</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Generated</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((f: any) => {
                  const sc = statusConfig[f.status] || statusConfig.draft;
                  return (
                    <TableRow key={f.id}>
                      <TableCell>
                        <Badge variant="outline" className="text-xs font-mono uppercase">{f.form_type}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{f.payroll_employers?.employer_name || "—"}</TableCell>
                      <TableCell className="text-sm">{f.payroll_employees ? `${f.payroll_employees.first_name} ${f.payroll_employees.last_name}` : "All"}</TableCell>
                      <TableCell className="text-sm">{f.tax_year}</TableCell>
                      <TableCell><Badge variant={sc.color} className="text-xs">{sc.label}</Badge></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{new Date(f.created_at).toLocaleDateString("en-GB")}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => toast.info("PDF generation coming soon")} title="Download">
                            <Download className="w-3.5 h-3.5" />
                          </Button>
                          {(f.status === "draft" || f.status === "generated") && f.form_type !== "p60" && f.form_type !== "p45" && (
                            <Button variant="outline" size="sm" className="gap-1" onClick={() => toast.info("HMRC submission requires live API connection")}>
                              <Send className="w-3 h-3" /> Submit
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Generate dialog */}
      <Dialog open={showGenerate} onOpenChange={setShowGenerate}>
        <DialogContent>
          <DialogHeader><DialogTitle>Generate Form</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Form Type</Label>
              <Select value={genForm.form_type} onValueChange={v => setGenForm({ ...genForm, form_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{FORM_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Employer</Label>
              <Select value={genForm.employer_id} onValueChange={v => setGenForm({ ...genForm, employer_id: v, employee_id: "" })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{employers.map(e => <SelectItem key={e.id} value={e.id}>{e.employer_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {needsEmployee && (
              <div className="space-y-1.5">
                <Label className="text-xs">Employee</Label>
                <Select value={genForm.employee_id} onValueChange={v => setGenForm({ ...genForm, employee_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                  <SelectContent>{empForEmployer.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <Button className="w-full" onClick={() => generateForm.mutate()} disabled={!genForm.employer_id || (needsEmployee && !genForm.employee_id) || generateForm.isPending}>
              Generate {FORM_TYPES.find(t => t.value === genForm.form_type)?.label}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
