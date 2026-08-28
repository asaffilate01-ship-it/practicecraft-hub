import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/hooks/usePermissions";
import { useClientContext } from "@/contexts/ClientContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DueDatePill } from "@/components/ui/due-date-pill";
import { KPICard } from "@/components/dashboard/KPICard";
import { FileText, Send, Calculator, CheckCircle2, Clock, AlertTriangle, PoundSterling, Plus, Pencil, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive"; icon: typeof Clock }> = {
  not_started: { label: "Not Started", variant: "outline", icon: Clock },
  in_progress: { label: "In Progress", variant: "secondary", icon: Calculator },
  review: { label: "Under Review", variant: "default", icon: FileText },
  approved: { label: "Approved", variant: "default", icon: CheckCircle2 },
  submitted: { label: "Filed", variant: "default", icon: Send },
  overdue: { label: "Overdue", variant: "destructive", icon: AlertTriangle },
};

export default function CorporationTax() {
  const { tenantId } = usePermissions();
  const { selectedClientId } = useClientContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showNewPeriod, setShowNewPeriod] = useState(false);
  const [newPeriodStart, setNewPeriodStart] = useState("");
  const [newPeriodEnd, setNewPeriodEnd] = useState("");
  const [newPeriodClientId, setNewPeriodClientId] = useState("");
  const [newPeriodStandard, setNewPeriodStandard] = useState("FRS 102 1A");

  const { data: periods = [], isLoading } = useQuery({
    queryKey: ["ct-periods", tenantId, selectedClientId],
    queryFn: async () => {
      let q = supabase
        .from("accounts_periods")
        .select("*, clients(legal_name, company_number, utr)")
        .eq("tenant_id", tenantId!)
        .in("period_type", ["ct600", "annual"])
        .order("filing_deadline", { ascending: true });
      if (selectedClientId) q = q.eq("client_id", selectedClientId);
      const { data, error } = await q.limit(200);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!tenantId,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients-ltd", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from("clients").select("id, legal_name, company_number").eq("status", "active").in("entity_type", ["ltd", "llp"]).order("legal_name");
      return data ?? [];
    },
    enabled: !!tenantId,
  });

  const createPeriod = useMutation({
    mutationFn: async () => {
      const deadline = new Date(newPeriodEnd);
      deadline.setMonth(deadline.getMonth() + 9);
      const { error } = await supabase.from("accounts_periods").insert({
        tenant_id: tenantId!,
        client_id: newPeriodClientId,
        period_start: newPeriodStart,
        period_end: newPeriodEnd,
        period_type: "ct600",
        accounts_standard: newPeriodStandard,
        filing_deadline: deadline.toISOString().split("T")[0],
        status: "not_started",
        ct600_status: "not_started",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ct-periods"] });
      setShowNewPeriod(false);
      toast.success("CT600 period created");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const inProgress = periods.filter((p: any) => p.ct600_status === "in_progress").length;
  const awaitingFiling = periods.filter((p: any) => p.ct600_status === "approved").length;
  const filed = periods.filter((p: any) => p.ct600_status === "submitted").length;
  const totalTaxPence = 0; // Would come from tax_computations

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Corporation Tax</h1>
          <p className="text-muted-foreground">CT600 preparation, computation & filing</p>
        </div>
        <Button className="gap-1.5" onClick={() => setShowNewPeriod(true)}>
          <Plus className="w-4 h-4" /> New CT600 Period
        </Button>
      </div>

      <Card className="border-warning/30 bg-warning/5"><CardContent className="flex items-start gap-2 pt-4 text-sm"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" /><p>Preparation only: PracticeCraft does not yet generate or file a valid CT600 with accounts and computation iXBRL. Any existing “filed” status is a legacy workflow record and must be checked against an HMRC receipt.</p></CardContent></Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Periods" value={periods.length} change="All CT600 periods" changeType="neutral" icon={FileText} iconColor="bg-muted" />
        <KPICard title="In Progress" value={inProgress} change="Being prepared" changeType={inProgress > 0 ? "negative" : "positive"} icon={Calculator} iconColor="bg-warning/10" />
        <KPICard title="Awaiting Filing" value={awaitingFiling} change="Approved, ready to submit" changeType="neutral" icon={Send} iconColor="bg-[hsl(var(--info))]/10" />
        <KPICard title="Legacy filed status" value={filed} change="Verify against HMRC receipt" changeType="neutral" icon={CheckCircle2} iconColor="bg-[hsl(var(--success))]/10" />
      </div>

      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">Active ({periods.filter((p: any) => p.ct600_status !== "submitted").length})</TabsTrigger>
          <TabsTrigger value="filed">Filed ({filed})</TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Active CT600 Periods</CardTitle>
              <CardDescription>Corporation tax returns in preparation — click to open in the Accounts Wizard</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Company</TableHead>
                      <TableHead>Co. Number</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Filing Deadline</TableHead>
                      <TableHead>CT600 Status</TableHead>
                      <TableHead>Accounts Status</TableHead>
                      <TableHead className="w-24">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {periods.filter((p: any) => p.ct600_status !== "submitted").map((p: any) => {
                      const client = p.clients as any;
                      const sc = statusConfig[p.ct600_status] || statusConfig.not_started;
                      const Icon = sc.icon;
                      return (
                        <TableRow key={p.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/accounts`)}>
                          <TableCell className="font-medium">{client?.legal_name ?? "—"}</TableCell>
                          <TableCell className="text-muted-foreground font-mono text-xs">{client?.company_number ?? "—"}</TableCell>
                          <TableCell className="text-sm">{p.period_start} — {p.period_end}</TableCell>
                          <TableCell>
                            {p.filing_deadline ? <DueDatePill dueDate={p.filing_deadline} /> : "—"}
                          </TableCell>
                          <TableCell>
                            <Badge variant={sc.variant} className="gap-1">
                              <Icon className="w-3 h-3" /> {sc.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={p.status === "completed" ? "default" : "secondary"}>
                              {p.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" className="gap-1" onClick={(e) => { e.stopPropagation(); navigate("/accounts"); }}>
                              <Pencil className="w-3 h-3" /> Open <ArrowRight className="w-3 h-3" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {periods.filter((p: any) => p.ct600_status !== "submitted").length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                          No active CT600 periods. Click "New CT600 Period" to create one.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="filed">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Filed CT600 Returns</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Filed Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {periods.filter((p: any) => p.ct600_status === "submitted").map((p: any) => {
                    const client = p.clients as any;
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{client?.legal_name ?? "—"}</TableCell>
                        <TableCell>{p.period_start} — {p.period_end}</TableCell>
                        <TableCell>{p.updated_at?.slice(0, 10)}</TableCell>
                        <TableCell>
                          <Badge variant="default" className="gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Filed
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {periods.filter((p: any) => p.ct600_status === "submitted").length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-12">
                        No CT600 returns filed yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* New Period Dialog */}
      <Dialog open={showNewPeriod} onOpenChange={setShowNewPeriod}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create CT600 Period</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Company</Label>
              <Select value={newPeriodClientId} onValueChange={setNewPeriodClientId}>
                <SelectTrigger><SelectValue placeholder="Select company" /></SelectTrigger>
                <SelectContent>
                  {clients.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.legal_name} {c.company_number ? `(${c.company_number})` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Period Start</Label>
                <Input type="date" value={newPeriodStart} onChange={(e) => setNewPeriodStart(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Period End</Label>
                <Input type="date" value={newPeriodEnd} onChange={(e) => setNewPeriodEnd(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Accounts Standard</Label>
              <Select value={newPeriodStandard} onValueChange={setNewPeriodStandard}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="FRS 102 1A">FRS 102 Section 1A (Small)</SelectItem>
                  <SelectItem value="FRS 105">FRS 105 (Micro)</SelectItem>
                  <SelectItem value="FRS 102">FRS 102 (Full)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={() => createPeriod.mutate()} disabled={!newPeriodClientId || !newPeriodStart || !newPeriodEnd}>
              Create Period
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
