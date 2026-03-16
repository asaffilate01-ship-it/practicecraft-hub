import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/hooks/usePermissions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { HardHat, Plus, Send, ShieldCheck, Users, FileText, CalendarDays } from "lucide-react";
import { DueDatePill } from "@/components/ui/due-date-pill";

const statusColors: Record<string, string> = {
  active: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
  inactive: "bg-muted text-muted-foreground",
  unverified: "bg-amber-500/10 text-amber-700 border-amber-200",
  verified_gross: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
  verified_net: "bg-blue-500/10 text-blue-700 border-blue-200",
  verified_nil: "bg-purple-500/10 text-purple-700 border-purple-200",
  draft: "bg-muted text-muted-foreground",
  ready: "bg-blue-500/10 text-blue-700 border-blue-200",
  submitted: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
  accepted: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
  rejected: "bg-destructive/10 text-destructive border-destructive/20",
};

const fmt = (pence: number) => `£${(pence / 100).toLocaleString("en-GB", { minimumFractionDigits: 2 })}`;

const taxMonths = Array.from({ length: 12 }, (_, i) => ({
  value: i + 1,
  label: `Month ${i + 1} (${["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"][i]})`,
}));

export default function CisWorkbench() {
  const { tenantId } = usePermissions();
  const qc = useQueryClient();
  const [tab, setTab] = useState("contractors");

  // Contractors
  const { data: contractors = [], isLoading: loadingContractors } = useQuery({
    queryKey: ["cis-contractors", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cis_contractors")
        .select("*, clients(legal_name, company_number)")
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });

  // Subcontractors
  const { data: subcontractors = [] } = useQuery({
    queryKey: ["cis-subcontractors", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cis_subcontractors")
        .select("*, cis_contractors(clients(legal_name))")
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });

  // Monthly Returns
  const { data: returns = [] } = useQuery({
    queryKey: ["cis-returns", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cis_monthly_returns")
        .select("*, cis_contractors(clients(legal_name))")
        .eq("tenant_id", tenantId!)
        .order("tax_year", { ascending: false })
        .order("tax_month", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });

  // Deductions
  const { data: deductions = [] } = useQuery({
    queryKey: ["cis-deductions", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cis_deductions")
        .select("*, cis_subcontractors(name), cis_contractors(clients(legal_name))")
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });

  const totalDeductions = deductions.reduce((s, d) => s + (d.deduction_amount_pence || 0), 0);
  const totalGross = deductions.reduce((s, d) => s + (d.gross_amount_pence || 0), 0);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <HardHat className="w-6 h-6 text-primary" /> CIS — Construction Industry Scheme
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage contractors, subcontractors, deductions and monthly CIS returns
          </p>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wide">Contractors</div>
            <div className="text-2xl font-bold mt-1">{contractors.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wide">Subcontractors</div>
            <div className="text-2xl font-bold mt-1">{subcontractors.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wide">Total Gross (YTD)</div>
            <div className="text-2xl font-bold mt-1">{fmt(totalGross)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wide">Total Deductions (YTD)</div>
            <div className="text-2xl font-bold mt-1">{fmt(totalDeductions)}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="contractors" className="gap-1"><Users className="w-3.5 h-3.5" /> Contractors</TabsTrigger>
          <TabsTrigger value="subcontractors" className="gap-1"><HardHat className="w-3.5 h-3.5" /> Subcontractors</TabsTrigger>
          <TabsTrigger value="deductions" className="gap-1"><FileText className="w-3.5 h-3.5" /> Deductions</TabsTrigger>
          <TabsTrigger value="returns" className="gap-1"><Send className="w-3.5 h-3.5" /> Monthly Returns</TabsTrigger>
        </TabsList>

        {/* ── Contractors Tab ─────────────────── */}
        <TabsContent value="contractors" className="space-y-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">Registered Contractors</CardTitle>
              <Button size="sm" variant="outline" disabled><Plus className="w-4 h-4 mr-1" /> Add Contractor</Button>
            </CardHeader>
            <CardContent>
              {contractors.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <HardHat className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No CIS contractors registered</p>
                  <p className="text-sm mt-1">Register a client as a CIS contractor to begin managing deductions</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Contractor</TableHead>
                      <TableHead>UTR</TableHead>
                      <TableHead>PAYE Ref</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Subcontractors</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contractors.map((c: any) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{(c.clients as any)?.legal_name}</TableCell>
                        <TableCell className="font-mono text-xs">{c.utr}</TableCell>
                        <TableCell className="text-sm">{c.paye_reference || "—"}</TableCell>
                        <TableCell><Badge variant="outline" className={statusColors[c.status] || ""}>{c.status}</Badge></TableCell>
                        <TableCell className="text-right">{subcontractors.filter((s: any) => s.contractor_id === c.id).length}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Subcontractors Tab ─────────────── */}
        <TabsContent value="subcontractors" className="space-y-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">Subcontractors</CardTitle>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled><ShieldCheck className="w-4 h-4 mr-1" /> Verify with HMRC</Button>
                <Button size="sm" variant="outline" disabled><Plus className="w-4 h-4 mr-1" /> Add Subcontractor</Button>
              </div>
            </CardHeader>
            <CardContent>
              {subcontractors.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No subcontractors registered</p>
                  <p className="text-sm mt-1">Add subcontractors to begin recording CIS deductions</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>UTR / NINO</TableHead>
                      <TableHead>Contractor</TableHead>
                      <TableHead>Verification</TableHead>
                      <TableHead className="text-right">Deduction Rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subcontractors.map((s: any) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{s.name}{s.trading_name ? ` (t/a ${s.trading_name})` : ""}</TableCell>
                        <TableCell className="font-mono text-xs">{s.utr || s.nino || "—"}</TableCell>
                        <TableCell className="text-sm">{(s.cis_contractors as any)?.clients?.legal_name || "—"}</TableCell>
                        <TableCell><Badge variant="outline" className={statusColors[s.verification_status] || ""}>{s.verification_status}</Badge></TableCell>
                        <TableCell className="text-right font-mono">{Number(s.deduction_rate)}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Deductions Tab ─────────────────── */}
        <TabsContent value="deductions" className="space-y-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">Payment & Deduction Records</CardTitle>
              <Button size="sm" variant="outline" disabled><Plus className="w-4 h-4 mr-1" /> Record Payment</Button>
            </CardHeader>
            <CardContent>
              {deductions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No deductions recorded</p>
                  <p className="text-sm mt-1">Record payments to subcontractors to calculate CIS deductions</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Subcontractor</TableHead>
                      <TableHead>Contractor</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead className="text-right">Gross</TableHead>
                      <TableHead className="text-right">Materials</TableHead>
                      <TableHead className="text-right">Deduction</TableHead>
                      <TableHead className="text-right">Net</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deductions.map((d: any) => (
                      <TableRow key={d.id}>
                        <TableCell className="font-medium">{(d.cis_subcontractors as any)?.name}</TableCell>
                        <TableCell className="text-sm">{(d.cis_contractors as any)?.clients?.legal_name}</TableCell>
                        <TableCell className="text-sm">M{d.tax_month} {d.tax_year}</TableCell>
                        <TableCell className="text-right font-mono">{fmt(d.gross_amount_pence)}</TableCell>
                        <TableCell className="text-right font-mono">{fmt(d.materials_amount_pence)}</TableCell>
                        <TableCell className="text-right font-mono text-destructive">{fmt(d.deduction_amount_pence)}</TableCell>
                        <TableCell className="text-right font-mono font-medium">{fmt(d.net_amount_pence)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Monthly Returns Tab ────────────── */}
        <TabsContent value="returns" className="space-y-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">Monthly CIS Returns</CardTitle>
              <Button size="sm" variant="outline" disabled><CalendarDays className="w-4 h-4 mr-1" /> Create Return</Button>
            </CardHeader>
            <CardContent>
              {returns.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Send className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No monthly returns</p>
                  <p className="text-sm mt-1">Monthly CIS returns are due by the 19th of the following month</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Contractor</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Nil?</TableHead>
                      <TableHead className="text-right">Gross</TableHead>
                      <TableHead className="text-right">Deductions</TableHead>
                      <TableHead className="text-right">Submitted</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {returns.map((r: any) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{(r.cis_contractors as any)?.clients?.legal_name}</TableCell>
                        <TableCell>M{r.tax_month} {r.tax_year}</TableCell>
                        <TableCell><Badge variant="outline" className={statusColors[r.status] || ""}>{r.status}</Badge></TableCell>
                        <TableCell>{r.nil_return ? "Yes" : "No"}</TableCell>
                        <TableCell className="text-right font-mono">{fmt(r.total_gross_pence)}</TableCell>
                        <TableCell className="text-right font-mono">{fmt(r.total_deductions_pence)}</TableCell>
                        <TableCell className="text-right text-xs">{r.submitted_at ? new Date(r.submitted_at).toLocaleDateString("en-GB") : "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
