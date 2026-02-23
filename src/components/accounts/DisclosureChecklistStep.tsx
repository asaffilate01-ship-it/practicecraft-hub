import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

type ChecklistItem = { key: string; label: string; required?: boolean };

const LTD_DISCLOSURES: ChecklistItem[] = [
  { key: "accounting_policies", label: "Accounting policies note drafted", required: true },
  { key: "turnover_analysis", label: "Turnover analysis / revenue recognition reviewed" },
  { key: "director_remuneration", label: "Directors' remuneration disclosed" },
  { key: "director_loans", label: "Director loan account reviewed (S455 check)" },
  { key: "related_parties", label: "Related party transactions disclosed", required: true },
  { key: "fixed_assets", label: "Fixed assets schedule & depreciation reviewed" },
  { key: "debtors_creditors", label: "Debtors / creditors agree to TB" },
  { key: "bank_reconciliation", label: "Bank reconciliation agrees to year-end statement" },
  { key: "vat_reconciliation", label: "VAT control account reconciled" },
  { key: "paye_reconciliation", label: "PAYE/NIC control reconciled to P35/FPS" },
  { key: "corporation_tax", label: "Corporation tax computation & provision reviewed" },
  { key: "going_concern", label: "Going concern assessment completed", required: true },
  { key: "events_after_reporting", label: "Post balance sheet events considered", required: true },
  { key: "micro_exemptions", label: "Micro/small entity exemptions applied (if applicable)" },
  { key: "comparative_figures", label: "Comparative figures agree to prior year filed accounts" },
  { key: "engagement_letter", label: "Engagement letter on file and in date" },
  { key: "anti_money_laundering", label: "AML checks current" },
];

const SOLE_DISCLOSURES: ChecklistItem[] = [
  { key: "income_complete", label: "All income sources identified and recorded", required: true },
  { key: "expenses_allowable", label: "Private use adjustments made where needed" },
  { key: "capital_allowances", label: "Capital allowances computed (AIA, WDA)" },
  { key: "use_of_home", label: "Use of home as office — basis confirmed" },
  { key: "motor_expenses", label: "Motor expenses — actual or mileage" },
  { key: "bank_reconciled", label: "Business bank account reconciled" },
  { key: "cash_basis", label: "Cash basis vs accruals — election confirmed" },
  { key: "class2_nic", label: "Class 2 NIC liability noted" },
  { key: "student_loan", label: "Student loan repayment plan checked" },
  { key: "poa_reviewed", label: "Payments on Account reviewed" },
];

const PARTNERSHIP_DISCLOSURES: ChecklistItem[] = [
  { key: "partnership_agreement", label: "Partnership agreement on file", required: true },
  { key: "profit_share", label: "Profit sharing ratios confirmed with all partners", required: true },
  { key: "capital_accounts", label: "Capital account movements reconciled" },
  { key: "partner_loans", label: "Partner loans / drawings reviewed" },
  { key: "partner_sa", label: "Individual partner SA returns prepared" },
  { key: "salaried_member", label: "Salaried member rules checked (LLPs)", },
  ...SOLE_DISCLOSURES.filter(d => !["class2_nic", "student_loan", "poa_reviewed", "cash_basis"].includes(d.key)),
];

type Props = {
  entityType: string;
  checks: Record<string, boolean>;
  notes: Record<string, string>;
  onCheckChange: (checks: Record<string, boolean>) => void;
  onNotesChange: (notes: Record<string, string>) => void;
};

export function DisclosureChecklistStep({ entityType, checks, notes, onCheckChange, onNotesChange }: Props) {
  const items = entityType === "sole_trader"
    ? SOLE_DISCLOSURES
    : (entityType === "partnership" || entityType === "llp")
      ? PARTNERSHIP_DISCLOSURES
      : LTD_DISCLOSURES;

  const completed = items.filter(i => checks[i.key]).length;
  const requiredRemaining = items.filter(i => i.required && !checks[i.key]).length;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Disclosure & Review Checklist</CardTitle>
              <CardDescription className="text-xs">
                Complete all required items before filing. {entityType === "sole_trader" ? "SA preparation" : entityType === "partnership" || entityType === "llp" ? "Partnership accounts" : "Statutory accounts"}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Badge variant="outline" className="text-xs">{completed}/{items.length} completed</Badge>
              {requiredRemaining > 0 ? (
                <Badge variant="destructive" className="text-xs">{requiredRemaining} required remaining</Badge>
              ) : (
                <Badge className="text-xs bg-[hsl(var(--success))]">All required done</Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {items.map((item) => (
            <div key={item.key} className="border rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={checks[item.key] || false}
                  onCheckedChange={(v) => onCheckChange({ ...checks, [item.key]: !!v })}
                />
                <Label className="text-sm flex-1 cursor-pointer" onClick={() => onCheckChange({ ...checks, [item.key]: !checks[item.key] })}>
                  {item.label}
                </Label>
                {item.required && <Badge variant="outline" className="text-[10px] text-destructive border-destructive">Required</Badge>}
              </div>
              <Textarea
                className="text-xs min-h-[32px] resize-none"
                rows={1}
                placeholder="Notes…"
                value={notes[item.key] || ""}
                onChange={(e) => onNotesChange({ ...notes, [item.key]: e.target.value })}
              />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
