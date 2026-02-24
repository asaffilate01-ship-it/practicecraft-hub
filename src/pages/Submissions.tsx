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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search, Send, RotateCcw, XCircle, Eye, CheckCircle2,
  AlertTriangle, Clock, Loader2, Ban, Copy, RefreshCw,
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

      {/* Job Detail Sheet */}
      <SubmissionDetailSheet
        job={viewJob}
        onClose={() => setViewJob(null)}
        onRetry={(id) => { retryMutation.mutate(id); setViewJob(null); }}
        onCancel={(id) => { cancelMutation.mutate(id); setViewJob(null); }}
      />
    </div>
  );
}

/* ───────── Submission Detail Sheet with Attempts ───────── */

function SubmissionDetailSheet({
  job,
  onClose,
  onRetry,
  onCancel,
}: {
  job: any;
  onClose: () => void;
  onRetry: (id: string) => void;
  onCancel: (id: string) => void;
}) {
  const { data: attempts = [], isLoading: attemptsLoading, refetch } = useQuery({
    queryKey: ["submission_attempts", job?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("submission_attempts")
        .select("*")
        .eq("job_id", job.id)
        .order("attempt_no", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!job?.id,
  });

  const copyCorrelationId = async () => {
    const val = job?.correlation_id;
    if (!val) return;
    try {
      await navigator.clipboard.writeText(val);
      toast.success("Correlation ID copied");
    } catch {
      toast.error("Copy failed");
    }
  };

  return (
    <Sheet open={!!job} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col">
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <SheetTitle>Submission Details</SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1">
          {job && (
            <div className="p-6 space-y-6">
              {/* Summary grid */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground text-xs">Client</span>
                  <p className="font-medium">{job.clients?.legal_name || "—"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Provider</span>
                  <p className="font-medium">{providerLabels[job.provider] || job.provider}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Type</span>
                  <p className="font-medium capitalize">{job.submission_type.replace(/_/g, " ")}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Status</span>
                  <div className="mt-0.5"><StatusBadge status={job.status} /></div>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Attempts</span>
                  <p className="font-medium">{job.attempt_count} / {job.max_attempts ?? 8}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Idempotency Key</span>
                  <p className="font-mono text-xs break-all">{job.idempotency_key}</p>
                </div>
              </div>

              {/* Correlation ID with copy */}
              {job.correlation_id && (
                <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2">
                  <div className="flex-1 min-w-0">
                    <span className="text-xs text-muted-foreground">Correlation ID</span>
                    <p className="font-mono text-xs break-all">{job.correlation_id}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={copyCorrelationId}>
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}

              {/* Last error */}
              {job.last_error && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                  <p className="text-xs font-medium text-destructive mb-1">Last Error</p>
                  <p className="text-xs text-muted-foreground whitespace-pre-wrap">{job.last_error}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => refetch()}>
                  <RefreshCw className="w-3.5 h-3.5" /> Refresh
                </Button>
                {["rejected", "draft"].includes(job.status) && (
                  <Button size="sm" className="gap-1.5" onClick={() => onRetry(job.id)}>
                    <RotateCcw className="w-3.5 h-3.5" /> Retry
                  </Button>
                )}
                {["queued", "draft"].includes(job.status) && (
                  <Button variant="destructive" size="sm" className="gap-1.5" onClick={() => onCancel(job.id)}>
                    <XCircle className="w-3.5 h-3.5" /> Cancel
                  </Button>
                )}
              </div>

              <Separator />

              {/* Attempts timeline */}
              <div>
                <h3 className="text-sm font-semibold mb-3">Attempts</h3>
                {attemptsLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                    <Loader2 className="w-4 h-4 animate-spin" /> Loading attempts…
                  </div>
                ) : attempts.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">No attempts recorded yet.</p>
                ) : (
                  <div className="space-y-2">
                    {attempts.map((a: any) => (
                      <div key={a.id} className="rounded-lg border p-3 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant={a.status === "succeeded" ? "default" : "destructive"} className="text-[10px] px-1.5">
                              #{a.attempt_no} — {a.status}
                            </Badge>
                            {a.http_status && (
                              <span className="text-muted-foreground">HTTP {a.http_status}</span>
                            )}
                          </div>
                          {a.duration_ms != null && (
                            <span className="text-muted-foreground">{a.duration_ms}ms</span>
                          )}
                        </div>
                        <div className="text-muted-foreground">
                          {a.started_at && (
                            <span>{new Date(a.started_at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
                          )}
                        </div>
                        {(a.provider_message || a.error_message) && (
                          <p className="text-muted-foreground">{a.provider_message || a.error_message}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              {/* Safe payload viewer */}
              {job.request_json && Object.keys(job.request_json).length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-2">Request (safe)</h3>
                  <pre className="text-xs bg-muted rounded-lg p-3 overflow-auto max-h-40 whitespace-pre-wrap">
                    {JSON.stringify(job.request_json, null, 2)}
                  </pre>
                </div>
              )}

              {job.response_json && Object.keys(job.response_json).length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-2">Response (safe)</h3>
                  <pre className="text-xs bg-muted rounded-lg p-3 overflow-auto max-h-40 whitespace-pre-wrap">
                    {JSON.stringify(job.response_json, null, 2)}
                  </pre>
                </div>
              )}

              {/* Security note */}
              <p className="text-[10px] text-muted-foreground/60 italic">
                Encrypted payloads are never displayed. Only safe summaries are shown.
              </p>

              {/* Timestamps */}
              <div className="text-xs text-muted-foreground border-t pt-3 flex justify-between">
                <span>Created: {new Date(job.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                <span>Updated: {new Date(job.updated_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
              </div>
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
