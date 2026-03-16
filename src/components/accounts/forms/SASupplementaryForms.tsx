import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  entityType: string;
};

export function SASupplementaryForms({ formData, onFormChange, entityType }: Props) {
  const update = (key: string, val: string) => onFormChange({ ...formData, [key]: val });
  const g = (key: string, def = "0.00") => formData[key] || def;

  return (
    <div className="space-y-4">
      <div className="text-center border-b pb-2">
        <h3 className="text-sm font-bold">SA Supplementary Pages</h3>
        <p className="text-[11px] text-muted-foreground">Select and complete applicable supplementary forms</p>
      </div>

      <Accordion type="multiple" className="space-y-2">
        {/* SA102 - Employment */}
        <AccordionItem value="sa102" className="border rounded-lg">
          <AccordionTrigger className="px-4 py-2 text-sm font-semibold">
            <div className="flex items-center gap-2">
              <Checkbox checked={g("sa102_enabled") === "true"} onCheckedChange={c => update("sa102_enabled", c ? "true" : "false")} />
              SA102 — Employment Income
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 space-y-1">
            <FormRow box="1" label="Pay from this employment" value={g("sa102_1")} onChange={v => update("sa102_1", v)} />
            <FormRow box="2" label="UK tax deducted" value={g("sa102_2")} onChange={v => update("sa102_2", v)} />
            <FormRow box="3" label="Tips and other payments not on P60" value={g("sa102_3")} onChange={v => update("sa102_3", v)} />
            <FormRow box="4" label="PAYE tax reference" value={g("sa102_4", "")} onChange={v => update("sa102_4", v)} />
            <FormRow box="5" label="Employer name" value={g("sa102_5", "")} onChange={v => update("sa102_5", v)} />
            <Separator className="my-2" />
            <FormRow box="6" label="Benefits and expenses from P11D" value={g("sa102_6")} onChange={v => update("sa102_6", v)} />
            <FormRow box="7" label="Expenses" value={g("sa102_7")} onChange={v => update("sa102_7", v)} />
            <FormRow box="8" label="Excess of allowable expenses" value={g("sa102_8")} onChange={v => update("sa102_8", v)} />
            <FormRow box="9" label="Lump sums and compensation" value={g("sa102_9")} onChange={v => update("sa102_9", v)} />
            <FormRow box="10" label="Tax deducted from lump sums" value={g("sa102_10")} onChange={v => update("sa102_10", v)} />
          </AccordionContent>
        </AccordionItem>

        {/* SA103S - Self-Employment (Short) */}
        <AccordionItem value="sa103s" className="border rounded-lg">
          <AccordionTrigger className="px-4 py-2 text-sm font-semibold">
            <div className="flex items-center gap-2">
              <Checkbox checked={g("sa103s_enabled") === "true"} onCheckedChange={c => update("sa103s_enabled", c ? "true" : "false")} />
              SA103S — Self-Employment (Short)
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 space-y-1">
            <FormRow box="9" label="Business name" value={g("sa103s_9", "")} onChange={v => update("sa103s_9", v)} />
            <FormRow box="10" label="Description of business" value={g("sa103s_10", "")} onChange={v => update("sa103s_10", v)} />
            <FormRow box="11" label="Postcode of business" value={g("sa103s_11", "")} onChange={v => update("sa103s_11", v)} />
            <FormRow box="14" label="Date started (if new)" value={g("sa103s_14", "")} onChange={v => update("sa103s_14", v)} />
            <Separator className="my-2" />
            <FormRow box="15" label="Turnover" value={g("sa103s_15")} onChange={v => update("sa103s_15", v)} />
            <FormRow box="17" label="Allowable expenses" value={g("sa103s_17")} onChange={v => update("sa103s_17", v)} />
            <FormRow box="20" label="Net profit" value={g("sa103s_20")} onChange={v => update("sa103s_20", v)} />
            <FormRow box="21" label="Net loss" value={g("sa103s_21")} onChange={v => update("sa103s_21", v)} />
            <FormRow box="22" label="CIS deductions" value={g("sa103s_22")} onChange={v => update("sa103s_22", v)} />
            <FormRow box="24" label="Disallowable expenses" value={g("sa103s_24")} onChange={v => update("sa103s_24", v)} />
            <FormRow box="25" label="Capital allowances" value={g("sa103s_25")} onChange={v => update("sa103s_25", v)} />
            <FormRow box="27" label="Total allowable expenses" value={g("sa103s_27")} onChange={v => update("sa103s_27", v)} />
            <FormRow box="29" label="Net business profit for tax" value={g("sa103s_29")} onChange={v => update("sa103s_29", v)} />
            <FormRow box="31" label="Losses brought forward" value={g("sa103s_31")} onChange={v => update("sa103s_31", v)} />
            <FormRow box="32" label="Taxable profit after losses" value={g("sa103s_32")} onChange={v => update("sa103s_32", v)} />
          </AccordionContent>
        </AccordionItem>

        {/* SA103F - Self-Employment (Full) */}
        <AccordionItem value="sa103f" className="border rounded-lg">
          <AccordionTrigger className="px-4 py-2 text-sm font-semibold">
            <div className="flex items-center gap-2">
              <Checkbox checked={g("sa103f_enabled") === "true"} onCheckedChange={c => update("sa103f_enabled", c ? "true" : "false")} />
              SA103F — Self-Employment (Full)
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 space-y-1">
            <p className="text-xs text-muted-foreground mb-2">Use full version for turnover &gt; £85,000 or complex businesses</p>
            <FormRow box="15" label="Turnover / Business income" value={g("sa103f_15")} onChange={v => update("sa103f_15", v)} />
            <FormRow box="16" label="Other business income" value={g("sa103f_16")} onChange={v => update("sa103f_16", v)} />
            <Separator className="my-2" />
            <p className="text-xs font-semibold text-muted-foreground">Expenses (itemised)</p>
            <FormRow box="17" label="Cost of goods" value={g("sa103f_17")} onChange={v => update("sa103f_17", v)} />
            <FormRow box="18" label="Construction industry subcontractor costs" value={g("sa103f_18")} onChange={v => update("sa103f_18", v)} />
            <FormRow box="19" label="Other direct costs" value={g("sa103f_19")} onChange={v => update("sa103f_19", v)} />
            <FormRow box="20" label="Employee costs" value={g("sa103f_20")} onChange={v => update("sa103f_20", v)} />
            <FormRow box="21" label="Premises costs" value={g("sa103f_21")} onChange={v => update("sa103f_21", v)} />
            <FormRow box="22" label="Repairs" value={g("sa103f_22")} onChange={v => update("sa103f_22", v)} />
            <FormRow box="23" label="General administrative expenses" value={g("sa103f_23")} onChange={v => update("sa103f_23", v)} />
            <FormRow box="24" label="Motor expenses" value={g("sa103f_24")} onChange={v => update("sa103f_24", v)} />
            <FormRow box="25" label="Travel and subsistence" value={g("sa103f_25")} onChange={v => update("sa103f_25", v)} />
            <FormRow box="26" label="Advertising and marketing" value={g("sa103f_26")} onChange={v => update("sa103f_26", v)} />
            <FormRow box="27" label="Entertainment" value={g("sa103f_27")} onChange={v => update("sa103f_27", v)} />
            <FormRow box="28" label="Interest and bank charges" value={g("sa103f_28")} onChange={v => update("sa103f_28", v)} />
            <FormRow box="29" label="Irrecoverable debts" value={g("sa103f_29")} onChange={v => update("sa103f_29", v)} />
            <FormRow box="30" label="Accountancy/professional fees" value={g("sa103f_30")} onChange={v => update("sa103f_30", v)} />
            <FormRow box="31" label="Depreciation and losses on sale" value={g("sa103f_31")} onChange={v => update("sa103f_31", v)} />
            <FormRow box="32" label="Other expenses" value={g("sa103f_32")} onChange={v => update("sa103f_32", v)} />
            <FormRow box="33" label="Total expenses" value={g("sa103f_33")} readonly />
            <Separator className="my-2" />
            <FormRow box="34" label="Net profit" value={g("sa103f_34")} onChange={v => update("sa103f_34", v)} />
            <FormRow box="38" label="Disallowable expenses" value={g("sa103f_38")} onChange={v => update("sa103f_38", v)} />
            <FormRow box="39" label="Capital allowances" value={g("sa103f_39")} onChange={v => update("sa103f_39", v)} />
            <FormRow box="41" label="Balancing charges" value={g("sa103f_41")} onChange={v => update("sa103f_41", v)} />
            <FormRow box="46" label="Adjusted profit" value={g("sa103f_46")} onChange={v => update("sa103f_46", v)} />
            <FormRow box="47" label="Losses brought forward" value={g("sa103f_47")} onChange={v => update("sa103f_47", v)} />
            <FormRow box="48" label="Taxable profit" value={g("sa103f_48")} onChange={v => update("sa103f_48", v)} />
          </AccordionContent>
        </AccordionItem>

        {/* SA104 - Partnership */}
        <AccordionItem value="sa104" className="border rounded-lg">
          <AccordionTrigger className="px-4 py-2 text-sm font-semibold">
            <div className="flex items-center gap-2">
              <Checkbox checked={g("sa104_enabled") === "true"} onCheckedChange={c => update("sa104_enabled", c ? "true" : "false")} />
              SA104 — Partnership
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 space-y-1">
            <FormRow box="1" label="Partnership name" value={g("sa104_1", "")} onChange={v => update("sa104_1", v)} />
            <FormRow box="2" label="Partnership UTR" value={g("sa104_2", "")} onChange={v => update("sa104_2", v)} />
            <FormRow box="3" label="Description of partnership trade" value={g("sa104_3", "")} onChange={v => update("sa104_3", v)} />
            <Separator className="my-2" />
            <FormRow box="7" label="Your share of profit (loss)" value={g("sa104_7")} onChange={v => update("sa104_7", v)} />
            <FormRow box="8" label="Adjustment (overlap profit)" value={g("sa104_8")} onChange={v => update("sa104_8", v)} />
            <FormRow box="9" label="Overlap relief used" value={g("sa104_9")} onChange={v => update("sa104_9", v)} />
            <FormRow box="10" label="Taxable profit" value={g("sa104_10")} onChange={v => update("sa104_10", v)} />
            <FormRow box="11" label="Your share of untaxed income" value={g("sa104_11")} onChange={v => update("sa104_11", v)} />
            <FormRow box="12" label="Your share of tax on untaxed income" value={g("sa104_12")} onChange={v => update("sa104_12", v)} />
            <FormRow box="22" label="Loss (to carry back/forward)" value={g("sa104_22")} onChange={v => update("sa104_22", v)} />
          </AccordionContent>
        </AccordionItem>

        {/* SA105 - UK Property */}
        <AccordionItem value="sa105" className="border rounded-lg">
          <AccordionTrigger className="px-4 py-2 text-sm font-semibold">
            <div className="flex items-center gap-2">
              <Checkbox checked={g("sa105_enabled") === "true"} onCheckedChange={c => update("sa105_enabled", c ? "true" : "false")} />
              SA105 — UK Property Income
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 space-y-1">
            <FormRow box="1" label="Total rents and other income" value={g("sa105_1")} onChange={v => update("sa105_1", v)} />
            <FormRow box="2" label="Tax deducted" value={g("sa105_2")} onChange={v => update("sa105_2", v)} />
            <FormRow box="3" label="Premiums for granting lease" value={g("sa105_3")} onChange={v => update("sa105_3", v)} />
            <Separator className="my-2" />
            <p className="text-xs font-semibold text-muted-foreground">Property expenses</p>
            <FormRow box="4" label="Rent, rates, insurance, ground rents" value={g("sa105_4")} onChange={v => update("sa105_4", v)} />
            <FormRow box="5" label="Repairs and maintenance" value={g("sa105_5")} onChange={v => update("sa105_5", v)} />
            <FormRow box="6" label="Finance charges (interest)" value={g("sa105_6")} onChange={v => update("sa105_6", v)} />
            <FormRow box="7" label="Legal and professional fees" value={g("sa105_7")} onChange={v => update("sa105_7", v)} />
            <FormRow box="8" label="Other allowable expenses" value={g("sa105_8")} onChange={v => update("sa105_8", v)} />
            <FormRow box="9" label="Total allowable expenses" value={g("sa105_9")} readonly />
            <Separator className="my-2" />
            <FormRow box="20" label="Taxable profit" value={g("sa105_20")} onChange={v => update("sa105_20", v)} />
            <FormRow box="21" label="Adjusted loss" value={g("sa105_21")} onChange={v => update("sa105_21", v)} />
            <FormRow box="24" label="Loss brought forward" value={g("sa105_24")} onChange={v => update("sa105_24", v)} />
            <FormRow box="25" label="Residential finance costs" value={g("sa105_25")} onChange={v => update("sa105_25", v)} />
          </AccordionContent>
        </AccordionItem>

        {/* SA106 - Foreign */}
        <AccordionItem value="sa106" className="border rounded-lg">
          <AccordionTrigger className="px-4 py-2 text-sm font-semibold">
            <div className="flex items-center gap-2">
              <Checkbox checked={g("sa106_enabled") === "true"} onCheckedChange={c => update("sa106_enabled", c ? "true" : "false")} />
              SA106 — Foreign Income
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 space-y-1">
            <FormRow box="1" label="Foreign interest (untaxed)" value={g("sa106_1")} onChange={v => update("sa106_1", v)} />
            <FormRow box="2" label="Foreign tax paid on interest" value={g("sa106_2")} onChange={v => update("sa106_2", v)} />
            <FormRow box="3" label="Foreign dividends" value={g("sa106_3")} onChange={v => update("sa106_3", v)} />
            <FormRow box="4" label="Foreign tax paid on dividends" value={g("sa106_4")} onChange={v => update("sa106_4", v)} />
            <FormRow box="5" label="Foreign property income" value={g("sa106_5")} onChange={v => update("sa106_5", v)} />
            <FormRow box="6" label="Foreign tax paid on property" value={g("sa106_6")} onChange={v => update("sa106_6", v)} />
            <FormRow box="7" label="Other overseas income" value={g("sa106_7")} onChange={v => update("sa106_7", v)} />
            <FormRow box="8" label="Foreign tax paid on other income" value={g("sa106_8")} onChange={v => update("sa106_8", v)} />
            <Separator className="my-2" />
            <FormRow box="20" label="Foreign Tax Credit Relief claimed" value={g("sa106_20")} onChange={v => update("sa106_20", v)} />
          </AccordionContent>
        </AccordionItem>

        {/* SA107 - Trusts */}
        <AccordionItem value="sa107" className="border rounded-lg">
          <AccordionTrigger className="px-4 py-2 text-sm font-semibold">
            <div className="flex items-center gap-2">
              <Checkbox checked={g("sa107_enabled") === "true"} onCheckedChange={c => update("sa107_enabled", c ? "true" : "false")} />
              SA107 — Trusts etc. Income
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 space-y-1">
            <FormRow box="1" label="Income from UK estates or trusts" value={g("sa107_1")} onChange={v => update("sa107_1", v)} />
            <FormRow box="2" label="Tax deducted" value={g("sa107_2")} onChange={v => update("sa107_2", v)} />
            <FormRow box="3" label="Income from foreign estates or trusts" value={g("sa107_3")} onChange={v => update("sa107_3", v)} />
            <FormRow box="4" label="Foreign tax paid" value={g("sa107_4")} onChange={v => update("sa107_4", v)} />
          </AccordionContent>
        </AccordionItem>

        {/* SA108 - Capital Gains */}
        <AccordionItem value="sa108" className="border rounded-lg">
          <AccordionTrigger className="px-4 py-2 text-sm font-semibold">
            <div className="flex items-center gap-2">
              <Checkbox checked={g("sa108_enabled") === "true"} onCheckedChange={c => update("sa108_enabled", c ? "true" : "false")} />
              SA108 — Capital Gains
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 space-y-1">
            <FormRow box="3" label="Number of disposals" value={g("sa108_3")} onChange={v => update("sa108_3", v)} />
            <FormRow box="4" label="Total proceeds" value={g("sa108_4")} onChange={v => update("sa108_4", v)} />
            <Separator className="my-2" />
            <p className="text-xs font-semibold text-muted-foreground">Listed shares and securities</p>
            <FormRow box="5" label="Gains" value={g("sa108_5")} onChange={v => update("sa108_5", v)} />
            <FormRow box="6" label="Losses" value={g("sa108_6")} onChange={v => update("sa108_6", v)} />
            <p className="text-xs font-semibold text-muted-foreground mt-2">Residential property</p>
            <FormRow box="7" label="Gains" value={g("sa108_7")} onChange={v => update("sa108_7", v)} />
            <FormRow box="8" label="Losses" value={g("sa108_8")} onChange={v => update("sa108_8", v)} />
            <FormRow box="9" label="CGT already paid on residential property" value={g("sa108_9")} onChange={v => update("sa108_9", v)} />
            <p className="text-xs font-semibold text-muted-foreground mt-2">Other assets</p>
            <FormRow box="11" label="Gains" value={g("sa108_11")} onChange={v => update("sa108_11", v)} />
            <FormRow box="12" label="Losses" value={g("sa108_12")} onChange={v => update("sa108_12", v)} />
            <Separator className="my-2" />
            <FormRow box="15" label="Total gains" value={g("sa108_15")} onChange={v => update("sa108_15", v)} />
            <FormRow box="16" label="Losses used against gains" value={g("sa108_16")} onChange={v => update("sa108_16", v)} />
            <FormRow box="17" label="Losses brought forward" value={g("sa108_17")} onChange={v => update("sa108_17", v)} />
            <FormRow box="21" label="Annual exempt amount used" value={g("sa108_21")} onChange={v => update("sa108_21", v)} />
            <FormRow box="22" label="Taxable gains" value={g("sa108_22")} onChange={v => update("sa108_22", v)} />
            <Separator className="my-2" />
            <p className="text-xs font-semibold text-muted-foreground">Reliefs</p>
            <FormRow box="23" label="Business Asset Disposal Relief (BADR)" value={g("sa108_23")} onChange={v => update("sa108_23", v)} />
            <FormRow box="24" label="Investors' Relief" value={g("sa108_24")} onChange={v => update("sa108_24", v)} />
            <FormRow box="25" label="EIS/SEIS deferral relief" value={g("sa108_25")} onChange={v => update("sa108_25", v)} />
          </AccordionContent>
        </AccordionItem>

        {/* SA109 - Residence */}
        <AccordionItem value="sa109" className="border rounded-lg">
          <AccordionTrigger className="px-4 py-2 text-sm font-semibold">
            <div className="flex items-center gap-2">
              <Checkbox checked={g("sa109_enabled") === "true"} onCheckedChange={c => update("sa109_enabled", c ? "true" : "false")} />
              SA109 — Residence, Remittance & Domicile
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 space-y-1">
            <div className="flex items-center gap-2 py-1">
              <Checkbox checked={g("sa109_resident") === "true"} onCheckedChange={c => update("sa109_resident", c ? "true" : "false")} />
              <Label className="text-xs">UK resident for tax year</Label>
            </div>
            <div className="flex items-center gap-2 py-1">
              <Checkbox checked={g("sa109_domiciled") === "true"} onCheckedChange={c => update("sa109_domiciled", c ? "true" : "false")} />
              <Label className="text-xs">UK domiciled</Label>
            </div>
            <div className="flex items-center gap-2 py-1">
              <Checkbox checked={g("sa109_remittance") === "true"} onCheckedChange={c => update("sa109_remittance", c ? "true" : "false")} />
              <Label className="text-xs">Claiming remittance basis</Label>
            </div>
            <FormRow box="14" label="Remittance basis charge" value={g("sa109_14")} onChange={v => update("sa109_14", v)} />
            <FormRow box="15" label="Number of years UK resident" value={g("sa109_15")} onChange={v => update("sa109_15", v)} />
          </AccordionContent>
        </AccordionItem>

        {/* SA110 - Tax Calculation */}
        <AccordionItem value="sa110" className="border rounded-lg">
          <AccordionTrigger className="px-4 py-2 text-sm font-semibold">
            <div className="flex items-center gap-2">
              <Checkbox checked={g("sa110_enabled") === "true"} onCheckedChange={c => update("sa110_enabled", c ? "true" : "false")} />
              SA110 — Tax Calculation Summary
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 space-y-1">
            <FormRow box="1" label="Total income" value={g("sa110_1")} onChange={v => update("sa110_1", v)} />
            <FormRow box="2" label="Personal allowance" value={g("sa110_2", "12570.00")} onChange={v => update("sa110_2", v)} />
            <FormRow box="3" label="Blind Person's Allowance" value={g("sa110_3")} onChange={v => update("sa110_3", v)} />
            <FormRow box="4" label="Married couple's allowance" value={g("sa110_4")} onChange={v => update("sa110_4", v)} />
            <FormRow box="5" label="Taxable income" value={g("sa110_5")} onChange={v => update("sa110_5", v)} />
            <Separator className="my-2" />
            <p className="text-xs font-semibold text-muted-foreground">Tax charged</p>
            <FormRow box="6" label="Tax @ basic rate 20%" value={g("sa110_6")} onChange={v => update("sa110_6", v)} />
            <FormRow box="7" label="Tax @ higher rate 40%" value={g("sa110_7")} onChange={v => update("sa110_7", v)} />
            <FormRow box="8" label="Tax @ additional rate 45%" value={g("sa110_8")} onChange={v => update("sa110_8", v)} />
            <FormRow box="9" label="Dividend tax @ basic 8.75%" value={g("sa110_9")} onChange={v => update("sa110_9", v)} />
            <FormRow box="10" label="Dividend tax @ higher 33.75%" value={g("sa110_10")} onChange={v => update("sa110_10", v)} />
            <FormRow box="11" label="Dividend tax @ additional 39.35%" value={g("sa110_11")} onChange={v => update("sa110_11", v)} />
            <FormRow box="12" label="CGT @ 10%/18%" value={g("sa110_12")} onChange={v => update("sa110_12", v)} />
            <FormRow box="13" label="CGT @ 20%/28%" value={g("sa110_13")} onChange={v => update("sa110_13", v)} />
            <Separator className="my-2" />
            <FormRow box="14" label="Total tax due" value={g("sa110_14")} onChange={v => update("sa110_14", v)} />
            <FormRow box="15" label="Class 4 NIC" value={g("sa110_15")} onChange={v => update("sa110_15", v)} />
            <FormRow box="16" label="Class 2 NIC" value={g("sa110_16")} onChange={v => update("sa110_16", v)} />
            <FormRow box="17" label="Student loan repayments" value={g("sa110_17")} onChange={v => update("sa110_17", v)} />
            <FormRow box="18" label="Tax deducted at source" value={g("sa110_18")} onChange={v => update("sa110_18", v)} />
            <FormRow box="19" label="Payments on account" value={g("sa110_19")} onChange={v => update("sa110_19", v)} />
            <Separator className="my-2" />
            <div className="bg-primary/10 rounded p-3">
              <FormRow box="20" label="Tax payable / (repayable)" value={g("sa110_20")} onChange={v => update("sa110_20", v)} />
            </div>
            <FormRow box="21" label="1st payment on account for next year" value={g("sa110_21")} onChange={v => update("sa110_21", v)} />
            <FormRow box="22" label="2nd payment on account for next year" value={g("sa110_22")} onChange={v => update("sa110_22", v)} />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
