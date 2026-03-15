import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Printer, Download } from "lucide-react";
import type { TBEntry } from "./TrialBalanceStep";

const pence = (v: number) => `£${(v / 100).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function netBalance(entry: TBEntry) {
  return (entry.debit_pence + entry.adjustment_debit_pence) - (entry.credit_pence + entry.adjustment_credit_pence);
}

type Props = {
  entries: TBEntry[];
  entityType: string;
  standard: string;
  periodStart: string;
  periodEnd: string;
  clientName: string;
  companyNumber?: string;
};

export function AccountsPdfPreview({ entries, entityType, standard, periodStart, periodEnd, clientName, companyNumber }: Props) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html>
      <html><head><title>${clientName} - Accounts</title>
      <style>
        @page { margin: 2cm; size: A4; }
        body { font-family: 'Times New Roman', serif; font-size: 11pt; color: #111; line-height: 1.4; }
        h1 { font-size: 16pt; text-align: center; margin-bottom: 4pt; }
        h2 { font-size: 13pt; text-align: center; margin: 0; color: #444; }
        h3 { font-size: 12pt; margin-top: 18pt; border-bottom: 1pt solid #ccc; padding-bottom: 4pt; }
        .meta { text-align: center; font-size: 9pt; color: #666; margin-bottom: 20pt; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 12pt; }
        th { text-align: left; font-size: 9pt; text-transform: uppercase; letter-spacing: 0.5pt; border-bottom: 2pt solid #333; padding: 4pt 8pt; }
        th.amt { text-align: right; }
        td { padding: 3pt 8pt; font-size: 10pt; border-bottom: 0.5pt solid #eee; }
        td.amt { text-align: right; font-family: 'Courier New', monospace; }
        tr.section td { font-weight: bold; background: #f5f5f5; font-size: 9pt; text-transform: uppercase; letter-spacing: 0.3pt; }
        tr.subtotal td { border-top: 1pt solid #999; font-weight: bold; }
        tr.total td { border-top: 2pt solid #333; border-bottom: 2pt double #333; font-weight: bold; font-size: 11pt; }
        .negative { color: #c00; }
        .footer { margin-top: 30pt; font-size: 8pt; color: #999; text-align: center; border-top: 0.5pt solid #ccc; padding-top: 6pt; }
      </style></head><body>${content.innerHTML}
      <div class="footer">Produced by IQ Practice Cloud &bull; ${standard} &bull; Draft</div>
      </body></html>
    `);
    win.document.close();
    win.print();
  };

  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "";
  const isSoleTrader = entityType === "sole_trader";
  const isPartnership = entityType === "partnership" || entityType === "llp";

  const byType = (type: string) => entries.filter(e => e.account_type === type);
  const incomeEntries = byType("income");
  const totalIncome = incomeEntries.reduce((a, e) => a + Math.abs(netBalance(e)), 0);
  const cosEntries = entries.filter(e => e.account_type === "expense" && e.account_code.startsWith("5"));
  const totalCOS = cosEntries.reduce((a, e) => a + netBalance(e), 0);
  const grossProfit = totalIncome - totalCOS;
  const overheadEntries = entries.filter(e => e.account_type === "expense" && !e.account_code.startsWith("5"));
  const totalOverheads = overheadEntries.reduce((a, e) => a + netBalance(e), 0);
  const netProfit = grossProfit - totalOverheads;
  const assetEntries = byType("asset");
  const liabilityEntries = byType("liability");
  const equityEntries = byType("equity");
  const totalAssets = assetEntries.reduce((a, e) => a + netBalance(e), 0);
  const totalLiabilities = liabilityEntries.reduce((a, e) => a + Math.abs(netBalance(e)), 0);
  const totalEquity = equityEntries.reduce((a, e) => a + Math.abs(netBalance(e)), 0);

  const renderSection = (title: string, items: TBEntry[], total: number, totalLabel: string) => (
    <>
      <tr className="section"><td colSpan={2}>{title}</td></tr>
      {items.map((e, i) => (
        <tr key={i}><td style={{ paddingLeft: "24pt" }}>{e.account_name}</td><td className="amt">{pence(Math.abs(netBalance(e)))}</td></tr>
      ))}
      <tr className="subtotal"><td>{totalLabel}</td><td className="amt">{pence(total)}</td></tr>
    </>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground">PDF Preview</h3>
        <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2">
          <Printer className="w-4 h-4" /> Print / Save PDF
        </Button>
      </div>

      <Card className="border-2 shadow-lg">
        <CardContent className="p-8" ref={printRef}>
          <h1>{clientName}</h1>
          {companyNumber && <h2>Company Number: {companyNumber}</h2>}
          <h2>{isSoleTrader ? "Statement of Income and Expenditure" : isPartnership ? "Partnership Trading Account" : "Report and Financial Statements"}</h2>
          <div className="meta">
            For the period {fmtDate(periodStart)} to {fmtDate(periodEnd)} &bull; {standard} &bull; DRAFT
          </div>

          <h3>{isSoleTrader ? "Income & Expenditure Account" : "Profit and Loss Account"}</h3>
          <table>
            <thead><tr><th>Account</th><th className="amt">£</th></tr></thead>
            <tbody>
              {renderSection(isSoleTrader ? "Income" : "Turnover", incomeEntries, totalIncome, "Total Turnover")}
              {cosEntries.length > 0 && renderSection("Cost of Sales", cosEntries, totalCOS, "Total Cost of Sales")}
              <tr className="subtotal"><td>Gross Profit</td><td className="amt">{pence(grossProfit)}</td></tr>
              {renderSection(isSoleTrader ? "Allowable Expenses" : "Administrative Expenses", overheadEntries, totalOverheads, "Total Overheads")}
              <tr className="total">
                <td>{isSoleTrader ? "Net Profit / (Loss)" : "Net Profit Before Tax"}</td>
                <td className={`amt ${netProfit < 0 ? "negative" : ""}`}>
                  {netProfit < 0 ? `(${pence(Math.abs(netProfit))})` : pence(netProfit)}
                </td>
              </tr>
            </tbody>
          </table>

          <h3>{isSoleTrader ? "Statement of Assets and Liabilities" : "Balance Sheet"}</h3>
          <table>
            <thead><tr><th>Account</th><th className="amt">£</th></tr></thead>
            <tbody>
              {renderSection(isSoleTrader ? "Assets" : "Fixed & Current Assets", assetEntries, totalAssets, "Total Assets")}
              {renderSection("Liabilities", liabilityEntries, totalLiabilities, "Total Liabilities")}
              <tr className="subtotal"><td>Net Assets</td><td className="amt">{pence(totalAssets - totalLiabilities)}</td></tr>
              {renderSection(
                isSoleTrader ? "Capital" : isPartnership ? "Partners' Capital" : "Capital & Reserves",
                equityEntries, totalEquity,
                isSoleTrader ? "Total Capital" : "Total Equity"
              )}
              <tr><td>Profit for the period</td><td className="amt">{pence(netProfit)}</td></tr>
              <tr className="total"><td>Total Equity + Profit</td><td className="amt">{pence(totalEquity + netProfit)}</td></tr>
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
