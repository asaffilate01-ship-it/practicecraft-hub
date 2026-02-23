import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2 } from "lucide-react";

export type FixedAsset = {
  id: string;
  description: string;
  category: string;
  acquisitionDate: string;
  costPence: number;
  residualPence: number;
  usefulLifeYears: number;
  depreciationMethod: "straight_line" | "reducing_balance" | "aia";
  rbRate: number; // % for reducing balance
  bfDepreciationPence: number;
  disposalPence: number;
  disposalDate: string;
};

export type FixedAssetScheduleData = {
  assets: FixedAsset[];
  aiaLimitPence: number;
  wdaRate: number; // writing down allowance % for capital allowances
};

export const defaultFixedAssetScheduleData: FixedAssetScheduleData = {
  assets: [],
  aiaLimitPence: 100000000, // £1,000,000
  wdaRate: 18,
};

const CATEGORIES = [
  { value: "plant_machinery", label: "Plant & Machinery" },
  { value: "fixtures_fittings", label: "Fixtures & Fittings" },
  { value: "office_equipment", label: "Office Equipment" },
  { value: "computer_equipment", label: "Computer Equipment" },
  { value: "motor_vehicles", label: "Motor Vehicles" },
  { value: "leasehold_improvements", label: "Leasehold Improvements" },
  { value: "land_buildings", label: "Land & Buildings" },
];

const DEP_METHODS = [
  { value: "straight_line", label: "Straight Line" },
  { value: "reducing_balance", label: "Reducing Balance" },
  { value: "aia", label: "AIA (100%)" },
];

const penceToStr = (v: number) => (v / 100).toFixed(2);
const strToPence = (s: string) => Math.round(parseFloat(s || "0") * 100);

function calcDepreciation(asset: FixedAsset, monthsInPeriod: number): number {
  const nbv = asset.costPence - asset.bfDepreciationPence;
  if (nbv <= 0 || asset.disposalPence > 0) return 0;

  const depreciableAmount = asset.costPence - asset.residualPence;

  switch (asset.depreciationMethod) {
    case "straight_line": {
      if (asset.usefulLifeYears <= 0) return 0;
      const annual = depreciableAmount / asset.usefulLifeYears;
      const prorated = Math.round(annual * (monthsInPeriod / 12));
      return Math.min(prorated, nbv - asset.residualPence);
    }
    case "reducing_balance": {
      const rate = asset.rbRate / 100;
      const annual = Math.round(nbv * rate);
      const prorated = Math.round(annual * (monthsInPeriod / 12));
      return Math.min(prorated, nbv - asset.residualPence);
    }
    case "aia":
      return Math.max(0, nbv);
    default:
      return 0;
  }
}

type Props = {
  data: FixedAssetScheduleData;
  onChange: (data: FixedAssetScheduleData) => void;
  periodStart: string;
  periodEnd: string;
  entityType: string;
};

export function FixedAssetScheduleStep({ data, onChange, periodStart, periodEnd, entityType }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const monthsInPeriod = (() => {
    const start = new Date(periodStart);
    const end = new Date(periodEnd);
    return (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;
  })();

  const addAsset = () => {
    const newAsset: FixedAsset = {
      id: crypto.randomUUID(),
      description: "",
      category: "plant_machinery",
      acquisitionDate: "",
      costPence: 0,
      residualPence: 0,
      usefulLifeYears: 5,
      depreciationMethod: "straight_line",
      rbRate: 25,
      bfDepreciationPence: 0,
      disposalPence: 0,
      disposalDate: "",
    };
    onChange({ ...data, assets: [...data.assets, newAsset] });
  };

  const removeAsset = (id: string) => {
    onChange({ ...data, assets: data.assets.filter(a => a.id !== id) });
  };

  const updateAsset = (id: string, field: keyof FixedAsset, value: any) => {
    onChange({
      ...data,
      assets: data.assets.map(a => a.id === id ? { ...a, [field]: value } : a),
    });
  };

  // Group by category
  const grouped = CATEGORIES.map(cat => ({
    ...cat,
    assets: data.assets.filter(a => a.category === cat.value),
  })).filter(g => g.assets.length > 0);

  // Totals
  const totalCost = data.assets.reduce((s, a) => s + a.costPence, 0);
  const totalBfDep = data.assets.reduce((s, a) => s + a.bfDepreciationPence, 0);
  const totalCharge = data.assets.reduce((s, a) => s + calcDepreciation(a, monthsInPeriod), 0);
  const totalDisposals = data.assets.reduce((s, a) => s + a.disposalPence, 0);
  const totalCfDep = totalBfDep + totalCharge;
  const totalNBV = totalCost - totalCfDep - totalDisposals;

  // Capital Allowances summary
  const aiaAssets = data.assets.filter(a => a.depreciationMethod === "aia");
  const totalAIA = Math.min(
    aiaAssets.reduce((s, a) => s + calcDepreciation(a, monthsInPeriod), 0),
    data.aiaLimitPence
  );
  const poolAssets = data.assets.filter(a => a.depreciationMethod !== "aia");
  const poolValue = poolAssets.reduce((s, a) => s + (a.costPence - a.bfDepreciationPence), 0);
  const wda = Math.round(poolValue * data.wdaRate / 100);
  const totalCapitalAllowances = totalAIA + wda;

  return (
    <div className="space-y-4">
      {/* Depreciation Configuration */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Fixed Asset Schedule</CardTitle>
              <CardDescription className="text-xs">
                Register assets, set depreciation method & rates. Period: {monthsInPeriod} months.
              </CardDescription>
            </div>
            <Button size="sm" className="gap-1" onClick={addAsset}>
              <Plus className="w-3.5 h-3.5" /> Add Asset
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {data.assets.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">No fixed assets. Click "Add Asset" to register an asset.</p>
          ) : (
            <div className="border rounded-lg overflow-auto max-h-[500px]">
              <Table>
                <TableHeader className="sticky top-0 bg-muted z-10">
                  <TableRow>
                    <TableHead className="min-w-[180px]">Description</TableHead>
                    <TableHead className="w-32">Category</TableHead>
                    <TableHead className="w-24">Method</TableHead>
                    <TableHead className="w-20 text-right">Cost £</TableHead>
                    <TableHead className="w-20 text-right">B/f Dep £</TableHead>
                    <TableHead className="w-20 text-right">Charge £</TableHead>
                    <TableHead className="w-20 text-right">NBV £</TableHead>
                    <TableHead className="w-8" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.assets.map((asset) => {
                    const charge = calcDepreciation(asset, monthsInPeriod);
                    const nbv = asset.costPence - asset.bfDepreciationPence - charge - asset.disposalPence;
                    const isExpanded = expandedId === asset.id;

                    return (
                      <>
                        <TableRow key={asset.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setExpandedId(isExpanded ? null : asset.id)}>
                          <TableCell className="p-1">
                            <Input className="h-8 text-xs" value={asset.description}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => updateAsset(asset.id, "description", e.target.value)}
                              placeholder="Asset description" />
                          </TableCell>
                          <TableCell className="p-1">
                            <Select value={asset.category} onValueChange={(v) => updateAsset(asset.id, "category", v)}>
                              <SelectTrigger className="h-8 text-xs" onClick={(e) => e.stopPropagation()}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value} className="text-xs">{c.label}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="p-1">
                            <Select value={asset.depreciationMethod} onValueChange={(v: any) => updateAsset(asset.id, "depreciationMethod", v)}>
                              <SelectTrigger className="h-8 text-xs" onClick={(e) => e.stopPropagation()}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {DEP_METHODS.map(m => <SelectItem key={m.value} value={m.value} className="text-xs">{m.label}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-right text-xs font-mono">{penceToStr(asset.costPence)}</TableCell>
                          <TableCell className="text-right text-xs font-mono">{penceToStr(asset.bfDepreciationPence)}</TableCell>
                          <TableCell className="text-right text-xs font-mono">{penceToStr(charge)}</TableCell>
                          <TableCell className="text-right text-xs font-mono font-medium">{penceToStr(nbv)}</TableCell>
                          <TableCell className="p-1">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={(e) => { e.stopPropagation(); removeAsset(asset.id); }}>
                              <Trash2 className="w-3.5 h-3.5 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                        {isExpanded && (
                          <TableRow key={`${asset.id}-detail`}>
                            <TableCell colSpan={8} className="bg-muted/30 p-4">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div className="space-y-1">
                                  <Label className="text-xs">Acquisition Date</Label>
                                  <Input className="h-8 text-xs" type="date" value={asset.acquisitionDate}
                                    onChange={(e) => updateAsset(asset.id, "acquisitionDate", e.target.value)} />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs">Cost (£)</Label>
                                  <Input className="h-8 text-xs text-right" type="number" step="0.01"
                                    value={penceToStr(asset.costPence)}
                                    onChange={(e) => updateAsset(asset.id, "costPence", strToPence(e.target.value))} />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs">Residual Value (£)</Label>
                                  <Input className="h-8 text-xs text-right" type="number" step="0.01"
                                    value={penceToStr(asset.residualPence)}
                                    onChange={(e) => updateAsset(asset.id, "residualPence", strToPence(e.target.value))} />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs">Useful Life (Years)</Label>
                                  <Input className="h-8 text-xs text-right" type="number"
                                    value={asset.usefulLifeYears}
                                    onChange={(e) => updateAsset(asset.id, "usefulLifeYears", parseInt(e.target.value) || 0)} />
                                </div>
                                {asset.depreciationMethod === "reducing_balance" && (
                                  <div className="space-y-1">
                                    <Label className="text-xs">RB Rate (%)</Label>
                                    <Input className="h-8 text-xs text-right" type="number" step="0.5"
                                      value={asset.rbRate}
                                      onChange={(e) => updateAsset(asset.id, "rbRate", parseFloat(e.target.value) || 0)} />
                                  </div>
                                )}
                                <div className="space-y-1">
                                  <Label className="text-xs">B/f Depreciation (£)</Label>
                                  <Input className="h-8 text-xs text-right" type="number" step="0.01"
                                    value={penceToStr(asset.bfDepreciationPence)}
                                    onChange={(e) => updateAsset(asset.id, "bfDepreciationPence", strToPence(e.target.value))} />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs">Disposal Proceeds (£)</Label>
                                  <Input className="h-8 text-xs text-right" type="number" step="0.01"
                                    value={penceToStr(asset.disposalPence)}
                                    onChange={(e) => updateAsset(asset.id, "disposalPence", strToPence(e.target.value))} />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs">Disposal Date</Label>
                                  <Input className="h-8 text-xs" type="date" value={asset.disposalDate}
                                    onChange={(e) => updateAsset(asset.id, "disposalDate", e.target.value)} />
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    );
                  })}

                  {/* Category subtotals */}
                  {grouped.map(g => {
                    const catCost = g.assets.reduce((s, a) => s + a.costPence, 0);
                    const catBfDep = g.assets.reduce((s, a) => s + a.bfDepreciationPence, 0);
                    const catCharge = g.assets.reduce((s, a) => s + calcDepreciation(a, monthsInPeriod), 0);
                    const catNBV = catCost - catBfDep - catCharge;
                    return (
                      <TableRow key={`cat-${g.value}`} className="bg-muted/40 text-xs font-medium">
                        <TableCell colSpan={3}>{g.label}</TableCell>
                        <TableCell className="text-right font-mono">{penceToStr(catCost)}</TableCell>
                        <TableCell className="text-right font-mono">{penceToStr(catBfDep)}</TableCell>
                        <TableCell className="text-right font-mono">{penceToStr(catCharge)}</TableCell>
                        <TableCell className="text-right font-mono">{penceToStr(catNBV)}</TableCell>
                        <TableCell />
                      </TableRow>
                    );
                  })}

                  {/* Grand totals */}
                  <TableRow className="border-t-2 font-bold text-sm">
                    <TableCell colSpan={3}>Total Fixed Assets</TableCell>
                    <TableCell className="text-right font-mono">{penceToStr(totalCost)}</TableCell>
                    <TableCell className="text-right font-mono">{penceToStr(totalBfDep)}</TableCell>
                    <TableCell className="text-right font-mono">{penceToStr(totalCharge)}</TableCell>
                    <TableCell className="text-right font-mono">{penceToStr(totalNBV)}</TableCell>
                    <TableCell />
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Capital Allowances Summary */}
      {(entityType === "ltd" || entityType === "sole_trader" || entityType === "llp") && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Capital Allowances Summary</CardTitle>
            <CardDescription className="text-xs">For tax computation — AIA, WDA, and total allowances</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="space-y-1">
                <Label className="text-xs">AIA Limit (£)</Label>
                <Input className="h-8 text-xs text-right" type="number" step="0.01"
                  value={penceToStr(data.aiaLimitPence)}
                  onChange={(e) => onChange({ ...data, aiaLimitPence: strToPence(e.target.value) })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Main Pool WDA Rate (%)</Label>
                <Input className="h-8 text-xs text-right" type="number" step="0.5"
                  value={data.wdaRate}
                  onChange={(e) => onChange({ ...data, wdaRate: parseFloat(e.target.value) || 0 })} />
              </div>
            </div>
            <Table>
              <TableBody>
                <TableRow>
                  <TableCell className="text-sm">AIA claimed ({aiaAssets.length} assets)</TableCell>
                  <TableCell className="text-right font-mono text-sm">£{penceToStr(totalAIA)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="text-sm">Main pool WDA @ {data.wdaRate}%</TableCell>
                  <TableCell className="text-right font-mono text-sm">£{penceToStr(wda)}</TableCell>
                </TableRow>
                <TableRow className="border-t-2 font-bold">
                  <TableCell>Total Capital Allowances</TableCell>
                  <TableCell className="text-right font-mono">£{penceToStr(totalCapitalAllowances)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
            <p className="text-xs text-muted-foreground mt-2">
              <Badge variant="outline" className="text-[10px] mr-1">Tip</Badge>
              This total feeds into the tax computation step as "Capital Allowances".
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
