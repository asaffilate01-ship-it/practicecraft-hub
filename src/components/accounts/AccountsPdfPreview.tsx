import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Printer } from "lucide-react";
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
  directorsReport?: any;
  notesData?: any;
};

export function AccountsPdfPreview({ entries, entityType, standard, periodStart, periodEnd, clientName, companyNumber, directorsReport, notesData }: Props) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html>
      <html><head><title>${clientName} - Statutory Accounts</title>
      <style>
        @page { margin: 2cm; size: A4; }
        @media print { .page-break { page-break-before: always; } }
        body { font-family: 'Times New Roman', Georgia, serif; font-size: 11pt; color: #111; line-height: 1.5; max-width: 700px; margin: 0 auto; }
        .cover { text-align: center; padding-top: 120pt; }
        .cover h1 { font-size: 22pt; margin-bottom: 6pt; letter-spacing: 1pt; text-transform: uppercase; }
        .cover h2 { font-size: 14pt; color: #444; margin: 4pt 0; }
        .cover .co-num { font-size: 11pt; color: #666; margin-top: 16pt; }
        .cover .period { font-size: 11pt; color: #666; margin-top: 8pt; }
        .cover .standard { font-size: 9pt; color: #999; margin-top: 24pt; border: 1pt solid #ccc; display: inline-block; padding: 3pt 10pt; }
        .section-title { font-size: 14pt; font-weight: bold; margin-top: 24pt; margin-bottom: 12pt; border-bottom: 2pt solid #333; padding-bottom: 6pt; }
        .sub-title { font-size: 12pt; font-weight: bold; margin-top: 18pt; margin-bottom: 6pt; }
        .report-para { margin-bottom: 10pt; text-align: justify; }
        .report-label { font-weight: bold; margin-top: 14pt; margin-bottom: 4pt; font-size: 10pt; text-transform: uppercase; letter-spacing: 0.3pt; }
        .signature-block { margin-top: 30pt; }
        .signature-line { border-bottom: 1pt solid #333; width: 200pt; display: inline-block; margin-top: 20pt; }
        .contents-table { width: 100%; margin-top: 20pt; }
        .contents-table td { padding: 6pt 0; border-bottom: 0.5pt dotted #999; }
        .contents-table td:last-child { text-align: right; }
        table.accounts { width: 100%; border-collapse: collapse; margin-bottom: 12pt; }
        table.accounts th { text-align: left; font-size: 9pt; text-transform: uppercase; letter-spacing: 0.5pt; border-bottom: 2pt solid #333; padding: 4pt 8pt; }
        table.accounts th.amt { text-align: right; }
        table.accounts td { padding: 3pt 8pt; font-size: 10pt; border-bottom: 0.5pt solid #eee; }
        table.accounts td.amt { text-align: right; font-family: 'Courier New', monospace; }
        table.accounts tr.section td { font-weight: bold; background: #f5f5f5; font-size: 9pt; text-transform: uppercase; letter-spacing: 0.3pt; }
        table.accounts tr.subtotal td { border-top: 1pt solid #999; font-weight: bold; }
        table.accounts tr.total td { border-top: 2pt solid #333; border-bottom: 2pt double #333; font-weight: bold; font-size: 11pt; }
        .negative { color: #c00; }
        .note-ref { font-size: 8pt; color: #666; vertical-align: super; }
        .footer { margin-top: 30pt; font-size: 8pt; color: #999; text-align: center; border-top: 0.5pt solid #ccc; padding-top: 6pt; }
        .bs-statement { font-style: italic; font-size: 10pt; margin-top: 16pt; border: 1pt solid #ddd; padding: 12pt; background: #fafafa; }
      </style></head><body>${content.innerHTML}
      <div class="footer">Produced by PracticeCraft &bull; ${standard} &bull; Draft — Subject to review</div>
      </body></html>
    `);
    win.document.close();
    setTimeout(() => win.print(), 300);
  };

  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "";
  const isSoleTrader = entityType === "sole_trader";
  const isPartnership = entityType === "partnership" || entityType === "llp";
  const isLtd = entityType === "ltd" || entityType === "llp";

  const byType = (type: string) => entries.filter(e => e.account_type === type);
  const incomeEntries = byType("income");
  const totalIncome = incomeEntries.reduce((a, e) => a + Math.abs(netBalance(e)), 0);
  const cosEntries = entries.filter(e => e.account_type === "expense" && e.account_code.startsWith("5"));
  const totalCOS = cosEntries.reduce((a, e) => a + netBalance(e), 0);
  const grossProfit = totalIncome - totalCOS;
  const overheadEntries = entries.filter(e => e.account_type === "expense" && !e.account_code.startsWith("5"));
  const totalOverheads = overheadEntries.reduce((a, e) => a + netBalance(e), 0);
  const netProfit = grossProfit - totalOverheads;

  // Balance Sheet breakdown
  const fixedAssetEntries = byType("asset").filter(e => e.account_code.startsWith("14"));
  const currentAssetEntries = byType("asset").filter(e => !e.account_code.startsWith("14"));
  const totalFixedAssets = fixedAssetEntries.reduce((a, e) => a + netBalance(e), 0);
  const totalCurrentAssets = currentAssetEntries.reduce((a, e) => a + netBalance(e), 0);
  const totalAssets = totalFixedAssets + totalCurrentAssets;

  const currentLiabilityEntries = byType("liability").filter(e => !e.account_code.startsWith("25"));
  const longTermLiabilityEntries = byType("liability").filter(e => e.account_code.startsWith("25"));
  const totalCurrentLiabilities = currentLiabilityEntries.reduce((a, e) => a + Math.abs(netBalance(e)), 0);
  const totalLongTermLiabilities = longTermLiabilityEntries.reduce((a, e) => a + Math.abs(netBalance(e)), 0);
  const netCurrentAssets = totalCurrentAssets - totalCurrentLiabilities;
  const totalNetAssets = totalFixedAssets + netCurrentAssets - totalLongTermLiabilities;

  const equityEntries = byType("equity");
  const totalEquity = equityEntries.reduce((a, e) => a + Math.abs(netBalance(e)), 0);

  const renderSection = (title: string, items: TBEntry[], total: number, totalLabel: string) => (
    <>
      <tr className="section"><td colSpan={3}>{title}</td></tr>
      {items.map((e, i) => (
        <tr key={i}><td style={{ paddingLeft: "24pt" }}>{e.account_name}</td><td></td><td className="amt">{pence(Math.abs(netBalance(e)))}</td></tr>
      ))}
      <tr className="subtotal"><td>{totalLabel}</td><td></td><td className="amt">{pence(total)}</td></tr>
    </>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground">Statutory Accounts Preview</h3>
        <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2">
          <Printer className="w-4 h-4" /> Print / Save PDF
        </Button>
      </div>

      <Card className="border-2 shadow-lg">
        <CardContent className="p-8 font-serif" ref={printRef}>
          {/* ═══ COVER PAGE ═══ */}
          <div className="cover">
            <h1>{clientName}</h1>
            {companyNumber && <div className="co-num">Registered Number: {companyNumber}</div>}
            <h2>{isSoleTrader ? "Unaudited Accounts" : isPartnership ? "Partnership Accounts" : "Unaudited Financial Statements"}</h2>
            <div className="period">For the period {fmtDate(periodStart)} to {fmtDate(periodEnd)}</div>
            <div className="standard">{standard}</div>
          </div>

          {/* ═══ CONTENTS ═══ */}
          <div className="page-break" />
          <div className="section-title">Contents</div>
          <table className="contents-table">
            <tbody>
              {isLtd && <tr><td>Company Information</td><td>1</td></tr>}
              <tr><td>Accountant's Report</td><td>2</td></tr>
              {isLtd && <tr><td>Directors' Report</td><td>3</td></tr>}
              <tr><td>{isSoleTrader ? "Income & Expenditure Account" : "Profit and Loss Account"}</td><td>{isLtd ? 4 : 3}</td></tr>
              <tr><td>{isSoleTrader ? "Statement of Assets & Liabilities" : "Balance Sheet"}</td><td>{isLtd ? 5 : 4}</td></tr>
              <tr><td>Notes to the Financial Statements</td><td>{isLtd ? 6 : 5}</td></tr>
              {!isSoleTrader && <tr><td>Detailed Profit and Loss Account</td><td>{isLtd ? 7 : 6}</td></tr>}
            </tbody>
          </table>

          {/* ═══ COMPANY INFORMATION ═══ */}
          {isLtd && (
            <>
              <div className="page-break" />
              <div className="section-title">Company Information</div>
              <table className="contents-table">
                <tbody>
                  {companyNumber && <tr><td><strong>Registered number</strong></td><td>{companyNumber}</td></tr>}
                  {directorsReport?.directors?.length > 0 && (
                    <tr><td><strong>Directors</strong></td><td>{directorsReport.directors.map((d: any) => d.name).filter(Boolean).join(", ") || "—"}</td></tr>
                  )}
                  <tr><td><strong>Accountants</strong></td><td>[Practice Name]</td></tr>
                </tbody>
              </table>
            </>
          )}

          {/* ═══ ACCOUNTANT'S REPORT ═══ */}
          <div className="page-break" />
          <div className="section-title">Chartered Accountant's Report to the {isLtd ? "Director(s)" : "Proprietor"}</div>
          <p className="report-para">
            In accordance with the engagement letter dated [date], we have compiled the financial statements of{" "}
            <strong>{clientName}</strong> for the period {fmtDate(periodStart)} to {fmtDate(periodEnd)}{" "}
            which comprise the {isSoleTrader ? "Income and Expenditure Account and Statement of Assets and Liabilities" : "Profit and Loss Account, Balance Sheet and the related notes"}.
          </p>
          <p className="report-para">
            As described on the Balance Sheet, the {isLtd ? "director(s) of the company are" : "proprietor is"} responsible for the preparation of the financial statements and for being satisfied that they give a true and fair view.
          </p>
          {isLtd && (
            <p className="report-para">
              We have not been instructed to carry out an audit or a review of the financial statements. For this reason, we have not verified the accuracy or completeness of the accounting records or information and explanations you have given to us, and we do not, therefore, express any opinion on the financial statements.
            </p>
          )}
          <div className="signature-block">
            <p>[Practice Name]</p>
            <p>Chartered Accountants</p>
            <p>[Address]</p>
            <p>Date: ........................</p>
          </div>

          {/* ═══ DIRECTORS' REPORT ═══ */}
          {isLtd && directorsReport && (
            <>
              <div className="page-break" />
              <div className="section-title">Directors' Report</div>
              <p className="report-para">
                The {entityType === "llp" ? "members" : "directors"} present their report and the financial statements of the company for the period {fmtDate(periodStart)} to {fmtDate(periodEnd)}.
              </p>
              {directorsReport.principalActivities && (
                <>
                  <div className="report-label">Principal Activities</div>
                  <p className="report-para">{directorsReport.principalActivities}</p>
                </>
              )}
              {directorsReport.directors?.length > 0 && (
                <>
                  <div className="report-label">Directors</div>
                  <p className="report-para">
                    The following directors held office during the period:
                  </p>
                  <ul style={{ marginLeft: "20pt" }}>
                    {directorsReport.directors.map((d: any, i: number) => (
                      <li key={i}>{d.name}{d.resignedDate ? ` (resigned ${fmtDate(d.resignedDate)})` : ""}</li>
                    ))}
                  </ul>
                </>
              )}
              {directorsReport.reviewOfBusiness && (
                <>
                  <div className="report-label">Review of Business</div>
                  <p className="report-para">{directorsReport.reviewOfBusiness}</p>
                </>
              )}
              {directorsReport.dividendsStatement && (
                <>
                  <div className="report-label">Dividends</div>
                  <p className="report-para">{directorsReport.dividendsStatement}</p>
                </>
              )}
              {directorsReport.auditExemption && (
                <>
                  <div className="report-label">Small Company Provisions</div>
                  <p className="report-para">{directorsReport.auditExemptionStatement}</p>
                </>
              )}
              <div className="signature-block">
                <p>Approved by the Board and signed on its behalf</p>
                <div className="signature-line" />
                <p>{directorsReport.approvedByDirector || "[Director Name]"}</p>
                <p>Date: {directorsReport.approvalDate ? fmtDate(directorsReport.approvalDate) : "........................"}</p>
              </div>
            </>
          )}

          {/* ═══ PROFIT & LOSS ═══ */}
          <div className="page-break" />
          <div className="section-title">{isSoleTrader ? "Income and Expenditure Account" : "Profit and Loss Account"}</div>
          <p style={{ fontSize: "9pt", color: "#666" }}>For the period {fmtDate(periodStart)} to {fmtDate(periodEnd)}</p>
          <table className="accounts">
            <thead><tr><th>Account</th><th className="amt">Note</th><th className="amt">£</th></tr></thead>
            <tbody>
              {renderSection(isSoleTrader ? "Income" : "Turnover", incomeEntries, totalIncome, "Total Turnover")}
              {cosEntries.length > 0 && renderSection("Cost of Sales", cosEntries, totalCOS, "Total Cost of Sales")}
              <tr className="subtotal"><td>Gross Profit</td><td></td><td className="amt">{pence(grossProfit)}</td></tr>
              {renderSection(isSoleTrader ? "Allowable Expenses" : "Administrative Expenses", overheadEntries, totalOverheads, "Total Administrative Expenses")}
              <tr className="total">
                <td>{isSoleTrader ? "Net Profit / (Loss)" : "Net Profit Before Taxation"}</td>
                <td></td>
                <td className={`amt ${netProfit < 0 ? "negative" : ""}`}>
                  {netProfit < 0 ? `(${pence(Math.abs(netProfit))})` : pence(netProfit)}
                </td>
              </tr>
            </tbody>
          </table>
          <p style={{ fontSize: "8pt", color: "#999", fontStyle: "italic" }}>
            The notes on pages {isLtd ? "6" : "5"} onwards form part of these financial statements.
          </p>

          {/* ═══ BALANCE SHEET ═══ */}
          <div className="page-break" />
          <div className="section-title">{isSoleTrader ? "Statement of Assets and Liabilities" : "Balance Sheet"}</div>
          <p style={{ fontSize: "9pt", color: "#666" }}>As at {fmtDate(periodEnd)}</p>
          <table className="accounts">
            <thead><tr><th>Account</th><th className="amt">Note</th><th className="amt">£</th></tr></thead>
            <tbody>
              {/* Fixed Assets */}
              {fixedAssetEntries.length > 0 && (
                <>
                  <tr className="section"><td colSpan={3}>Fixed Assets</td></tr>
                  {fixedAssetEntries.map((e, i) => (
                    <tr key={i}><td style={{ paddingLeft: "24pt" }}>{e.account_name}</td><td></td><td className="amt">{pence(netBalance(e))}</td></tr>
                  ))}
                  <tr className="subtotal"><td>Total Fixed Assets</td><td></td><td className="amt">{pence(totalFixedAssets)}</td></tr>
                </>
              )}

              {/* Current Assets */}
              <tr className="section"><td colSpan={3}>Current Assets</td></tr>
              {currentAssetEntries.map((e, i) => (
                <tr key={i}><td style={{ paddingLeft: "24pt" }}>{e.account_name}</td><td></td><td className="amt">{pence(netBalance(e))}</td></tr>
              ))}
              <tr className="subtotal"><td>Total Current Assets</td><td></td><td className="amt">{pence(totalCurrentAssets)}</td></tr>

              {/* Current Liabilities */}
              {currentLiabilityEntries.length > 0 && (
                <>
                  <tr className="section"><td colSpan={3}>Creditors: Amounts Falling Due Within One Year</td></tr>
                  {currentLiabilityEntries.map((e, i) => (
                    <tr key={i}><td style={{ paddingLeft: "24pt" }}>{e.account_name}</td><td></td><td className="amt">({pence(Math.abs(netBalance(e)))})</td></tr>
                  ))}
                  <tr className="subtotal"><td>Net Current Assets / (Liabilities)</td><td></td><td className="amt">{netCurrentAssets < 0 ? `(${pence(Math.abs(netCurrentAssets))})` : pence(netCurrentAssets)}</td></tr>
                </>
              )}

              {/* Long-term Liabilities */}
              {longTermLiabilityEntries.length > 0 && (
                <>
                  <tr className="section"><td colSpan={3}>Creditors: Amounts Falling Due After More Than One Year</td></tr>
                  {longTermLiabilityEntries.map((e, i) => (
                    <tr key={i}><td style={{ paddingLeft: "24pt" }}>{e.account_name}</td><td></td><td className="amt">({pence(Math.abs(netBalance(e)))})</td></tr>
                  ))}
                </>
              )}

              <tr className="total"><td>Total Net Assets</td><td></td><td className="amt">{pence(totalNetAssets)}</td></tr>

              {/* Capital & Reserves */}
              <tr className="section"><td colSpan={3}>{isSoleTrader ? "Capital" : isPartnership ? "Partners' Capital" : "Capital and Reserves"}</td></tr>
              {equityEntries.map((e, i) => (
                <tr key={i}><td style={{ paddingLeft: "24pt" }}>{e.account_name}</td><td></td><td className="amt">{pence(Math.abs(netBalance(e)))}</td></tr>
              ))}
              <tr><td style={{ paddingLeft: "24pt" }}>Profit for the financial period</td><td></td><td className="amt">{pence(netProfit)}</td></tr>
              <tr className="total">
                <td>{isSoleTrader ? "Total Capital" : "Total Shareholders' Funds"}</td>
                <td></td>
                <td className="amt">{pence(totalEquity + netProfit)}</td>
              </tr>
            </tbody>
          </table>

          {/* Balance Sheet approval statement */}
          <div className="bs-statement">
            {isLtd ? (
              <>
                <p>For the period ending {fmtDate(periodEnd)} the company was entitled to exemption from audit under section 477 of the Companies Act 2006.</p>
                <p style={{ marginTop: "8pt" }}>The members have not required the company to obtain an audit of its accounts for the period in question in accordance with section 476.</p>
                <p style={{ marginTop: "8pt" }}>The directors acknowledge their responsibilities for complying with the requirements of the Act with respect to accounting records and the preparation of accounts.</p>
                <p style={{ marginTop: "8pt" }}>These accounts were approved by the Board of Directors on {directorsReport?.approvalDate ? fmtDate(directorsReport.approvalDate) : "........................"} and signed on its behalf by:</p>
              </>
            ) : (
              <p>These accounts were approved on ........................</p>
            )}
            <div className="signature-block">
              <div className="signature-line" />
              <p>{directorsReport?.approvedByDirector || "[Director Name]"}, Director</p>
            </div>
          </div>

          {/* ═══ NOTES ═══ */}
          <div className="page-break" />
          <div className="section-title">Notes to the Financial Statements</div>
          
          <div className="sub-title">1. Accounting Policies</div>
          <div className="report-label">Basis of preparation</div>
          <p className="report-para">{notesData?.basisOfPreparation || "The accounts have been prepared under the historical cost convention and in accordance with " + standard + "."}</p>
          <div className="report-label">Revenue recognition</div>
          <p className="report-para">{notesData?.revenueRecognition || "Revenue is recognised when the company has fulfilled its performance obligations."}</p>
          <div className="report-label">Depreciation</div>
          <p className="report-para" style={{ whiteSpace: "pre-wrap" }}>{notesData?.depreciationPolicy || "Depreciation is provided at rates calculated to write off the cost of fixed assets over their expected useful lives."}</p>

          <div className="sub-title">2. Going Concern</div>
          <p className="report-para">{notesData?.goingConcern || "The directors have a reasonable expectation that the company has adequate resources to continue in operational existence for the foreseeable future."}</p>

          {notesData?.employeesAvgNumber && (
            <>
              <div className="sub-title">3. Employees</div>
              <p className="report-para">The average number of employees during the period was {notesData.employeesAvgNumber}.</p>
              {notesData.employeesWagesCost && <p className="report-para">Total wages and salaries cost: £{notesData.employeesWagesCost}</p>}
            </>
          )}

          <div className="sub-title">{notesData?.employeesAvgNumber ? "4" : "3"}. Related Party Transactions</div>
          <p className="report-para">{notesData?.relatedPartyTransactions || "There were no related party transactions during the period that require disclosure."}</p>

          <div className="sub-title">{notesData?.employeesAvgNumber ? "5" : "4"}. Post Balance Sheet Events</div>
          <p className="report-para">{notesData?.postBalanceSheetEvents || "There have been no significant events since the balance sheet date that require disclosure."}</p>

          {/* ═══ DETAILED P&L ═══ */}
          {!isSoleTrader && (
            <>
              <div className="page-break" />
              <div className="section-title">Detailed Profit and Loss Account</div>
              <p style={{ fontSize: "9pt", color: "#666" }}>For the period {fmtDate(periodStart)} to {fmtDate(periodEnd)}</p>
              <table className="accounts">
                <thead><tr><th>Account</th><th className="amt">£</th></tr></thead>
                <tbody>
                  <tr className="section"><td colSpan={2}>Turnover</td></tr>
                  {incomeEntries.map((e, i) => (
                    <tr key={i}><td style={{ paddingLeft: "24pt" }}>{e.account_name}</td><td className="amt">{pence(Math.abs(netBalance(e)))}</td></tr>
                  ))}
                  <tr className="subtotal"><td>Total Turnover</td><td className="amt">{pence(totalIncome)}</td></tr>

                  {cosEntries.length > 0 && (
                    <>
                      <tr className="section"><td colSpan={2}>Cost of Sales</td></tr>
                      {cosEntries.map((e, i) => (
                        <tr key={i}><td style={{ paddingLeft: "24pt" }}>{e.account_name}</td><td className="amt">{pence(netBalance(e))}</td></tr>
                      ))}
                      <tr className="subtotal"><td>Total Cost of Sales</td><td className="amt">{pence(totalCOS)}</td></tr>
                    </>
                  )}
                  <tr className="subtotal"><td><strong>Gross Profit</strong></td><td className="amt"><strong>{pence(grossProfit)}</strong></td></tr>

                  <tr className="section"><td colSpan={2}>Administrative Expenses</td></tr>
                  {overheadEntries.map((e, i) => (
                    <tr key={i}><td style={{ paddingLeft: "24pt" }}>{e.account_name}</td><td className="amt">{pence(netBalance(e))}</td></tr>
                  ))}
                  <tr className="subtotal"><td>Total Administrative Expenses</td><td className="amt">{pence(totalOverheads)}</td></tr>

                  <tr className="total">
                    <td>Net Profit Before Taxation</td>
                    <td className={`amt ${netProfit < 0 ? "negative" : ""}`}>
                      {netProfit < 0 ? `(${pence(Math.abs(netProfit))})` : pence(netProfit)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
