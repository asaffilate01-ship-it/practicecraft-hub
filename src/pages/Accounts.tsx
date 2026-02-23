import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { KPICard } from "@/components/dashboard/KPICard";
import { DueDatePill } from "@/components/ui/due-date-pill";
import {
  Search, Plus, BookOpen, Calculator, CheckCircle2,
  AlertTriangle, Eye, Pencil,
} from "lucide-react";
import { toast } from "sonner";

const statusVariant = (s: string) => {
  if (s === "filed" || s === "submitted") return "default" as const;
  if (s === "overdue") return "destructive" as const;
  return "secondary" as const;
};

const ctSaStatuses = ["not_applicable", "not_started", "in_progress", "review", "filed"];

export default function AccountsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showNewPeriod, setShowNewPeriod] = useState(false);
  const [detailPeriod, setDetailPeriod] = useState<any>(null);
  const [editMode, setEditMode] = useState(false);

  const [newClientId, setNewClientId] = useState("");
  const [newPeriodStart, setNewPeriodStart] = useState("");
  const [newPeriodEnd, setNewPeriodEnd] = useState("");
  const [newDeadline, setNewDeadline] = useState("");
  const [newStandard, setNewStandard] = useState("FRS 102 Section 1A");
  const [newPeriodType, setNewPeriodType] = useState("annual");

  const [editForm, setEditForm] = useState({
    status: "", ct600_status: "", sa_status: "", accounts_standard: "",
    filing_deadline: "", notes: "", period_type: "",
  });

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("tenant_id").eq("id", user!.id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: periods = [], isLoading } = useQuery({
    queryKey: ["accounts-periods", profile?.tenant_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accounts_periods")
        .select("*, clients(legal_name, entity_type, company_number, utr)")
        .order("filing_deadline", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.tenant_id,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients-list", profile?.tenant_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, legal_name, entity_type")
        .eq("status", "active")
        .order("legal_name");
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.tenant_id,
  });

  const createPeriod = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("accounts_periods").insert({
        tenant_id: profile!.tenant_id,
        client_id: newClientId,
        period_start: newPeriodStart,
        period_end: newPeriodEnd,
        filing_deadline: newDeadline || null,
        accounts_standard: newStandard,
        period_type: newPeriodType,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts-periods"] });
      setShowNewPeriod(false);
      toast.success("Accounting period created");
    },
  });

  const updatePeriod = useMutation({
    mutationFn: async () => {
      if (!detailPeriod) return;
      const { error } = await supabase.from("accounts_periods").update({
        status: editForm.status,
        ct600_status: editForm.ct600_status,
        sa_status: editForm.sa_status,
        accounts_standard: editForm.accounts_standard,
        filing_deadline: editForm.filing_deadline || null,
        notes: editForm.notes || null,
        period_type: editForm.period_type,
      }).eq("id", detailPeriod.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts-periods"] });
      setEditMode(false);
      setDetailPeriod(null);
      toast.success("Period updated");
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("accounts_periods").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts-periods"] });
      toast.success("Status updated");
    },
  });

  const openDetail = (p: any) => {
    setDetailPeriod(p);
    setEditForm({
      status: p.status,
      ct600_status: p.ct600_status,
      sa_status: p.sa_status,
      accounts_standard: p.accounts_standard,
      filing_deadline: p.filing_deadline || "",
      notes: p.notes || "",
      period_type: p.period_type || "annual",
    });
    setEditMode(false);
  };

  const now = new Date();
  const openPeriods = periods.filter((p: any) => ["open", "in_progress", "review"].includes(p.status)).length;
  const overduePeriods = periods.filter((p: any) => p.filing_deadline && new Date(p.filing_deadline) < now && !["filed", "submitted"].includes(p.status)).length;
  const ct600Pending = periods.filter((p: any) => p.ct600_status === "in_progress").length;
  const saPending = periods.filter((p: any) => p.sa_status === "in_progress").length;
  const filedPeriods = periods.filter((p: any) => p.status === "filed").length;

  const ctPeriods = periods.filter((p: any) => p.ct600_status !== "not_applicable");
  const saPeriods = periods.filter((p: any) => p.sa_status !== "not_applicable");

  const filtered = useMemo(() => {
    return periods.filter((p: any) => {
      const matchSearch = !search || (p.clients?.legal_name || "").toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "all" || p.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [periods, search, statusFilter]);

  const PeriodTable = ({ data, showCt = true, showSa = true }: { data: any[]; showCt?: boolean; showSa?: boolean }) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Client</TableHead>
          <TableHead>Period</TableHead>
          <TableHead>Standard</TableHead>
          <TableHead>Filing Deadline</TableHead>
          {showCt && <TableHead>CT600</TableHead>}
          {showSa && <TableHead>SA100</TableHead>}
          <TableHead>Status</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((p: any) => (
          <TableRow key={p.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openDetail(p)}>
            <TableCell>
              <div>
                <p className="text-sm font-medium">{p.clients?.legal_name || "—"}</p>
                <p className="text-xs text-muted-foreground capitalize">{p.clients?.entity_type || ""}{p.clients?.utr ? ` · UTR: ${p.clients.utr}` : ""}</p>
              </div>
            </TableCell>
            <TableCell className="text-sm">
              {new Date(p.period_start).toLocaleDateString("en-GB", { month: "short", year: "numeric" })} – {new Date(p.period_end).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}
            </TableCell>
            <TableCell className="text-xs">{p.accounts_standard}</TableCell>
            <TableCell>
              {p.filing_deadline ? <DueDatePill dueDate={p.filing_deadline} /> : <span className="text-xs text-muted-foreground">—</span>}
            </TableCell>
            {showCt && <TableCell><Badge variant="outline" className="text-[10px] capitalize">{p.ct600_status.replace("_", " ")}</Badge></TableCell>}
            {showSa && <TableCell><Badge variant="outline" className="text-[10px] capitalize">{p.sa_status.replace("_", " ")}</Badge></TableCell>}
            <TableCell><Badge variant={statusVariant(p.status)} className="text-xs capitalize">{p.status.replace("_", " ")}</Badge></TableCell>
            <TableCell>
              <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="sm" onClick={() => openDetail(p)}>
                  <Eye className="w-3.5 h-3.5" />
                </Button>
                {p.status === "open" && (
                  <Button variant="outline" size="sm" onClick={() => updateStatus.mutate({ id: p.id, status: "in_progress" })}>Start</Button>
                )}
                {p.status === "in_progress" && (
                  <Button variant="outline" size="sm" onClick={() => updateStatus.mutate({ id: p.id, status: "review" })}>To Review</Button>
                )}
                {p.status === "review" && (
                  <Button variant="outline" size="sm" onClick={() => updateStatus.mutate({ id: p.id, status: "filed" })}>Mark Filed</Button>
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Accounts, CT600 & Self Assessment</h1>
          <p className="text-sm text-muted-foreground">Year-end accounts, Corporation Tax returns, and Self Assessment filings</p>
        </div>
        <Button className="gap-1.5" onClick={() => setShowNewPeriod(true)}>
          <Plus className="w-3.5 h-3.5" /> New Period
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <KPICard title="Open Periods" value={openPeriods} change="In progress" changeType={openPeriods ? "negative" : "positive"} icon={BookOpen} iconColor="bg-primary/10" />
        <KPICard title="Overdue" value={overduePeriods} change="Past filing deadline" changeType={overduePeriods ? "negative" : "positive"} icon={AlertTriangle} iconColor="bg-destructive/10" />
        <KPICard title="CT600 In Progress" value={ct600Pending} change="Corporation tax" changeType="neutral" icon={Calculator} iconColor="bg-warning/10" />
        <KPICard title="SA In Progress" value={saPending} change="Self Assessment" changeType="neutral" icon={Calculator} iconColor="bg-[hsl(var(--info))]/10" />
        <KPICard title="Filed" value={filedPeriods} change="Completed" changeType="positive" icon={CheckCircle2} iconColor="bg-[hsl(var(--success))]/10" />
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All Periods ({periods.length})</TabsTrigger>
          <TabsTrigger value="ct600">Corporation Tax ({ctPeriods.length})</TabsTrigger>
          <TabsTrigger value="sa">Self Assessment ({saPeriods.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search by client..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="All statuses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="review">Under Review</SelectItem>
                <SelectItem value="filed">Filed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Card>
            <CardContent className="pt-4">
              {isLoading ? (
                <div className="space-y-3 py-6">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-10 rounded bg-muted animate-pulse" />)}</div>
              ) : filtered.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No accounting periods found.</p>
                </div>
              ) : (
                <PeriodTable data={filtered} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ct600" className="mt-4">
          <Card>
            <CardContent className="pt-4">
              {ctPeriods.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <Calculator className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No Corporation Tax periods. CT600 applies to limited companies.</p>
                  <p className="text-xs mt-1">Create a period for an Ltd/LLP client and set CT600 status.</p>
                </div>
              ) : (
                <PeriodTable data={ctPeriods} showSa={false} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sa" className="mt-4">
          <Card>
            <CardContent className="pt-4">
              {saPeriods.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <Calculator className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No Self Assessment periods. SA100 applies to sole traders, partners, and trust returns.</p>
                  <p className="text-xs mt-1">Create a period for a sole trader/partnership client and set SA status.</p>
                </div>
              ) : (
                <PeriodTable data={saPeriods} showCt={false} />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Period Detail / Edit Dialog */}
      <Dialog open={!!detailPeriod} onOpenChange={(open) => { if (!open) { setDetailPeriod(null); setEditMode(false); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>
                {detailPeriod?.clients?.legal_name || "Period"} — {detailPeriod?.period_start && new Date(detailPeriod.period_start).toLocaleDateString("en-GB", { month: "short", year: "numeric" })} to {detailPeriod?.period_end && new Date(detailPeriod.period_end).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}
              </DialogTitle>
              {!editMode && (
                <Button variant="ghost" size="sm" onClick={() => setEditMode(true)}>
                  <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
                </Button>
              )}
            </div>
          </DialogHeader>

          {detailPeriod && !editMode && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Entity Type:</span> <span className="font-medium ml-1 capitalize">{detailPeriod.clients?.entity_type}</span></div>
                <div><span className="text-muted-foreground">Company No:</span> <span className="font-medium ml-1">{detailPeriod.clients?.company_number || "—"}</span></div>
                <div><span className="text-muted-foreground">UTR:</span> <span className="font-medium ml-1">{detailPeriod.clients?.utr || "—"}</span></div>
                <div><span className="text-muted-foreground">Standard:</span> <span className="font-medium ml-1">{detailPeriod.accounts_standard}</span></div>
                <div><span className="text-muted-foreground">Type:</span> <span className="font-medium ml-1 capitalize">{detailPeriod.period_type}</span></div>
                <div><span className="text-muted-foreground">Filing Deadline:</span> <span className="ml-1">{detailPeriod.filing_deadline ? <DueDatePill dueDate={detailPeriod.filing_deadline} /> : "—"}</span></div>
              </div>

              <div className="border rounded-lg p-4 space-y-3">
                <h3 className="text-sm font-semibold">Filing Status</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="border rounded p-3 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Accounts</p>
                    <Badge variant={statusVariant(detailPeriod.status)} className="capitalize">{detailPeriod.status.replace("_", " ")}</Badge>
                  </div>
                  <div className="border rounded p-3 text-center">
                    <p className="text-xs text-muted-foreground mb-1">CT600</p>
                    <Badge variant={statusVariant(detailPeriod.ct600_status)} className="capitalize">{detailPeriod.ct600_status.replace("_", " ")}</Badge>
                  </div>
                  <div className="border rounded p-3 text-center">
                    <p className="text-xs text-muted-foreground mb-1">SA100</p>
                    <Badge variant={statusVariant(detailPeriod.sa_status)} className="capitalize">{detailPeriod.sa_status.replace("_", " ")}</Badge>
                  </div>
                </div>
              </div>

              {detailPeriod.notes && (
                <div className="border rounded-lg p-4">
                  <h3 className="text-sm font-semibold mb-1">Notes</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{detailPeriod.notes}</p>
                </div>
              )}
            </div>
          )}

          {detailPeriod && editMode && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Accounts Status</Label>
                  <Select value={editForm.status} onValueChange={(v) => setEditForm({ ...editForm, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="review">Under Review</SelectItem>
                      <SelectItem value="filed">Filed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Period Type</Label>
                  <Select value={editForm.period_type} onValueChange={(v) => setEditForm({ ...editForm, period_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="annual">Annual</SelectItem>
                      <SelectItem value="transition">Transition</SelectItem>
                      <SelectItem value="short">Short Period</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>CT600 Status</Label>
                  <Select value={editForm.ct600_status} onValueChange={(v) => setEditForm({ ...editForm, ct600_status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ctSaStatuses.map(s => <SelectItem key={s} value={s} className="capitalize">{s.replace("_", " ")}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>SA100 Status</Label>
                  <Select value={editForm.sa_status} onValueChange={(v) => setEditForm({ ...editForm, sa_status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ctSaStatuses.map(s => <SelectItem key={s} value={s} className="capitalize">{s.replace("_", " ")}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Accounts Standard</Label>
                  <Select value={editForm.accounts_standard} onValueChange={(v) => setEditForm({ ...editForm, accounts_standard: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FRS 102 Section 1A">FRS 102 Section 1A</SelectItem>
                      <SelectItem value="FRS 102">FRS 102 (Full)</SelectItem>
                      <SelectItem value="FRS 105">FRS 105 (Micro)</SelectItem>
                      <SelectItem value="Charity SORP">Charity SORP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Filing Deadline</Label>
                  <Input type="date" value={editForm.filing_deadline} onChange={(e) => setEditForm({ ...editForm, filing_deadline: e.target.value })} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} rows={3} placeholder="Internal notes, tax computation details..." />
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setEditMode(false)}>Cancel</Button>
                <Button onClick={() => updatePeriod.mutate()} disabled={updatePeriod.isPending}>
                  {updatePeriod.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* New period dialog */}
      <Dialog open={showNewPeriod} onOpenChange={setShowNewPeriod}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Accounting Period</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Client</Label>
              <Select value={newClientId} onValueChange={setNewClientId}>
                <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent>
                  {clients.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.legal_name}</SelectItem>
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
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Filing Deadline</Label>
                <Input type="date" value={newDeadline} onChange={(e) => setNewDeadline(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Period Type</Label>
                <Select value={newPeriodType} onValueChange={setNewPeriodType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="annual">Annual</SelectItem>
                    <SelectItem value="transition">Transition</SelectItem>
                    <SelectItem value="short">Short Period</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Accounts Standard</Label>
              <Select value={newStandard} onValueChange={setNewStandard}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="FRS 102 Section 1A">FRS 102 Section 1A</SelectItem>
                  <SelectItem value="FRS 102">FRS 102 (Full)</SelectItem>
                  <SelectItem value="FRS 105">FRS 105 (Micro)</SelectItem>
                  <SelectItem value="Charity SORP">Charity SORP</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={() => createPeriod.mutate()} disabled={!newClientId || !newPeriodStart || !newPeriodEnd}>
              Create Period
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}