import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Search, Info, Pencil } from "lucide-react";
import { calculatePay, type PayFrequency } from "@/components/payroll/PayCalculationEngine";

const fmt = (pence: number) => `£${(pence / 100).toFixed(2)}`;

/**
 * Moneysoft-style year-at-a-glance Pay Details grid.
 * Rows = employees, Columns = tax periods (1-12 or 1-52).
 * Clicking a cell opens pay detail for editing.
 */
interface PayDetailsGridProps {
  employees: any[];
  payRuns: any[];
  payslips: any[];
  frequency: string;
  taxYear: string;
  onEditPayslip?: (employeeId: string, period: number, payslip: any) => void;
}

export function PayDetailsGrid({ employees, payRuns, payslips, frequency, taxYear, onEditPayslip }: PayDetailsGridProps) {
  const [showCalcExplainer, setShowCalcExplainer] = useState(false);
  const [calcDetail, setCalcDetail] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");

  const maxPeriods = frequency === "weekly" ? 52 : frequency === "fortnightly" ? 26 : frequency === "four_weekly" ? 13 : 12;

  // Build a lookup: employeeId → period → payslip
  const slipLookup = useMemo(() => {
    const map: Record<string, Record<number, any>> = {};
    payslips.forEach((ps: any) => {
      if (!map[ps.employee_id]) map[ps.employee_id] = {};
      // Find the run to get period
      const run = payRuns.find((r: any) => r.id === ps.pay_run_id);
      if (run) {
        map[ps.employee_id][run.tax_period] = ps;
      }
    });
    return map;
  }, [payslips, payRuns]);

  // Filter employees
  const filtered = useMemo(() => {
    return employees.filter((e: any) => {
      const name = `${e.first_name} ${e.last_name}`.toLowerCase();
      const matchSearch = !searchTerm || name.includes(searchTerm.toLowerCase()) || (e.ni_number || "").toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = statusFilter === "all" || (statusFilter === "active" ? e.is_active : !e.is_active);
      return matchSearch && matchStatus;
    });
  }, [employees, searchTerm, statusFilter]);

  // Calculate YTD for an employee
  const getYTD = (empId: string) => {
    const empSlips = slipLookup[empId] || {};
    let gross = 0, tax = 0, niEmp = 0, net = 0;
    Object.values(empSlips).forEach((ps: any) => {
      gross += ps.gross_pence || 0;
      tax += ps.tax_pence || 0;
      niEmp += ps.ni_employee_pence || 0;
      net += ps.net_pence || 0;
    });
    return { gross, tax, niEmp, net };
  };

  // Show calculation explainer (Moneysoft "Click Here for Explanation")
  const showExplanation = (emp: any, period: number) => {
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
      currentPeriod: period,
    });
    setCalcDetail({ emp, period, result });
    setShowCalcExplainer(true);
  };

  // Determine current active period
  const latestPeriod = useMemo(() => {
    if (payRuns.length === 0) return 1;
    return Math.max(...payRuns.map((r: any) => r.tax_period || 1));
  }, [payRuns]);

  // Which periods to show (show 6 periods at a time for readability)
  const [viewStart, setViewStart] = useState(Math.max(1, latestPeriod - 5));
  const visiblePeriods = Array.from({ length: Math.min(6, maxPeriods - viewStart + 1) }, (_, i) => viewStart + i);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search employee or NI..." className="pl-9" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Leavers</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1 ml-auto">
          <Button variant="outline" size="sm" disabled={viewStart <= 1} onClick={() => setViewStart(Math.max(1, viewStart - 6))}>
            ← Earlier
          </Button>
          <span className="text-xs text-muted-foreground px-2">
            P{visiblePeriods[0]}-P{visiblePeriods[visiblePeriods.length - 1]} of {maxPeriods}
          </span>
          <Button variant="outline" size="sm" disabled={viewStart + 6 > maxPeriods} onClick={() => setViewStart(Math.min(maxPeriods - 5, viewStart + 6))}>
            Later →
          </Button>
        </div>
      </div>

      <Card>
        <ScrollArea className="w-full">
          <div className="min-w-[900px]">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="sticky left-0 bg-muted/50 z-10 min-w-[200px]">Employee</TableHead>
                  <TableHead className="min-w-[80px]">Tax Code</TableHead>
                  <TableHead className="min-w-[80px]">NI Cat</TableHead>
                  {visiblePeriods.map(p => (
                    <TableHead key={p} className={`text-center min-w-[110px] ${p === latestPeriod ? "bg-primary/10 font-bold" : ""}`}>
                      {frequency === "weekly" ? `Wk ${p}` : `Month ${p}`}
                    </TableHead>
                  ))}
                  <TableHead className="text-right min-w-[100px] bg-muted font-semibold">YTD Gross</TableHead>
                  <TableHead className="text-right min-w-[90px] bg-muted font-semibold">YTD Tax</TableHead>
                  <TableHead className="text-right min-w-[90px] bg-muted font-semibold">YTD Net</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={visiblePeriods.length + 6} className="text-center py-8 text-muted-foreground">
                      No employees found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((emp: any) => {
                    const ytd = getYTD(emp.id);
                    const empSlips = slipLookup[emp.id] || {};
                    return (
                      <TableRow key={emp.id} className={!emp.is_active ? "opacity-50" : ""}>
                        <TableCell className="sticky left-0 bg-card z-10">
                          <div>
                            <span className="text-sm font-medium">{emp.first_name} {emp.last_name}</span>
                            {emp.is_director && <Badge variant="outline" className="ml-1 text-[10px] py-0">Dir</Badge>}
                            <div className="text-[11px] text-muted-foreground">{emp.ni_number || "—"}</div>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{emp.tax_code}{emp.week1_month1 ? " W1" : ""}</TableCell>
                        <TableCell className="font-mono text-xs">{emp.ni_category || "A"}</TableCell>
                        {visiblePeriods.map(period => {
                          const slip = empSlips[period];
                          const isCurrentPeriod = period === latestPeriod;
                          return (
                            <TableCell
                              key={period}
                              className={`text-center cursor-pointer transition-colors hover:bg-accent/50 ${isCurrentPeriod ? "bg-primary/5" : ""} ${slip ? "" : "text-muted-foreground"}`}
                              onClick={() => {
                                if (onEditPayslip) onEditPayslip(emp.id, period, slip);
                              }}
                            >
                              {slip ? (
                                <div className="space-y-0.5">
                                  <div className="text-xs font-mono font-semibold">{fmt(slip.net_pence)}</div>
                                  <div className="text-[10px] text-muted-foreground">G: {fmt(slip.gross_pence)}</div>
                                </div>
                              ) : (
                                <span className="text-xs">—</span>
                              )}
                            </TableCell>
                          );
                        })}
                        <TableCell className="text-right font-mono text-sm font-semibold bg-muted/30">{fmt(ytd.gross)}</TableCell>
                        <TableCell className="text-right font-mono text-sm bg-muted/30">{fmt(ytd.tax)}</TableCell>
                        <TableCell className="text-right font-mono text-sm font-semibold bg-muted/30">{fmt(ytd.net)}</TableCell>
                      </TableRow>
                    );
                  })
                )}
                {/* Totals row */}
                {filtered.length > 0 && (
                  <TableRow className="bg-muted/50 font-semibold">
                    <TableCell className="sticky left-0 bg-muted/50 z-10">Totals</TableCell>
                    <TableCell></TableCell>
                    <TableCell></TableCell>
                    {visiblePeriods.map(period => {
                      const periodTotal = filtered.reduce((sum: number, emp: any) => {
                        const slip = (slipLookup[emp.id] || {})[period];
                        return sum + (slip?.net_pence || 0);
                      }, 0);
                      return (
                        <TableCell key={period} className="text-center font-mono text-xs">
                          {periodTotal > 0 ? fmt(periodTotal) : "—"}
                        </TableCell>
                      );
                    })}
                    <TableCell className="text-right font-mono text-sm bg-muted">
                      {fmt(filtered.reduce((s: number, e: any) => s + getYTD(e.id).gross, 0))}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm bg-muted">
                      {fmt(filtered.reduce((s: number, e: any) => s + getYTD(e.id).tax, 0))}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm bg-muted">
                      {fmt(filtered.reduce((s: number, e: any) => s + getYTD(e.id).net, 0))}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </Card>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Info className="h-3 w-3" />
        <span>Click any pay period cell to view/edit pay details. Highlighted column = current period. YTD columns show year-to-date totals.</span>
      </div>

      {/* Calculation Explainer Dialog (Moneysoft "Click Here for Explanation") */}
      <Dialog open={showCalcExplainer} onOpenChange={setShowCalcExplainer}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Pay Calculation — {calcDetail?.emp?.first_name} {calcDetail?.emp?.last_name} (P{calcDetail?.period})
            </DialogTitle>
          </DialogHeader>
          {calcDetail?.result && (
            <div className="space-y-3 text-sm">
              <Card><CardContent className="p-3 space-y-1">
                <div className="text-xs font-semibold text-muted-foreground uppercase">Earnings Calculation</div>
                <div className="flex justify-between"><span>Annual Salary</span><span className="font-mono">{fmt(calcDetail.emp.annual_salary_pence || 0)}</span></div>
                <div className="flex justify-between"><span>÷ {frequency === "weekly" ? "52 weeks" : "12 months"}</span><span className="font-mono">{fmt(calcDetail.result.basicPayPence)}</span></div>
                <div className="flex justify-between font-semibold border-t pt-1"><span>Gross Pay</span><span className="font-mono">{fmt(calcDetail.result.grossPence)}</span></div>
              </CardContent></Card>

              <Card><CardContent className="p-3 space-y-1">
                <div className="text-xs font-semibold text-muted-foreground uppercase">Tax Calculation</div>
                <div className="flex justify-between"><span>Tax Code: {calcDetail.emp.tax_code}</span></div>
                <div className="flex justify-between"><span>Personal Allowance (annual)</span><span className="font-mono">{fmt(calcDetail.result.personalAllowancePence || 1257000)}</span></div>
                <div className="flex justify-between"><span>Taxable Pay</span><span className="font-mono">{fmt(calcDetail.result.taxablePayPence || 0)}</span></div>
                <div className="flex justify-between font-semibold border-t pt-1"><span>PAYE Tax</span><span className="font-mono text-destructive">-{fmt(calcDetail.result.taxPence)}</span></div>
              </CardContent></Card>

              <Card><CardContent className="p-3 space-y-1">
                <div className="text-xs font-semibold text-muted-foreground uppercase">National Insurance</div>
                <div className="flex justify-between"><span>NI Category: {calcDetail.emp.ni_category || "A"}</span></div>
                <div className="flex justify-between"><span>Employee NI</span><span className="font-mono text-destructive">-{fmt(calcDetail.result.niEmployeePence)}</span></div>
                <div className="flex justify-between"><span>Employer NI</span><span className="font-mono">{fmt(calcDetail.result.niEmployerPence)}</span></div>
              </CardContent></Card>

              {!calcDetail.emp.pension_opt_out && (
                <Card><CardContent className="p-3 space-y-1">
                  <div className="text-xs font-semibold text-muted-foreground uppercase">Pension (Auto-Enrolment)</div>
                  <div className="flex justify-between"><span>Employee ({calcDetail.emp.pension_employee_pct || 5}%)</span><span className="font-mono text-destructive">-{fmt(calcDetail.result.pensionEmployeePence)}</span></div>
                  <div className="flex justify-between"><span>Employer ({calcDetail.emp.pension_employer_pct || 3}%)</span><span className="font-mono">{fmt(calcDetail.result.pensionEmployerPence)}</span></div>
                </CardContent></Card>
              )}

              <Card className="bg-primary/5 border-primary/20"><CardContent className="p-3">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Net Pay</span>
                  <span className="text-xl font-bold">{fmt(calcDetail.result.netPence)}</span>
                </div>
              </CardContent></Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
