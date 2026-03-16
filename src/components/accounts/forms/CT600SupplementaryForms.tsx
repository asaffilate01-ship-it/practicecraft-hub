import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

type FormRowProps = { box: string; label: string; value: string; readonly?: boolean; onChange?: (v: string) => void };

const FormRow = ({ box, label, value, readonly, onChange }: FormRowProps) => (
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
        onChange={readonly ? undefined : (e) => onChange?.(e.target.value)}
      />
    </div>
  </div>
);

type Props = {
  formData: Record<string, string>;
  onFormChange: (data: Record<string, string>) => void;
};

export function CT600SupplementaryForms({ formData, onFormChange }: Props) {
  const update = (key: string, val: string) => onFormChange({ ...formData, [key]: val });
  const g = (key: string, def = "0.00") => formData[key] || def;

  return (
    <div className="space-y-4">
      <div className="text-center border-b pb-2">
        <h3 className="text-sm font-bold">CT600 Supplementary Pages</h3>
        <p className="text-[11px] text-muted-foreground">Complete applicable supplementary schedules</p>
      </div>

      <Accordion type="multiple" className="space-y-2">
        {/* CT600A - Loans to participators */}
        <AccordionItem value="ct600a" className="border rounded-lg">
          <AccordionTrigger className="px-4 py-2 text-sm font-semibold">
            <div className="flex items-center gap-2">
              <Checkbox checked={g("ct600a_enabled") === "true"} onCheckedChange={c => update("ct600a_enabled", c ? "true" : "false")} />
              CT600A — Loans to Participators (s.455)
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 space-y-1">
            <p className="text-xs text-muted-foreground mb-2">Close company loans to directors/shareholders under CTA 2010 s.455</p>
            <FormRow box="A1" label="Total loans outstanding at end of period" value={g("ct600a_a1")} onChange={v => update("ct600a_a1", v)} />
            <FormRow box="A5" label="Loans made in the period" value={g("ct600a_a5")} onChange={v => update("ct600a_a5", v)} />
            <FormRow box="A10" label="Loans repaid in the period" value={g("ct600a_a10")} onChange={v => update("ct600a_a10", v)} />
            <FormRow box="A15" label="Loans written off in the period" value={g("ct600a_a15")} onChange={v => update("ct600a_a15", v)} />
            <FormRow box="A20" label="Tax due on loans (s.455 @ 33.75%)" value={g("ct600a_a20")} onChange={v => update("ct600a_a20", v)} />
            <FormRow box="A25" label="Tax repayable on loans repaid" value={g("ct600a_a25")} onChange={v => update("ct600a_a25", v)} />
            <FormRow box="A30" label="Net s.455 tax due" value={g("ct600a_a30")} onChange={v => update("ct600a_a30", v)} />
          </AccordionContent>
        </AccordionItem>

        {/* CT600B - R&D */}
        <AccordionItem value="ct600b" className="border rounded-lg">
          <AccordionTrigger className="px-4 py-2 text-sm font-semibold">
            <div className="flex items-center gap-2">
              <Checkbox checked={g("ct600b_enabled") === "true"} onCheckedChange={c => update("ct600b_enabled", c ? "true" : "false")} />
              CT600B — R&D Enhanced Expenditure (Merged Scheme)
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 space-y-1">
            <p className="text-xs text-muted-foreground mb-2">Merged RDEC scheme from 1 April 2024</p>
            <FormRow box="B1" label="Total qualifying R&D expenditure" value={g("ct600b_b1")} onChange={v => update("ct600b_b1", v)} />
            <FormRow box="B5" label="Staff costs" value={g("ct600b_b5")} onChange={v => update("ct600b_b5", v)} />
            <FormRow box="B10" label="Externally provided workers" value={g("ct600b_b10")} onChange={v => update("ct600b_b10", v)} />
            <FormRow box="B15" label="Consumable items" value={g("ct600b_b15")} onChange={v => update("ct600b_b15", v)} />
            <FormRow box="B20" label="Software/Cloud computing" value={g("ct600b_b20")} onChange={v => update("ct600b_b20", v)} />
            <FormRow box="B25" label="Subcontracted R&D" value={g("ct600b_b25")} onChange={v => update("ct600b_b25", v)} />
            <Separator className="my-2" />
            <FormRow box="B30" label="RDEC credit @ 20%" value={g("ct600b_b30")} onChange={v => update("ct600b_b30", v)} />
            <FormRow box="B35" label="Net RDEC benefit" value={g("ct600b_b35")} onChange={v => update("ct600b_b35", v)} />
            <FormRow box="B40" label="R&D Intensive Relief (if eligible)" value={g("ct600b_b40")} onChange={v => update("ct600b_b40", v)} />
          </AccordionContent>
        </AccordionItem>

        {/* CT600C - Group & Consortium */}
        <AccordionItem value="ct600c" className="border rounded-lg">
          <AccordionTrigger className="px-4 py-2 text-sm font-semibold">
            <div className="flex items-center gap-2">
              <Checkbox checked={g("ct600c_enabled") === "true"} onCheckedChange={c => update("ct600c_enabled", c ? "true" : "false")} />
              CT600C — Group & Consortium Relief
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 space-y-1">
            <FormRow box="C1" label="Group relief claimed" value={g("ct600c_c1")} onChange={v => update("ct600c_c1", v)} />
            <FormRow box="C5" label="Group relief surrendered" value={g("ct600c_c5")} onChange={v => update("ct600c_c5", v)} />
            <FormRow box="C10" label="Consortium relief claimed" value={g("ct600c_c10")} onChange={v => update("ct600c_c10", v)} />
            <FormRow box="C15" label="Surrendering company name" value={g("ct600c_c15", "")} onChange={v => update("ct600c_c15", v)} />
            <FormRow box="C20" label="Surrendering company UTR" value={g("ct600c_c20", "")} onChange={v => update("ct600c_c20", v)} />
          </AccordionContent>
        </AccordionItem>

        {/* CT600D - Capital allowances */}
        <AccordionItem value="ct600d" className="border rounded-lg">
          <AccordionTrigger className="px-4 py-2 text-sm font-semibold">
            <div className="flex items-center gap-2">
              <Checkbox checked={g("ct600d_enabled") === "true"} onCheckedChange={c => update("ct600d_enabled", c ? "true" : "false")} />
              CT600D — Capital Allowances & Charges
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 space-y-1">
            <p className="text-xs font-semibold text-muted-foreground">Annual Investment Allowance (AIA)</p>
            <FormRow box="D1" label="Additions qualifying for AIA" value={g("ct600d_d1")} onChange={v => update("ct600d_d1", v)} />
            <FormRow box="D5" label="AIA claimed (max £1,000,000)" value={g("ct600d_d5")} onChange={v => update("ct600d_d5", v)} />
            <Separator className="my-2" />
            <p className="text-xs font-semibold text-muted-foreground">Full Expensing (from 1 April 2023)</p>
            <FormRow box="D10" label="Plant & machinery qualifying" value={g("ct600d_d10")} onChange={v => update("ct600d_d10", v)} />
            <FormRow box="D15" label="Full expensing claimed (100%)" value={g("ct600d_d15")} onChange={v => update("ct600d_d15", v)} />
            <FormRow box="D16" label="50% first-year allowance (special rate)" value={g("ct600d_d16")} onChange={v => update("ct600d_d16", v)} />
            <Separator className="my-2" />
            <p className="text-xs font-semibold text-muted-foreground">Writing Down Allowance (WDA)</p>
            <FormRow box="D20" label="Main pool b/f" value={g("ct600d_d20")} onChange={v => update("ct600d_d20", v)} />
            <FormRow box="D25" label="Main pool additions" value={g("ct600d_d25")} onChange={v => update("ct600d_d25", v)} />
            <FormRow box="D30" label="Main pool disposals" value={g("ct600d_d30")} onChange={v => update("ct600d_d30", v)} />
            <FormRow box="D35" label="Main pool WDA @ 18%" value={g("ct600d_d35")} onChange={v => update("ct600d_d35", v)} />
            <FormRow box="D40" label="Main pool c/f" value={g("ct600d_d40")} onChange={v => update("ct600d_d40", v)} />
            <Separator className="my-1" />
            <FormRow box="D45" label="Special rate pool b/f" value={g("ct600d_d45")} onChange={v => update("ct600d_d45", v)} />
            <FormRow box="D50" label="Special rate pool additions" value={g("ct600d_d50")} onChange={v => update("ct600d_d50", v)} />
            <FormRow box="D55" label="Special rate pool disposals" value={g("ct600d_d55")} onChange={v => update("ct600d_d55", v)} />
            <FormRow box="D60" label="Special rate WDA @ 6%" value={g("ct600d_d60")} onChange={v => update("ct600d_d60", v)} />
            <FormRow box="D65" label="Special rate pool c/f" value={g("ct600d_d65")} onChange={v => update("ct600d_d65", v)} />
            <Separator className="my-2" />
            <FormRow box="D70" label="Balancing allowances" value={g("ct600d_d70")} onChange={v => update("ct600d_d70", v)} />
            <FormRow box="D75" label="Balancing charges" value={g("ct600d_d75")} onChange={v => update("ct600d_d75", v)} />
            <FormRow box="D80" label="Total capital allowances" value={g("ct600d_d80")} onChange={v => update("ct600d_d80", v)} />
          </AccordionContent>
        </AccordionItem>

        {/* CT600E - Charities */}
        <AccordionItem value="ct600e" className="border rounded-lg">
          <AccordionTrigger className="px-4 py-2 text-sm font-semibold">
            <div className="flex items-center gap-2">
              <Checkbox checked={g("ct600e_enabled") === "true"} onCheckedChange={c => update("ct600e_enabled", c ? "true" : "false")} />
              CT600E — Charities & Community Amateur Sports Clubs
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 space-y-1">
            <FormRow box="E1" label="Income from charitable activities" value={g("ct600e_e1")} onChange={v => update("ct600e_e1", v)} />
            <FormRow box="E5" label="Income from non-charitable trading" value={g("ct600e_e5")} onChange={v => update("ct600e_e5", v)} />
            <FormRow box="E10" label="Income from property" value={g("ct600e_e10")} onChange={v => update("ct600e_e10", v)} />
            <FormRow box="E15" label="Total exempt income" value={g("ct600e_e15")} onChange={v => update("ct600e_e15", v)} />
            <FormRow box="E20" label="Non-exempt trading profits" value={g("ct600e_e20")} onChange={v => update("ct600e_e20", v)} />
          </AccordionContent>
        </AccordionItem>

        {/* CT600H - Cross-border */}
        <AccordionItem value="ct600h" className="border rounded-lg">
          <AccordionTrigger className="px-4 py-2 text-sm font-semibold">
            <div className="flex items-center gap-2">
              <Checkbox checked={g("ct600h_enabled") === "true"} onCheckedChange={c => update("ct600h_enabled", c ? "true" : "false")} />
              CT600H — Cross-Border Royalties
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 space-y-1">
            <FormRow box="H1" label="Royalties paid to non-residents" value={g("ct600h_h1")} onChange={v => update("ct600h_h1", v)} />
            <FormRow box="H5" label="Income tax deducted at source" value={g("ct600h_h5")} onChange={v => update("ct600h_h5", v)} />
            <FormRow box="H10" label="Treaty rate applied (%)" value={g("ct600h_h10", "")} onChange={v => update("ct600h_h10", v)} />
          </AccordionContent>
        </AccordionItem>

        {/* CT600I - Supplementary charge */}
        <AccordionItem value="ct600i" className="border rounded-lg">
          <AccordionTrigger className="px-4 py-2 text-sm font-semibold">
            <div className="flex items-center gap-2">
              <Checkbox checked={g("ct600i_enabled") === "true"} onCheckedChange={c => update("ct600i_enabled", c ? "true" : "false")} />
              CT600I — Supplementary Charge (Ring Fence)
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 space-y-1">
            <p className="text-xs text-muted-foreground mb-2">Oil & gas ring fence profits — rarely used for most practices</p>
            <FormRow box="I1" label="Ring fence trading profits" value={g("ct600i_i1")} onChange={v => update("ct600i_i1", v)} />
            <FormRow box="I5" label="Supplementary charge @ 10%" value={g("ct600i_i5")} onChange={v => update("ct600i_i5", v)} />
          </AccordionContent>
        </AccordionItem>

        {/* CT600J - Losses */}
        <AccordionItem value="ct600j" className="border rounded-lg">
          <AccordionTrigger className="px-4 py-2 text-sm font-semibold">
            <div className="flex items-center gap-2">
              <Checkbox checked={g("ct600j_enabled") === "true"} onCheckedChange={c => update("ct600j_enabled", c ? "true" : "false")} />
              CT600J — Losses, Deficits & Excess Amounts
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 space-y-1">
            <p className="text-xs font-semibold text-muted-foreground">Trading losses</p>
            <FormRow box="J1" label="Trading loss for the period" value={g("ct600j_j1")} onChange={v => update("ct600j_j1", v)} />
            <FormRow box="J5" label="Set off against current period profits" value={g("ct600j_j5")} onChange={v => update("ct600j_j5", v)} />
            <FormRow box="J10" label="Carry back to previous period" value={g("ct600j_j10")} onChange={v => update("ct600j_j10", v)} />
            <FormRow box="J15" label="Carry forward" value={g("ct600j_j15")} onChange={v => update("ct600j_j15", v)} />
            <Separator className="my-2" />
            <p className="text-xs font-semibold text-muted-foreground">Non-trading loan relationship deficits</p>
            <FormRow box="J20" label="Deficit for the period" value={g("ct600j_j20")} onChange={v => update("ct600j_j20", v)} />
            <FormRow box="J25" label="Set off against current period" value={g("ct600j_j25")} onChange={v => update("ct600j_j25", v)} />
            <FormRow box="J30" label="Carry back" value={g("ct600j_j30")} onChange={v => update("ct600j_j30", v)} />
            <FormRow box="J35" label="Carry forward" value={g("ct600j_j35")} onChange={v => update("ct600j_j35", v)} />
            <Separator className="my-2" />
            <p className="text-xs font-semibold text-muted-foreground">Capital losses</p>
            <FormRow box="J40" label="Capital losses this period" value={g("ct600j_j40")} onChange={v => update("ct600j_j40", v)} />
            <FormRow box="J45" label="Used against gains" value={g("ct600j_j45")} onChange={v => update("ct600j_j45", v)} />
            <FormRow box="J50" label="Carry forward" value={g("ct600j_j50")} onChange={v => update("ct600j_j50", v)} />
          </AccordionContent>
        </AccordionItem>

        {/* CT600L - Marginal Relief */}
        <AccordionItem value="ct600l" className="border rounded-lg">
          <AccordionTrigger className="px-4 py-2 text-sm font-semibold">
            <div className="flex items-center gap-2">
              <Checkbox checked={g("ct600l_enabled") === "true"} onCheckedChange={c => update("ct600l_enabled", c ? "true" : "false")} />
              CT600L — Marginal Relief Calculation
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 space-y-1">
            <p className="text-xs text-muted-foreground mb-2">For profits between £50,000 and £250,000 (from 1 April 2023)</p>
            <FormRow box="L1" label="Augmented profits" value={g("ct600l_l1")} onChange={v => update("ct600l_l1", v)} />
            <FormRow box="L5" label="Number of associated companies" value={g("ct600l_l5", "0")} onChange={v => update("ct600l_l5", v)} />
            <FormRow box="L10" label="Upper limit (adjusted)" value={g("ct600l_l10", "250000.00")} onChange={v => update("ct600l_l10", v)} />
            <FormRow box="L15" label="Lower limit (adjusted)" value={g("ct600l_l15", "50000.00")} onChange={v => update("ct600l_l15", v)} />
            <FormRow box="L20" label="HMRC fraction (3/200)" value={g("ct600l_l20", "0.015")} readonly />
            <FormRow box="L25" label="Marginal relief amount" value={g("ct600l_l25")} onChange={v => update("ct600l_l25", v)} />
            <FormRow box="L30" label="CT after marginal relief" value={g("ct600l_l30")} onChange={v => update("ct600l_l30", v)} />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
