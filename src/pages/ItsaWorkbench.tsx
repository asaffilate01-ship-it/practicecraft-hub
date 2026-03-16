import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/hooks/usePermissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarClock, FileCheck, FileText, Plus, Send, TrendingUp } from "lucide-react";

const statusColors: Record<string, string> = {
  open: "bg-amber-500/10 text-amber-700 border-amber-200",
  fulfilled: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
  overdue: "bg-destructive/10 text-destructive border-destructive/20",
  draft: "bg-muted text-muted-foreground",
  submitted: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
  accepted: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
  rejected: "bg-destructive/10 text-destructive border-destructive/20",
};

const fmt = (pence: number) => `£${(pence / 100).toLocaleString("en-GB", { minimumFractionDigits: 2 })}`;

export default function ItsaWorkbench() {
  const { tenantId } = usePermissions();
  const [tab, setTab] = useState("obligations");

  const { data: obligations = [] } = useQuery({
    queryKey: ["itsa-obligations", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("itsa_obligations")
        .select("*, clients(legal_name, nino)")
        .eq("tenant_id", tenantId!)
        .order("due_date", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });

  const { data: updates = [] } = useQuery({
    queryKey: ["itsa-updates", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("itsa_updates")
        .select("*, clients(legal_name), itsa_obligations(period_start, period_end)")
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });

  const { data: declarations = [] } = useQuery({
    queryKey: ["itsa-declarations", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("itsa_final_declarations")
        .select("*, clients(legal_name)")
        .eq("tenant_id", tenantId!)
        .order("tax_year", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });

  const openObligations = obligations.filter((o: any) => o.status === "open").length;
  const submittedUpdates = updates.filter((u: any) => u.status === "submitted").length;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-primary" /> MTD for Income Tax (ITSA)
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Quarterly updates, end-of-period statements and final declarations under Making Tax Digital
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Open Obligations</div>
          <div className="text-2xl font-bold mt-1">{openObligations}</div>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Updates Submitted</div>
          <div className="text-2xl font-bold mt-1">{submittedUpdates}</div>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Final Declarations</div>
          <div className="text-2xl font-bold mt-1">{declarations.length}</div>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Clients</div>
          <div className="text-2xl font-bold mt-1">{new Set(obligations.map((o: any) => o.client_id)).size}</div>
        </CardContent></Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="obligations" className="gap-1"><CalendarClock className="w-3.5 h-3.5" /> Obligations</TabsTrigger>
          <TabsTrigger value="updates" className="gap-1"><FileText className="w-3.5 h-3.5" /> Quarterly Updates</TabsTrigger>
          <TabsTrigger value="declarations" className="gap-1"><FileCheck className="w-3.5 h-3.5" /> Final Declarations</TabsTrigger>
        </TabsList>

        <TabsContent value="obligations" className="space-y-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">ITSA Obligations</CardTitle>
              <Button size="sm" variant="outline" disabled><Plus className="w-4 h-4 mr-1" /> Pull from HMRC</Button>
            </CardHeader>
            <CardContent>
              {obligations.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CalendarClock className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No ITSA obligations</p>
                  <p className="text-sm mt-1">Pull obligations from HMRC for clients registered for MTD IT</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>NINO</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {obligations.map((o: any) => (
                      <TableRow key={o.id}>
                        <TableCell className="font-medium">{(o.clients as any)?.legal_name}</TableCell>
                        <TableCell className="font-mono text-xs">{o.nino}</TableCell>
                        <TableCell className="text-sm">{o.period_start} → {o.period_end}</TableCell>
                        <TableCell className="capitalize">{o.obligation_type}</TableCell>
                        <TableCell>{o.due_date}</TableCell>
                        <TableCell><Badge variant="outline" className={statusColors[o.status] || ""}>{o.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="updates" className="space-y-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">Quarterly Updates</CardTitle>
              <Button size="sm" variant="outline" disabled><Plus className="w-4 h-4 mr-1" /> Create Update</Button>
            </CardHeader>
            <CardContent>
              {updates.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No quarterly updates</p>
                  <p className="text-sm mt-1">Create quarterly updates from bookkeeping data to submit to HMRC</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Income</TableHead>
                      <TableHead className="text-right">Expenses</TableHead>
                      <TableHead className="text-right">Net Profit</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {updates.map((u: any) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">{(u.clients as any)?.legal_name}</TableCell>
                        <TableCell className="text-sm">
                          {(u.itsa_obligations as any)?.period_start} → {(u.itsa_obligations as any)?.period_end}
                        </TableCell>
                        <TableCell className="capitalize">{u.update_type}</TableCell>
                        <TableCell className="text-right font-mono">{fmt(u.total_income_pence)}</TableCell>
                        <TableCell className="text-right font-mono">{fmt(u.total_expenses_pence)}</TableCell>
                        <TableCell className="text-right font-mono font-medium">{fmt(u.net_profit_pence)}</TableCell>
                        <TableCell><Badge variant="outline" className={statusColors[u.status] || ""}>{u.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="declarations" className="space-y-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">Final Declarations</CardTitle>
              <Button size="sm" variant="outline" disabled><Plus className="w-4 h-4 mr-1" /> Create Declaration</Button>
            </CardHeader>
            <CardContent>
              {declarations.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileCheck className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No final declarations</p>
                  <p className="text-sm mt-1">Final declarations replace the traditional Self Assessment return under MTD IT</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>Tax Year</TableHead>
                      <TableHead className="text-right">Total Income</TableHead>
                      <TableHead className="text-right">Deductions</TableHead>
                      <TableHead className="text-right">Tax Due</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {declarations.map((d: any) => (
                      <TableRow key={d.id}>
                        <TableCell className="font-medium">{(d.clients as any)?.legal_name}</TableCell>
                        <TableCell>{d.tax_year}</TableCell>
                        <TableCell className="text-right font-mono">{fmt(d.total_income_pence)}</TableCell>
                        <TableCell className="text-right font-mono">{fmt(d.total_deductions_pence)}</TableCell>
                        <TableCell className="text-right font-mono font-medium">{fmt(d.total_tax_due_pence)}</TableCell>
                        <TableCell><Badge variant="outline" className={statusColors[d.status] || ""}>{d.status}</Badge></TableCell>
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
