import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Eye, AlertTriangle, CheckCircle2, Clock, Bell, ShieldAlert, Search, Loader2, XCircle
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const SEVERITY_COLORS: Record<string, string> = {
  low: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  medium: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  high: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  critical: "bg-red-200 text-red-900 dark:bg-red-900/50 dark:text-red-300",
};

const ALERT_TYPES = [
  { value: "pep_match", label: "PEP Match" },
  { value: "sanctions_match", label: "Sanctions Match" },
  { value: "adverse_media", label: "Adverse Media" },
  { value: "expired_id", label: "Expired ID Document" },
  { value: "review_due", label: "Periodic Review Due" },
  { value: "risk_change", label: "Risk Level Change" },
  { value: "activity_flag", label: "Unusual Activity" },
];

export default function AmlMonitoring() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("open");
  const [selectedAlert, setSelectedAlert] = useState<any>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");

  const profileQ = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("tenant_id").eq("id", user!.id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ["aml-monitoring-alerts", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("aml_monitoring_alerts")
        .select("*, client:clients(legal_name), kyc_case:kyc_cases(risk_level, status)")
        .order("created_at", { ascending: false });
      if (statusFilter !== "all") query = query.eq("status", statusFilter);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Cases with monitoring enabled
  const { data: monitoredCases = [] } = useQuery({
    queryKey: ["aml-monitored-cases"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("kyc_cases")
        .select("id, client_id, risk_level, monitoring_enabled, next_review_date, last_monitored_at, client:clients(legal_name)")
        .eq("monitoring_enabled", true)
        .order("next_review_date", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const resolveMut = useMutation({
    mutationFn: async () => {
      if (!selectedAlert) return;
      const { error } = await supabase.from("aml_monitoring_alerts").update({
        status: "resolved",
        resolved_at: new Date().toISOString(),
        resolved_by_user_id: user!.id,
        resolution_notes: resolutionNotes.trim() || null,
      }).eq("id", selectedAlert.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aml-monitoring-alerts"] });
      setSelectedAlert(null);
      setResolutionNotes("");
      toast.success("Alert resolved");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleMonitoringMut = useMutation({
    mutationFn: async ({ caseId, enabled }: { caseId: string; enabled: boolean }) => {
      const { error } = await supabase.from("kyc_cases").update({
        monitoring_enabled: enabled,
        next_review_date: enabled ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0] : null,
      }).eq("id", caseId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aml-monitored-cases"] });
      queryClient.invalidateQueries({ queryKey: ["kyc-cases"] });
      toast.success("Monitoring updated");
    },
  });

  const filtered = alerts.filter((a: any) => {
    if (!search) return true;
    return a.client?.legal_name?.toLowerCase().includes(search.toLowerCase()) ||
           a.title?.toLowerCase().includes(search.toLowerCase());
  });

  const stats = {
    open: alerts.filter((a: any) => a.status === "open").length,
    high: alerts.filter((a: any) => a.severity === "high" || a.severity === "critical").length,
    monitored: monitoredCases.length,
    reviewDue: monitoredCases.filter((c: any) => c.next_review_date && new Date(c.next_review_date) <= new Date()).length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2" style={{ fontFamily: "var(--font-heading)" }}>
          <Eye className="w-6 h-6 text-primary" />
          AML Ongoing Monitoring
        </h1>
        <p className="text-sm text-muted-foreground">Continuous monitoring alerts, periodic reviews, and compliance tracking</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Open Alerts</p>
          <p className="text-2xl font-bold text-amber-600">{stats.open}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">High/Critical</p>
          <p className="text-2xl font-bold text-destructive">{stats.high}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Monitored Clients</p>
          <p className="text-2xl font-bold text-primary">{stats.monitored}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Reviews Due</p>
          <p className="text-2xl font-bold text-amber-600">{stats.reviewDue}</p>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Alerts column */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search alerts…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="dismissed">Dismissed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <ShieldAlert className="w-12 h-12 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">No monitoring alerts.</p>
                </div>
              ) : (
                <div className="divide-y">
                  {filtered.map((a: any) => (
                    <div
                      key={a.id}
                      className="flex items-center justify-between p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => { setSelectedAlert(a); setResolutionNotes(""); }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">
                          {a.severity === "high" || a.severity === "critical" ? (
                            <AlertTriangle className="w-4 h-4 text-destructive" />
                          ) : (
                            <Bell className="w-4 h-4 text-amber-500" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{a.title}</p>
                          <p className="text-xs text-muted-foreground">{a.client?.legal_name} · {format(new Date(a.created_at), "dd MMM yyyy")}</p>
                          {a.description && <p className="text-xs text-muted-foreground mt-0.5">{a.description}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${SEVERITY_COLORS[a.severity]}`}>
                          {a.severity}
                        </span>
                        <Badge variant={a.status === "resolved" ? "default" : "secondary"} className="text-xs capitalize">
                          {a.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Monitored clients sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Monitored Clients</CardTitle>
              <CardDescription className="text-xs">Cases with ongoing screening enabled</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {monitoredCases.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">No clients under monitoring. Enable monitoring from the AML workbench.</p>
              ) : (
                monitoredCases.map((c: any) => {
                  const reviewDue = c.next_review_date && new Date(c.next_review_date) <= new Date();
                  return (
                    <div key={c.id} className="flex items-center justify-between p-2 rounded-lg border text-sm">
                      <div>
                        <p className="font-medium text-xs">{c.client?.legal_name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          Next review: {c.next_review_date ? format(new Date(c.next_review_date), "dd MMM yyyy") : "—"}
                        </p>
                      </div>
                      {reviewDue && (
                        <Badge variant="destructive" className="text-[10px]">Due</Badge>
                      )}
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Alert detail / resolve dialog */}
      <Dialog open={!!selectedAlert} onOpenChange={() => setSelectedAlert(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              {selectedAlert?.title}
            </DialogTitle>
          </DialogHeader>
          {selectedAlert && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-xs text-muted-foreground">Client</Label>
                  <p>{selectedAlert.client?.legal_name}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Alert Type</Label>
                  <p>{ALERT_TYPES.find(t => t.value === selectedAlert.alert_type)?.label || selectedAlert.alert_type}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Severity</Label>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${SEVERITY_COLORS[selectedAlert.severity]}`}>
                    {selectedAlert.severity}
                  </span>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Source</Label>
                  <p>{selectedAlert.source}</p>
                </div>
              </div>
              {selectedAlert.description && (
                <div>
                  <Label className="text-xs text-muted-foreground">Description</Label>
                  <p className="text-sm">{selectedAlert.description}</p>
                </div>
              )}
              {selectedAlert.status === "open" && (
                <div className="space-y-1.5">
                  <Label>Resolution Notes</Label>
                  <Textarea value={resolutionNotes} onChange={(e) => setResolutionNotes(e.target.value)} placeholder="Describe the resolution…" rows={3} />
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            {selectedAlert?.status === "open" && (
              <Button onClick={() => resolveMut.mutate()} disabled={resolveMut.isPending} className="gap-1.5">
                {resolveMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Resolve Alert
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
