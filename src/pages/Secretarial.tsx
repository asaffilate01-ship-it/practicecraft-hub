import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { KPICard } from "@/components/dashboard/KPICard";
import { StatusBadge } from "@/components/ui/status-badge";
import { DueDatePill } from "@/components/ui/due-date-pill";
import {
  Building2, Search, AlertTriangle, Clock, FileX, FileText,
  Plus, CheckCircle2, Users, Download,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { FilingDrawer } from "@/components/secretarial/FilingDrawer";
import { ChangeWizard } from "@/components/secretarial/ChangeWizard";
import { CompanyPortfolio } from "@/components/secretarial/CompanyPortfolio";
import { qk } from "@/lib/queryKeys";

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

const changeTypeOptions = Object.entries(changeTypeLabels);

export default function Secretarial() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dueDateFilter, setDueDateFilter] = useState("all");

  // Selection & drawers
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [drawerChangeId, setDrawerChangeId] = useState<string | null>(null);
  const [drawerClientId, setDrawerClientId] = useState("");
  const [showWizard, setShowWizard] = useState(false);
  const [wizardClientId, setWizardClientId] = useState("");

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("tenant_id").eq("id", user!.id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Secretarial changes
  const { data: changes = [], isLoading: changesLoading } = useQuery({
    queryKey: qk.secretarial.workbench({ tenant: profile?.tenant_id }),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("secretarial_changes")
        .select("*, clients(legal_name, company_number)")
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

  // Auth code status per client
  const { data: authCodes = [] } = useQuery({
    queryKey: ["auth-codes", profile?.tenant_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_credentials")
        .select("client_id, credential_type, expires_at")
        .eq("credential_type", "auth_code");
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

  const { data: companyChoices = [] } = useQuery({
    queryKey: ["secretarial-company-choices", profile?.tenant_id],
    queryFn: async () => {
      const { data, error } = await supabase.from("company_profiles").select("client_id,company_name,company_number").order("company_name");
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.tenant_id,
  });

  // Build auth code lookup
  const authCodeMap = useMemo(() => {
    const map = new Map<string, boolean>();
    authCodes.forEach((ac: any) => map.set(ac.client_id, true));
    return map;
  }, [authCodes]);

  // KPIs
  const csOverdue = csCycles.filter((c: any) => new Date(c.due_date) < new Date()).length;
  const csDue30d = csCycles.filter((c: any) => {
    const days = Math.ceil((new Date(c.due_date).getTime() - Date.now()) / 86400000);
    return days >= 0 && days <= 30;
  }).length;
  const openChanges = changes.filter((c: any) =>
    ["draft", "awaiting_approval", "ready_to_file", "rejected"].includes(c.status)
  ).length;
  const rejectedFilings = filings.filter((f: any) => f.status === "rejected").length;

  // Filter changes
  const filteredChanges = useMemo(() => {
    return changes.filter((c: any) => {
      const matchSearch =
        !search ||
        (c.clients?.legal_name || "").toLowerCase().includes(search.toLowerCase()) ||
        c.title.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "all" || c.status === statusFilter;
      const matchType = typeFilter === "all" || c.change_type === typeFilter;
      return matchSearch && matchStatus && matchType;
    });
  }, [changes, search, statusFilter, typeFilter]);

  // Filter CS cycles
  const filteredCS = useMemo(() => {
    return csCycles.filter((c: any) => {
      if (dueDateFilter === "all") return true;
      const days = Math.ceil((new Date(c.due_date).getTime() - Date.now()) / 86400000);
      if (dueDateFilter === "7d") return days <= 7;
      if (dueDateFilter === "14d") return days <= 14;
      if (dueDateFilter === "30d") return days <= 30;
      return true;
    });
  }, [csCycles, dueDateFilter]);

  // Selection helpers
  const toggleRow = (id: string) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedRows.size === filteredChanges.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(filteredChanges.map((c: any) => c.id)));
    }
  };

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setTypeFilter("all");
  };

  const hasActiveFilters = search || statusFilter !== "all" || typeFilter !== "all";

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="workspace-eyebrow">Governance and statutory compliance</p>
          <h1 className="mt-1 font-serif text-3xl font-semibold tracking-tight">Company Secretarial</h1>
          <p className="text-sm text-muted-foreground">
            One portfolio for company records, statutory registers, approvals and Companies House evidence.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:justify-end">
          <Select value={wizardClientId} onValueChange={setWizardClientId}>
            <SelectTrigger className="w-full bg-card sm:w-64"><SelectValue placeholder="Choose company" /></SelectTrigger>
            <SelectContent>{companyChoices.map((company) => <SelectItem key={company.client_id} value={company.client_id}>{company.company_name} · {company.company_number}</SelectItem>)}</SelectContent>
          </Select>
          <Button className="gap-1.5" onClick={() => setShowWizard(true)} disabled={!wizardClientId}>
            <Plus className="w-3.5 h-3.5" /> Create Change
          </Button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="CS Overdue"
          value={csOverdue}
          change={csOverdue ? "Action required" : "All clear"}
          changeType={csOverdue ? "negative" : "positive"}
          icon={AlertTriangle}
          iconColor="bg-destructive/10"
        />
        <KPICard
          title="CS Due ≤30d"
          value={csDue30d}
          change="Confirmation statements"
          changeType="neutral"
          icon={Clock}
          iconColor="bg-warning/10"
        />
        <KPICard
          title="Open Changes"
          value={openChanges}
          change="Pending filing"
          changeType={openChanges ? "negative" : "positive"}
          icon={FileText}
          iconColor="bg-[hsl(var(--info))]/10"
        />
        <KPICard
          title="Filing Rejections"
          value={rejectedFilings}
          change="Last 50 filings"
          changeType={rejectedFilings ? "negative" : "positive"}
          icon={FileX}
          iconColor="bg-destructive/10"
        />
      </div>

      <Tabs defaultValue="portfolio">
        <div className="overflow-x-auto pb-1">
        <TabsList className="w-max min-w-full justify-start">
          <TabsTrigger value="portfolio">Company Portfolio</TabsTrigger>
          <TabsTrigger value="workbench">Workbench</TabsTrigger>
          <TabsTrigger value="confirmation">
            Confirmation Statements ({csCycles.length})
          </TabsTrigger>
          <TabsTrigger value="filings">Filing History ({filings.length})</TabsTrigger>
        </TabsList>
        </div>

        <TabsContent value="portfolio" className="mt-4">
          <CompanyPortfolio />
        </TabsContent>

        {/* ── Workbench Tab ─────────────────────────────── */}
        <TabsContent value="workbench" className="mt-4 space-y-4">
          {/* Filter bar */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by client or title..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[170px]">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="awaiting_approval">Awaiting Approval</SelectItem>
                <SelectItem value="ready_to_file">Ready to File</SelectItem>
                <SelectItem value="queued">Queued</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {changeTypeOptions.map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs">
                Clear filters
              </Button>
            )}
          </div>

          {/* Bulk actions bar */}
          {selectedRows.size > 0 && (
            <div className="flex items-center gap-3 rounded-lg border bg-muted/50 px-4 py-2">
              <span className="text-sm font-medium">
                {selectedRows.size} selected
              </span>
              <div className="flex gap-2 ml-auto">
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Users className="w-3.5 h-3.5" /> Assign
                </Button>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Download className="w-3.5 h-3.5" /> Export CSV
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedRows(new Set())}
                >
                  Clear
                </Button>
              </div>
            </div>
          )}

          {/* Data table */}
          <Card>
            <CardContent className="pt-4">
              {changesLoading ? (
                <div className="space-y-3 py-6">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-10 rounded bg-muted animate-pulse" />
                  ))}
                </div>
              ) : filteredChanges.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <Building2 className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No secretarial changes found.</p>
                  <p className="text-xs mt-1">
                    Create a change request to file with Companies House.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <Checkbox
                          checked={
                            selectedRows.size === filteredChanges.length &&
                            filteredChanges.length > 0
                          }
                          onCheckedChange={toggleAll}
                        />
                      </TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Change Type</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Auth Code</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Updated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredChanges.map((c: any) => {
                      const hasAuthCode = authCodeMap.has(c.client_id);
                      return (
                        <TableRow
                          key={c.id}
                          className={cn(
                            "cursor-pointer hover:bg-muted/50",
                            selectedRows.has(c.id) && "bg-accent/30"
                          )}
                          onClick={() => {
                            setDrawerChangeId(c.id);
                            setDrawerClientId(c.client_id);
                          }}
                        >
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={selectedRows.has(c.id)}
                              onCheckedChange={() => toggleRow(c.id)}
                            />
                          </TableCell>
                          <TableCell className="font-medium">
                            {c.clients?.legal_name || "—"}
                          </TableCell>
                          <TableCell className="text-sm">
                            {changeTypeLabels[c.change_type] || c.change_type}
                          </TableCell>
                          <TableCell className="text-sm max-w-[200px] truncate">
                            {c.title}
                          </TableCell>
                          <TableCell>
                            {c.requires_auth_code ? (
                              hasAuthCode ? (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] border-[hsl(var(--success))]/30 text-[hsl(var(--success))] bg-[hsl(var(--success))]/10"
                                >
                                  Stored ✓
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] border-destructive/30 text-destructive bg-destructive/10"
                                >
                                  Missing
                                </Badge>
                              )
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={c.status} />
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(c.updated_at).toLocaleDateString("en-GB", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
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

        {/* ── Confirmation Statements Tab ──────────────── */}
        <TabsContent value="confirmation" className="mt-4 space-y-4">
          <div className="flex items-center gap-3">
            <Select value={dueDateFilter} onValueChange={setDueDateFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All due dates" />
              </SelectTrigger>
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
                    {filteredCS.map((cs: any) => (
                      <TableRow
                        key={cs.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => navigate(`/clients/${cs.client_id}`)}
                      >
                        <TableCell className="font-medium">
                          {cs.clients?.legal_name || "—"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {new Date(cs.due_date).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(cs.review_period_start).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                          })}{" "}
                          –{" "}
                          {new Date(cs.review_period_end).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={cs.status} />
                        </TableCell>
                        <TableCell>
                          <DueDatePill dueDate={cs.due_date} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Filing History Tab ────────────────────────── */}
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
                        <TableCell className="font-medium">
                          {f.clients?.legal_name || "—"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {changeTypeLabels[f.filing_type] || f.filing_type}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {f.filing_description || "—"}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={f.status} />
                        </TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">
                          {f.ch_transaction_id || "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(f.created_at).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
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
        onOpenChange={(open) => {
          if (!open) setDrawerChangeId(null);
        }}
        changeId={drawerChangeId}
        clientId={drawerClientId}
      />

      <ChangeWizard
        open={showWizard}
        onOpenChange={setShowWizard}
        clientId={wizardClientId}
      />
    </div>
  );
}
