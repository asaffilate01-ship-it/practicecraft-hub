import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Send, CheckCircle, Clock, AlertTriangle, XCircle, FileText } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

const fmt = (pence: number) => `£${(pence / 100).toFixed(2)}`;

/**
 * Moneysoft-style RTI Schedule showing all tax periods with filing status.
 * Supports batch filing for agents managing multiple employers.
 */
interface RtiScheduleProps {
  payRuns: any[];
  frequency: string;
  taxYear: string;
  employerName?: string;
}

export function RtiSchedule({ payRuns, frequency, taxYear, employerName }: RtiScheduleProps) {
  const maxPeriods = frequency === "weekly" ? 52 : frequency === "fortnightly" ? 26 : frequency === "four_weekly" ? 13 : 12;

  const periodData = useMemo(() => {
    const periods = [];
    for (let p = 1; p <= maxPeriods; p++) {
      const run = payRuns.find((r: any) => r.tax_period === p);
      periods.push({
        period: p,
        run,
        status: run?.status || "not_run",
        fpsStatus: run?.fps_status || (run?.status === "submitted" ? "accepted" : "not_filed"),
        epsRequired: false, // Would be driven by data
        payDate: run?.pay_date,
        gross: run?.total_gross_pence || 0,
        tax: run?.total_tax_pence || 0,
        net: run?.total_net_pence || 0,
        employeeCount: run?.employee_count || 0,
      });
    }
    return periods;
  }, [payRuns, maxPeriods]);

  const statusIcon = (status: string) => {
    switch (status) {
      case "submitted": return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "finalised": return <Clock className="h-4 w-4 text-amber-500" />;
      case "draft": return <FileText className="h-4 w-4 text-muted-foreground" />;
      case "rejected": return <XCircle className="h-4 w-4 text-destructive" />;
      default: return <span className="w-4 h-4 rounded-full bg-muted block" />;
    }
  };

  const fpsStatusBadge = (status: string) => {
    switch (status) {
      case "accepted": return <Badge variant="default" className="text-[10px]">Accepted</Badge>;
      case "pending": return <Badge variant="secondary" className="text-[10px]">Pending</Badge>;
      case "rejected": return <Badge variant="destructive" className="text-[10px]">Rejected</Badge>;
      default: return <Badge variant="outline" className="text-[10px]">Not Filed</Badge>;
    }
  };

  // Stats
  const filed = periodData.filter(p => p.fpsStatus === "accepted").length;
  const pending = periodData.filter(p => p.status === "finalised").length;
  const rejected = periodData.filter(p => p.fpsStatus === "rejected").length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <div className="text-2xl font-bold text-green-600">{filed}</div>
            <div className="text-xs text-muted-foreground">FPS Filed</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <div className="text-2xl font-bold text-amber-600">{pending}</div>
            <div className="text-xs text-muted-foreground">Ready to File</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <div className="text-2xl font-bold text-destructive">{rejected}</div>
            <div className="text-xs text-muted-foreground">Rejected</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <div className="text-2xl font-bold">{maxPeriods - filed - pending}</div>
            <div className="text-xs text-muted-foreground">Remaining</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              RTI Schedule — {employerName || "All Employers"} · {taxYear}
            </CardTitle>
            <Button
              size="sm"
              disabled={pending === 0}
              onClick={() => toast.success(`Batch filing ${pending} FPS returns to HMRC...`)}
            >
              <Send className="h-4 w-4 mr-1" />
              Batch File FPS ({pending})
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">Period</TableHead>
                <TableHead>Pay Date</TableHead>
                <TableHead>Run Status</TableHead>
                <TableHead>FPS Status</TableHead>
                <TableHead>EPS</TableHead>
                <TableHead className="text-right">Gross</TableHead>
                <TableHead className="text-right">Tax</TableHead>
                <TableHead className="text-right">Net</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {periodData.map(p => (
                <TableRow key={p.period} className={p.status === "not_run" ? "opacity-50" : ""}>
                  <TableCell className="font-mono font-semibold">
                    {frequency === "weekly" ? `Wk ${p.period}` : `M${p.period}`}
                  </TableCell>
                  <TableCell className="text-sm">
                    {p.payDate ? new Date(p.payDate).toLocaleDateString("en-GB") : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      {statusIcon(p.status)}
                      <span className="text-xs capitalize">{p.status === "not_run" ? "Not Run" : p.status}</span>
                    </div>
                  </TableCell>
                  <TableCell>{fpsStatusBadge(p.fpsStatus)}</TableCell>
                  <TableCell>
                    {p.epsRequired ? (
                      <Badge variant="secondary" className="text-[10px]">Required</Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">{p.gross > 0 ? fmt(p.gross) : "—"}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{p.tax > 0 ? fmt(p.tax) : "—"}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{p.net > 0 ? fmt(p.net) : "—"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end">
                      {p.status === "finalised" && p.run && (
                        <Link to={`/payroll/rti/fps/${p.run.id}`}>
                          <Button variant="outline" size="sm" className="text-xs gap-1">
                            <Send className="h-3 w-3" /> File FPS
                          </Button>
                        </Link>
                      )}
                      {p.fpsStatus === "rejected" && (
                        <Button variant="destructive" size="sm" className="text-xs" onClick={() => toast.info("Opening rejection details...")}>
                          View Error
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
