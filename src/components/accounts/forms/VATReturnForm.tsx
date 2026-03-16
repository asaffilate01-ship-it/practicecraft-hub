import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

type FormRowProps = { box: string; label: string; value: string; readonly?: boolean; onChange?: (v: string) => void; highlight?: boolean };

const FormRow = ({ box, label, value, readonly, onChange, highlight }: FormRowProps) => (
  <div className={`grid grid-cols-12 gap-2 items-center py-1.5 border-b last:border-0 ${highlight ? 'bg-primary/5 rounded' : ''}`}>
    <div className="col-span-2">
      <Badge variant="outline" className="text-[10px] font-mono">{box}</Badge>
    </div>
    <div className="col-span-7">
      <Label className="text-xs font-medium">{label}</Label>
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
  periodStart?: string;
  periodEnd?: string;
  clientName?: string;
  vatNumber?: string;
};

export function VATReturnForm({ formData, onFormChange, periodStart, periodEnd, clientName, vatNumber }: Props) {
  const update = (key: string, val: string) => onFormChange({ ...formData, [key]: val });
  const g = (key: string, def = "0.00") => formData[key] || def;

  const box1 = parseFloat(g("vat_box1")) || 0;
  const box2 = parseFloat(g("vat_box2")) || 0;
  const box3 = box1 + box2;
  const box4 = parseFloat(g("vat_box4")) || 0;
  const box5 = Math.abs(box3 - box4);
  const box6 = parseFloat(g("vat_box6")) || 0;
  const box7 = parseFloat(g("vat_box7")) || 0;
  const box8 = parseFloat(g("vat_box8")) || 0;
  const box9 = parseFloat(g("vat_box9")) || 0;

  return (
    <div className="space-y-4">
      {/* VAT100 - Standard 9-Box Return */}
      <Card>
        <CardHeader className="pb-2">
          <div className="text-center">
            <CardTitle className="text-base">VAT100 — Value Added Tax Return</CardTitle>
            <CardDescription className="text-xs">HM Revenue & Customs — Making Tax Digital</CardDescription>
            <div className="flex justify-center gap-4 mt-2 text-xs">
              <span>Business: <strong>{clientName || "—"}</strong></span>
              <span>VAT No: <strong>{vatNumber || "—"}</strong></span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Period: {periodStart || "—"} to {periodEnd || "—"}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-1">
          <p className="text-xs font-semibold text-muted-foreground">VAT due</p>
          <FormRow box="Box 1" label="VAT due on sales and other outputs" value={g("vat_box1")} onChange={v => update("vat_box1", v)} />
          <FormRow box="Box 2" label="VAT due on acquisitions from EU" value={g("vat_box2")} onChange={v => update("vat_box2", v)} />
          <FormRow box="Box 3" label="Total VAT due (Box 1 + Box 2)" value={box3.toFixed(2)} readonly />
          <Separator className="my-2" />
          <p className="text-xs font-semibold text-muted-foreground">VAT reclaimed</p>
          <FormRow box="Box 4" label="VAT reclaimed on purchases and inputs" value={g("vat_box4")} onChange={v => update("vat_box4", v)} />
          <Separator className="my-2" />
          <FormRow box="Box 5" label={box3 >= box4 ? "Net VAT to pay HMRC" : "Net VAT to reclaim from HMRC"} value={box5.toFixed(2)} readonly highlight />
          <Separator className="my-2" />
          <p className="text-xs font-semibold text-muted-foreground">Sales and purchases (exc. VAT)</p>
          <FormRow box="Box 6" label="Total value of sales (exc. VAT)" value={g("vat_box6")} onChange={v => update("vat_box6", v)} />
          <FormRow box="Box 7" label="Total value of purchases (exc. VAT)" value={g("vat_box7")} onChange={v => update("vat_box7", v)} />
          <FormRow box="Box 8" label="Total value of supplies to EU (exc. VAT)" value={g("vat_box8")} onChange={v => update("vat_box8", v)} />
          <FormRow box="Box 9" label="Total value of acquisitions from EU (exc. VAT)" value={g("vat_box9")} onChange={v => update("vat_box9", v)} />
        </CardContent>
      </Card>

      {/* Supplementary VAT forms */}
      <Accordion type="multiple" className="space-y-2">
        {/* Fuel Scale Charge */}
        <AccordionItem value="fuel" className="border rounded-lg">
          <AccordionTrigger className="px-4 py-2 text-sm font-semibold">
            <div className="flex items-center gap-2">
              <Checkbox checked={g("vat_fuel_enabled") === "true"} onCheckedChange={c => update("vat_fuel_enabled", c ? "true" : "false")} />
              Fuel Scale Charge
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 space-y-1">
            <FormRow box="FSC1" label="Number of vehicles" value={g("vat_fsc1", "0")} onChange={v => update("vat_fsc1", v)} />
            <FormRow box="FSC2" label="CO2 band (g/km)" value={g("vat_fsc2", "")} onChange={v => update("vat_fsc2", v)} />
            <FormRow box="FSC3" label="Scale charge amount (per quarter)" value={g("vat_fsc3")} onChange={v => update("vat_fsc3", v)} />
            <FormRow box="FSC4" label="VAT on fuel scale charge" value={g("vat_fsc4")} onChange={v => update("vat_fsc4", v)} />
          </AccordionContent>
        </AccordionItem>

        {/* EC Sales List */}
        <AccordionItem value="ecsl" className="border rounded-lg">
          <AccordionTrigger className="px-4 py-2 text-sm font-semibold">
            <div className="flex items-center gap-2">
              <Checkbox checked={g("vat_ecsl_enabled") === "true"} onCheckedChange={c => update("vat_ecsl_enabled", c ? "true" : "false")} />
              EC Sales List (ECSL)
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 space-y-1">
            <p className="text-xs text-muted-foreground mb-2">Report supplies of goods/services to EU VAT-registered businesses (post-Brexit: Northern Ireland Protocol only)</p>
            <FormRow box="ECSL1" label="Total value of goods supplied" value={g("vat_ecsl1")} onChange={v => update("vat_ecsl1", v)} />
            <FormRow box="ECSL2" label="Total value of services supplied" value={g("vat_ecsl2")} onChange={v => update("vat_ecsl2", v)} />
            <FormRow box="ECSL3" label="Number of EU customers reported" value={g("vat_ecsl3", "0")} onChange={v => update("vat_ecsl3", v)} />
          </AccordionContent>
        </AccordionItem>

        {/* Intrastat */}
        <AccordionItem value="intrastat" className="border rounded-lg">
          <AccordionTrigger className="px-4 py-2 text-sm font-semibold">
            <div className="flex items-center gap-2">
              <Checkbox checked={g("vat_intrastat_enabled") === "true"} onCheckedChange={c => update("vat_intrastat_enabled", c ? "true" : "false")} />
              Intrastat Supplementary Declaration
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 space-y-1">
            <p className="text-xs text-muted-foreground mb-2">NI Protocol: Intrastat declarations for goods movements between NI and EU</p>
            <FormRow box="IS1" label="Total dispatches value" value={g("vat_is1")} onChange={v => update("vat_is1", v)} />
            <FormRow box="IS2" label="Total arrivals value" value={g("vat_is2")} onChange={v => update("vat_is2", v)} />
            <FormRow box="IS3" label="Commodity codes reported" value={g("vat_is3", "0")} onChange={v => update("vat_is3", v)} />
          </AccordionContent>
        </AccordionItem>

        {/* Flat Rate Scheme */}
        <AccordionItem value="frs" className="border rounded-lg">
          <AccordionTrigger className="px-4 py-2 text-sm font-semibold">
            <div className="flex items-center gap-2">
              <Checkbox checked={g("vat_frs_enabled") === "true"} onCheckedChange={c => update("vat_frs_enabled", c ? "true" : "false")} />
              Flat Rate Scheme (FRS) Calculation
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 space-y-1">
            <FormRow box="FRS1" label="Flat rate turnover (inc. VAT)" value={g("vat_frs1")} onChange={v => update("vat_frs1", v)} />
            <FormRow box="FRS2" label="Flat rate percentage (%)" value={g("vat_frs2", "0")} onChange={v => update("vat_frs2", v)} />
            <FormRow box="FRS3" label="VAT payable under FRS" value={g("vat_frs3")} onChange={v => update("vat_frs3", v)} />
            <FormRow box="FRS4" label="Capital goods scheme adjustment" value={g("vat_frs4")} onChange={v => update("vat_frs4", v)} />
          </AccordionContent>
        </AccordionItem>

        {/* Reverse Charge */}
        <AccordionItem value="rc" className="border rounded-lg">
          <AccordionTrigger className="px-4 py-2 text-sm font-semibold">
            <div className="flex items-center gap-2">
              <Checkbox checked={g("vat_rc_enabled") === "true"} onCheckedChange={c => update("vat_rc_enabled", c ? "true" : "false")} />
              Domestic Reverse Charge (CIS/Construction)
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 space-y-1">
            <p className="text-xs text-muted-foreground mb-2">VAT reverse charge for construction services</p>
            <FormRow box="RC1" label="Reverse charge supplies received" value={g("vat_rc1")} onChange={v => update("vat_rc1", v)} />
            <FormRow box="RC2" label="VAT on reverse charge (included in Box 1)" value={g("vat_rc2")} onChange={v => update("vat_rc2", v)} />
            <FormRow box="RC3" label="Reverse charge input VAT (included in Box 4)" value={g("vat_rc3")} onChange={v => update("vat_rc3", v)} />
          </AccordionContent>
        </AccordionItem>

        {/* Partial Exemption */}
        <AccordionItem value="pe" className="border rounded-lg">
          <AccordionTrigger className="px-4 py-2 text-sm font-semibold">
            <div className="flex items-center gap-2">
              <Checkbox checked={g("vat_pe_enabled") === "true"} onCheckedChange={c => update("vat_pe_enabled", c ? "true" : "false")} />
              Partial Exemption Calculation
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 space-y-1">
            <p className="text-xs text-muted-foreground mb-2">For businesses making both taxable and exempt supplies</p>
            <FormRow box="PE1" label="Total input VAT" value={g("vat_pe1")} onChange={v => update("vat_pe1", v)} />
            <FormRow box="PE2" label="Directly attributable to taxable supplies" value={g("vat_pe2")} onChange={v => update("vat_pe2", v)} />
            <FormRow box="PE3" label="Directly attributable to exempt supplies" value={g("vat_pe3")} onChange={v => update("vat_pe3", v)} />
            <FormRow box="PE4" label="Residual (non-attributable)" value={g("vat_pe4")} onChange={v => update("vat_pe4", v)} />
            <FormRow box="PE5" label="Taxable turnover %" value={g("vat_pe5", "0")} onChange={v => update("vat_pe5", v)} />
            <FormRow box="PE6" label="Recoverable residual VAT" value={g("vat_pe6")} onChange={v => update("vat_pe6", v)} />
            <FormRow box="PE7" label="Total recoverable input VAT" value={g("vat_pe7")} onChange={v => update("vat_pe7", v)} />
            <Separator className="my-2" />
            <p className="text-xs font-semibold text-muted-foreground">De minimis test</p>
            <div className="flex items-center gap-2 py-1">
              <Checkbox checked={g("vat_pe_deminimis") === "true"} onCheckedChange={c => update("vat_pe_deminimis", c ? "true" : "false")} />
              <Label className="text-xs">Exempt input VAT is de minimis (below £625/month)</Label>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Declaration */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Declaration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Checkbox checked={g("vat_declaration") === "true"} onCheckedChange={c => update("vat_declaration", c ? "true" : "false")} />
            <Label className="text-xs">I declare that the information given above is true and complete</Label>
          </div>
          <div className="bg-primary/10 rounded p-3">
            <div className="flex justify-between items-center">
              <span className="font-bold text-sm">{box3 >= box4 ? "Net VAT payable" : "Net VAT reclaimable"}</span>
              <span className="font-mono font-bold text-lg">£{box5.toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
