import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  ShieldCheck, Search, Plus, AlertTriangle, CheckCircle2, Clock,
  XCircle, User, FileText, MoreHorizontal
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { toast } from "@/hooks/use-toast";
import { WorkspacePageHeader } from "@/components/layout/WorkspacePageHeader";

const RISK_COLORS: Record<string, string> = {
  low: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  standard: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  high: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  very_high: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

const STATUS_ICONS: Record<string, typeof CheckCircle2> = {
  pending: Clock,
  in_progress: AlertTriangle,
  approved: CheckCircle2,
  rejected: XCircle,
  expired: Clock,
};

const CHECK_TYPES = [
  { value: "id_document", label: "ID Document" },
  { value: "proof_of_address", label: "Proof of Address" },
  { value: "source_of_funds", label: "Source of Funds" },
  { value: "pep_screening", label: "PEP Screening" },
  { value: "sanctions_screening", label: "Sanctions Screening" },
  { value: "adverse_media", label: "Adverse Media" },
  { value: "beneficial_ownership", label: "Beneficial Ownership" },
  { value: "occupation_check", label: "Occupation Check" },
];

export default function AmlWorkbench() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedCase, setSelectedCase] = useState<any>(null);
  const [newCaseClientId, setNewCaseClientId] = useState("");
  const [newCaseRisk, setNewCaseRisk] = useState("standard");

  const { data: cases = [], isLoading } = useQuery({
    queryKey: ["kyc-cases", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("kyc_cases")
        .select("*, client:clients(legal_name, entity_type)")
        .order("created_at", { ascending: false });
      if (statusFilter !== "all") query = query.eq("status", statusFilter);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const { data: checks = [] } = useQuery({
    queryKey: ["kyc-checks", selectedCase?.id],
    queryFn: async () => {
      if (!selectedCase) return [];
      const { data, error } = await supabase
        .from("kyc_checks")
        .select("*")
        .eq("case_id", selectedCase.id)
        .order("created_at");
      if (error) throw error;
      return data;
    },
    enabled: !!selectedCase,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients-list-brief"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, legal_name")
        .eq("status", "active")
        .order("legal_name");
      if (error) throw error;
      return data;
    },
  });

  const createCaseMut = useMutation({
    mutationFn: async () => {
      if (!newCaseClientId) throw new Error("Select a client");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data: profile } = await supabase.from("profiles").select("tenant_id").eq("id", user.id).single();
      if (!profile) throw new Error("No profile");

      const { data: kycCase, error } = await supabase.from("kyc_cases").insert({
        tenant_id: profile.tenant_id,
        client_id: newCaseClientId,
        risk_level: newCaseRisk,
        assigned_to_user_id: user.id,
      }).select().single();
      if (error) throw error;

      // Auto-create standard checks
      const standardChecks = CHECK_TYPES.map(ct => ({
        tenant_id: profile.tenant_id,
        case_id: kycCase.id,
        check_type: ct.value,
        status: "pending" as const,
      }));
      await supabase.from("kyc_checks").insert(standardChecks);

      return kycCase;
    },
    onSuccess: () => {
      toast({ title: "KYC case created", description: "All standard checks have been added." });
      queryClient.invalidateQueries({ queryKey: ["kyc-cases"] });
      setCreateOpen(false);
      setNewCaseClientId("");
      setNewCaseRisk("standard");
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateCheckMut = useMutation({
    mutationFn: async ({ checkId, status, notes }: { checkId: string; status: string; notes?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("kyc_checks").update({
        status,
        notes: notes || null,
        checked_by_user_id: user?.id,
        checked_at: new Date().toISOString(),
      }).eq("id", checkId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kyc-checks"] });
      toast({ title: "Check updated" });
    },
  });

  const approveCaseMut = useMutation({
    mutationFn: async (caseId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("kyc_cases").update({
        status: "approved",
        approved_by_user_id: user?.id,
        approved_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      }).eq("id", caseId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kyc-cases"] });
      setSelectedCase(null);
      toast({ title: "Case approved ✅" });
    },
  });

  const filtered = cases.filter((c: any) => {
    if (!search) return true;
    return c.client?.legal_name?.toLowerCase().includes(search.toLowerCase());
  });

  const caseStats = {
    total: cases.length,
    pending: cases.filter((c: any) => c.status === "pending" || c.status === "in_progress").length,
    approved: cases.filter((c: any) => c.status === "approved").length,
    highRisk: cases.filter((c: any) => c.risk_level === "high" || c.risk_level === "very_high").length,
  };

  return (
    <div className="space-y-6">
      <WorkspacePageHeader eyebrow="Client compliance" title="AML / KYC Workbench" icon={ShieldCheck} description="Client identity verification, PEP screening, risk scoring and compliance cases." actions={<Button onClick={() => setCreateOpen(true)}><Plus className="mr-1.5 h-4 w-4" /> New Case</Button>} />

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Total Cases</p>
          <p className="text-2xl font-bold">{caseStats.total}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Pending Review</p>
          <p className="text-2xl font-bold text-warning">{caseStats.pending}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Approved</p>
          <p className="text-2xl font-bold text-success">{caseStats.approved}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">High Risk</p>
          <p className="text-2xl font-bold text-destructive">{caseStats.highRisk}</p>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search clients…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Cases list */}
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <ShieldCheck className="w-12 h-12 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No KYC cases found. Create a new case to begin verification.</p>
            </div>
          ) : (
            <div className="space-y-1">
              {filtered.map((c: any) => {
                const StatusIcon = STATUS_ICONS[c.status] || Clock;
                return (
                  <div
                    key={c.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => setSelectedCase(c)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                        <User className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{c.client?.legal_name}</p>
                        <p className="text-xs text-muted-foreground">
                          Created {new Date(c.created_at).toLocaleDateString("en-GB")}
                          {c.expires_at && ` · Expires ${new Date(c.expires_at).toLocaleDateString("en-GB")}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${RISK_COLORS[c.risk_level]}`}>
                        {c.risk_level.replace("_", " ")}
                      </span>
                      <Badge variant={c.status === "approved" ? "default" : "secondary"} className="text-xs capitalize gap-1">
                        <StatusIcon className="w-3 h-3" />
                        {c.status.replace("_", " ")}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create case dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New KYC Case</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Client</Label>
              <Select value={newCaseClientId} onValueChange={setNewCaseClientId}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select client…" /></SelectTrigger>
                <SelectContent>
                  {clients.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.legal_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Initial Risk Level</Label>
              <Select value={newCaseRisk} onValueChange={setNewCaseRisk}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="very_high">Very High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={() => createCaseMut.mutate()} disabled={createCaseMut.isPending}>
              {createCaseMut.isPending ? "Creating…" : "Create Case"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Case detail dialog */}
      <Dialog open={!!selectedCase} onOpenChange={() => setSelectedCase(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5" />
              KYC: {selectedCase?.client?.legal_name}
            </DialogTitle>
          </DialogHeader>

          {selectedCase && (
            <Tabs defaultValue="checks" className="mt-2">
              <TabsList>
                <TabsTrigger value="checks">Verification Checks</TabsTrigger>
                <TabsTrigger value="risk">Risk Assessment</TabsTrigger>
              </TabsList>

              <TabsContent value="checks" className="space-y-3 mt-4">
                {checks.map((check: any) => {
                  const checkLabel = CHECK_TYPES.find(ct => ct.value === check.check_type)?.label || check.check_type;
                  return (
                    <div key={check.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={check.status === "passed"}
                          onCheckedChange={(checked) => {
                            updateCheckMut.mutate({
                              checkId: check.id,
                              status: checked ? "passed" : "pending",
                            });
                          }}
                        />
                        <div>
                          <p className="text-sm font-medium">{checkLabel}</p>
                          {check.notes && <p className="text-xs text-muted-foreground">{check.notes}</p>}
                        </div>
                      </div>
                      <Badge
                        variant={check.status === "passed" ? "default" : check.status === "failed" ? "destructive" : "secondary"}
                        className="text-xs capitalize"
                      >
                        {check.status.replace("_", " ")}
                      </Badge>
                    </div>
                  );
                })}

                {checks.length > 0 && checks.every((c: any) => c.status === "passed") && selectedCase.status !== "approved" && (
                  <Button className="w-full" onClick={() => approveCaseMut.mutate(selectedCase.id)}>
                    <CheckCircle2 className="w-4 h-4 mr-1.5" /> Approve Case
                  </Button>
                )}
              </TabsContent>

              <TabsContent value="risk" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Risk Level</Label>
                    <p className="mt-1">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${RISK_COLORS[selectedCase.risk_level]}`}>
                        {selectedCase.risk_level.replace("_", " ")}
                      </span>
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Risk Score</Label>
                    <p className="text-lg font-bold mt-1">{selectedCase.risk_score ?? 0}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Screening Results</Label>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={selectedCase.pep_check ? "default" : "secondary"} className="text-xs">
                      PEP: {selectedCase.pep_check ? "Clear" : "Unchecked"}
                    </Badge>
                    <Badge variant={selectedCase.sanctions_check ? "default" : "secondary"} className="text-xs">
                      Sanctions: {selectedCase.sanctions_check ? "Clear" : "Unchecked"}
                    </Badge>
                    <Badge variant={selectedCase.adverse_media_check ? "default" : "secondary"} className="text-xs">
                      Adverse Media: {selectedCase.adverse_media_check ? "Clear" : "Unchecked"}
                    </Badge>
                  </div>
                </div>

                {selectedCase.risk_notes && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Notes</Label>
                    <p className="text-sm mt-1">{selectedCase.risk_notes}</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
