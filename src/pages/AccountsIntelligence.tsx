import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  Check,
  CheckCircle2,
  CircleDollarSign,
  FileSearch,
  Files,
  FolderOpen,
  ListChecks,
  Plus,
  RefreshCw,
  Scale,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";

type ReviewStatus = "suggested" | "confirmed" | "rejected";
type DuplicateStatus = "open" | "confirmed_duplicate" | "not_duplicate";

const money = (pence: number | null | undefined) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format((pence ?? 0) / 100);

const shortDate = (value: string | null | undefined) =>
  value ? new Date(`${value}T00:00:00`).toLocaleDateString("en-GB") : "—";

const statusBadge = (status: string) => {
  if (["confirmed", "complete", "approved", "posted"].includes(status)) return "default" as const;
  if (["rejected", "blocked", "confirmed_duplicate"].includes(status)) return "destructive" as const;
  return "secondary" as const;
};

export default function AccountsIntelligence() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const [clientId, setClientId] = useState(params.get("client") ?? "");
  const [periodId, setPeriodId] = useState(params.get("period") ?? "");
  const [showJudgement, setShowJudgement] = useState(false);
  const [judgement, setJudgement] = useState({
    type: "capex",
    title: "",
    amount: "",
    description: "",
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

  const { data: clients = [] } = useQuery({
    queryKey: ["accounts-intelligence-clients", profile?.tenant_id],
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

  const { data: periods = [] } = useQuery({
    queryKey: ["accounts-intelligence-periods", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accounts_periods")
        .select("id, client_id, period_start, period_end, accounts_standard, status")
        .eq("client_id", clientId)
        .order("period_end", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });

  useEffect(() => {
    if (clientId && periods.length && !periods.some((period) => period.id === periodId)) {
      setPeriodId(periods[0].id);
    }
  }, [clientId, periodId, periods]);

  useEffect(() => {
    const next = new URLSearchParams();
    if (clientId) next.set("client", clientId);
    if (periodId) next.set("period", periodId);
    setParams(next, { replace: true });
  }, [clientId, periodId, setParams]);

  const selectedPeriod = periods.find((period) => period.id === periodId);

  const { data: matches = [], isLoading: matchesLoading } = useQuery({
    queryKey: ["evidence-matches", periodId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("evidence_matches")
        .select("*")
        .eq("period_id", periodId)
        .order("confidence", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!periodId,
  });

  const { data: duplicates = [] } = useQuery({
    queryKey: ["duplicate-candidates", periodId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("duplicate_candidates")
        .select("*")
        .eq("period_id", periodId)
        .order("confidence", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!periodId,
  });

  const { data: judgements = [] } = useQuery({
    queryKey: ["accounting-judgements", periodId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accounting_judgements")
        .select("*")
        .eq("period_id", periodId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!periodId,
  });

  const { data: checks = [] } = useQuery({
    queryKey: ["year-end-checks", periodId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("year_end_checks")
        .select("*")
        .eq("period_id", periodId)
        .order("category")
        .order("title");
      if (error) throw error;
      return data;
    },
    enabled: !!periodId,
  });

  const { data: documents = [] } = useQuery({
    queryKey: ["accounts-intelligence-documents", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("id, filename, document_type, status")
        .eq("client_id", clientId)
        .limit(1000);
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ["accounts-intelligence-transactions", clientId, selectedPeriod?.period_start, selectedPeriod?.period_end],
    queryFn: async () => {
      let query = supabase
        .from("bank_transactions")
        .select("id, transaction_date, description, amount_pence, reference, categorisation_status")
        .eq("client_id", clientId)
        .order("transaction_date", { ascending: false })
        .limit(2000);
      if (selectedPeriod) {
        query = query.gte("transaction_date", selectedPeriod.period_start).lte("transaction_date", selectedPeriod.period_end);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!clientId && !!periodId,
  });

  const documentMap = useMemo(() => new Map(documents.map((document) => [document.id, document])), [documents]);
  const transactionMap = useMemo(() => new Map(transactions.map((transaction) => [transaction.id, transaction])), [transactions]);

  const invalidateWorkspace = () => {
    queryClient.invalidateQueries({ queryKey: ["evidence-matches", periodId] });
    queryClient.invalidateQueries({ queryKey: ["duplicate-candidates", periodId] });
    queryClient.invalidateQueries({ queryKey: ["accounting-judgements", periodId] });
    queryClient.invalidateQueries({ queryKey: ["year-end-checks", periodId] });
  };

  const runIntelligence = useMutation({
    mutationFn: async () => {
      if (!clientId || !periodId) throw new Error("Choose a client and accounting period first");
      const { data, error } = await supabase.rpc("run_accounts_intelligence", {
        p_client_id: clientId,
        p_period_id: periodId,
      });
      if (error) throw error;
      return data as { match_candidates_processed?: number; duplicate_candidates_processed?: number };
    },
    onSuccess: (data) => {
      invalidateWorkspace();
      toast.success(
        `Review refreshed: ${data?.match_candidates_processed ?? 0} matches and ${data?.duplicate_candidates_processed ?? 0} duplicate candidates processed`,
      );
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const reviewMatch = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ReviewStatus }) => {
      const { error } = await supabase
        .from("evidence_matches")
        .update({ status, reviewed_by_user_id: user?.id ?? null, reviewed_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evidence-matches", periodId] });
      toast.success("Evidence decision saved");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const reviewDuplicate = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: DuplicateStatus }) => {
      const { error } = await supabase
        .from("duplicate_candidates")
        .update({ status, reviewed_by_user_id: user?.id ?? null, reviewed_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["duplicate-candidates", periodId] });
      toast.success("Duplicate decision saved");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const addJudgement = useMutation({
    mutationFn: async () => {
      if (!profile?.tenant_id || !clientId || !periodId) throw new Error("Choose a client and period");
      if (!judgement.title.trim()) throw new Error("Enter a title");
      const amountPence = judgement.amount ? Math.round(Number(judgement.amount) * 100) : null;
      if (judgement.amount && !Number.isFinite(amountPence)) throw new Error("Enter a valid amount");
      const { error } = await supabase.from("accounting_judgements").insert({
        tenant_id: profile.tenant_id,
        client_id: clientId,
        period_id: periodId,
        judgement_type: judgement.type,
        title: judgement.title.trim(),
        description: judgement.description.trim() || null,
        amount_pence: amountPence,
        created_by_user_id: user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounting-judgements", periodId] });
      setShowJudgement(false);
      setJudgement({ type: "capex", title: "", amount: "", description: "" });
      toast.success("Accounting judgement added");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const reviewJudgement = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "approved" | "rejected" }) => {
      const { error } = await supabase
        .from("accounting_judgements")
        .update({ status, reviewed_by_user_id: user?.id ?? null, reviewed_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["accounting-judgements", periodId] }),
    onError: (error: Error) => toast.error(error.message),
  });

  const updateCheck = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const isComplete = status === "complete";
      const { error } = await supabase
        .from("year_end_checks")
        .update({
          status,
          completed_by_user_id: isComplete ? user?.id ?? null : null,
          completed_at: isComplete ? new Date().toISOString() : null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["year-end-checks", periodId] }),
    onError: (error: Error) => toast.error(error.message),
  });

  const suggestedMatches = matches.filter((match) => match.status === "suggested").length;
  const openDuplicates = duplicates.filter((candidate) => candidate.status === "open").length;
  const confirmedDocumentIds = new Set(matches.filter((match) => match.status === "confirmed").map((match) => match.document_id));
  const transactionsWithEvidence = new Set(matches.filter((match) => match.status === "confirmed").map((match) => match.bank_transaction_id)).size;
  const evidenceCoverage = transactions.length ? Math.round((transactionsWithEvidence / transactions.length) * 100) : 0;
  const completedChecks = checks.filter((check) => ["complete", "not_applicable"].includes(check.status)).length;
  const checklistProgress = checks.length ? Math.round((completedChecks / checks.length) * 100) : 0;
  const unexplainedTransactions = transactions.filter((transaction) => !matches.some(
    (match) => match.bank_transaction_id === transaction.id && match.status === "confirmed",
  )).length;

  const selectedClient = clients.find((client) => client.id === clientId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            <Sparkles className="h-3.5 w-3.5" /> Evidence to accounts
          </div>
          <h1 className="font-serif text-3xl font-semibold tracking-tight md:text-4xl">AI Review Centre</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            One controlled queue for evidence matching, duplicates, accounting judgements and year-end checks. Suggestions require human approval before posting or filing.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <Button variant="outline" className="min-h-11 sm:min-h-9" onClick={() => navigate("/documents")}>
            <FolderOpen className="mr-2 h-4 w-4" /> Documents
          </Button>
          <Button variant="outline" className="min-h-11 sm:min-h-9" onClick={() => navigate("/bank-feeds")}>
            <Banknote className="mr-2 h-4 w-4" /> Bank feeds
          </Button>
          <Button className="col-span-2 min-h-11 sm:min-h-9" onClick={() => runIntelligence.mutate()} disabled={!periodId || runIntelligence.isPending}>
            <RefreshCw className={`mr-2 h-4 w-4 ${runIntelligence.isPending ? "animate-spin" : ""}`} />
            {runIntelligence.isPending ? "Analysing…" : "Run matching"}
          </Button>
        </div>
      </div>

      <Card className="workspace-panel">
        <CardContent className="grid gap-4 pt-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Client</Label>
            <Select value={clientId} onValueChange={(value) => { setClientId(value); setPeriodId(""); }}>
              <SelectTrigger><SelectValue placeholder="Choose a client" /></SelectTrigger>
              <SelectContent>
                {clients.map((client) => <SelectItem key={client.id} value={client.id}>{client.legal_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Accounting period</Label>
            <Select value={periodId} onValueChange={setPeriodId} disabled={!clientId}>
              <SelectTrigger><SelectValue placeholder={clientId ? "Choose a period" : "Choose a client first"} /></SelectTrigger>
              <SelectContent>
                {periods.map((period) => (
                  <SelectItem key={period.id} value={period.id}>
                    {shortDate(period.period_start)} – {shortDate(period.period_end)} · {period.accounts_standard}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {!periodId ? (
        <Card className="border-dashed">
          <CardContent className="flex min-h-64 flex-col items-center justify-center text-center">
            <FileSearch className="mb-4 h-10 w-10 text-muted-foreground" />
            <h2 className="font-semibold">Choose a client and accounting period</h2>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">The workspace will use the existing PracticeCraft documents, bank transactions and ledger for that period.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {[
              { label: "Documents", value: documents.length, detail: `${confirmedDocumentIds.size} confirmed evidence`, icon: Files },
              { label: "Suggested matches", value: suggestedMatches, detail: "Awaiting review", icon: FileSearch },
              { label: "Possible duplicates", value: openDuplicates, detail: "Require a decision", icon: AlertTriangle },
              { label: "Unexplained bank items", value: unexplainedTransactions, detail: `${evidenceCoverage}% evidence coverage`, icon: CircleDollarSign },
              { label: "Year-end checks", value: `${completedChecks}/${checks.length}`, detail: `${checklistProgress}% complete`, icon: ListChecks },
            ].map((item) => (
              <Card key={item.label} className="workspace-panel">
                <CardContent className="pt-5">
                  <div className="mb-3 flex items-center justify-between">
                    <item.icon className="h-4 w-4 text-primary" />
                    <span className="text-2xl font-bold">{item.value}</span>
                  </div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{item.detail}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Tabs defaultValue="matches" className="space-y-4">
            <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-xl bg-card p-1 shadow-sm sm:w-auto">
              <TabsTrigger value="matches">Evidence matches</TabsTrigger>
              <TabsTrigger value="duplicates">Duplicates</TabsTrigger>
              <TabsTrigger value="adjustments">Adjustments</TabsTrigger>
              <TabsTrigger value="year-end">Year-end checklist</TabsTrigger>
            </TabsList>

            <TabsContent value="matches">
              <Card className="workspace-panel overflow-hidden">
                <CardHeader>
                  <CardTitle>Bank-to-document review</CardTitle>
                  <CardDescription>Suggestions are never posted automatically. Confirm or reject each relationship before relying on it.</CardDescription>
                </CardHeader>
                <CardContent className="overflow-x-auto p-0">
                  {matchesLoading ? (
                    <div className="space-y-3 p-6">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-12 animate-pulse rounded bg-muted" />)}</div>
                  ) : matches.length === 0 ? (
                    <div className="py-14 text-center text-sm text-muted-foreground">No candidates yet. Upload evidence, import bank activity, then run matching.</div>
                  ) : (
                    <Table className="min-w-[900px]">
                      <TableHeader><TableRow><TableHead>Bank transaction</TableHead><TableHead>Document</TableHead><TableHead>Match</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Decision</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {matches.map((match) => {
                          const transaction = transactionMap.get(match.bank_transaction_id);
                          const document = documentMap.get(match.document_id);
                          return (
                            <TableRow key={match.id}>
                              <TableCell>
                                <div className="font-medium">{transaction?.description ?? "Bank transaction"}</div>
                                <div className="text-xs text-muted-foreground">{shortDate(transaction?.transaction_date)} · {money(transaction?.amount_pence)}</div>
                              </TableCell>
                              <TableCell><div className="font-medium">{document?.filename ?? "Document"}</div><div className="text-xs capitalize text-muted-foreground">{document?.document_type?.split("_").join(" ")}</div></TableCell>
                              <TableCell className="min-w-40"><div className="mb-1 flex justify-between text-xs"><span className="capitalize">{match.match_type.split("_").join(" ")}</span><span className="font-semibold">{match.confidence}%</span></div><Progress value={match.confidence} className="h-1.5" /></TableCell>
                              <TableCell><Badge variant={statusBadge(match.status)} className="capitalize">{match.status}</Badge></TableCell>
                              <TableCell className="text-right">
                                {match.status === "suggested" ? <div className="flex justify-end gap-1"><Button size="sm" variant="outline" onClick={() => reviewMatch.mutate({ id: match.id, status: "rejected" })}><X className="mr-1 h-3.5 w-3.5" /> Reject</Button><Button size="sm" onClick={() => reviewMatch.mutate({ id: match.id, status: "confirmed" })}><Check className="mr-1 h-3.5 w-3.5" /> Confirm</Button></div> : <span className="text-xs text-muted-foreground">Reviewed</span>}
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

            <TabsContent value="duplicates">
              <Card className="workspace-panel overflow-hidden">
                <CardHeader><CardTitle>Duplicate review</CardTitle><CardDescription>Exact file duplicates are blocked during upload. These are near-duplicate invoice or receipt candidates.</CardDescription></CardHeader>
                <CardContent className="overflow-x-auto p-0">
                  {duplicates.length === 0 ? <div className="py-14 text-center text-sm text-muted-foreground">No probable duplicates detected for this period.</div> : (
                    <Table className="min-w-[920px]">
                      <TableHeader><TableRow><TableHead>First document</TableHead><TableHead></TableHead><TableHead>Possible duplicate</TableHead><TableHead>Reason</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Decision</TableHead></TableRow></TableHeader>
                      <TableBody>{duplicates.map((candidate) => (
                        <TableRow key={candidate.id}>
                          <TableCell className="font-medium">{documentMap.get(candidate.primary_document_id)?.filename ?? "Document"}</TableCell>
                          <TableCell><ArrowRight className="h-4 w-4 text-muted-foreground" /></TableCell>
                          <TableCell className="font-medium">{documentMap.get(candidate.candidate_document_id)?.filename ?? "Document"}</TableCell>
                          <TableCell><div className="font-medium">{candidate.confidence}% likely</div><div className="text-xs capitalize text-muted-foreground">{candidate.detection_method.split("_").join(" ")}</div></TableCell>
                          <TableCell><Badge variant={statusBadge(candidate.status)} className="capitalize">{candidate.status.split("_").join(" ")}</Badge></TableCell>
                          <TableCell className="text-right">{candidate.status === "open" ? <div className="flex justify-end gap-1"><Button size="sm" variant="outline" onClick={() => reviewDuplicate.mutate({ id: candidate.id, status: "not_duplicate" })}>Keep both</Button><Button size="sm" variant="destructive" onClick={() => reviewDuplicate.mutate({ id: candidate.id, status: "confirmed_duplicate" })}>Mark duplicate</Button></div> : <span className="text-xs text-muted-foreground">Reviewed</span>}</TableCell>
                        </TableRow>
                      ))}</TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="adjustments" className="space-y-4">
              <div className="flex justify-end"><Button onClick={() => setShowJudgement(true)}><Plus className="mr-2 h-4 w-4" /> Add judgement</Button></div>
              <Card className="workspace-panel overflow-hidden">
                <CardHeader><CardTitle>Accounting judgements and year-end adjustments</CardTitle><CardDescription>Record capex, cash expenses, depreciation, accruals, prepayments and opening or closing balance decisions before journal posting.</CardDescription></CardHeader>
                <CardContent className="overflow-x-auto p-0">
                  {judgements.length === 0 ? <div className="py-14 text-center text-sm text-muted-foreground">No proposed adjustments or judgements.</div> : (
                    <Table className="min-w-[820px]"><TableHeader><TableRow><TableHead>Type</TableHead><TableHead>Judgement</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Review</TableHead></TableRow></TableHeader>
                      <TableBody>{judgements.map((item) => <TableRow key={item.id}>
                        <TableCell><Badge variant="outline" className="capitalize">{item.judgement_type.split("_").join(" ")}</Badge></TableCell>
                        <TableCell><div className="font-medium">{item.title}</div>{item.description && <div className="max-w-xl text-xs text-muted-foreground">{item.description}</div>}</TableCell>
                        <TableCell className="text-right font-medium">{item.amount_pence == null ? "—" : money(item.amount_pence)}</TableCell>
                        <TableCell><Badge variant={statusBadge(item.status)} className="capitalize">{item.status}</Badge></TableCell>
                        <TableCell className="text-right">{item.status === "proposed" ? <div className="flex justify-end gap-1"><Button size="sm" variant="outline" onClick={() => reviewJudgement.mutate({ id: item.id, status: "rejected" })}>Reject</Button><Button size="sm" onClick={() => reviewJudgement.mutate({ id: item.id, status: "approved" })}>Approve</Button></div> : <span className="text-xs text-muted-foreground">Reviewed</span>}</TableCell>
                      </TableRow>)}</TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="year-end">
              <Card className="workspace-panel">
                <CardHeader><CardTitle>Year-end control checklist</CardTitle><CardDescription>{selectedClient?.legal_name} · {selectedPeriod?.accounts_standard}. Complete or mark every control not applicable before final review.</CardDescription></CardHeader>
                <CardContent className="space-y-5">
                  <div><div className="mb-2 flex justify-between text-sm"><span>Overall readiness</span><span className="font-semibold">{checklistProgress}%</span></div><Progress value={checklistProgress} /></div>
                  {checks.length === 0 ? <div className="py-10 text-center text-sm text-muted-foreground">Run matching to initialise the year-end checklist.</div> : checks.map((check) => (
                    <div key={check.id} className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-start gap-3"><div className={`mt-0.5 rounded-full p-1 ${check.status === "complete" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{check.status === "complete" ? <Check className="h-3.5 w-3.5" /> : <Scale className="h-3.5 w-3.5" />}</div><div><div className="font-medium">{check.title}</div><div className="text-xs text-muted-foreground">{check.category}</div></div></div>
                      <Select value={check.status} onValueChange={(status) => updateCheck.mutate({ id: check.id, status })}><SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="not_started">Not started</SelectItem><SelectItem value="in_progress">In progress</SelectItem><SelectItem value="complete">Complete</SelectItem><SelectItem value="blocked">Blocked</SelectItem><SelectItem value="not_applicable">Not applicable</SelectItem></SelectContent></Select>
                    </div>
                  ))}
                  {checks.length > 0 && checklistProgress === 100 && <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm"><CheckCircle2 className="h-5 w-5 text-primary" /><span>All year-end controls have a completed or not-applicable decision. The period can progress to accounts review.</span></div>}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}

      <Dialog open={showJudgement} onOpenChange={setShowJudgement}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add accounting judgement</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Type</Label><Select value={judgement.type} onValueChange={(type) => setJudgement((current) => ({ ...current, type }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="capex">Capital expenditure</SelectItem><SelectItem value="cash_expense">Cash expense</SelectItem><SelectItem value="accrual">Accrual</SelectItem><SelectItem value="prepayment">Prepayment</SelectItem><SelectItem value="depreciation">Depreciation</SelectItem><SelectItem value="opening_balance">Opening balance</SelectItem><SelectItem value="closing_balance">Closing balance</SelectItem><SelectItem value="missing_evidence">Missing evidence</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label>Title</Label><Input value={judgement.title} onChange={(event) => setJudgement((current) => ({ ...current, title: event.target.value }))} placeholder="e.g. Laptop purchase treated as computer equipment" /></div>
            <div className="space-y-2"><Label>Amount (£)</Label><Input type="number" step="0.01" value={judgement.amount} onChange={(event) => setJudgement((current) => ({ ...current, amount: event.target.value }))} /></div>
            <div className="space-y-2"><Label>Rationale and evidence</Label><Textarea value={judgement.description} onChange={(event) => setJudgement((current) => ({ ...current, description: event.target.value }))} placeholder="Record why this treatment is appropriate and what evidence supports it." /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowJudgement(false)}>Cancel</Button><Button onClick={() => addJudgement.mutate()} disabled={addJudgement.isPending}>{addJudgement.isPending ? "Saving…" : "Add for review"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
