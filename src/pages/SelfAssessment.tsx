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
import { FileText, Send, Calculator, CheckCircle2, Clock, AlertTriangle, Plus, Pencil, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const SA_FORMS = [
  { code: "SA100", label: "Individual", entityTypes: ["sole_trader"] },
  { code: "SA800", label: "Partnership", entityTypes: ["partnership"] },
  { code: "SA900", label: "Trust & Estate", entityTypes: ["trust"] },
];

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive"; icon: typeof Clock }> = {
  not_started: { label: "Not Started", variant: "outline", icon: Clock },
  in_progress: { label: "In Progress", variant: "secondary", icon: Calculator },
  review: { label: "Under Review", variant: "default", icon: FileText },
  approved: { label: "Approved", variant: "default", icon: CheckCircle2 },
  submitted: { label: "Submitted", variant: "default", icon: Send },
  overdue: { label: "Overdue", variant: "destructive", icon: AlertTriangle },
};

export default function SelfAssessment() {
  const { tenantId } = usePermissions();
  const { selectedClientId } = useClientContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filterForm, setFilterForm] = useState("all");
  const [showNewPeriod, setShowNewPeriod] = useState(false);
  const [newPeriodClientId, setNewPeriodClientId] = useState("");
  const [newPeriodType, setNewPeriodType] = useState("sa100");
  const [newTaxYearStart, setNewTaxYearStart] = useState("");
  const [newTaxYearEnd, setNewTaxYearEnd] = useState("");

  const { data: periods = [], isLoading } = useQuery({
    queryKey: ["sa-periods", tenantId, selectedClientId],
    queryFn: async () => {
      let q = supabase
        .from("accounts_periods")
        .select("*, clients(legal_name, entity_type, utr)")
        .eq("tenant_id", tenantId!)
        .in("period_type", ["sa100", "sa800", "sa900"])
        .order("filing_deadline", { ascending: true });
      if (selectedClientId) q = q.eq("client_id", selectedClientId);
      const { data, error } = await q.limit(200);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!tenantId,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients-sa", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from("clients").select("id, legal_name, entity_type, utr").eq("status", "active").in("entity_type", ["sole_trader", "partnership", "trust"]).order("legal_name");
      return data ?? [];
    },
    enabled: !!tenantId,
  });

  const createPeriod = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("accounts_periods").insert({
        tenant_id: tenantId!,
        client_id: newPeriodClientId,
        period_start: newTaxYearStart,
        period_end: newTaxYearEnd,
        period_type: newPeriodType,
        accounts_standard: "FRS 105",
        filing_deadline: `${parseInt(newTaxYearEnd.split("-")[0]) + 1}-01-31`,
        status: "not_started",
        sa_status: "not_started",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sa-periods"] });
      setShowNewPeriod(false);
      toast.success("SA period created");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const filtered = filterForm === "all"
    ? periods
    : periods.filter((p: any) => p.period_type === filterForm.toLowerCase());

  const inProgress = filtered.filter((p: any) => p.sa_status === "in_progress").length;
  const submitted = filtered.filter((p: any) => p.sa_status === "submitted").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Self Assessment</h1>
          <p className="text-muted-foreground">SA100, SA800 & SA900 returns</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={filterForm} onValueChange={setFilterForm}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Forms</SelectItem>
              {SA_FORMS.map((f) => (
                <SelectItem key={f.code} value={f.code}>{f.code} — {f.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button className="gap-1.5" onClick={() => setShowNewPeriod(true)}>
            <Plus className="w-4 h-4" /> New SA Return
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Returns" value={filtered.length} change="All SA returns" changeType="neutral" icon={FileText} iconColor="bg-muted" />
        <KPICard title="In Progress" value={inProgress} change="Being prepared" changeType={inProgress > 0 ? "negative" : "positive"} icon={Calculator} iconColor="bg-warning/10" />
        <KPICard title="Paper Deadline" value="31 Oct" change="Online: 31 Jan" changeType="neutral" icon={Clock} iconColor="bg-[hsl(var(--info))]/10" />
        <KPICard title="Submitted" value={submitted} change="Filed with HMRC" changeType="positive" icon={CheckCircle2} iconColor="bg-[hsl(var(--success))]/10" />
      </div>

      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">Active ({filtered.filter((p: any) => p.sa_status !== "submitted").length})</TabsTrigger>
          <TabsTrigger value="submitted">Submitted ({submitted})</TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Active Returns</CardTitle>
              <CardDescription>Returns awaiting preparation or submission — click to open in the Accounts Wizard</CardDescription>
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
                      <TableHead>Client</TableHead>
                      <TableHead>Form</TableHead>
                      <TableHead>Tax Year</TableHead>
                      <TableHead>Filing Deadline</TableHead>
                      <TableHead>SA Status</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-24">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.filter((p: any) => p.sa_status !== "submitted").map((p: any) => {
                      const client = p.clients as any;
                      const sc = statusConfig[p.sa_status] || statusConfig.not_started;
                      const Icon = sc.icon;
                      return (
                        <TableRow key={p.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate("/accounts")}>
                          <TableCell className="font-medium">{client?.legal_name ?? "—"}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{p.period_type?.toUpperCase()}</Badge>
                          </TableCell>
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
                    {filtered.filter((p: any) => p.sa_status !== "submitted").length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                          {selectedClientId ? "No active SA returns for this client." : "No active SA returns. Click \"New SA Return\" to get started."}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="submitted">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Submitted Returns</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Form</TableHead>
                    <TableHead>Tax Year</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.filter((p: any) => p.sa_status === "submitted").map((p: any) => {
                    const client = p.clients as any;
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{client?.legal_name ?? "—"}</TableCell>
                        <TableCell><Badge variant="outline">{p.period_type?.toUpperCase()}</Badge></TableCell>
                        <TableCell>{p.period_start} — {p.period_end}</TableCell>
                        <TableCell>{p.updated_at?.slice(0, 10)}</TableCell>
                        <TableCell>
                          <Badge variant="default" className="gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Submitted
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filtered.filter((p: any) => p.sa_status === "submitted").length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                        No submitted SA returns yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* New SA Period Dialog */}
      <Dialog open={showNewPeriod} onOpenChange={setShowNewPeriod}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Self Assessment Return</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Client</Label>
              <Select value={newPeriodClientId} onValueChange={(v) => {
                setNewPeriodClientId(v);
                const c = clients.find((cl: any) => cl.id === v);
                if (c) {
                  const et = (c as any).entity_type;
                  setNewPeriodType(et === "partnership" ? "sa800" : et === "trust" ? "sa900" : "sa100");
                }
              }}>
                <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent>
                  {clients.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.legal_name} ({c.entity_type})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Form Type</Label>
              <Select value={newPeriodType} onValueChange={setNewPeriodType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sa100">SA100 — Individual</SelectItem>
                  <SelectItem value="sa800">SA800 — Partnership</SelectItem>
                  <SelectItem value="sa900">SA900 — Trust</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Tax Year Start</Label>
                <Input type="date" value={newTaxYearStart} onChange={(e) => setNewTaxYearStart(e.target.value)} placeholder="e.g. 2024-04-06" />
              </div>
              <div className="space-y-2">
                <Label>Tax Year End</Label>
                <Input type="date" value={newTaxYearEnd} onChange={(e) => setNewTaxYearEnd(e.target.value)} placeholder="e.g. 2025-04-05" />
              </div>
            </div>
            <Button className="w-full" onClick={() => createPeriod.mutate()} disabled={!newPeriodClientId || !newTaxYearStart || !newTaxYearEnd}>
              Create Return
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
