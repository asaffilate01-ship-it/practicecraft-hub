import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import type { TBEntry } from "./TrialBalanceStep";
import type { TaxCompData } from "./TaxComputationStep";

const pence = (v: number) => (v / 100).toFixed(2);

function netBalance(e: TBEntry) {
  return (e.debit_pence + e.adjustment_debit_pence) - (e.credit_pence + e.adjustment_credit_pence);
}

type FormField = {
  box: string;
  label: string;
  value: string;
  readonly?: boolean;
};

type Props = {
  entries: TBEntry[];
  entityType: string;
  compData: TaxCompData;
  formData: Record<string, string>;
  onFormChange: (data: Record<string, string>) => void;
  periodStart: string;
  periodEnd: string;
  clientName: string;
  companyNumber?: string;
  utr?: string;
};

export function TaxFormStep({ entries, entityType, compData, formData, onFormChange, periodStart, periodEnd, clientName, companyNumber, utr }: Props) {
  const isLtd = entityType === "ltd" || entityType === "llp";

  const incomeEntries = entries.filter(e => e.account_type === "income");
  const totalIncome = incomeEntries.reduce((a, e) => a + Math.abs(netBalance(e)), 0);
  const expenseEntries = entries.filter(e => e.account_type === "expense");
  const totalExpenses = expenseEntries.reduce((a, e) => a + netBalance(e), 0);
  const accountingProfit = totalIncome - totalExpenses;
  const tradingProfit = Math.max(0, accountingProfit + compData.disallowableExpenses - compData.capitalAllowances);

  const taxableProfit_ct = Math.max(0,
    accountingProfit + compData.disallowableExpenses - compData.capitalAllowances
    - compData.tradingLossesBf + compData.otherIncome - compData.charitableDonations
  );
  const ctRate = taxableProfit_ct <= 5000000 ? 0.19 : 0.25;
  const ctLiability = Math.round(taxableProfit_ct * ctRate);

  const update = (key: string, val: string) => onFormChange({ ...formData, [key]: val });

  const FormRow = ({ box, label, value, readonly }: FormField) => (
    <div className="grid grid-cols-12 gap-2 items-center py-1.5 border-b last:border-0">
      <div className="col-span-2">
        <Badge variant="outline" className="text-[10px] font-mono">{box}</Badge>
      </div>
      <div className="col-span-7">
        <Label className="text-xs">{label}</Label>
      </div>
      <div className="col-span-3">
        <Input
          className="h-7 text-xs text-right font-mono"
          value={value}
          readOnly={readonly}
          onChange={readonly ? undefined : (e) => update(box, e.target.value)}
        />
      </div>
    </div>
  );

  if (isLtd) {
    return (
      <div className="space-y-4">
        <div className="text-center border-b pb-3">
          <h2 className="text-lg font-bold">CT600 — Company Tax Return</h2>
          <p className="text-xs text-muted-foreground">HM Revenue & Customs</p>
          <div className="flex justify-center gap-4 mt-2 text-xs">
            <span>Company: <strong>{clientName}</strong></span>
            <span>Company No: <strong>{companyNumber || "—"}</strong></span>
            <span>UTR: <strong>{utr || "—"}</strong></span>
          </div>
          <div className="flex justify-center gap-4 mt-1 text-xs text-muted-foreground">
            <span>Period: {periodStart} to {periodEnd}</span>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Part 3 — Tax Calculation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <FormRow box="145" label="Turnover / Revenue" value={pence(totalIncome)} readonly />
            <FormRow box="155" label="Trading profits" value={pence(accountingProfit)} readonly />
            <FormRow box="160" label="Trading losses brought forward" value={pence(compData.tradingLossesBf)} readonly />
            <FormRow box="165" label="Net trading profits" value={pence(Math.max(0, accountingProfit - compData.tradingLossesBf))} readonly />
            <FormRow box="170" label="Non-trading loan relationships income" value={formData["170"] || "0.00"} />
            <FormRow box="190" label="Income from property" value={formData["190"] || "0.00"} />
            <FormRow box="205" label="Gross chargeable gains" value={formData["205"] || "0.00"} />
            <FormRow box="235" label="Profits before deductions and reliefs" value={pence(taxableProfit_ct + compData.tradingLossesBf)} readonly />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Part 4 — Deductions & Reliefs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <FormRow box="275" label="Management expenses" value={formData["275"] || "0.00"} />
            <FormRow box="285" label="Trading losses (this period)" value={formData["285"] || "0.00"} />
            <FormRow box="305" label="Non-trade capital allowances" value={formData["305"] || "0.00"} />
            <FormRow box="315" label="Total deductions" value={formData["315"] || "0.00"} />
            <FormRow box="330" label="Qualifying donations" value={pence(compData.charitableDonations)} readonly />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Part 5 — Tax Calculation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <FormRow box="345" label="Profits chargeable to CT" value={pence(taxableProfit_ct)} readonly />
            <FormRow box="360" label="Corporation Tax @ {(ctRate * 100).toFixed(0)}%" value={pence(ctLiability)} readonly />
            <FormRow box="380" label="Marginal relief" value={formData["380"] || "0.00"} />
            <FormRow box="390" label="CT payable" value={pence(ctLiability)} readonly />
            <FormRow box="395" label="Tax already paid" value={formData["395"] || "0.00"} />
            <Separator />
            <div className="bg-primary/10 rounded p-3 mt-2">
              <div className="flex justify-between items-center">
                <span className="font-bold">Box 400 — Tax Payable / (Repayable)</span>
                <span className="font-mono font-bold text-lg">£{pence(ctLiability - (Math.round(parseFloat(formData["395"] || "0") * 100)))}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Part 8 — Declaration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Checkbox checked={formData["declaration"] === "true"} onCheckedChange={(c) => update("declaration", c ? "true" : "false")} />
              <Label className="text-xs">I declare that the information in this return is correct and complete to the best of my knowledge</Label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Name of signatory</Label>
                <Input className="h-8 text-xs" value={formData["signatory"] || ""} onChange={(e) => update("signatory", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Date</Label>
                <Input className="h-8 text-xs" type="date" value={formData["sign_date"] || ""} onChange={(e) => update("sign_date", e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // SA100 form
  const partnerShare = entityType === "partnership" ? Math.round(tradingProfit * compData.partnerSharePercent / 100) : tradingProfit;
  const totalSaIncome = partnerShare + compData.otherEmploymentIncome + compData.propertyIncome + compData.savingsInterest + compData.dividendIncome;
  const taxableIncome = Math.max(0, totalSaIncome - compData.personalAllowance - compData.pensionContributions - compData.giftAid);

  return (
    <div className="space-y-4">
      <div className="text-center border-b pb-3">
        <h2 className="text-lg font-bold">SA100 — Tax Return</h2>
        <p className="text-xs text-muted-foreground">HM Revenue & Customs — Self Assessment</p>
        <div className="flex justify-center gap-4 mt-2 text-xs">
          <span>Name: <strong>{clientName}</strong></span>
          <span>UTR: <strong>{utr || "—"}</strong></span>
        </div>
        <div className="flex justify-center gap-4 mt-1 text-xs text-muted-foreground">
          <span>Tax Year: {periodStart} to {periodEnd}</span>
        </div>
      </div>

      {entityType === "partnership" && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">SA800 — Partnership Return Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <FormRow box="3.1" label="Partnership turnover" value={pence(totalIncome)} readonly />
            <FormRow box="3.4" label="Allowable expenses" value={pence(totalExpenses)} readonly />
            <FormRow box="3.24" label="Net profit" value={pence(accountingProfit)} readonly />
            <FormRow box="3.25" label="Add: Disallowable" value={pence(compData.disallowableExpenses)} readonly />
            <FormRow box="3.26" label="Less: Capital allowances" value={pence(compData.capitalAllowances)} readonly />
            <FormRow box="3.73" label="Adjusted profit" value={pence(tradingProfit)} readonly />
            <FormRow box="P.1" label="Your share (%)" value={`${compData.partnerSharePercent}%`} readonly />
            <FormRow box="P.2" label="Your profit share" value={pence(partnerShare)} readonly />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">SA103 — Self-Employment</CardTitle>
          <CardDescription className="text-xs">Business income and expenses</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          <FormRow box="15" label="Turnover" value={pence(totalIncome)} readonly />
          <FormRow box="17" label="Allowable business expenses" value={pence(totalExpenses)} readonly />
          <FormRow box="24" label="Disallowable expenses" value={pence(compData.disallowableExpenses)} readonly />
          <FormRow box="25" label="Capital allowances" value={pence(compData.capitalAllowances)} readonly />
          <FormRow box="27" label="Total allowable expenses" value={pence(totalExpenses - compData.disallowableExpenses + compData.capitalAllowances)} readonly />
          <FormRow box="29" label="Net business profit" value={pence(tradingProfit)} readonly />
          <FormRow box="31" label="Losses brought forward" value={formData["31"] || "0.00"} />
          <FormRow box="32" label="Taxable profit" value={pence(tradingProfit)} readonly />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">SA100 — Income Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <FormRow box="TR1" label="Self-employment profit" value={pence(entityType === "partnership" ? partnerShare : tradingProfit)} readonly />
          <FormRow box="TR2" label="Employment income" value={pence(compData.otherEmploymentIncome)} readonly />
          <FormRow box="TR3" label="Property income" value={pence(compData.propertyIncome)} readonly />
          <FormRow box="TR4" label="Savings & investments" value={pence(compData.savingsInterest)} readonly />
          <FormRow box="TR5" label="Dividends" value={pence(compData.dividendIncome)} readonly />
          <FormRow box="TR6" label="Capital gains" value={pence(compData.capitalGains)} readonly />
          <Separator className="my-2" />
          <FormRow box="TR7" label="Total income" value={pence(totalSaIncome)} readonly />
          <FormRow box="TR8" label="Personal allowance" value={pence(compData.personalAllowance)} readonly />
          <FormRow box="TR9" label="Pension contributions" value={pence(compData.pensionContributions)} readonly />
          <FormRow box="TR10" label="Gift Aid" value={pence(compData.giftAid)} readonly />
          <FormRow box="TR11" label="Taxable income" value={pence(taxableIncome)} readonly />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Declaration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Checkbox checked={formData["declaration"] === "true"} onCheckedChange={(c) => update("declaration", c ? "true" : "false")} />
            <Label className="text-xs">I declare that the information in this return is correct and complete</Label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Taxpayer name</Label>
              <Input className="h-8 text-xs" value={formData["taxpayer_name"] || ""} onChange={(e) => update("taxpayer_name", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Date</Label>
              <Input className="h-8 text-xs" type="date" value={formData["sign_date"] || ""} onChange={(e) => update("sign_date", e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
