import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { TBEntry } from "./TrialBalanceStep";

const pence = (v: number) => (v / 100).toFixed(2);
const strToPence = (s: string) => Math.round(parseFloat(s || "0") * 100);

function netBalance(entry: TBEntry) {
  return (entry.debit_pence + entry.adjustment_debit_pence) - (entry.credit_pence + entry.adjustment_credit_pence);
}

export type TaxCompData = {
  // CT600 fields
  disallowableExpenses: number;
  capitalAllowances: number;
  tradingLossesBf: number;
  otherIncome: number;
  charitableDonations: number;
  // SA100/SA103 fields
  otherEmploymentIncome: number;
  propertyIncome: number;
  savingsInterest: number;
  dividendIncome: number;
  capitalGains: number;
  personalAllowance: number;
  pensionContributions: number;
  giftAid: number;
  // Partnership
  partnerSharePercent: number;
};

type Props = {
  entries: TBEntry[];
  entityType: string;
  compData: TaxCompData;
  onChange: (data: TaxCompData) => void;
};

export const defaultTaxCompData: TaxCompData = {
  disallowableExpenses: 0,
  capitalAllowances: 0,
  tradingLossesBf: 0,
  otherIncome: 0,
  charitableDonations: 0,
  otherEmploymentIncome: 0,
  propertyIncome: 0,
  savingsInterest: 0,
  dividendIncome: 0,
  capitalGains: 0,
  personalAllowance: 1257000, // £12,570
  pensionContributions: 0,
  giftAid: 0,
  partnerSharePercent: 100,
};

export function TaxComputationStep({ entries, entityType, compData, onChange }: Props) {
  const isLtd = entityType === "ltd" || entityType === "llp";
  const isSole = entityType === "sole_trader";
  const isPartnership = entityType === "partnership" || entityType === "llp";

  const incomeEntries = entries.filter(e => e.account_type === "income");
  const totalIncome = incomeEntries.reduce((a, e) => a + Math.abs(netBalance(e)), 0);
  const expenseEntries = entries.filter(e => e.account_type === "expense");
  const totalExpenses = expenseEntries.reduce((a, e) => a + netBalance(e), 0);
  const accountingProfit = totalIncome - totalExpenses;

  const update = (field: keyof TaxCompData, val: string) => {
    onChange({ ...compData, [field]: strToPence(val) });
  };

  const Field = ({ label, field, hint }: { label: string; field: keyof TaxCompData; hint?: string }) => (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input type="number" step="0.01" className="h-8 text-sm text-right"
        value={pence(compData[field])}
        onChange={(e) => update(field, e.target.value)} />
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );

  // CT600 computation
  const taxableProfit_ct = Math.max(0,
    accountingProfit
    + compData.disallowableExpenses
    - compData.capitalAllowances
    - compData.tradingLossesBf
    + compData.otherIncome
    - compData.charitableDonations
  );
  const ctRate = taxableProfit_ct <= 5000000 ? 0.19 : taxableProfit_ct <= 25000000 ? 0.25 : 0.25;
  const ctLiability = Math.round(taxableProfit_ct * ctRate);

  // SA100 computation
  const tradingProfit = Math.max(0, accountingProfit + compData.disallowableExpenses - compData.capitalAllowances);
  const partnerShare = isPartnership ? Math.round(tradingProfit * compData.partnerSharePercent / 100) : tradingProfit;
  const totalSaIncome = partnerShare + compData.otherEmploymentIncome + compData.propertyIncome + compData.savingsInterest + compData.dividendIncome;
  const taxableIncome_sa = Math.max(0, totalSaIncome - compData.personalAllowance - compData.pensionContributions - compData.giftAid);

  // Simple tax calc (2024/25 rates)
  const calcIncomeTax = (taxable: number) => {
    if (taxable <= 0) return 0;
    const basic = Math.min(taxable, 3728600); // £37,286
    const higher = Math.min(Math.max(taxable - 3728600, 0), 8727100); // up to £125,140
    const additional = Math.max(taxable - 12455700, 0);
    return Math.round(basic * 0.20 + higher * 0.40 + additional * 0.45);
  };

  const class4 = isSole || isPartnership ? Math.round(Math.max(0, partnerShare - 1257000) * 0.06) : 0;
  const class2 = isSole || isPartnership ? (partnerShare > 1257000 ? 17940 : 0) : 0; // £179.40/yr
  const incomeTax = calcIncomeTax(taxableIncome_sa);
  const totalSaTax = incomeTax + class4 + class2;

  if (isLtd) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">CT600 — Corporation Tax Computation</CardTitle>
            <CardDescription className="text-xs">Adjustments to accounting profit to arrive at taxable profits</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Table>
              <TableBody>
                <TableRow className="bg-muted/50">
                  <TableCell className="font-semibold">Accounting Profit per P&L</TableCell>
                  <TableCell className="text-right font-mono font-semibold">{pence(accountingProfit)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Add: Disallowable Expenses" field="disallowableExpenses" hint="Entertainment, depreciation, fines" />
              <Field label="Less: Capital Allowances" field="capitalAllowances" hint="AIA, WDA, FYA" />
              <Field label="Less: Trading Losses b/f" field="tradingLossesBf" hint="Losses from prior periods" />
              <Field label="Add: Other Income" field="otherIncome" hint="Interest, property income" />
              <Field label="Less: Charitable Donations" field="charitableDonations" hint="Qualifying donations" />
            </div>

            <Separator />

            <Table>
              <TableBody>
                <TableRow>
                  <TableCell className="font-semibold">Taxable Profit</TableCell>
                  <TableCell className="text-right font-mono font-bold text-base">{pence(taxableProfit_ct)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="text-sm text-muted-foreground">Corporation Tax Rate</TableCell>
                  <TableCell className="text-right text-sm">{(ctRate * 100).toFixed(0)}%</TableCell>
                </TableRow>
                <TableRow className="bg-primary/10">
                  <TableCell className="font-bold text-base">Corporation Tax Payable</TableCell>
                  <TableCell className="text-right font-mono font-bold text-base">£{pence(ctLiability)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  }

  // SA100 / SA103 computation
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            {isPartnership ? "SA800 / SA100 — Partnership & Self Assessment Computation" : "SA100 / SA103 — Self Assessment Tax Computation"}
          </CardTitle>
          <CardDescription className="text-xs">
            {isPartnership ? "Partnership trading profit allocation and individual tax" : "Self-employment profit and personal tax calculation"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Trading profit */}
          <div className="border rounded-lg p-4 space-y-3">
            <h3 className="text-sm font-semibold">SA103 — Self-Employment (Trading Profit)</h3>
            <Table>
              <TableBody>
                <TableRow className="bg-muted/50">
                  <TableCell className="font-semibold">Turnover</TableCell>
                  <TableCell className="text-right font-mono">{pence(totalIncome)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Less: Allowable Expenses</TableCell>
                  <TableCell className="text-right font-mono">{pence(totalExpenses)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-semibold">Net Profit</TableCell>
                  <TableCell className="text-right font-mono font-semibold">{pence(accountingProfit)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Add: Disallowable Expenses" field="disallowableExpenses" hint="Private use, entertainment" />
              <Field label="Less: Capital Allowances" field="capitalAllowances" hint="AIA, vehicles, equipment" />
            </div>

            <Table>
              <TableBody>
                <TableRow className="bg-primary/5">
                  <TableCell className="font-bold">Adjusted Trading Profit</TableCell>
                  <TableCell className="text-right font-mono font-bold">{pence(tradingProfit)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>

            {isPartnership && (
              <div className="border rounded p-3 bg-muted/30">
                <Field label="Partner Share %" field="partnerSharePercent" hint="Your share of partnership profits" />
                <p className="text-xs text-muted-foreground mt-1">Your share: £{pence(partnerShare)}</p>
              </div>
            )}
          </div>

          {/* Other income */}
          <div className="border rounded-lg p-4 space-y-3">
            <h3 className="text-sm font-semibold">SA100 — Other Income</h3>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Employment Income" field="otherEmploymentIncome" hint="PAYE employment income" />
              <Field label="Property Income" field="propertyIncome" hint="Rental income (SA105)" />
              <Field label="Savings Interest" field="savingsInterest" hint="Bank interest received" />
              <Field label="Dividend Income" field="dividendIncome" hint="UK dividends" />
              <Field label="Capital Gains" field="capitalGains" hint="Gains on disposals (SA108)" />
            </div>
          </div>

          {/* Reliefs */}
          <div className="border rounded-lg p-4 space-y-3">
            <h3 className="text-sm font-semibold">Reliefs & Allowances</h3>
            <div className="grid grid-cols-3 gap-4">
              <Field label="Personal Allowance" field="personalAllowance" hint="£12,570 (2024/25)" />
              <Field label="Pension Contributions" field="pensionContributions" hint="Qualifying pension payments" />
              <Field label="Gift Aid" field="giftAid" hint="Charitable donations" />
            </div>
          </div>

          <Separator />

          {/* Tax summary */}
          <Table>
            <TableBody>
              <TableRow className="bg-muted/50">
                <TableCell className="font-semibold">Total Income</TableCell>
                <TableCell className="text-right font-mono">{pence(totalSaIncome)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Less: Allowances & Reliefs</TableCell>
                <TableCell className="text-right font-mono">{pence(compData.personalAllowance + compData.pensionContributions + compData.giftAid)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-semibold">Taxable Income</TableCell>
                <TableCell className="text-right font-mono font-semibold">{pence(taxableIncome_sa)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Income Tax</TableCell>
                <TableCell className="text-right font-mono">{pence(incomeTax)}</TableCell>
              </TableRow>
              {(isSole || isPartnership) && <>
                <TableRow>
                  <TableCell>Class 4 NIC</TableCell>
                  <TableCell className="text-right font-mono">{pence(class4)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Class 2 NIC</TableCell>
                  <TableCell className="text-right font-mono">{pence(class2)}</TableCell>
                </TableRow>
              </>}
              <TableRow className="bg-primary/10 border-t-2">
                <TableCell className="font-bold text-base">Total Tax Payable</TableCell>
                <TableCell className="text-right font-mono font-bold text-base">£{pence(totalSaTax)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>

          <div className="flex gap-2">
            <Badge variant="outline" className="text-xs">Payment on Account 1: £{pence(Math.round(totalSaTax / 2))}</Badge>
            <Badge variant="outline" className="text-xs">Payment on Account 2: £{pence(Math.round(totalSaTax / 2))}</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
