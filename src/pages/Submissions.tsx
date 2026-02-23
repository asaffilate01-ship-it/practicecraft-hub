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
import { KPICard } from "@/components/dashboard/KPICard";
import { StatusBadge } from "@/components/ui/status-badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Search, Send, RotateCcw, XCircle, Eye, CheckCircle2,
  AlertTriangle, Clock, Loader2, Ban,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { qk } from "@/lib/queryKeys";
import { toast } from "sonner";

const providerLabels: Record<string, string> = {
  hmrc: "HMRC",
  companies_house: "Companies House",
  charity_commission: "Charity Commission",
  open_banking: "Open Banking",
  stripe: "Stripe",
  gocardless: "GoCardless",
};

const statusIcons: Record<string, typeof Send> = {
  draft: Clock,
  queued: Loader2,
  sent: Send,
  accepted: CheckCircle2,
  rejected: AlertTriangle,
  cancelled: Ban,
};

export default function SubmissionsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [providerFilter, setProviderFilter] = useState("all");
  const [viewJob, setViewJob] = useState<any>(null);

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("tenant_id").eq("id", user!.id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: qk.submissions.jobs({ tenant: profile?.tenant_id }),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("submission_jobs")
        .select("*, clients(legal_name, company_number)")
        .order("updated_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.tenant_id,
  });

  // Retry mutation
  const retryMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const { error } = await supabase
        .from("submission_jobs")
        .update({ status: "queued", next_retry_at: new Date().toISOString() })
        .eq("id", jobId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["submissions"] });
      toast.success("Job re-queued for retry");
    },
    onError: (e) => toast.error(e.message),
  });

  // Cancel mutation
  const cancelMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const { error } = await supabase
        .from("submission_jobs")
        .update({ status: "cancelled" })
        .eq("id", jobId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["submissions"] });
      toast.success("Job cancelled");
    },
    onError: (e) => toast.error(e.message),
  });

  // KPIs
  const queued = jobs.filter((j: any) => j.status === "queued").length;
  const sent = jobs.filter((j: any) => j.status === "sent").length;
  const accepted = jobs.filter((j: any) => j.status === "accepted").length;
  const rejected = jobs.filter((j: any) => j.status === "rejected").length;

  // Filtered
  const filtered = useMemo(() => {
    return jobs.filter((j: any) => {
      const matchSearch = !search ||
        (j.clients?.legal_name || "").toLowerCase().includes(search.toLowerCase()) ||
        j.submission_type.toLowerCase().includes(search.toLowerCase()) ||
        j.idempotency_key.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "all" || j.status === statusFilter;
      const matchProvider = providerFilter === "all" || j.provider === providerFilter;
      return matchSearch && matchStatus && matchProvider;
    });
  }, [jobs, search, statusFilter, providerFilter]);

  const activeJobs = filtered.filter((j: any) => ["draft", "queued", "sent"].includes(j.status));
  const terminalJobs = filtered.filter((j: any) => ["accepted", "rejected", "cancelled"].includes(j.status));

  const hasActiveFilters = search || statusFilter !== "all" || providerFilter !== "all";
  const clearFilters = () => { setSearch(""); setStatusFilter("all"); setProviderFilter("all"); };

  const renderTable = (data: any[], showActions: boolean) => (
    <Card>
      <CardContent className="pt-4">
        {isLoading ? (
          <div className="space-y-3 py-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-10 rounded bg-muted animate-pulse" />
            ))}
          </div>
        ) : data.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <Send className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No submission jobs found.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Attempts</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((job: any) => {
                const StatusIcon = statusIcons[job.status] || Clock;
                return (
                  <TableRow key={job.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setViewJob(job)}>
                    <TableCell className="font-medium">{job.clients?.legal_name || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {providerLabels[job.provider] || job.provider}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm capitalize">{job.submission_type.replace(/_/g, " ")}</TableCell>
                    <TableCell>
                      <StatusBadge status={job.status} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground text-center">{job.attempt_count}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(job.updated_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewJob(job)}>
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        {showActions && ["rejected", "draft"].includes(job.status) && (
                          <Button
                            variant="ghost" size="icon" className="h-7 w-7 text-primary"
                            onClick={() => retryMutation.mutate(job.id)}
                            disabled={retryMutation.isPending}
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        {showActions && ["queued", "draft"].includes(job.status) && (
                          <Button
                            variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                            onClick={() => cancelMutation.mutate(job.id)}
                            disabled={cancelMutation.isPending}
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Submissions</h1>
        <p className="text-sm text-muted-foreground">Track all regulatory submission jobs across HMRC and Companies House</p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Queued" value={queued} change="Awaiting submission" changeType="neutral" icon={Clock} iconColor="bg-accent" />
        <KPICard title="In Flight" value={sent} change="Sent to provider" changeType={sent ? "negative" : "positive"} icon={Send} iconColor="bg-[hsl(var(--info))]/10" />
        <KPICard title="Accepted" value={accepted} change="Successfully filed" changeType="positive" icon={CheckCircle2} iconColor="bg-[hsl(var(--success))]/10" />
        <KPICard title="Rejected" value={rejected} change={rejected ? "Review required" : "None"} changeType={rejected ? "negative" : "positive"} icon={AlertTriangle} iconColor="bg-destructive/10" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by client, type, or key..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="All statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="queued">Queued</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="accepted">Accepted</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Select value={providerFilter} onValueChange={setProviderFilter}>
          <SelectTrigger className="w-[190px]"><SelectValue placeholder="All providers" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All providers</SelectItem>
            <SelectItem value="hmrc">HMRC</SelectItem>
            <SelectItem value="companies_house">Companies House</SelectItem>
            <SelectItem value="charity_commission">Charity Commission</SelectItem>
          </SelectContent>
        </Select>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs">Clear filters</Button>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">Active ({activeJobs.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({terminalJobs.length})</TabsTrigger>
          <TabsTrigger value="all">All ({filtered.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="active" className="mt-4">
          {renderTable(activeJobs, true)}
        </TabsContent>
        <TabsContent value="completed" className="mt-4">
          {renderTable(terminalJobs, false)}
        </TabsContent>
        <TabsContent value="all" className="mt-4">
          {renderTable(filtered, true)}
        </TabsContent>
      </Tabs>

      {/* Job Detail Dialog */}
      <Dialog open={!!viewJob} onOpenChange={(open) => { if (!open) setViewJob(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Submission Details</DialogTitle></DialogHeader>
          {viewJob && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-muted-foreground">Client</span>
                  <p className="font-medium">{viewJob.clients?.legal_name || "—"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Provider</span>
                  <p className="font-medium">{providerLabels[viewJob.provider] || viewJob.provider}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Type</span>
                  <p className="font-medium capitalize">{viewJob.submission_type.replace(/_/g, " ")}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Status</span>
                  <div className="mt-0.5"><StatusBadge status={viewJob.status} /></div>
                </div>
                <div>
                  <span className="text-muted-foreground">Attempts</span>
                  <p className="font-medium">{viewJob.attempt_count}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Idempotency Key</span>
                  <p className="font-mono text-xs break-all">{viewJob.idempotency_key}</p>
                </div>
                {viewJob.correlation_id && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Correlation ID</span>
                    <p className="font-mono text-xs break-all">{viewJob.correlation_id}</p>
                  </div>
                )}
              </div>

              {viewJob.last_error && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                  <p className="text-xs font-medium text-destructive mb-1">Last Error</p>
                  <p className="text-xs text-muted-foreground whitespace-pre-wrap">{viewJob.last_error}</p>
                </div>
              )}

              {viewJob.response_json && Object.keys(viewJob.response_json).length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Response</p>
                  <pre className="text-xs bg-muted rounded-lg p-3 overflow-auto max-h-40 whitespace-pre-wrap">
                    {JSON.stringify(viewJob.response_json, null, 2)}
                  </pre>
                </div>
              )}

              <div className="text-xs text-muted-foreground border-t pt-2 flex justify-between">
                <span>Created: {new Date(viewJob.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                <span>Updated: {new Date(viewJob.updated_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
              </div>

              {/* Actions */}
              {["rejected", "draft"].includes(viewJob.status) && (
                <div className="flex gap-2 pt-1">
                  <Button size="sm" className="gap-1.5" onClick={() => { retryMutation.mutate(viewJob.id); setViewJob(null); }}>
                    <RotateCcw className="w-3.5 h-3.5" /> Retry
                  </Button>
                </div>
              )}
              {["queued", "draft"].includes(viewJob.status) && (
                <div className="flex gap-2 pt-1">
                  <Button variant="destructive" size="sm" className="gap-1.5" onClick={() => { cancelMutation.mutate(viewJob.id); setViewJob(null); }}>
                    <XCircle className="w-3.5 h-3.5" /> Cancel
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
