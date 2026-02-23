import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CheckCircle2, XCircle, Clock, Send, RotateCcw,
  AlertTriangle, FileText, Shield, ChevronRight,
  Loader2, Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface FilingDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  changeId: string | null;
  clientId: string;
}

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

const statusConfig: Record<string, { icon: typeof Clock; label: string; color: string }> = {
  draft: { icon: FileText, label: "Draft", color: "text-muted-foreground" },
  awaiting_approval: { icon: Clock, label: "Awaiting Approval", color: "text-[hsl(var(--warning))]" },
  ready_to_file: { icon: Shield, label: "Ready to File", color: "text-[hsl(var(--info))]" },
  queued: { icon: Loader2, label: "Queued", color: "text-primary" },
  sent: { icon: Send, label: "Sent to CH", color: "text-primary" },
  accepted: { icon: CheckCircle2, label: "Accepted", color: "text-[hsl(var(--success))]" },
  rejected: { icon: XCircle, label: "Rejected", color: "text-destructive" },
  cancelled: { icon: XCircle, label: "Cancelled", color: "text-muted-foreground" },
};

export function FilingDrawer({ open, onOpenChange, changeId, clientId }: FilingDrawerProps) {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["filing-detail", changeId],
    queryFn: async () => {
      const { data: change, error } = await supabase
        .from("secretarial_changes")
        .select("*, clients(legal_name)")
        .eq("id", changeId!)
        .single();
      if (error) throw error;

      let submissionJob: any = null;
      if (change.submission_job_id) {
        const { data: job } = await supabase.from("submission_jobs")
          .select("*").eq("id", change.submission_job_id).single();
        submissionJob = job;
      }

      const { data: events } = await supabase.from("event_logs")
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false })
        .limit(30);

      const relevantEvents = (events || []).filter((e: any) => {
        const p = e.payload_json as any;
        return p?.changeId === changeId || p?.submissionJobId === change.submission_job_id;
      });

      let chFiling: any = null;
      if (change.submission_job_id) {
        const sjId = String(change.submission_job_id);
        const { data: filing } = await (supabase.from("ch_filings")
          .select("*") as any)
          .eq("submission_job_id", sjId)
          .maybeSingle();
        chFiling = filing;
      }

      return { change: change as any, submissionJob, chFiling, events: relevantEvents as any[] };
    },
    enabled: !!changeId && open,
  });

  const validateMutation = useMutation({
    mutationFn: async () => {
      const res = await supabase.functions.invoke("secretarial", {
        method: "POST",
        body: {},
        headers: { "x-path": `changes/${changeId}/validate` },
      });
      // Fallback: direct API call
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/secretarial/changes/${changeId}/validate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: "{}",
        }
      );
      return response.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["filing-detail", changeId] });
      if (result.ok) {
        toast.success("Validation passed — no errors");
      } else {
        toast.error(`Validation failed: ${result.errors?.length || 0} error(s)`);
      }
    },
    onError: (e) => toast.error(e.message),
  });

  const approveMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/secretarial/changes/${changeId}/approve`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: "{}",
        }
      );
      if (!response.ok) throw new Error((await response.json()).error);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["filing-detail", changeId] });
      queryClient.invalidateQueries({ queryKey: ["secretarial-changes"] });
      toast.success("Change approved — ready to file");
    },
    onError: (e) => toast.error(e.message),
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/secretarial/changes/${changeId}/submit`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: "{}",
        }
      );
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Submission failed");
      return json;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["filing-detail", changeId] });
      queryClient.invalidateQueries({ queryKey: ["secretarial-changes"] });
      toast.success(`Filing queued — Job ID: ${result.submissionJobId?.slice(0, 8)}…`);
    },
    onError: (e) => toast.error(e.message),
  });

  const change = data?.change;
  const job = data?.submissionJob;
  const chFiling = data?.chFiling;
  const events = data?.events || [];
  const validation = change?.validation_json as any;
  const sc = change ? statusConfig[change.status] || statusConfig.draft : statusConfig.draft;
  const StatusIcon = sc.icon;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg p-0 flex flex-col">
        <SheetHeader className="p-4 pb-0">
          <SheetTitle className="text-base">Filing Details</SheetTitle>
        </SheetHeader>

        {isLoading || !change ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…
          </div>
        ) : (
          <>
            {/* Status header */}
            <div className="px-4 py-3 border-b">
              <div className="flex items-center gap-2">
                <StatusIcon className={cn("w-5 h-5", sc.color)} />
                <span className={cn("font-semibold text-sm", sc.color)}>{sc.label}</span>
                <Badge variant="outline" className="ml-auto text-[10px] font-mono">
                  {change.id.slice(0, 8)}
                </Badge>
              </div>
              <p className="text-sm font-medium mt-1">{change.title}</p>
              <p className="text-xs text-muted-foreground">
                {changeTypeLabels[change.change_type] || change.change_type} · {change.clients?.legal_name}
              </p>
            </div>

            {/* Status pipeline */}
            <div className="px-4 py-3 border-b">
              <div className="flex items-center gap-0.5">
                {["draft", "awaiting_approval", "ready_to_file", "queued", "sent", "accepted"].map((s, i) => {
                  const isCurrent = change.status === s;
                  const isPast = ["draft", "awaiting_approval", "ready_to_file", "queued", "sent", "accepted"]
                    .indexOf(change.status) > i;
                  const isRejected = change.status === "rejected";
                  return (
                    <div key={s} className="flex items-center flex-1">
                      <div className={cn(
                        "h-1.5 rounded-full flex-1",
                        isCurrent ? "bg-primary" : isPast ? "bg-primary/50" : isRejected && s === "accepted" ? "bg-destructive/30" : "bg-muted"
                      )} />
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[9px] text-muted-foreground">Draft</span>
                <span className="text-[9px] text-muted-foreground">Accepted</span>
              </div>
            </div>

            <ScrollArea className="flex-1">
              <Tabs defaultValue="summary" className="p-4">
                <TabsList className="w-full">
                  <TabsTrigger value="summary" className="flex-1 text-xs">Summary</TabsTrigger>
                  <TabsTrigger value="validation" className="flex-1 text-xs">
                    Validation
                    {validation?.errors?.length > 0 && (
                      <Badge variant="destructive" className="ml-1 text-[9px] h-4 px-1">{validation.errors.length}</Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="audit" className="flex-1 text-xs">Audit Trail</TabsTrigger>
                </TabsList>

                {/* Summary tab */}
                <TabsContent value="summary" className="mt-3 space-y-4">
                  {/* Filing summary */}
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Change Type</span>
                      <span className="font-medium">{changeTypeLabels[change.change_type]}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Created</span>
                      <span>{new Date(change.created_at).toLocaleDateString("en-GB")}</span>
                    </div>
                    {change.approved_at && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Approved</span>
                        <span>{new Date(change.approved_at).toLocaleDateString("en-GB")}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Requires Auth Code</span>
                      <span>{change.requires_auth_code ? "Yes" : "No"}</span>
                    </div>
                  </div>

                  <Separator />

                  {/* Submission job */}
                  {job && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Submission Job</p>
                      <div className="space-y-1.5 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Status</span>
                          <Badge variant={job.status === "accepted" ? "default" : job.status === "rejected" ? "destructive" : "secondary"} className="text-xs capitalize">
                            {job.status}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Attempts</span>
                          <span>{job.attempt_count || 1}</span>
                        </div>
                        {job.correlation_id && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">CH Transaction</span>
                            <span className="font-mono text-xs">{job.correlation_id}</span>
                          </div>
                        )}
                        {job.idempotency_key && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Idempotency</span>
                            <span className="font-mono text-[10px] max-w-[200px] truncate">{job.idempotency_key}</span>
                          </div>
                        )}
                        {job.last_error && (
                          <div className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">
                            <AlertTriangle className="w-3 h-3 inline mr-1" />
                            {job.last_error}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* CH Filing */}
                  {chFiling && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">CH Filing Record</p>
                        <div className="space-y-1.5 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Filing Status</span>
                            <Badge variant={chFiling.status === "accepted" ? "default" : chFiling.status === "rejected" ? "destructive" : "secondary"} className="text-xs capitalize">
                              {chFiling.status}
                            </Badge>
                          </div>
                          {chFiling.ch_transaction_id && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Receipt</span>
                              <span className="font-mono text-xs">{chFiling.ch_transaction_id}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Payload preview */}
                  {change.payload_json && Object.keys(change.payload_json as object).length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Payload</p>
                        <pre className="text-[10px] bg-muted p-2 rounded-md overflow-x-auto max-h-40">
                          {JSON.stringify(change.payload_json, null, 2)}
                        </pre>
                      </div>
                    </>
                  )}
                </TabsContent>

                {/* Validation tab */}
                <TabsContent value="validation" className="mt-3 space-y-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-1.5"
                    onClick={() => validateMutation.mutate()}
                    disabled={validateMutation.isPending}
                  >
                    {validateMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Shield className="w-3 h-3" />}
                    Run Validation
                  </Button>

                  {validation?.errors?.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs font-semibold text-destructive flex items-center gap-1">
                        <XCircle className="w-3 h-3" /> Errors ({validation.errors.length})
                      </p>
                      {validation.errors.map((e: any, i: number) => (
                        <div key={i} className="flex gap-2 items-start text-xs rounded-md bg-destructive/10 p-2">
                          <XCircle className="w-3 h-3 text-destructive mt-0.5 shrink-0" />
                          <div>
                            <span className="font-mono text-[10px] text-muted-foreground">{e.field}</span>
                            <p className="text-destructive">{e.message}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {validation?.warnings?.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs font-semibold text-[hsl(var(--warning))] flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Warnings ({validation.warnings.length})
                      </p>
                      {validation.warnings.map((w: any, i: number) => (
                        <div key={i} className="flex gap-2 items-start text-xs rounded-md bg-[hsl(var(--warning))]/10 p-2">
                          <AlertTriangle className="w-3 h-3 text-[hsl(var(--warning))] mt-0.5 shrink-0" />
                          <div>
                            <span className="font-mono text-[10px] text-muted-foreground">{w.field}</span>
                            <p className="text-[hsl(var(--warning))]">{w.message}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {validation && validation.errors?.length === 0 && validation.warnings?.length === 0 && (
                    <div className="flex items-center gap-2 text-sm text-[hsl(var(--success))] bg-[hsl(var(--success))]/10 rounded-md p-3">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>All validations passed</span>
                    </div>
                  )}

                  {!validation && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground p-3">
                      <Info className="w-4 h-4" />
                      <span>No validation run yet — click above to validate</span>
                    </div>
                  )}
                </TabsContent>

                {/* Audit trail tab */}
                <TabsContent value="audit" className="mt-3">
                  {events.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">No events recorded.</p>
                  ) : (
                    <div className="space-y-0">
                      {events.map((evt: any, i: number) => (
                        <div key={evt.id} className="flex gap-3 py-2">
                          <div className="flex flex-col items-center">
                            <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />
                            {i < events.length - 1 && <div className="w-px flex-1 bg-border" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium">{evt.event_type.replace(/_/g, " ")}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {new Date(evt.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                              {evt.source && ` · ${evt.source}`}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </ScrollArea>

            {/* Action bar */}
            <div className="border-t p-3 flex gap-2">
              {change.status === "draft" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 gap-1.5"
                  onClick={() => approveMutation.mutate()}
                  disabled={approveMutation.isPending}
                >
                  {approveMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                  Approve
                </Button>
              )}
              {change.status === "awaiting_approval" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 gap-1.5"
                  onClick={() => approveMutation.mutate()}
                  disabled={approveMutation.isPending}
                >
                  {approveMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                  Approve
                </Button>
              )}
              {change.status === "ready_to_file" && (
                <Button
                  size="sm"
                  className="flex-1 gap-1.5"
                  onClick={() => submitMutation.mutate()}
                  disabled={submitMutation.isPending}
                >
                  {submitMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                  Submit to CH
                </Button>
              )}
              {change.status === "rejected" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 gap-1.5 text-destructive"
                  onClick={() => {/* Would re-open for editing */}}
                >
                  <RotateCcw className="w-3 h-3" /> Retry / Edit
                </Button>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
