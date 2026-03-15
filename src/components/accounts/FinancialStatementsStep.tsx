import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AccountsPdfPreview } from "./AccountsPdfPreview";
import type { TBEntry } from "./TrialBalanceStep";

const pence = (v: number) => (v / 100).toFixed(2);

function netBalance(entry: TBEntry) {
  const dr = entry.debit_pence + entry.adjustment_debit_pence;
  const cr = entry.credit_pence + entry.adjustment_credit_pence;
  return dr - cr;
}

type Props = {
  entries: TBEntry[];
  entityType: string;
  standard: string;
  periodStart: string;
  periodEnd: string;
  clientName: string;
};

export function FinancialStatementsStep({ entries, entityType, standard, periodStart, periodEnd, clientName }: Props) {
  const byType = (type: string) => entries.filter(e => e.account_type === type);

  // Income = credit balance (negative net = income)
  const incomeEntries = byType("income");
  const totalIncome = incomeEntries.reduce((a, e) => a + Math.abs(netBalance(e)), 0);

  // COGS
  const cosEntries = entries.filter(e => e.account_type === "expense" && e.account_code.startsWith("5"));
  const totalCOS = cosEntries.reduce((a, e) => a + netBalance(e), 0);
  const grossProfit = totalIncome - totalCOS;

  // Overheads
  const overheadEntries = entries.filter(e => e.account_type === "expense" && !e.account_code.startsWith("5"));
  const totalOverheads = overheadEntries.reduce((a, e) => a + netBalance(e), 0);
  const netProfit = grossProfit - totalOverheads;

  // Balance Sheet
  const assetEntries = byType("asset");
  const liabilityEntries = byType("liability");
  const equityEntries = byType("equity");
  const totalAssets = assetEntries.reduce((a, e) => a + netBalance(e), 0);
  const totalLiabilities = liabilityEntries.reduce((a, e) => a + Math.abs(netBalance(e)), 0);
  const totalEquity = equityEntries.reduce((a, e) => a + Math.abs(netBalance(e)), 0);

  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "";

  const isSoleTrader = entityType === "sole_trader";
  const isPartnership = entityType === "partnership" || entityType === "llp";

  const Section = ({ title, items, total, totalLabel }: { title: string; items: TBEntry[]; total: number; totalLabel: string }) => (
    <>
      <TableRow className="bg-muted/50">
        <TableCell colSpan={2} className="font-semibold text-xs uppercase tracking-wide">{title}</TableCell>
      </TableRow>
      {items.map((e, i) => (
        <TableRow key={i}>
          <TableCell className="text-sm pl-6">{e.account_name}</TableCell>
          <TableCell className="text-sm text-right font-mono">{pence(Math.abs(netBalance(e)))}</TableCell>
        </TableRow>
      ))}
      <TableRow className="border-t-2">
        <TableCell className="text-sm font-semibold">{totalLabel}</TableCell>
        <TableCell className="text-sm text-right font-mono font-semibold">{pence(total)}</TableCell>
      </TableRow>
    </>
  );

  return (
    <div className="space-y-6">
      <div className="text-center border-b pb-4">
        <h2 className="text-lg font-bold">{clientName}</h2>
        <p className="text-sm text-muted-foreground">
          {isSoleTrader ? "Statement of Income and Expenditure" : isPartnership ? "Partnership Trading Account" : "Profit & Loss Account"}
        </p>
        <p className="text-xs text-muted-foreground">
          For the period {fmtDate(periodStart)} to {fmtDate(periodEnd)}
        </p>
        <Badge variant="outline" className="mt-1 text-xs">{standard}</Badge>
      </div>

      {/* P&L */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            {isSoleTrader ? "Income & Expenditure" : "Profit & Loss Account"}
          </CardTitle>
          <CardDescription className="text-xs">Auto-generated from adjusted trial balance</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account</TableHead>
                <TableHead className="text-right w-32">£</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <Section title={isSoleTrader ? "Income" : "Turnover"} items={incomeEntries} total={totalIncome} totalLabel="Total Turnover" />
              {cosEntries.length > 0 && (
                <Section title="Cost of Sales" items={cosEntries} total={totalCOS} totalLabel="Total Cost of Sales" />
              )}
              <TableRow className="bg-primary/5">
                <TableCell className="font-bold">Gross Profit</TableCell>
                <TableCell className="text-right font-mono font-bold">{pence(grossProfit)}</TableCell>
              </TableRow>
              <Section title={isSoleTrader ? "Allowable Expenses" : "Administrative Expenses"} items={overheadEntries} total={totalOverheads} totalLabel="Total Overheads" />
              <TableRow className="bg-primary/10 border-t-2">
                <TableCell className="font-bold text-base">
                  {isSoleTrader ? "Net Profit / (Loss)" : "Net Profit Before Tax"}
                </TableCell>
                <TableCell className={`text-right font-mono font-bold text-base ${netProfit < 0 ? "text-destructive" : ""}`}>
                  {netProfit < 0 ? `(${pence(Math.abs(netProfit))})` : pence(netProfit)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Balance Sheet */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            {isSoleTrader ? "Statement of Assets and Liabilities" : "Balance Sheet"}
          </CardTitle>
          <CardDescription className="text-xs">As at {fmtDate(periodEnd)}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account</TableHead>
                <TableHead className="text-right w-32">£</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <Section title={isSoleTrader ? "Assets" : "Fixed & Current Assets"} items={assetEntries} total={totalAssets} totalLabel="Total Assets" />
              <Section title="Liabilities" items={liabilityEntries} total={totalLiabilities} totalLabel="Total Liabilities" />
              <TableRow className="bg-primary/5">
                <TableCell className="font-bold">Net Assets</TableCell>
                <TableCell className="text-right font-mono font-bold">{pence(totalAssets - totalLiabilities)}</TableCell>
              </TableRow>
              <Section
                title={isSoleTrader ? "Capital" : isPartnership ? "Partners' Capital" : "Capital & Reserves"}
                items={equityEntries}
                total={totalEquity}
                totalLabel={isSoleTrader ? "Total Capital" : "Total Equity"}
              />
              <TableRow className="bg-muted/50">
                <TableCell className="text-sm font-semibold">Profit for the period</TableCell>
                <TableCell className="text-sm text-right font-mono font-semibold">{pence(netProfit)}</TableCell>
              </TableRow>
              <TableRow className="bg-primary/10 border-t-2">
                <TableCell className="font-bold text-base">Total Equity + Profit</TableCell>
                <TableCell className="text-right font-mono font-bold text-base">{pence(totalEquity + netProfit)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
