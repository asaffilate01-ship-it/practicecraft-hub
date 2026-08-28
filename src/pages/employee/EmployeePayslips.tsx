import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, FileText, Mail, Wallet, Loader2, LogOut } from "lucide-react";
import { toast } from "sonner";

const fmt = (pence: number) => `£${(pence / 100).toFixed(2)}`;

export default function EmployeePayslips() {
  const { user, signOut } = useAuth();
  const [selected, setSelected] = useState<any>(null);
  const [yearFilter, setYearFilter] = useState("all");
  const [downloading, setDownloading] = useState(false);

  const { data: employee } = useQuery({
    queryKey: ["employee-record", user?.id],
    queryFn: async () => {
      const sb = supabase as any;
      const { data, error } = await sb
        .from("payroll_employees")
        .select("id, first_name, last_name, employer_id, payroll_employers(employer_name)")
        .eq("user_id", user!.id)
        .eq("is_active", true)
        .limit(1)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
    staleTime: 5 * 60_000,
  });

  const { data: payslips = [], isLoading } = useQuery({
    queryKey: ["employee-payslips", employee?.id],
    queryFn: async () => {
      const sb = supabase as any;
      const { data, error } = await sb
        .from("payslips")
        .select("*, pay_runs(pay_date, tax_period, period_start, period_end, status)")
        .eq("employee_id", employee!.id)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!employee?.id,
  });

  const taxYears = [...new Set(payslips.map((p: any) => {
    const payDate = p.pay_runs?.pay_date;
    if (!payDate) return null;
    const d = new Date(payDate);
    const month = d.getMonth();
    const year = d.getFullYear();
    return month >= 3 ? `${year}/${year + 1}` : `${year - 1}/${year}`;
  }).filter(Boolean))];

  const filtered = yearFilter === "all"
    ? payslips
    : payslips.filter((p: any) => {
        const payDate = p.pay_runs?.pay_date;
        if (!payDate) return false;
        const d = new Date(payDate);
        const month = d.getMonth();
        const year = d.getFullYear();
        const ty = month >= 3 ? `${year}/${year + 1}` : `${year - 1}/${year}`;
        return ty === yearFilter;
      });

  const totalNet = filtered.reduce((s: number, p: any) => s + (p.net_pence || 0), 0);
  const totalTax = filtered.reduce((s: number, p: any) => s + (p.tax_pence || 0), 0);
  const totalNi = filtered.reduce((s: number, p: any) => s + (p.ni_employee_pence || 0), 0);

  const employerName = (employee?.payroll_employers as any)?.employer_name ?? "—";
  const employeeName = employee ? `${employee.first_name} ${employee.last_name}` : "—";

  const handleDownloadPdf = async (payslip: any) => {
    if (!payslip.document_id) {
      toast.info("PDF not yet available for this payslip.");
      return;
    }
    setDownloading(true);
    try {
      const { data: document, error: documentError } = await supabase
        .from("documents")
        .select("storage_path")
        .eq("id", payslip.document_id)
        .single();
      if (documentError) throw documentError;
      const { data, error } = await supabase.storage
        .from("client-documents")
        .createSignedUrl(document.storage_path, 300); // 5 min expiry
      if (error) throw error;
      if (data?.signedUrl) {
        window.open(data.signedUrl, "_blank");
        toast.success("Downloading payslip…");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to download");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">My Payslips</h1>
            <p className="text-sm text-muted-foreground">{employeeName} — {employerName}</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={yearFilter} onValueChange={setYearFilter}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="All years" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All years</SelectItem>
                {taxYears.map((y) => (
                  <SelectItem key={y} value={y!}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" aria-label="Sign out" title="Sign out" onClick={async () => { await signOut(); window.location.assign("/login"); }}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-[hsl(var(--success))]/10 flex items-center justify-center shrink-0">
                <Wallet className="w-4 h-4 text-[hsl(var(--success))]" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Total Net Pay</div>
                <div className="text-xl font-semibold">{fmt(totalNet)}</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4 text-destructive" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Total Tax</div>
                <div className="text-xl font-semibold">{fmt(totalTax)}</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4 text-primary" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Total NI</div>
                <div className="text-xl font-semibold">{fmt(totalNi)}</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Payslips table */}
        <Card>
          <CardContent className="pt-4">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <Wallet className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No payslips found.</p>
                <p className="text-xs mt-1">Your payslips will appear here once processed.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period</TableHead>
                    <TableHead>Pay Date</TableHead>
                    <TableHead className="text-right">Gross</TableHead>
                    <TableHead className="text-right">Tax</TableHead>
                    <TableHead className="text-right">NI</TableHead>
                    <TableHead className="text-right">Net</TableHead>
                    <TableHead className="w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((p: any) => (
                    <TableRow key={p.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelected(p)}>
                      <TableCell className="font-medium">
                        Period {p.pay_runs?.tax_period ?? "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {p.pay_runs?.pay_date
                          ? new Date(p.pay_runs.pay_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono">{fmt(p.gross_pence || 0)}</TableCell>
                      <TableCell className="text-right font-mono">{fmt(p.tax_pence || 0)}</TableCell>
                      <TableCell className="text-right font-mono">{fmt(p.ni_employee_pence || 0)}</TableCell>
                      <TableCell className="text-right font-mono font-semibold">{fmt(p.net_pence || 0)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); setSelected(p); }}>
                          <FileText className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Payslip detail drawer */}
        <Sheet open={!!selected} onOpenChange={() => setSelected(null)}>
          <SheetContent className="sm:max-w-md">
            <SheetHeader>
              <SheetTitle>Payslip Detail</SheetTitle>
              <SheetDescription>
                Period {selected?.pay_runs?.tax_period ?? "—"} •{" "}
                {selected?.pay_runs?.pay_date
                  ? new Date(selected.pay_runs.pay_date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
                  : ""}
              </SheetDescription>
            </SheetHeader>
            {selected && (
              <div className="mt-6 space-y-4">
                <Card>
                  <CardContent className="p-4 space-y-2">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Earnings</div>
                    <div className="flex justify-between text-sm">
                      <span>Gross Pay</span>
                      <span className="font-mono">{fmt(selected.gross_pence || 0)}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 space-y-2">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Deductions</div>
                    <div className="flex justify-between text-sm">
                      <span>Income Tax</span>
                      <span className="font-mono text-destructive">{fmt(selected.tax_pence || 0)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>National Insurance</span>
                      <span className="font-mono text-destructive">{fmt(selected.ni_employee_pence || 0)}</span>
                    </div>
                    {(selected.pension_employee_pence || 0) > 0 && (
                      <div className="flex justify-between text-sm">
                        <span>Pension (Employee)</span>
                        <span className="font-mono text-destructive">{fmt(selected.pension_employee_pence)}</span>
                      </div>
                    )}
                    {(selected.student_loan_pence || 0) > 0 && (
                      <div className="flex justify-between text-sm">
                        <span>Student Loan</span>
                        <span className="font-mono text-destructive">{fmt(selected.student_loan_pence)}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold">Net Pay</span>
                      <span className="text-2xl font-bold">{fmt(selected.net_pence || 0)}</span>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex gap-2">
                  <Button
                    className="flex-1 gap-1.5"
                    disabled={downloading}
                    onClick={() => handleDownloadPdf(selected)}
                  >
                    {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                    Download PDF
                  </Button>
                  <Button
                    variant="outline"
                    className="gap-1.5"
                    onClick={() => toast.info("Email resend feature coming soon.")}
                  >
                    <Mail className="w-3.5 h-3.5" /> Email me
                  </Button>
                </div>
              </div>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
