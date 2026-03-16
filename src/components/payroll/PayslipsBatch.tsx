import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Printer, Mail, Download, FileText, CheckCircle } from "lucide-react";
import { toast } from "sonner";

const fmt = (pence: number) => `£${(pence / 100).toFixed(2)}`;

/**
 * Moneysoft-style Payslips batch print/email screen.
 * Select employees and print/email their payslips in bulk.
 */
interface PayslipsBatchProps {
  payslips: any[];
  payRun: any;
}

export function PayslipsBatch({ payslips, payRun }: PayslipsBatchProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [layout, setLayout] = useState("standard");

  const toggleAll = () => {
    if (selectedIds.size === payslips.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(payslips.map((p: any) => p.id)));
    }
  };

  const toggleOne = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const allSelected = payslips.length > 0 && selectedIds.size === payslips.length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={layout} onValueChange={setLayout}>
          <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="standard">Standard Layout</SelectItem>
            <SelectItem value="compact">Compact (2 per page)</SelectItem>
            <SelectItem value="detailed">Detailed with YTD</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={toggleAll}>
          {allSelected ? "Deselect All" : "Select All"}
        </Button>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" disabled={selectedIds.size === 0} onClick={() => toast.success(`Generating ${selectedIds.size} payslip PDFs...`)}>
            <Download className="h-4 w-4 mr-1" /> Download PDF
          </Button>
          <Button variant="outline" size="sm" disabled={selectedIds.size === 0} onClick={() => toast.success(`Printing ${selectedIds.size} payslips...`)}>
            <Printer className="h-4 w-4 mr-1" /> Print
          </Button>
          <Button size="sm" disabled={selectedIds.size === 0} onClick={() => toast.success(`Emailing ${selectedIds.size} payslips to employees...`)}>
            <Mail className="h-4 w-4 mr-1" /> Email Payslips
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
                </TableHead>
                <TableHead>Employee</TableHead>
                <TableHead>NI Number</TableHead>
                <TableHead>Tax Code</TableHead>
                <TableHead className="text-right">Gross</TableHead>
                <TableHead className="text-right">Tax</TableHead>
                <TableHead className="text-right">NI</TableHead>
                <TableHead className="text-right">Pension</TableHead>
                <TableHead className="text-right">Net Pay</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payslips.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                    <FileText className="h-6 w-6 mx-auto mb-2 opacity-40" />
                    No payslips in this pay run.
                  </TableCell>
                </TableRow>
              ) : (
                payslips.map((ps: any) => (
                  <TableRow key={ps.id}>
                    <TableCell>
                      <Checkbox checked={selectedIds.has(ps.id)} onCheckedChange={() => toggleOne(ps.id)} />
                    </TableCell>
                    <TableCell className="font-medium">{ps.employee_name}</TableCell>
                    <TableCell className="font-mono text-sm">{ps.ni_number || "—"}</TableCell>
                    <TableCell className="font-mono text-sm">{ps.tax_code}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{fmt(ps.gross_pence)}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{fmt(ps.tax_pence)}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{fmt(ps.ni_employee_pence)}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{fmt(ps.pension_employee_pence || 0)}</TableCell>
                    <TableCell className="text-right font-mono text-sm font-semibold">{fmt(ps.net_pence)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] gap-1">
                        <CheckCircle className="h-3 w-3" /> Calculated
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
