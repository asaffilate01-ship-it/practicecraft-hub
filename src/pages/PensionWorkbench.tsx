import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/hooks/usePermissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, DollarSign, Plus, PiggyBank, UserCheck, Users } from "lucide-react";
import { WorkspacePageHeader } from "@/components/layout/WorkspacePageHeader";

const statusColors: Record<string, string> = {
  active: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
  inactive: "bg-muted text-muted-foreground",
  enrolled: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
  opted_out: "bg-amber-500/10 text-amber-700 border-amber-200",
  postponed: "bg-blue-500/10 text-blue-700 border-blue-200",
  calculated: "bg-muted text-muted-foreground",
  submitted: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
  paid: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
};

const fmt = (pence: number) => `£${(pence / 100).toLocaleString("en-GB", { minimumFractionDigits: 2 })}`;

export default function PensionWorkbench() {
  const { tenantId } = usePermissions();
  const [tab, setTab] = useState("schemes");

  const { data: schemes = [] } = useQuery({
    queryKey: ["pension-schemes", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pension_schemes")
        .select("*, clients(legal_name)")
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });

  const { data: enrolments = [] } = useQuery({
    queryKey: ["pension-enrolments", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pension_enrolments")
        .select("*, pension_schemes(provider, clients(legal_name))")
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });

  const { data: contributions = [] } = useQuery({
    queryKey: ["pension-contributions", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pension_contributions")
        .select("*, pension_schemes(provider, clients(legal_name))")
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });

  const totalContributions = contributions.reduce((s, c: any) => s + (c.total_contribution_pence || 0), 0);
  const activeEnrolments = enrolments.filter((e: any) => e.status === "enrolled").length;

  return (
    <div className="space-y-6">
      <WorkspacePageHeader eyebrow="Payroll compliance" title="Pension Auto-Enrolment" icon={PiggyBank} description="Manage workplace pension schemes, employee enrolments, opt-outs and contribution submissions." />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Schemes</div>
          <div className="text-2xl font-bold mt-1">{schemes.length}</div>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Active Enrolments</div>
          <div className="text-2xl font-bold mt-1">{activeEnrolments}</div>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Opt-Outs</div>
          <div className="text-2xl font-bold mt-1">{enrolments.filter((e: any) => e.status === "opted_out").length}</div>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Total Contributions</div>
          <div className="text-2xl font-bold mt-1">{fmt(totalContributions)}</div>
        </CardContent></Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="schemes" className="gap-1"><Building2 className="w-3.5 h-3.5" /> Schemes</TabsTrigger>
          <TabsTrigger value="enrolments" className="gap-1"><UserCheck className="w-3.5 h-3.5" /> Enrolments</TabsTrigger>
          <TabsTrigger value="contributions" className="gap-1"><DollarSign className="w-3.5 h-3.5" /> Contributions</TabsTrigger>
        </TabsList>

        <TabsContent value="schemes" className="space-y-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">Pension Schemes</CardTitle>
              <Button size="sm" variant="outline" disabled><Plus className="w-4 h-4 mr-1" /> Add Scheme</Button>
            </CardHeader>
            <CardContent>
              {schemes.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <PiggyBank className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No pension schemes configured</p>
                  <p className="text-sm mt-1">Set up a workplace pension scheme (NEST, People's Pension, etc.) for your clients</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employer</TableHead>
                      <TableHead>Provider</TableHead>
                      <TableHead>Scheme Ref</TableHead>
                      <TableHead>Employee %</TableHead>
                      <TableHead>Employer %</TableHead>
                      <TableHead>Staging Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {schemes.map((s: any) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{(s.clients as any)?.legal_name}</TableCell>
                        <TableCell className="uppercase text-xs font-mono">{s.provider}</TableCell>
                        <TableCell className="font-mono text-xs">{s.scheme_reference || "—"}</TableCell>
                        <TableCell className="text-right">{Number(s.contribution_employee_pct)}%</TableCell>
                        <TableCell className="text-right">{Number(s.contribution_employer_pct)}%</TableCell>
                        <TableCell className="text-sm">{s.staging_date || "—"}</TableCell>
                        <TableCell><Badge variant="outline" className={statusColors[s.status] || ""}>{s.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="enrolments" className="space-y-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">Employee Enrolments</CardTitle>
              <Button size="sm" variant="outline" disabled><Plus className="w-4 h-4 mr-1" /> Enrol Employee</Button>
            </CardHeader>
            <CardContent>
              {enrolments.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No enrolments</p>
                  <p className="text-sm mt-1">Employees eligible for auto-enrolment will appear here after payroll assessment</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Provider</TableHead>
                      <TableHead>Employer</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Employee %</TableHead>
                      <TableHead>Employer %</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {enrolments.map((e: any) => (
                      <TableRow key={e.id}>
                        <TableCell className="font-medium">{e.employee_id?.slice(0, 8)}…</TableCell>
                        <TableCell className="uppercase text-xs font-mono">{(e.pension_schemes as any)?.provider}</TableCell>
                        <TableCell className="text-sm">{(e.pension_schemes as any)?.clients?.legal_name}</TableCell>
                        <TableCell className="capitalize">{e.enrolment_type}</TableCell>
                        <TableCell className="text-right">{e.employee_contribution_pct != null ? `${Number(e.employee_contribution_pct)}%` : "—"}</TableCell>
                        <TableCell className="text-right">{e.employer_contribution_pct != null ? `${Number(e.employer_contribution_pct)}%` : "—"}</TableCell>
                        <TableCell><Badge variant="outline" className={statusColors[e.status] || ""}>{e.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contributions" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Contribution Records</CardTitle></CardHeader>
            <CardContent>
              {contributions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <DollarSign className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No contributions recorded</p>
                  <p className="text-sm mt-1">Contributions are calculated automatically during payroll runs</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Period</TableHead>
                      <TableHead>Provider</TableHead>
                      <TableHead>Employer</TableHead>
                      <TableHead className="text-right">Qualifying Earnings</TableHead>
                      <TableHead className="text-right">Employee</TableHead>
                      <TableHead className="text-right">Employer</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contributions.map((c: any) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.period}</TableCell>
                        <TableCell className="uppercase text-xs font-mono">{(c.pension_schemes as any)?.provider}</TableCell>
                        <TableCell className="text-sm">{(c.pension_schemes as any)?.clients?.legal_name}</TableCell>
                        <TableCell className="text-right font-mono">{fmt(c.qualifying_earnings_pence)}</TableCell>
                        <TableCell className="text-right font-mono">{fmt(c.employee_contribution_pence)}</TableCell>
                        <TableCell className="text-right font-mono">{fmt(c.employer_contribution_pence)}</TableCell>
                        <TableCell className="text-right font-mono font-medium">{fmt(c.total_contribution_pence)}</TableCell>
                        <TableCell><Badge variant="outline" className={statusColors[c.status] || ""}>{c.status}</Badge></TableCell>
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
