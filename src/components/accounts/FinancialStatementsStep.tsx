import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AccountsRoundingBasis } from "@/lib/accountsCompliance";
import { AccountsPdfPreview } from "./AccountsPdfPreview";
import type { TBEntry } from "./TrialBalanceStep";

function currentBalance(entry: TBEntry) {
  return entry.debit_pence + entry.adjustment_debit_pence - entry.credit_pence - entry.adjustment_credit_pence;
}

function comparativeBalance(entry: TBEntry) {
  return (entry.comparative_debit_pence ?? 0) - (entry.comparative_credit_pence ?? 0);
}

function formattedAmount(pence: number, roundingBasis: AccountsRoundingBasis) {
  const divisor = roundingBasis === "thousands" ? 100_000 : 100;
  return Math.round(pence / divisor).toLocaleString("en-GB");
}

type Props = {
  entries: TBEntry[];
  entityType: string;
  standard: string;
  periodStart: string;
  periodEnd: string;
  clientName: string;
  roundingBasis?: AccountsRoundingBasis;
  comparativesRequired?: boolean;
};

type StatementSectionProps = {
  title: string;
  items: TBEntry[];
  total: number;
  comparativeTotal: number;
  totalLabel: string;
  roundingBasis: AccountsRoundingBasis;
  showComparatives: boolean;
};

function StatementSection({ title, items, total, comparativeTotal, totalLabel, roundingBasis, showComparatives }: StatementSectionProps) {
  return (
    <>
      <TableRow className="bg-muted/50">
        <TableCell colSpan={showComparatives ? 3 : 2} className="text-xs font-semibold uppercase tracking-wide">{title}</TableCell>
      </TableRow>
      {items.map((entry) => (
        <TableRow key={`${entry.account_code}-${entry.account_name}`}>
          <TableCell className="pl-6 text-sm">{entry.account_name}</TableCell>
          <TableCell className="text-right font-mono text-sm">{formattedAmount(Math.abs(currentBalance(entry)), roundingBasis)}</TableCell>
          {showComparatives && <TableCell className="text-right font-mono text-sm text-muted-foreground">{formattedAmount(Math.abs(comparativeBalance(entry)), roundingBasis)}</TableCell>}
        </TableRow>
      ))}
      <TableRow className="border-t-2">
        <TableCell className="text-sm font-semibold">{totalLabel}</TableCell>
        <TableCell className="text-right font-mono text-sm font-semibold">{formattedAmount(total, roundingBasis)}</TableCell>
        {showComparatives && <TableCell className="text-right font-mono text-sm font-semibold text-muted-foreground">{formattedAmount(comparativeTotal, roundingBasis)}</TableCell>}
      </TableRow>
    </>
  );
}

export function FinancialStatementsStep({
  entries,
  entityType,
  standard,
  periodStart,
  periodEnd,
  clientName,
  roundingBasis = "pounds",
  comparativesRequired = true,
}: Props) {
  const byType = (type: string) => entries.filter((entry) => entry.account_type === type);
  const sum = (items: TBEntry[], balance: (entry: TBEntry) => number, absolute = false) =>
    items.reduce((total, entry) => total + (absolute ? Math.abs(balance(entry)) : balance(entry)), 0);

  const incomeEntries = byType("income");
  const costOfSalesEntries = entries.filter((entry) => entry.account_type === "expense" && entry.account_code.startsWith("5"));
  const overheadEntries = entries.filter((entry) => entry.account_type === "expense" && !entry.account_code.startsWith("5"));
  const assetEntries = byType("asset");
  const liabilityEntries = byType("liability");
  const equityEntries = byType("equity");

  const totalIncome = sum(incomeEntries, currentBalance, true);
  const comparativeIncome = sum(incomeEntries, comparativeBalance, true);
  const totalCostOfSales = sum(costOfSalesEntries, currentBalance);
  const comparativeCostOfSales = sum(costOfSalesEntries, comparativeBalance);
  const totalOverheads = sum(overheadEntries, currentBalance);
  const comparativeOverheads = sum(overheadEntries, comparativeBalance);
  const grossProfit = totalIncome - totalCostOfSales;
  const comparativeGrossProfit = comparativeIncome - comparativeCostOfSales;
  const netProfit = grossProfit - totalOverheads;
  const comparativeNetProfit = comparativeGrossProfit - comparativeOverheads;
  const totalAssets = sum(assetEntries, currentBalance);
  const comparativeAssets = sum(assetEntries, comparativeBalance);
  const totalLiabilities = sum(liabilityEntries, currentBalance, true);
  const comparativeLiabilities = sum(liabilityEntries, comparativeBalance, true);
  const totalEquity = sum(equityEntries, currentBalance, true);
  const comparativeEquity = sum(equityEntries, comparativeBalance, true);

  const formatDate = (date: string) => date
    ? new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
    : "";
  const previousPeriodEnd = new Date(periodStart);
  previousPeriodEnd.setDate(previousPeriodEnd.getDate() - 1);
  const previousLabel = previousPeriodEnd.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  const currentLabel = new Date(periodEnd).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  const unitLabel = roundingBasis === "thousands" ? "£000" : "£";
  const isSoleTrader = entityType === "sole_trader";
  const isPartnership = entityType === "partnership" || entityType === "llp";
  const columnSpan = comparativesRequired ? 3 : 2;

  const valueRow = (label: string, current: number, comparative: number, emphasis = false) => (
    <TableRow className={emphasis ? "border-t-2 bg-primary/10" : "bg-primary/5"}>
      <TableCell className={emphasis ? "text-base font-bold" : "font-bold"}>{label}</TableCell>
      <TableCell className={`text-right font-mono font-bold ${emphasis ? "text-base" : ""}`}>{formattedAmount(current, roundingBasis)}</TableCell>
      {comparativesRequired && <TableCell className={`text-right font-mono font-bold text-muted-foreground ${emphasis ? "text-base" : ""}`}>{formattedAmount(comparative, roundingBasis)}</TableCell>}
    </TableRow>
  );

  return (
    <Tabs defaultValue="interactive" className="space-y-4">
      <TabsList><TabsTrigger value="interactive">Interactive view</TabsTrigger><TabsTrigger value="pdf">PDF preview</TabsTrigger></TabsList>
      <TabsContent value="pdf">
        <AccountsPdfPreview entries={entries} entityType={entityType} standard={standard} periodStart={periodStart} periodEnd={periodEnd} clientName={clientName} roundingBasis={roundingBasis} comparativesRequired={comparativesRequired} />
        <p className="mt-2 text-center text-xs text-muted-foreground">Draft visual review only. A valid iXBRL package and provider acceptance remain separate gates.</p>
      </TabsContent>
      <TabsContent value="interactive">
        <div className="space-y-6">
          <div className="border-b pb-4 text-center">
            <h2 className="text-lg font-bold">{clientName}</h2>
            <p className="text-sm text-muted-foreground">{isSoleTrader ? "Statement of Income and Expenditure" : isPartnership ? "Partnership Trading Account" : "Profit and Loss Account"}</p>
            <p className="text-xs text-muted-foreground">For the period {formatDate(periodStart)} to {formatDate(periodEnd)}</p>
            <div className="mt-2 flex flex-wrap justify-center gap-2"><Badge variant="outline">{standard}</Badge><Badge variant="outline">Rounded to {unitLabel}</Badge></div>
          </div>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">{isSoleTrader ? "Income & Expenditure" : "Profit & Loss Account"}</CardTitle><CardDescription>Generated from the adjusted trial balance with consistent presentation rounding.</CardDescription></CardHeader>
            <CardContent className="overflow-x-auto">
              <Table className="min-w-[38rem]">
                <TableHeader><TableRow><TableHead>Account</TableHead><TableHead className="w-32 text-right">{currentLabel}<br />{unitLabel}</TableHead>{comparativesRequired && <TableHead className="w-32 text-right">{previousLabel}<br />{unitLabel}</TableHead>}</TableRow></TableHeader>
                <TableBody>
                  <StatementSection title={isSoleTrader ? "Income" : "Turnover"} items={incomeEntries} total={totalIncome} comparativeTotal={comparativeIncome} totalLabel="Total turnover" roundingBasis={roundingBasis} showComparatives={comparativesRequired} />
                  {costOfSalesEntries.length > 0 && <StatementSection title="Cost of sales" items={costOfSalesEntries} total={totalCostOfSales} comparativeTotal={comparativeCostOfSales} totalLabel="Total cost of sales" roundingBasis={roundingBasis} showComparatives={comparativesRequired} />}
                  {valueRow("Gross profit", grossProfit, comparativeGrossProfit)}
                  <StatementSection title={isSoleTrader ? "Allowable expenses" : "Administrative expenses"} items={overheadEntries} total={totalOverheads} comparativeTotal={comparativeOverheads} totalLabel="Total overheads" roundingBasis={roundingBasis} showComparatives={comparativesRequired} />
                  {valueRow(isSoleTrader ? "Net profit / (loss)" : "Net profit before tax", netProfit, comparativeNetProfit, true)}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">{isSoleTrader ? "Statement of Assets and Liabilities" : "Balance Sheet"}</CardTitle><CardDescription>As at {formatDate(periodEnd)}</CardDescription></CardHeader>
            <CardContent className="overflow-x-auto">
              <Table className="min-w-[38rem]">
                <TableHeader><TableRow><TableHead>Account</TableHead><TableHead className="w-32 text-right">{currentLabel}<br />{unitLabel}</TableHead>{comparativesRequired && <TableHead className="w-32 text-right">{previousLabel}<br />{unitLabel}</TableHead>}</TableRow></TableHeader>
                <TableBody>
                  <StatementSection title={isSoleTrader ? "Assets" : "Fixed & current assets"} items={assetEntries} total={totalAssets} comparativeTotal={comparativeAssets} totalLabel="Total assets" roundingBasis={roundingBasis} showComparatives={comparativesRequired} />
                  <StatementSection title="Liabilities" items={liabilityEntries} total={totalLiabilities} comparativeTotal={comparativeLiabilities} totalLabel="Total liabilities" roundingBasis={roundingBasis} showComparatives={comparativesRequired} />
                  {valueRow("Net assets", totalAssets - totalLiabilities, comparativeAssets - comparativeLiabilities)}
                  <StatementSection title={isSoleTrader ? "Capital" : isPartnership ? "Partners' capital" : "Capital & reserves"} items={equityEntries} total={totalEquity} comparativeTotal={comparativeEquity} totalLabel={isSoleTrader ? "Total capital" : "Total equity"} roundingBasis={roundingBasis} showComparatives={comparativesRequired} />
                  {valueRow("Total equity and current-period profit", totalEquity + netProfit, comparativeEquity + comparativeNetProfit, true)}
                  {(totalAssets - totalLiabilities !== totalEquity + netProfit) && <TableRow className="bg-destructive/5"><TableCell colSpan={columnSpan} className="text-xs font-medium text-destructive">Balance sheet reconciliation difference: {formattedAmount((totalAssets - totalLiabilities) - (totalEquity + netProfit), roundingBasis)}. Correct the trial-balance classification before approval.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </TabsContent>
    </Tabs>
  );
}
