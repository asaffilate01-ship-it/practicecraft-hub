import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KPICard } from "@/components/dashboard/KPICard";
import {
  Building2, Search, AlertTriangle, Clock, FileX, CheckCircle2,
  Plus, Send, UserPlus, UserMinus, MapPin, Hash, Share2, FileText,
  RefreshCw, ShieldAlert,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { FilingDrawer } from "@/components/secretarial/FilingDrawer";

const changeTypeLabels: Record<string, string> = {
  CONFIRMATION_STATEMENT: "Confirmation Statement",
  CHANGE_REGISTERED_OFFICE: "Change Registered Office",
  CHANGE_SAIL_ADDRESS: "Change SAIL Address",
  APPOINT_DIRECTOR: "Appoint Director",
  RESIGN_DIRECTOR: "Resign Director",
  APPOINT_SECRETARY: "Appoint Secretary",
  RESIGN_SECRETARY: "Resign Secretary",
  PSC_CHANGE: "PSC Change",
  SIC_CHANGE: "SIC Change",
  ALLOT_SHARES: "Allot Shares",
  TRANSFER_SHARES: "Transfer Shares",
  OTHER: "Other",
};

const statusBadge: Record<string, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-muted text-muted-foreground" },
  awaiting_approval: { label: "Awaiting Approval", className: "bg-warning/15 text-[hsl(var(--warning))] border-[hsl(var(--warning))]/20" },
  ready_to_file: { label: "Ready to File", className: "bg-[hsl(var(--info))]/15 text-[hsl(var(--info))] border-[hsl(var(--info))]/20" },
  queued: { label: "Queued", className: "bg-accent text-accent-foreground" },
  sent: { label: "Sent", className: "bg-primary/15 text-primary" },
  accepted: { label: "Accepted", className: "bg-[hsl(var(--success))]/15 text-[hsl(var(--success))]" },
  rejected: { label: "Rejected", className: "bg-destructive/15 text-destructive" },
  cancelled: { label: "Cancelled", className: "bg-muted text-muted-foreground" },
};

const dueBadge = (dueDate: string | null) => {
  if (!dueDate) return null;
  const days = Math.ceil((new Date(dueDate).getTime() - Date.now()) / 86400000);
  if (days < 0) return { label: `${Math.abs(days)}d overdue`, color: "destructive" as const };
  if (days <= 7) return { label: `${days}d left`, color: "destructive" as const };
  if (days <= 14) return { label: `${days}d left`, color: "secondary" as const };
  if (days <= 30) return { label: `${days}d left`, color: "outline" as const };
  return { label: `${days}d`, color: "outline" as const };
};

export default function Secretarial() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dueDateFilter, setDueDateFilter] = useState("all");
  const [drawerChangeId, setDrawerChangeId] = useState<string | null>(null);
  const [drawerClientId, setDrawerClientId] = useState<string>("");

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("tenant_id").eq("id", user!.id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Secretarial changes (workbench)
  const { data: changes = [], isLoading: changesLoading } = useQuery({
    queryKey: ["secretarial-changes", profile?.tenant_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("secretarial_changes")
        .select("*, clients(legal_name)")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.tenant_id,
  });

  // Confirmation statement cycles
  const { data: csCycles = [] } = useQuery({
    queryKey: ["cs-cycles", profile?.tenant_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("confirmation_statement_cycles")
        .select("*, clients(legal_name)")
        .in("status", ["upcoming", "due", "in_progress", "overdue"])
        .order("due_date");
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.tenant_id,
  });

  // Company profiles for auth code status
  const { data: companyProfiles = [] } = useQuery({
    queryKey: ["company-profiles", profile?.tenant_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_profiles")
        .select("client_id, company_number, company_name, company_status, last_synced_at");
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.tenant_id,
  });

  // CH filings
  const { data: filings = [] } = useQuery({
    queryKey: ["ch-filings", profile?.tenant_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ch_filings")
        .select("*, clients(legal_name)")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.tenant_id,
  });

  // KPIs
  const csOverdue = csCycles.filter((c: any) => new Date(c.due_date) < new Date()).length;
  const csDue30d = csCycles.filter((c: any) => {
    const days = Math.ceil((new Date(c.due_date).getTime() - Date.now()) / 86400000);
    return days >= 0 && days <= 30;
  }).length;
  const openChanges = changes.filter((c: any) => ["draft", "awaiting_approval", "ready_to_file", "rejected"].includes(c.status)).length;
  const rejectedFilings = filings.filter((f: any) => f.status === "rejected").length;

  // Filter changes
  const filteredChanges = changes.filter((c: any) => {
    const matchSearch = !search || (c.clients?.legal_name || "").toLowerCase().includes(search.toLowerCase()) || c.title.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // Filter CS cycles
  const filteredCS = csCycles.filter((c: any) => {
    if (dueDateFilter === "7d") {
      const days = Math.ceil((new Date(c.due_date).getTime() - Date.now()) / 86400000);
      return days <= 7;
    }
    if (dueDateFilter === "14d") {
      const days = Math.ceil((new Date(c.due_date).getTime() - Date.now()) / 86400000);
      return days <= 14;
    }
    if (dueDateFilter === "30d") {
      const days = Math.ceil((new Date(c.due_date).getTime() - Date.now()) / 86400000);
      return days <= 30;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Company Secretarial</h1>
          <p className="text-sm text-muted-foreground">Companies House filings, registers & compliance workbench</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" /> Sync All
          </Button>
          <Button className="gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Create Change
          </Button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="CS Overdue" value={csOverdue} change={csOverdue ? "Action required" : "All clear"} changeType={csOverdue ? "negative" : "positive"} icon={AlertTriangle} iconColor="bg-destructive/10" />
        <KPICard title="CS Due ≤30d" value={csDue30d} change="Confirmation statements" changeType="neutral" icon={Clock} iconColor="bg-warning/10" />
        <KPICard title="Open Changes" value={openChanges} change="Pending filing" changeType={openChanges ? "negative" : "positive"} icon={FileText} iconColor="bg-[hsl(var(--info))]/10" />
        <KPICard title="Filing Rejections" value={rejectedFilings} change="Last 50 filings" changeType={rejectedFilings ? "negative" : "positive"} icon={FileX} iconColor="bg-destructive/10" />
      </div>

      <Tabs defaultValue="workbench">
        <TabsList>
          <TabsTrigger value="workbench">Workbench</TabsTrigger>
          <TabsTrigger value="confirmation">Confirmation Statements ({csCycles.length})</TabsTrigger>
          <TabsTrigger value="filings">Filing History ({filings.length})</TabsTrigger>
        </TabsList>

        {/* Workbench Tab */}
        <TabsContent value="workbench" className="mt-4 space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search by client or title..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="All statuses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="awaiting_approval">Awaiting Approval</SelectItem>
                <SelectItem value="ready_to_file">Ready to File</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardContent className="pt-4">
              {changesLoading ? (
                <p className="text-center text-muted-foreground py-8">Loading...</p>
              ) : filteredChanges.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <Building2 className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No secretarial changes found.</p>
                  <p className="text-xs mt-1">Create a change request to file with Companies House.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>Change Type</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Updated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredChanges.map((c: any) => {
                      const sb = statusBadge[c.status] || statusBadge.draft;
                      return (
                        <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50" onClick={() => { setDrawerChangeId(c.id); setDrawerClientId(c.client_id); }}>
                          <TableCell className="font-medium">{c.clients?.legal_name || "—"}</TableCell>
                          <TableCell className="text-sm">{changeTypeLabels[c.change_type] || c.change_type}</TableCell>
                          <TableCell className="text-sm">{c.title}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn("text-xs", sb.className)}>{sb.label}</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(c.updated_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Confirmation Statements Tab */}
        <TabsContent value="confirmation" className="mt-4 space-y-4">
          <div className="flex items-center gap-3">
            <Select value={dueDateFilter} onValueChange={setDueDateFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="All due dates" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All due dates</SelectItem>
                <SelectItem value="7d">Due in 7 days</SelectItem>
                <SelectItem value="14d">Due in 14 days</SelectItem>
                <SelectItem value="30d">Due in 30 days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardContent className="pt-4">
              {filteredCS.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No confirmation statements due.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Review Period</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Urgency</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCS.map((cs: any) => {
                      const due = dueBadge(cs.due_date);
                      return (
                        <TableRow key={cs.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/clients/${cs.client_id}`)}>
                          <TableCell className="font-medium">{cs.clients?.legal_name || "—"}</TableCell>
                          <TableCell className="text-sm">{new Date(cs.due_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(cs.review_period_start).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – {new Date(cs.review_period_end).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-xs capitalize">{cs.status}</Badge>
                          </TableCell>
                          <TableCell>
                            {due && <Badge variant={due.color} className="text-xs">{due.label}</Badge>}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Filing History Tab */}
        <TabsContent value="filings" className="mt-4">
          <Card>
            <CardContent className="pt-4">
              {filings.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No Companies House filings recorded yet.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>Filing Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>CH Transaction</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filings.map((f: any) => (
                      <TableRow key={f.id}>
                        <TableCell className="font-medium">{f.clients?.legal_name || "—"}</TableCell>
                        <TableCell className="text-sm">{changeTypeLabels[f.filing_type] || f.filing_type}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{f.filing_description || "—"}</TableCell>
                        <TableCell>
                          <Badge variant={f.status === "accepted" ? "default" : f.status === "rejected" ? "destructive" : "secondary"} className="text-xs capitalize">{f.status}</Badge>
                        </TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">{f.ch_transaction_id || "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(f.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
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

      <FilingDrawer
        open={!!drawerChangeId}
        onOpenChange={(open) => { if (!open) setDrawerChangeId(null); }}
        changeId={drawerChangeId}
        clientId={drawerClientId}
      />
    </div>
  );
}
