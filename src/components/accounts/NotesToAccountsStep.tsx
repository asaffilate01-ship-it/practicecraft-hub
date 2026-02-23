import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { TBEntry } from "./TrialBalanceStep";
import type { FixedAsset } from "./FixedAssetScheduleStep";

const pence = (v: number) => (v / 100).toFixed(2);
function netBalance(e: TBEntry) {
  return (e.debit_pence + e.adjustment_debit_pence) - (e.credit_pence + e.adjustment_credit_pence);
}

export type NotesData = {
  accountingPolicies: string;
  basisOfPreparation: string;
  revenueRecognition: string;
  depreciationPolicy: string;
  goingConcern: string;
  employeesAvgNumber: string;
  employeesWagesCost: string;
  directorRemuneration: string;
  directorHighestPaid: string;
  relatedPartyTransactions: string;
  contingentLiabilities: string;
  postBalanceSheetEvents: string;
  operatingLeaseCommitments: string;
  dividendsPaidPence: number;
  dividendsProposedPence: number;
  debtorTradeNotes: string;
  creditorTradeNotes: string;
  loanNotes: string;
  shareCapitalNotes: string;
  customNotes: { title: string; body: string }[];
};

export const defaultNotesData: NotesData = {
  accountingPolicies: "The accounts have been prepared under the historical cost convention and in accordance with FRS 102 Section 1A — Small Entities.",
  basisOfPreparation: "The company has taken advantage of the exemptions available under FRS 102 Section 1A.",
  revenueRecognition: "Revenue is recognised when the company has fulfilled its performance obligations to its customers.",
  depreciationPolicy: "Depreciation is provided on all tangible fixed assets at rates calculated to write off the cost of each asset, less its estimated residual value, over its expected useful life:\n• Plant & Machinery: 25% reducing balance\n• Fixtures & Fittings: 15% straight line\n• Computer Equipment: 33% straight line\n• Motor Vehicles: 25% reducing balance",
  goingConcern: "The directors have a reasonable expectation that the company has adequate resources to continue in operational existence for the foreseeable future. The company therefore continues to adopt the going concern basis in preparing its financial statements.",
  employeesAvgNumber: "",
  employeesWagesCost: "",
  directorRemuneration: "",
  directorHighestPaid: "",
  relatedPartyTransactions: "There were no related party transactions during the period that require disclosure.",
  contingentLiabilities: "There were no contingent liabilities at the balance sheet date.",
  postBalanceSheetEvents: "There have been no significant events since the balance sheet date that require disclosure.",
  operatingLeaseCommitments: "",
  dividendsPaidPence: 0,
  dividendsProposedPence: 0,
  debtorTradeNotes: "",
  creditorTradeNotes: "",
  loanNotes: "",
  shareCapitalNotes: "",
  customNotes: [],
};

type Props = {
  notes: NotesData;
  onChange: (notes: NotesData) => void;
  entries: TBEntry[];
  assets: FixedAsset[];
  entityType: string;
  periodEnd: string;
  clientName: string;
  standard: string;
  monthsInPeriod: number;
};

export function NotesToAccountsStep({ notes, onChange, entries, assets, entityType, periodEnd, clientName, standard, monthsInPeriod }: Props) {
  const isLtd = entityType === "ltd" || entityType === "llp";
  const isSole = entityType === "sole_trader";

  const update = (field: keyof NotesData, value: any) => onChange({ ...notes, [field]: value });

  const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  // Auto-derive debtors/creditors from TB
  const debtorEntries = entries.filter(e => e.account_type === "asset" && (e.account_code.startsWith("11") || e.account_name.toLowerCase().includes("debtor") || e.account_name.toLowerCase().includes("receivable")));
  const creditorEntries = entries.filter(e => e.account_type === "liability" && (e.account_code.startsWith("20") || e.account_name.toLowerCase().includes("creditor") || e.account_name.toLowerCase().includes("payable")));

  const NoteSection = ({ number, title, children }: { number: number; title: string; children: React.ReactNode }) => (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] font-mono">Note {number}</Badge>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">{children}</CardContent>
    </Card>
  );

  const addCustomNote = () => {
    update("customNotes", [...notes.customNotes, { title: "", body: "" }]);
  };

  const updateCustomNote = (idx: number, field: "title" | "body", val: string) => {
    const updated = [...notes.customNotes];
    updated[idx] = { ...updated[idx], [field]: val };
    update("customNotes", updated);
  };

  const removeCustomNote = (idx: number) => {
    update("customNotes", notes.customNotes.filter((_, i) => i !== idx));
  };

  let noteNum = 0;

  return (
    <div className="space-y-4">
      <div className="text-center border-b pb-3">
        <h2 className="text-lg font-bold">{clientName}</h2>
        <p className="text-sm text-muted-foreground">Notes to the Financial Statements</p>
        <p className="text-xs text-muted-foreground">For the period ended {fmtDate(periodEnd)}</p>
        <Badge variant="outline" className="mt-1 text-xs">{standard}</Badge>
      </div>

      {/* Note 1: Accounting Policies */}
      <NoteSection number={++noteNum} title="Accounting Policies">
        <div className="space-y-2">
          <Label className="text-xs">Basis of Preparation</Label>
          <Textarea className="text-xs min-h-[60px]" value={notes.basisOfPreparation}
            onChange={(e) => update("basisOfPreparation", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">General Accounting Policies</Label>
          <Textarea className="text-xs min-h-[60px]" value={notes.accountingPolicies}
            onChange={(e) => update("accountingPolicies", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Revenue Recognition</Label>
          <Textarea className="text-xs min-h-[40px]" value={notes.revenueRecognition}
            onChange={(e) => update("revenueRecognition", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Depreciation Policy</Label>
          <Textarea className="text-xs min-h-[80px]" value={notes.depreciationPolicy}
            onChange={(e) => update("depreciationPolicy", e.target.value)} />
        </div>
      </NoteSection>

      {/* Note 2: Going Concern */}
      <NoteSection number={++noteNum} title="Going Concern">
        <Textarea className="text-xs min-h-[60px]" value={notes.goingConcern}
          onChange={(e) => update("goingConcern", e.target.value)} />
      </NoteSection>

      {/* Note 3: Fixed Assets (auto-derived) */}
      {assets.length > 0 && (
        <NoteSection number={++noteNum} title="Tangible Fixed Assets">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Asset</TableHead>
                <TableHead className="text-xs text-right">Cost £</TableHead>
                <TableHead className="text-xs text-right">Dep'n £</TableHead>
                <TableHead className="text-xs text-right">NBV £</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assets.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="text-xs">{a.description || a.category}</TableCell>
                  <TableCell className="text-xs text-right font-mono">{pence(a.costPence)}</TableCell>
                  <TableCell className="text-xs text-right font-mono">{pence(a.bfDepreciationPence)}</TableCell>
                  <TableCell className="text-xs text-right font-mono">{pence(a.costPence - a.bfDepreciationPence)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </NoteSection>
      )}

      {/* Note 4: Debtors */}
      {debtorEntries.length > 0 && (
        <NoteSection number={++noteNum} title="Debtors">
          <Table>
            <TableBody>
              {debtorEntries.map((e, i) => (
                <TableRow key={i}>
                  <TableCell className="text-xs">{e.account_name}</TableCell>
                  <TableCell className="text-xs text-right font-mono">£{pence(Math.abs(netBalance(e)))}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Textarea className="text-xs min-h-[30px]" placeholder="Additional notes on debtors..."
            value={notes.debtorTradeNotes} onChange={(e) => update("debtorTradeNotes", e.target.value)} />
        </NoteSection>
      )}

      {/* Note 5: Creditors */}
      {creditorEntries.length > 0 && (
        <NoteSection number={++noteNum} title="Creditors: Amounts Falling Due Within One Year">
          <Table>
            <TableBody>
              {creditorEntries.map((e, i) => (
                <TableRow key={i}>
                  <TableCell className="text-xs">{e.account_name}</TableCell>
                  <TableCell className="text-xs text-right font-mono">£{pence(Math.abs(netBalance(e)))}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Textarea className="text-xs min-h-[30px]" placeholder="Additional notes on creditors..."
            value={notes.creditorTradeNotes} onChange={(e) => update("creditorTradeNotes", e.target.value)} />
        </NoteSection>
      )}

      {/* Employees */}
      <NoteSection number={++noteNum} title="Employees">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Average number of employees</Label>
            <Input className="h-8 text-xs" value={notes.employeesAvgNumber}
              onChange={(e) => update("employeesAvgNumber", e.target.value)} placeholder="e.g. 5" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Total wages & salaries cost (£)</Label>
            <Input className="h-8 text-xs" value={notes.employeesWagesCost}
              onChange={(e) => update("employeesWagesCost", e.target.value)} placeholder="e.g. 150,000" />
          </div>
        </div>
      </NoteSection>

      {/* Directors */}
      {isLtd && (
        <NoteSection number={++noteNum} title="Directors' Remuneration">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Total directors' remuneration (£)</Label>
              <Input className="h-8 text-xs" value={notes.directorRemuneration}
                onChange={(e) => update("directorRemuneration", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Highest paid director (£)</Label>
              <Input className="h-8 text-xs" value={notes.directorHighestPaid}
                onChange={(e) => update("directorHighestPaid", e.target.value)} />
            </div>
          </div>
        </NoteSection>
      )}

      {/* Share Capital (Ltd only) */}
      {isLtd && (
        <NoteSection number={++noteNum} title="Share Capital">
          <Textarea className="text-xs min-h-[40px]" value={notes.shareCapitalNotes}
            onChange={(e) => update("shareCapitalNotes", e.target.value)}
            placeholder="e.g. Authorised and issued: 100 ordinary shares of £1 each" />
        </NoteSection>
      )}

      {/* Dividends (Ltd only) */}
      {isLtd && (
        <NoteSection number={++noteNum} title="Dividends">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Dividends paid (£)</Label>
              <Input className="h-8 text-xs text-right" type="number" step="0.01"
                value={pence(notes.dividendsPaidPence)}
                onChange={(e) => update("dividendsPaidPence", Math.round(parseFloat(e.target.value || "0") * 100))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Dividends proposed (£)</Label>
              <Input className="h-8 text-xs text-right" type="number" step="0.01"
                value={pence(notes.dividendsProposedPence)}
                onChange={(e) => update("dividendsProposedPence", Math.round(parseFloat(e.target.value || "0") * 100))} />
            </div>
          </div>
        </NoteSection>
      )}

      {/* Related Parties */}
      <NoteSection number={++noteNum} title="Related Party Transactions">
        <Textarea className="text-xs min-h-[40px]" value={notes.relatedPartyTransactions}
          onChange={(e) => update("relatedPartyTransactions", e.target.value)} />
      </NoteSection>

      {/* Contingent Liabilities */}
      <NoteSection number={++noteNum} title="Contingent Liabilities">
        <Textarea className="text-xs min-h-[30px]" value={notes.contingentLiabilities}
          onChange={(e) => update("contingentLiabilities", e.target.value)} />
      </NoteSection>

      {/* Post Balance Sheet Events */}
      <NoteSection number={++noteNum} title="Post Balance Sheet Events">
        <Textarea className="text-xs min-h-[30px]" value={notes.postBalanceSheetEvents}
          onChange={(e) => update("postBalanceSheetEvents", e.target.value)} />
      </NoteSection>

      {/* Operating Lease Commitments */}
      <NoteSection number={++noteNum} title="Operating Lease Commitments">
        <Textarea className="text-xs min-h-[30px]" value={notes.operatingLeaseCommitments}
          onChange={(e) => update("operatingLeaseCommitments", e.target.value)}
          placeholder="Details of any operating lease commitments..." />
      </NoteSection>

      {/* Custom Notes */}
      {notes.customNotes.map((cn, idx) => (
        <NoteSection key={idx} number={++noteNum} title={cn.title || `Custom Note ${idx + 1}`}>
          <div className="space-y-2">
            <Input className="h-8 text-xs" placeholder="Note title..." value={cn.title}
              onChange={(e) => updateCustomNote(idx, "title", e.target.value)} />
            <Textarea className="text-xs min-h-[40px]" placeholder="Note content..."
              value={cn.body} onChange={(e) => updateCustomNote(idx, "body", e.target.value)} />
            <button className="text-xs text-destructive underline" onClick={() => removeCustomNote(idx)}>
              Remove this note
            </button>
          </div>
        </NoteSection>
      ))}

      <div className="flex justify-center">
        <button className="text-xs text-primary underline" onClick={addCustomNote}>
          + Add custom note
        </button>
      </div>
    </div>
  );
}
