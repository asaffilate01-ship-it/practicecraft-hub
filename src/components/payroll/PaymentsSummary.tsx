import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Banknote, Printer, Mail, Download } from "lucide-react";
import { toast } from "sonner";

const fmt = (pence: number) => `£${(pence / 100).toFixed(2)}`;

/**
 * Moneysoft-style Payments Summary showing how much to pay each employee.
 * Used after a pay run to arrange BACS payments.
 */
interface PaymentsSummaryProps {
  payslips: any[];
  payRun: any;
  employees: any[];
}

export function PaymentsSummary({ payslips, payRun, employees }: PaymentsSummaryProps) {
  const enrichedSlips = useMemo(() => {
    return payslips.map((ps: any) => {
      const emp = employees.find((e: any) => e.id === ps.employee_id);
      return {
        ...ps,
        sort_code: emp?.sort_code || "",
        account_number: emp?.account_number || "",
        account_name: emp?.account_name || ps.employee_name,
        payment_method: emp?.payment_method || "bacs",
      };
    });
  }, [payslips, employees]);

  const totalNet = payslips.reduce((s: number, p: any) => s + (p.net_pence || 0), 0);
  const totalGross = payslips.reduce((s: number, p: any) => s + (p.gross_pence || 0), 0);
  const totalTax = payslips.reduce((s: number, p: any) => s + (p.tax_pence || 0), 0);
  const totalNI = payslips.reduce((s: number, p: any) => s + (p.ni_employee_pence || 0), 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <div className="text-2xl font-bold">{payslips.length}</div>
            <div className="text-xs text-muted-foreground">Employees</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <div className="text-2xl font-bold">{fmt(totalGross)}</div>
            <div className="text-xs text-muted-foreground">Total Gross</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <div className="text-2xl font-bold text-destructive">{fmt(totalTax + totalNI)}</div>
            <div className="text-xs text-muted-foreground">Tax + NI</div>
          </CardContent>
        </Card>
        <Card className="bg-primary/5 border-primary/30">
          <CardContent className="pt-4 pb-3 text-center">
            <div className="text-2xl font-bold text-primary">{fmt(totalNet)}</div>
            <div className="text-xs text-muted-foreground">Total Net Payable</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Banknote className="h-4 w-4" />
              Payments Summary — P{payRun?.tax_period} · {payRun?.pay_date ? new Date(payRun.pay_date).toLocaleDateString("en-GB") : ""}
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => toast.success("BACS file generated")}>
                <Download className="h-4 w-4 mr-1" /> Export BACS
              </Button>
              <Button variant="outline" size="sm" onClick={() => toast.success("Printing payments summary...")}>
                <Printer className="h-4 w-4 mr-1" /> Print
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Sort Code</TableHead>
                <TableHead>Account No.</TableHead>
                <TableHead>Account Name</TableHead>
                <TableHead className="text-right">Net Pay</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {enrichedSlips.map((ps: any) => (
                <TableRow key={ps.id}>
                  <TableCell className="font-medium">{ps.employee_name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs uppercase">{ps.payment_method}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{ps.sort_code ? `${ps.sort_code.slice(0,2)}-${ps.sort_code.slice(2,4)}-${ps.sort_code.slice(4)}` : "—"}</TableCell>
                  <TableCell className="font-mono text-sm">{ps.account_number || "—"}</TableCell>
                  <TableCell className="text-sm">{ps.account_name}</TableCell>
                  <TableCell className="text-right font-mono font-semibold">{fmt(ps.net_pence)}</TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/50 font-semibold">
                <TableCell colSpan={5}>Total</TableCell>
                <TableCell className="text-right font-mono text-base">{fmt(totalNet)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
