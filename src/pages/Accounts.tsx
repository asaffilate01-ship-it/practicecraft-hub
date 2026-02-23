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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { KPICard } from "@/components/dashboard/KPICard";
import { DueDatePill } from "@/components/ui/due-date-pill";
import {
  Search, Plus, FileText, Clock, CheckCircle2,
  AlertTriangle, BookOpen, Calculator,
} from "lucide-react";
import { toast } from "sonner";

const statusVariant = (s: string) => {
  if (s === "filed" || s === "submitted") return "default" as const;
  if (s === "overdue") return "destructive" as const;
  return "secondary" as const;
};

export default function AccountsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showNewPeriod, setShowNewPeriod] = useState(false);

  // Form state
  const [newClientId, setNewClientId] = useState("");
  const [newPeriodStart, setNewPeriodStart] = useState("");
  const [newPeriodEnd, setNewPeriodEnd] = useState("");
  const [newDeadline, setNewDeadline] = useState("");
  const [newStandard, setNewStandard] = useState("FRS 102 Section 1A");

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
        .select("*, clients(legal_name, entity_type, company_number)")
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
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts-periods"] });
      setShowNewPeriod(false);
      toast.success("Accounting period created");
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

  // KPIs
  const now = new Date();
  const openPeriods = periods.filter((p: any) => ["open", "in_progress", "review"].includes(p.status)).length;
  const overduePeriods = periods.filter((p: any) => p.filing_deadline && new Date(p.filing_deadline) < now && !["filed", "submitted"].includes(p.status)).length;
  const ct600Pending = periods.filter((p: any) => p.ct600_status === "in_progress").length;
  const filedPeriods = periods.filter((p: any) => p.status === "filed").length;

  const filtered = useMemo(() => {
    return periods.filter((p: any) => {
      const matchSearch = !search || (p.clients?.legal_name || "").toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "all" || p.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [periods, search, statusFilter]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Accounts Production</h1>
          <p className="text-sm text-muted-foreground">FRS 102/105 accounts, CT600, SA100 — year-end workflow and filing</p>
        </div>
        <Button className="gap-1.5" onClick={() => setShowNewPeriod(true)}>
          <Plus className="w-3.5 h-3.5" /> New Period
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Open Periods" value={openPeriods} change="In progress" changeType={openPeriods ? "negative" : "positive"} icon={BookOpen} iconColor="bg-primary/10" />
        <KPICard title="Overdue" value={overduePeriods} change="Past filing deadline" changeType={overduePeriods ? "negative" : "positive"} icon={AlertTriangle} iconColor="bg-destructive/10" />
        <KPICard title="CT600 In Progress" value={ct600Pending} change="Corporation tax" changeType="neutral" icon={Calculator} iconColor="bg-warning/10" />
        <KPICard title="Filed" value={filedPeriods} change="Completed periods" changeType="positive" icon={CheckCircle2} iconColor="bg-[hsl(var(--success))]/10" />
      </div>

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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Standard</TableHead>
                  <TableHead>Filing Deadline</TableHead>
                  <TableHead>CT600</TableHead>
                  <TableHead>SA</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium">{p.clients?.legal_name || "—"}</p>
                        <p className="text-xs text-muted-foreground capitalize">{p.clients?.entity_type || ""}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(p.period_start).toLocaleDateString("en-GB", { month: "short", year: "numeric" })} – {new Date(p.period_end).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}
                    </TableCell>
                    <TableCell className="text-xs">{p.accounts_standard}</TableCell>
                    <TableCell>
                      {p.filing_deadline ? <DueDatePill dueDate={p.filing_deadline} /> : <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px] capitalize">{p.ct600_status.replace("_", " ")}</Badge></TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px] capitalize">{p.sa_status.replace("_", " ")}</Badge></TableCell>
                    <TableCell><Badge variant={statusVariant(p.status)} className="text-xs capitalize">{p.status.replace("_", " ")}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
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
          )}
        </CardContent>
      </Card>

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
            <div className="space-y-2">
              <Label>Filing Deadline</Label>
              <Input type="date" value={newDeadline} onChange={(e) => setNewDeadline(e.target.value)} />
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
