import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useClientContext } from "@/contexts/ClientContext";
import { usePermissions } from "@/hooks/usePermissions";
import { buildReceiptPostingPreview, reviewNoteIsValid, type ReceiptDraft } from "@/lib/receiptReview";
import { WorkspacePageHeader } from "@/components/layout/WorkspacePageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, ExternalLink, FileSearch, RefreshCw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

const money = (pence: number | null | undefined) =>
  pence == null ? "—" : new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(pence / 100);

export default function ReceiptReviewQueue() {
  const { user } = useAuth();
  const { tenantId, can, loading: roleLoading } = usePermissions();
  const { selectedClientId } = useClientContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const clientFilter = selectedClientId || searchParams.get("client") || null;
  const documentFilter = searchParams.get("document") || "";
  const queryClient = useQueryClient();
  const canView = !!tenantId && !!user && !roleLoading && can("ledger", "view") && can("ocr", "view");
  const canApprove = canView && can("ledger", "edit") && can("ocr", "approve");
  const [expenseId, setExpenseId] = useState("");
  const [bankId, setBankId] = useState("");
  const [note, setNote] = useState("");
  const [checked, setChecked] = useState(false);
  const [search, setSearch] = useState("");

  const receiptsQ = useQuery({
    queryKey: ["receipt-review-extractions", tenantId, user?.id, clientFilter],
    enabled: canView,
    queryFn: async () => {
      let query = supabase.from("receipt_extractions")
        .select("id,tenant_id,client_id,document_id,supplier_name,receipt_date,currency,total_gross_pence,total_net_pence,total_vat_pence,confidence,created_at")
        .eq("tenant_id", tenantId!).order("created_at", { ascending: false }).limit(100);
      if (clientFilter) query = query.eq("client_id", clientFilter);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []).filter(row => !!row.client_id);
    },
  });
  const ids = (receiptsQ.data ?? []).map(item => item.document_id);
  const documentsQ = useQuery({
    queryKey: ["receipt-review-documents", tenantId, user?.id, clientFilter, ids.join(",")],
    enabled: canView && ids.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.from("documents")
        .select("id,tenant_id,client_id,filename,storage_path,document_type,status")
        .eq("tenant_id", tenantId!).in("id", ids);
      if (error) throw error;
      return data ?? [];
    },
  });
  const reviewsQ = useQuery({
    queryKey: ["receipt-review-posted", tenantId, user?.id, clientFilter],
    enabled: canView,
    queryFn: async () => {
      let query = supabase.from("receipt_posting_reviews")
        .select("id,tenant_id,client_id,document_id,expense_account_id,payment_account_id,journal_entry_id,reviewed_at,review_note")
        .eq("tenant_id", tenantId!).order("reviewed_at", { ascending: false }).limit(200);
      if (clientFilter) query = query.eq("client_id", clientFilter);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });
  const accountsQ = useQuery({
    queryKey: ["receipt-review-ledger", tenantId, user?.id],
    enabled: canView,
    queryFn: async () => {
      const { data, error } = await supabase.from("chart_of_accounts")
        .select("id,code,name,account_type,is_active")
        .eq("tenant_id", tenantId!).eq("is_active", true).order("code");
      if (error) throw error;
      return data ?? [];
    },
  });

  const receipt = (receiptsQ.data ?? []).find(row => row.document_id === documentFilter);
  const docMap = useMemo(() =>
    new Map((documentsQ.data ?? []).map(doc => [doc.id, doc])),
    [documentsQ.data]);
  const postedMap = useMemo(() =>
    new Map((reviewsQ.data ?? []).map(review => [review.document_id, review])),
    [reviewsQ.data]);
  const selectedDoc = docMap.get(documentFilter);
  const posted = postedMap.get(documentFilter);
  const accounts = accountsQ.data ?? [];
  const preview = (() => {
    if (!receipt || !expenseId || !bankId) return null;
    try {
      return { data: buildReceiptPostingPreview(receipt as ReceiptDraft, expenseId, bankId, accounts), error: null };
    } catch (error) {
      return { data: null, error: (error as Error).message };
    }
  })();
  const displayRows = (receiptsQ.data ?? []).filter(row =>
    (row.supplier_name || "").toLowerCase().includes(search.trim().toLowerCase()) ||
    (docMap.get(row.document_id)?.filename || "").toLowerCase().includes(search.trim().toLowerCase()));
  const selectedClientMismatch = receipt && clientFilter && receipt.client_id !== clientFilter;
  const hasError = receiptsQ.isError || reviewsQ.isError || documentsQ.isError || accountsQ.isError;
  const isLoading = receiptsQ.isLoading || reviewsQ.isLoading || accountsQ.isLoading;

  const selectReceipt = (docId: string, clientId: string) => {
    const next = new URLSearchParams();
    if (selectedClientId || clientId) next.set("client", selectedClientId || clientId);
    next.set("document", docId);
    setSearchParams(next);
    setExpenseId("");
    setBankId("");
    setNote("");
    setChecked(false);
  };

  const openEvidence = async () => {
    if (!selectedDoc || !can("documents", "view") || !tenantId ||
        selectedDoc.tenant_id !== tenantId || selectedDoc.client_id !== receipt?.client_id)
      return toast.error("The receipt document is not available to this reviewer");
    const { data, error } = await supabase.storage.from("client-documents")
      .createSignedUrl(selectedDoc.storage_path, 90);
    if (error || !data?.signedUrl) return toast.error("Could not open the authorised source document");
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  const post = useMutation({
    mutationFn: async () => {
      if (!canApprove || !tenantId || !user) throw new Error("Receipt posting is not authorised");
      if (!receipt || !selectedDoc || selectedClientMismatch || posted)
        throw new Error("Select an unposted receipt for this client");
      if (receipt.tenant_id !== tenantId || selectedDoc.tenant_id !== tenantId ||
          selectedDoc.client_id !== receipt.client_id || selectedDoc.document_type !== "receipt")
        throw new Error("Receipt source does not match this authorised practice and client");
      if (!reviewNoteIsValid(note) || !checked)
        throw new Error("Enter a review note and confirm you checked the source and VAT treatment");
      // The preview is advisory: the database checks ALL facts again under a
      // tenant/role-authorised transaction and is the only writer of journals.
      buildReceiptPostingPreview(receipt as ReceiptDraft, expenseId, bankId, accounts);
      const { data, error } = await supabase.rpc("post_receipt_review", {
        p_document_id: receipt.document_id,
        p_expense_account_id: expenseId,
        p_payment_account_id: bankId,
        p_review_note: note.trim(),
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["receipt-review-posted", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["journal_entries"] });
      setChecked(false);
      setNote("");
      toast.success("Reviewed receipt was posted to the ledger with an audit record");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="space-y-6">
      <WorkspacePageHeader eyebrow="Controlled bookkeeping" title="Receipt review queue" icon={FileSearch}
        description="Review source evidence and AI-extracted totals before any journal posting. AI never approves a receipt." />
      <div className="rounded-xl border bg-muted/35 p-4 text-sm text-muted-foreground">
        Reviewed receipts only. This view lists the latest 100 extracted receipts and is not an all-time audit report.
        VAT recovery and expense classification require independent accountant judgement.
      </div>
      {!canView && !roleLoading && <div role="alert" className="rounded-xl border p-5 text-sm">
        Ledger and OCR viewing permissions are required for this review queue.
      </div>}
      {hasError && <div role="alert" className="rounded-xl border border-destructive/50 p-4 text-sm text-destructive">
        Some authorised review records could not be loaded. Totals and status are incomplete; retry before posting.
      </div>}
      {canView && (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.12fr)]">
          <Card>
            <CardHeader className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-lg">Receipts to review</CardTitle>
                <Button variant="outline" size="sm" disabled={receiptsQ.isFetching}
                  onClick={() => { void receiptsQ.refetch(); void reviewsQ.refetch(); void documentsQ.refetch(); }}>
                  <RefreshCw className="mr-1.5 h-4 w-4" /> Refresh
                </Button>
              </div>
              <CardDescription>
                {hasError || isLoading ? "Counts unavailable" :
                  `${displayRows.filter(row => !postedMap.has(row.document_id)).length} unposted in this view`}
              </CardDescription>
              <Input aria-label="Find a receipt" placeholder="Search supplier or filename" value={search}
                onChange={event => setSearch(event.target.value)} />
            </CardHeader>
            <CardContent className="space-y-2">
              {isLoading ? <p role="status" className="py-7 text-sm text-muted-foreground">Loading authorised receipts…</p> :
                displayRows.length === 0 ?
                  <p className="py-7 text-sm text-muted-foreground">
                    No receipts match this view. Scan a receipt from Bookkeeping to prepare a draft.
                  </p> :
                  displayRows.map(row => {
                    const isPosted = postedMap.has(row.document_id);
                    const active = row.document_id === documentFilter;
                    return (
                      <button type="button" key={row.id}
                        aria-pressed={active}
                        onClick={() => selectReceipt(row.document_id,row.client_id!)}
                        className={`w-full rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${active ? "border-primary bg-accent/50" : "hover:bg-muted/40"}`}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-semibold">{row.supplier_name || "Supplier not extracted"}</span>
                          <Badge variant={isPosted ? "default" : "secondary"}>{isPosted ? "Posted" : "Review"}</Badge>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                          <span className="max-w-[175px] truncate">{docMap.get(row.document_id)?.filename || "Receipt"}</span>
                          <span>{money(row.total_gross_pence)}</span>
                        </div>
                      </button>
                    );
                  })}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Human review</CardTitle>
              <CardDescription>Every posting is recorded with the reviewer, source values and selected ledger accounts.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {!receipt || !selectedDoc || selectedClientMismatch ? (
                <p className="py-8 text-sm text-muted-foreground">
                  Select a receipt with an available source document to review its extracted figures.
                </p>
              ) : (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="space-y-1">
                      <p className="font-semibold">{receipt.supplier_name || "Unverified supplier"}</p>
                      <p className="text-xs text-muted-foreground">{selectedDoc.filename} · {receipt.receipt_date || "Date missing"}</p>
                    </div>
                    <Button variant="outline" size="sm" disabled={!can("documents","view")} onClick={openEvidence}>
                      <ExternalLink className="mr-1.5 h-4 w-4" /> Source
                    </Button>
                  </div>
                  <dl className="grid grid-cols-3 gap-2 rounded-xl bg-muted/40 p-3 text-sm">
                    <div><dt className="text-xs text-muted-foreground">Net</dt><dd className="mt-1 font-semibold tabular-nums">{money(receipt.total_net_pence)}</dd></div>
                    <div><dt className="text-xs text-muted-foreground">VAT</dt><dd className="mt-1 font-semibold tabular-nums">{money(receipt.total_vat_pence)}</dd></div>
                    <div><dt className="text-xs text-muted-foreground">Gross</dt><dd className="mt-1 font-semibold tabular-nums">{money(receipt.total_gross_pence)}</dd></div>
                  </dl>
                  {posted ? (
                    <div role="status" className="space-y-2 rounded-xl border p-4 text-sm">
                      <p className="flex items-center gap-2 font-semibold"><CheckCircle2 className="h-4 w-4" /> Posted after human review</p>
                      <p className="text-muted-foreground">{posted.review_note}</p>
                      <p className="break-all text-xs text-muted-foreground">Journal: {posted.journal_entry_id}</p>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label>Expense ledger account</Label>
                        <Select value={expenseId} onValueChange={setExpenseId}>
                          <SelectTrigger aria-label="Expense account"><SelectValue placeholder="Choose an expense account" /></SelectTrigger>
                          <SelectContent>
                            {accounts.filter(a => a.account_type === "expense" && a.is_active).map(a =>
                              <SelectItem key={a.id} value={a.id}>{a.code} · {a.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Bank or cash account used for payment</Label>
                        <Select value={bankId} onValueChange={setBankId}>
                          <SelectTrigger aria-label="Bank or cash account"><SelectValue placeholder="Choose a bank/cash account" /></SelectTrigger>
                          <SelectContent>
                            {accounts.filter(a => a.code.startsWith("10") && a.is_active).map(a =>
                              <SelectItem key={a.id} value={a.id}>{a.code} · {a.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      {preview?.error && <p role="alert" className="text-sm text-destructive">{preview.error}</p>}
                      {preview?.data && (
                        <div className="space-y-2 rounded-xl border p-3 text-sm">
                          <p className="font-semibold">Proposed balanced journal</p>
                          {preview.data.lines.map((line,i) => (
                            <div key={i} className="flex justify-between gap-3 text-xs">
                              <span>{line.label} ({line.direction})</span>
                              <span className="tabular-nums">{money(line.amountPence)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="space-y-2">
                        <Label htmlFor="receipt-review-note">Review evidence and decision (12–1000 characters)</Label>
                        <Textarea id="receipt-review-note" rows={3} value={note} onChange={event => setNote(event.target.value)}
                          placeholder="I checked the receipt, business purpose, payment evidence and input VAT treatment…" />
                      </div>
                      <label className="flex items-start gap-3 text-sm leading-5">
                        <input type="checkbox" checked={checked} onChange={event => setChecked(event.target.checked)}
                          className="mt-1 h-4 w-4 shrink-0" />
                        <span>I independently checked the source and approve this accounting treatment. I understand posting creates a journal.</span>
                      </label>
                      {!canApprove && <p className="text-xs text-muted-foreground">
                        Posting requires ledger.edit and ocr.approve. Viewing a draft does not grant posting rights.
                      </p>}
                      <Button className="w-full" disabled={!canApprove || !checked || !reviewNoteIsValid(note) ||
                          !preview?.data || post.isPending || hasError || !selectedDoc || !receipt}
                        onClick={() => post.mutate()}>
                        <ShieldCheck className="mr-2 h-4 w-4" /> {post.isPending ? "Posting reviewed receipt…" : "Approve and post journal"}
                      </Button>
                    </>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
