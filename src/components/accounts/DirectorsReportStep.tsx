import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2 } from "lucide-react";

export type DirectorsReportData = {
  principalActivities: string;
  directors: { name: string; appointedDate: string; resignedDate: string }[];
  reviewOfBusiness: string;
  dividendsStatement: string;
  futureOutlook: string;
  risksPrincipal: string;
  smallCompanyExemptions: boolean;
  auditExemption: boolean;
  auditExemptionStatement: string;
  approvedByDirector: string;
  approvalDate: string;
};

export const defaultDirectorsReportData: DirectorsReportData = {
  principalActivities: "",
  directors: [],
  reviewOfBusiness: "",
  dividendsStatement: "",
  futureOutlook: "The directors are satisfied with the current position and future prospects of the company.",
  risksPrincipal: "",
  smallCompanyExemptions: true,
  auditExemption: true,
  auditExemptionStatement: "The directors have taken advantage of the exemption from audit under section 477 of the Companies Act 2006.",
  approvedByDirector: "",
  approvalDate: "",
};

type Props = {
  data: DirectorsReportData;
  onChange: (data: DirectorsReportData) => void;
  clientName: string;
  periodStart: string;
  periodEnd: string;
  companyNumber?: string;
};

export function DirectorsReportStep({ data, onChange, clientName, periodStart, periodEnd, companyNumber }: Props) {
  const update = (field: keyof DirectorsReportData, value: any) => onChange({ ...data, [field]: value });
  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "";

  const addDirector = () => {
    update("directors", [...data.directors, { name: "", appointedDate: "", resignedDate: "" }]);
  };

  const updateDirector = (idx: number, field: string, val: string) => {
    const updated = [...data.directors];
    updated[idx] = { ...updated[idx], [field]: val };
    update("directors", updated);
  };

  const removeDirector = (idx: number) => {
    update("directors", data.directors.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-4">
      <div className="text-center border-b pb-3">
        <h2 className="text-lg font-bold">{clientName}</h2>
        <p className="text-sm text-muted-foreground">Directors' Report</p>
        <p className="text-xs text-muted-foreground">
          For the period {fmtDate(periodStart)} to {fmtDate(periodEnd)}
        </p>
        {companyNumber && <p className="text-xs text-muted-foreground">Company No: {companyNumber}</p>}
      </div>

      {/* Principal Activities */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Principal Activities</CardTitle>
          <CardDescription className="text-xs">The principal activity of the company during the period</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea className="text-xs min-h-[60px]" value={data.principalActivities}
            onChange={(e) => update("principalActivities", e.target.value)}
            placeholder="e.g. The principal activity of the company continued to be that of management consultancy." />
        </CardContent>
      </Card>

      {/* Directors */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm">Directors</CardTitle>
              <CardDescription className="text-xs">Directors who served during the period</CardDescription>
            </div>
            <Button variant="outline" size="sm" className="gap-1" onClick={addDirector}>
              <Plus className="w-3.5 h-3.5" /> Add Director
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.directors.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">No directors added. Click "Add Director" to list directors who served during the period.</p>
          )}
          {data.directors.map((d, idx) => (
            <div key={idx} className="border rounded-lg p-3 space-y-2">
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Name</Label>
                  <Input className="h-8 text-xs" value={d.name}
                    onChange={(e) => updateDirector(idx, "name", e.target.value)} placeholder="Full name" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Appointed</Label>
                  <Input className="h-8 text-xs" type="date" value={d.appointedDate}
                    onChange={(e) => updateDirector(idx, "appointedDate", e.target.value)} />
                </div>
                <div className="flex items-end gap-2">
                  <div className="space-y-1 flex-1">
                    <Label className="text-xs">Resigned (if applicable)</Label>
                    <Input className="h-8 text-xs" type="date" value={d.resignedDate}
                      onChange={(e) => updateDirector(idx, "resignedDate", e.target.value)} />
                  </div>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => removeDirector(idx)}>
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Review of Business */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Review of Business</CardTitle>
          <CardDescription className="text-xs">A review of the company's business and future developments</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label className="text-xs">Business Review</Label>
            <Textarea className="text-xs min-h-[60px]" value={data.reviewOfBusiness}
              onChange={(e) => update("reviewOfBusiness", e.target.value)}
              placeholder="The company has continued to trade satisfactorily during the period..." />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Dividends</Label>
            <Textarea className="text-xs min-h-[40px]" value={data.dividendsStatement}
              onChange={(e) => update("dividendsStatement", e.target.value)}
              placeholder="e.g. The directors paid dividends of £X during the period." />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Future Outlook</Label>
            <Textarea className="text-xs min-h-[40px]" value={data.futureOutlook}
              onChange={(e) => update("futureOutlook", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Principal Risks & Uncertainties</Label>
            <Textarea className="text-xs min-h-[40px]" value={data.risksPrincipal}
              onChange={(e) => update("risksPrincipal", e.target.value)}
              placeholder="Describe principal risks facing the company..." />
          </div>
        </CardContent>
      </Card>

      {/* Exemptions */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Exemptions & Declarations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Checkbox checked={data.smallCompanyExemptions}
              onCheckedChange={(v) => update("smallCompanyExemptions", !!v)} />
            <Label className="text-xs">
              Small company exemptions under the Companies Act 2006 have been applied
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox checked={data.auditExemption}
              onCheckedChange={(v) => update("auditExemption", !!v)} />
            <Label className="text-xs">
              Audit exemption claimed under s.477 Companies Act 2006
            </Label>
          </div>
          {data.auditExemption && (
            <Textarea className="text-xs min-h-[40px]" value={data.auditExemptionStatement}
              onChange={(e) => update("auditExemptionStatement", e.target.value)} />
          )}
        </CardContent>
      </Card>

      {/* Approval */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Approval</CardTitle>
          <CardDescription className="text-xs">Approved by the board and signed on its behalf</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Approved by (Director name)</Label>
              <Input className="h-8 text-xs" value={data.approvedByDirector}
                onChange={(e) => update("approvedByDirector", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Date of approval</Label>
              <Input className="h-8 text-xs" type="date" value={data.approvalDate}
                onChange={(e) => update("approvalDate", e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
