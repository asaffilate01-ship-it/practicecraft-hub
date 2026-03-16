import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/hooks/usePermissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarClock, FileCheck, FileText, Plus, Send, TrendingUp, Loader2 } from "lucide-react";
import { toast } from "sonner";

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
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("obligations");
  const [showCreateUpdate, setShowCreateUpdate] = useState(false);
  const [showCreateDeclaration, setShowCreateDeclaration] = useState(false);
  const [updateForm, setUpdateForm] = useState({
    client_id: "", obligation_id: "", update_type: "quarterly",
    income: "0", expenses: "0",
  });
  const [declForm, setDeclForm] = useState({
    client_id: "", tax_year: "2025-26",
    total_income: "0", total_deductions: "0", total_tax_due: "0",
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients-itsa", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("id, legal_name, nino").eq("tenant_id", tenantId!).order("legal_name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });

  const { data: obligations = [] } = useQuery({
    queryKey: ["itsa-obligations", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("itsa_obligations").select("*, clients(legal_name, nino)")
        .eq("tenant_id", tenantId!).order("due_date", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });

  const { data: updates = [] } = useQuery({
    queryKey: ["itsa-updates", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("itsa_updates").select("*, clients(legal_name), itsa_obligations(period_start, period_end)")
        .eq("tenant_id", tenantId!).order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });

  const { data: declarations = [] } = useQuery({
    queryKey: ["itsa-declarations", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("itsa_final_declarations").select("*, clients(legal_name)")
        .eq("tenant_id", tenantId!).order("tax_year", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });

  const openObligations = obligations.filter((o: any) => o.status === "open").length;
  const submittedUpdates = updates.filter((u: any) => u.status === "submitted").length;

  // Filtered obligations for the selected client in create-update form
  const clientObligations = obligations.filter((o: any) => o.client_id === updateForm.client_id && o.status === "open");

  const createUpdate = useMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error("No tenant");
      const incomePence = Math.round(parseFloat(updateForm.income) * 100);
      const expensesPence = Math.round(parseFloat(updateForm.expenses) * 100);
      const { error } = await supabase.from("itsa_updates").insert({
        tenant_id: tenantId,
        client_id: updateForm.client_id,
        obligation_id: updateForm.obligation_id || null,
        update_type: updateForm.update_type,
        total_income_pence: incomePence,
        total_expenses_pence: expensesPence,
        net_profit_pence: incomePence - expensesPence,
        status: "draft",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["itsa-updates"] });
      setShowCreateUpdate(false);
      setUpdateForm({ client_id: "", obligation_id: "", update_type: "quarterly", income: "0", expenses: "0" });
      toast.success("Quarterly update created");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const createDeclaration = useMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error("No tenant");
      const { error } = await supabase.from("itsa_final_declarations").insert({
        tenant_id: tenantId,
        client_id: declForm.client_id,
        tax_year: declForm.tax_year,
        total_income_pence: Math.round(parseFloat(declForm.total_income) * 100),
        total_deductions_pence: Math.round(parseFloat(declForm.total_deductions) * 100),
        total_tax_due_pence: Math.round(parseFloat(declForm.total_tax_due) * 100),
        status: "draft",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["itsa-declarations"] });
      setShowCreateDeclaration(false);
      setDeclForm({ client_id: "", tax_year: "2025-26", total_income: "0", total_deductions: "0", total_tax_due: "0" });
      toast.success("Final declaration created");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const submitUpdate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("itsa_updates").update({ status: "submitted", submitted_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["itsa-updates"] });
      toast.success("Update marked as submitted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const submitDeclaration = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("itsa_final_declarations").update({ status: "submitted", submitted_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["itsa-declarations"] });
      toast.success("Declaration marked as submitted");
    },
    onError: (e: any) => toast.error(e.message),
  });

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
        <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground uppercase tracking-wide">Open Obligations</div><div className="text-2xl font-bold mt-1">{openObligations}</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground uppercase tracking-wide">Updates Submitted</div><div className="text-2xl font-bold mt-1">{submittedUpdates}</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground uppercase tracking-wide">Final Declarations</div><div className="text-2xl font-bold mt-1">{declarations.length}</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground uppercase tracking-wide">Clients</div><div className="text-2xl font-bold mt-1">{new Set(obligations.map((o: any) => o.client_id)).size}</div></CardContent></Card>
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
                  <TableHeader><TableRow>
                    <TableHead>Client</TableHead><TableHead>NINO</TableHead><TableHead>Period</TableHead>
                    <TableHead>Type</TableHead><TableHead>Due Date</TableHead><TableHead>Status</TableHead>
                  </TableRow></TableHeader>
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
              <Button size="sm" onClick={() => setShowCreateUpdate(true)}>
                <Plus className="w-4 h-4 mr-1" /> Create Update
              </Button>
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
                  <TableHeader><TableRow>
                    <TableHead>Client</TableHead><TableHead>Period</TableHead><TableHead>Type</TableHead>
                    <TableHead className="text-right">Income</TableHead><TableHead className="text-right">Expenses</TableHead>
                    <TableHead className="text-right">Net Profit</TableHead><TableHead>Status</TableHead><TableHead className="w-10" />
                  </TableRow></TableHeader>
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
                        <TableCell>
                          {u.status === "draft" && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" title="Submit"
                              onClick={() => submitUpdate.mutate(u.id)} disabled={submitUpdate.isPending}>
                              <Send className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </TableCell>
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
              <Button size="sm" onClick={() => setShowCreateDeclaration(true)}>
                <Plus className="w-4 h-4 mr-1" /> Create Declaration
              </Button>
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
                  <TableHeader><TableRow>
                    <TableHead>Client</TableHead><TableHead>Tax Year</TableHead>
                    <TableHead className="text-right">Total Income</TableHead><TableHead className="text-right">Deductions</TableHead>
                    <TableHead className="text-right">Tax Due</TableHead><TableHead>Status</TableHead><TableHead className="w-10" />
                  </TableRow></TableHeader>
                  <TableBody>
                    {declarations.map((d: any) => (
                      <TableRow key={d.id}>
                        <TableCell className="font-medium">{(d.clients as any)?.legal_name}</TableCell>
                        <TableCell>{d.tax_year}</TableCell>
                        <TableCell className="text-right font-mono">{fmt(d.total_income_pence)}</TableCell>
                        <TableCell className="text-right font-mono">{fmt(d.total_deductions_pence)}</TableCell>
                        <TableCell className="text-right font-mono font-medium">{fmt(d.total_tax_due_pence)}</TableCell>
                        <TableCell><Badge variant="outline" className={statusColors[d.status] || ""}>{d.status}</Badge></TableCell>
                        <TableCell>
                          {d.status === "draft" && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" title="Submit"
                              onClick={() => submitDeclaration.mutate(d.id)} disabled={submitDeclaration.isPending}>
                              <Send className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Quarterly Update */}
      <Dialog open={showCreateUpdate} onOpenChange={setShowCreateUpdate}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Quarterly Update</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Client *</Label>
              <Select value={updateForm.client_id} onValueChange={(v) => setUpdateForm({ ...updateForm, client_id: v, obligation_id: "" })}>
                <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent>{clients.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.legal_name}{c.nino ? ` (${c.nino})` : ""}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {clientObligations.length > 0 && (
              <div className="space-y-2">
                <Label>Obligation (optional)</Label>
                <Select value={updateForm.obligation_id} onValueChange={(v) => setUpdateForm({ ...updateForm, obligation_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Link to obligation…" /></SelectTrigger>
                  <SelectContent>{clientObligations.map((o: any) => <SelectItem key={o.id} value={o.id}>{o.period_start} → {o.period_end} (due {o.due_date})</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Update Type</Label>
              <Select value={updateForm.update_type} onValueChange={(v) => setUpdateForm({ ...updateForm, update_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="quarterly">Quarterly Update</SelectItem>
                  <SelectItem value="eops">End of Period Statement</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Total Income (£)</Label>
                <Input type="number" step="0.01" value={updateForm.income} onChange={(e) => setUpdateForm({ ...updateForm, income: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Total Expenses (£)</Label>
                <Input type="number" step="0.01" value={updateForm.expenses} onChange={(e) => setUpdateForm({ ...updateForm, expenses: e.target.value })} />
              </div>
            </div>
            <div className="border rounded-lg p-3 bg-muted/50">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Net Profit</span>
                <span className="font-mono font-bold">£{((parseFloat(updateForm.income) || 0) - (parseFloat(updateForm.expenses) || 0)).toFixed(2)}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateUpdate(false)}>Cancel</Button>
            <Button onClick={() => createUpdate.mutate()} disabled={!updateForm.client_id || createUpdate.isPending}>
              {createUpdate.isPending ? "Creating…" : "Create Update"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Final Declaration */}
      <Dialog open={showCreateDeclaration} onOpenChange={setShowCreateDeclaration}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Final Declaration</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Client *</Label>
              <Select value={declForm.client_id} onValueChange={(v) => setDeclForm({ ...declForm, client_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent>{clients.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.legal_name}{c.nino ? ` (${c.nino})` : ""}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tax Year</Label>
              <Select value={declForm.tax_year} onValueChange={(v) => setDeclForm({ ...declForm, tax_year: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="2025-26">2025-26</SelectItem>
                  <SelectItem value="2024-25">2024-25</SelectItem>
                  <SelectItem value="2023-24">2023-24</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-3">
              <div className="space-y-2"><Label>Total Income (£)</Label><Input type="number" step="0.01" value={declForm.total_income} onChange={(e) => setDeclForm({ ...declForm, total_income: e.target.value })} /></div>
              <div className="space-y-2"><Label>Total Deductions (£)</Label><Input type="number" step="0.01" value={declForm.total_deductions} onChange={(e) => setDeclForm({ ...declForm, total_deductions: e.target.value })} /></div>
              <div className="space-y-2"><Label>Total Tax Due (£)</Label><Input type="number" step="0.01" value={declForm.total_tax_due} onChange={(e) => setDeclForm({ ...declForm, total_tax_due: e.target.value })} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDeclaration(false)}>Cancel</Button>
            <Button onClick={() => createDeclaration.mutate()} disabled={!declForm.client_id || createDeclaration.isPending}>
              {createDeclaration.isPending ? "Creating…" : "Create Declaration"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
