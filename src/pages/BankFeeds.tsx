import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useClientContext } from "@/contexts/ClientContext";
import { usePermissions } from "@/hooks/usePermissions";
import { requireConsistentBankTransaction, requireManualBankConnection, validateBankCsvFile } from "@/lib/bankFeedSafety";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Landmark, Plus, ArrowUpRight, ArrowDownLeft, CheckCircle2, Tag, Sparkles, Upload } from "lucide-react";
import { toast } from "sonner";
import { parseBankCsv } from "@/lib/bankCsv";

const statusColors: Record<string, string> = {
  active: "bg-success text-success-foreground",
  expired: "bg-warning text-warning-foreground",
  revoked: "bg-destructive text-destructive-foreground",
  error: "bg-destructive text-destructive-foreground",
};

const catStatusColors: Record<string, string> = {
  uncategorised: "bg-muted text-muted-foreground",
  suggested: "bg-warning text-warning-foreground",
  confirmed: "bg-info text-info-foreground",
  posted: "bg-success text-success-foreground",
};

export default function BankFeeds() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { selectedClientId, selectedClientName } = useClientContext();
  const { tenantId, can } = usePermissions();
  const canEditLedger = can("ledger", "edit");
  const [showAddConnection, setShowAddConnection] = useState(false);
  const [showAddTxn, setShowAddTxn] = useState(false);
  const [showCsvImport, setShowCsvImport] = useState(false);
  const [showPostConfirmation, setShowPostConfirmation] = useState(false);
  const [csvConnectionId, setCsvConnectionId] = useState("");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [selectedConnection, setSelectedConnection] = useState<string>("all");
  const [catFilter, setCatFilter] = useState<string>("all");
  const [connForm, setConnForm] = useState({ client_id: "", account_name: "", account_number_masked: "", sort_code: "", provider: "manual", ledger_account_id: "" });
  const [txnForm, setTxnForm] = useState({ bank_connection_id: "", transaction_date: new Date().toISOString().split("T")[0], description: "", amount: "", reference: "", transaction_type: "debit" });

  // Use the authenticated staff membership's tenant, not user-editable profile metadata.
  const profile = tenantId ? { tenant_id: tenantId } : null;
  useEffect(() => {
    setSelectedConnection("all");
    setCsvConnectionId("");
    setCsvFile(null);
    setShowAddConnection(false);
    setShowAddTxn(false);
    setShowCsvImport(false);
    setShowPostConfirmation(false);
    setConnForm({ client_id: selectedClientId ?? "", account_name: "", account_number_masked: "", sort_code: "", provider: "manual", ledger_account_id: "" });
  }, [tenantId, selectedClientId]);

  const { data: clients = [], isError: clientsError } = useQuery({
    queryKey: ["clients-list", tenantId, user?.id, selectedClientId],
    queryFn: async () => {
      let request = supabase.from("clients").select("id, legal_name").eq("tenant_id", tenantId!).order("legal_name");
      if (selectedClientId) request = request.eq("id", selectedClientId);
      const { data, error } = await request;
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.tenant_id,
  });

  const { data: connections = [], isLoading: loadingConns, isError: connectionsError } = useQuery({
    queryKey: ["bank_connections", tenantId, user?.id, selectedClientId],
    queryFn: async () => {
      let q = supabase
        .from("bank_connections")
        .select("*, client:clients(legal_name)")
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: false });
      if (selectedClientId) q = q.eq("client_id", selectedClientId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.tenant_id,
  });

  const { data: transactions = [], isLoading: loadingTxns, isError: transactionsError } = useQuery({
    queryKey: ["bank_transactions", tenantId, user?.id, selectedClientId, selectedConnection, catFilter],
    queryFn: async () => {
      let query = supabase
        .from("bank_transactions")
        .select("*, bank_connection:bank_connections(account_name, ledger_account_id), suggested_account:chart_of_accounts!bank_transactions_suggested_account_id_fkey(code, name), confirmed_account:chart_of_accounts!bank_transactions_confirmed_account_id_fkey(code, name)")
        .eq("tenant_id", tenantId!)
        .order("transaction_date", { ascending: false })
        .limit(200);

      if (selectedClientId) query = query.eq("client_id", selectedClientId);
      if (selectedConnection !== "all") query = query.eq("bank_connection_id", selectedConnection);
      if (catFilter !== "all") query = query.eq("categorisation_status", catFilter);

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.tenant_id,
  });

  const { data: accounts = [], isError: accountsError } = useQuery({
    queryKey: ["chart_of_accounts", tenantId, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("chart_of_accounts").select("id, code, name").eq("tenant_id", tenantId!).order("code");
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.tenant_id,
  });

  const addConnection = useMutation({
    mutationFn: async () => {
      if (!profile?.tenant_id || !canEditLedger) throw new Error("Bank account editing is not authorised");
      if (!clients.some((c: any) => c.id === connForm.client_id) || (selectedClientId && connForm.client_id !== selectedClientId)) throw new Error("Select a client in this practice");
      if (!accounts.some((a: any) => a.id === connForm.ledger_account_id && a.code.startsWith("10"))) throw new Error("Select a valid bank/cash ledger account");
      if (!connForm.account_name.trim()) throw new Error("Bank account name is required");
      const { error } = await supabase.from("bank_connections").insert({
        tenant_id: profile.tenant_id,
        client_id: connForm.client_id,
        account_name: connForm.account_name.trim(),
        account_number_masked: connForm.account_number_masked.trim() || null,
        sort_code: connForm.sort_code.trim() || null,
        provider: "manual",
        ledger_account_id: connForm.ledger_account_id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank_connections"] });
      setShowAddConnection(false);
      setConnForm({ client_id: "", account_name: "", account_number_masked: "", sort_code: "", provider: "manual", ledger_account_id: "" });
      toast.success("Bank account added");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const addTransaction = useMutation({
    mutationFn: async () => {
      if (!profile?.tenant_id || !canEditLedger) throw new Error("Adding bank transactions is not authorised");
      const conn = requireManualBankConnection(connections.find((c: any) => c.id === txnForm.bank_connection_id), profile.tenant_id, selectedClientId);
      const amountPence = Math.round(parseFloat(txnForm.amount) * 100);
      if (!Number.isSafeInteger(amountPence) || amountPence === 0) throw new Error("Enter a valid amount");
      if (!txnForm.description.trim()) throw new Error("Enter a description");

      const { error } = await supabase.from("bank_transactions").insert({
        tenant_id: profile.tenant_id,
        client_id: conn.client_id,
        bank_connection_id: txnForm.bank_connection_id,
        transaction_date: txnForm.transaction_date,
        description: txnForm.description.trim(),
        amount_pence: txnForm.transaction_type === "debit" ? -Math.abs(amountPence) : Math.abs(amountPence),
        reference: txnForm.reference.trim() || null,
        transaction_type: txnForm.transaction_type,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank_transactions"] });
      setShowAddTxn(false);
      setTxnForm({ bank_connection_id: "", transaction_date: new Date().toISOString().split("T")[0], description: "", amount: "", reference: "", transaction_type: "debit" });
      toast.success("Transaction added");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const importCsv = useMutation({
    mutationFn: async () => {
      if (!profile?.tenant_id || !canEditLedger) throw new Error("CSV import is not authorised");
      if (!csvFile || !csvConnectionId) throw new Error("Choose a CSV file and bank account");
      validateBankCsvFile(csvFile);
      const connection = requireManualBankConnection(connections.find((item: any) => item.id === csvConnectionId), profile.tenant_id, selectedClientId);
      const parsed = parseBankCsv(await csvFile.text());
      if (parsed.transactions.length > 10000) throw new Error("CSV has too many transactions; split it into smaller statements");
      if (!parsed.transactions.length) throw new Error(parsed.errors[0] || "No valid transactions found");

      let imported = 0;
      for (let start = 0; start < parsed.transactions.length; start += 500) {
        const batch = parsed.transactions.slice(start, start + 500).map((transaction) => ({
          ...transaction,
          tenant_id: profile.tenant_id,
          client_id: connection.client_id,
          bank_connection_id: csvConnectionId,
          categorisation_status: "uncategorised",
        }));
        const { data, error } = await supabase
          .from("bank_transactions")
          .upsert(batch, { onConflict: "bank_connection_id,provider_transaction_id", ignoreDuplicates: true })
          .select("id");
        if (error) throw error;
        imported += data?.length ?? 0;
      }
      return { imported, parsed: parsed.transactions.length, skippedRows: parsed.errors.length };
    },
    onSuccess: ({ imported, parsed, skippedRows }) => {
      queryClient.invalidateQueries({ queryKey: ["bank_transactions"] });
      setShowCsvImport(false);
      setCsvFile(null);
      setCsvConnectionId("");
      toast.success(`${imported} new transactions imported${parsed - imported ? ` · ${parsed - imported} existing rows ignored` : ""}${skippedRows ? ` · ${skippedRows} invalid rows skipped` : ""}`);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const categoriseTxn = useMutation({
    mutationFn: async ({ txnId, accountId }: { txnId: string; accountId: string }) => {
      if (!canEditLedger || !tenantId) throw new Error("Categorisation is not authorised");
      const txn = transactions.find((t: any) => t.id === txnId && t.tenant_id === tenantId && (!selectedClientId || t.client_id === selectedClientId));
      if (!txn || txn.categorisation_status !== "uncategorised") throw new Error("Transaction is unavailable; refresh to review");
      if (!accounts.some((a: any) => a.id === accountId)) throw new Error("Choose a ledger account in this practice");
      const { data, error } = await supabase.from("bank_transactions").update({
        confirmed_account_id: accountId,
        categorisation_status: "confirmed",
      }).eq("id", txnId).eq("tenant_id", tenantId).eq("client_id", txn.client_id).eq("categorisation_status", "uncategorised").select("id");
      if (error) throw error;
      if (data?.length !== 1) throw new Error("Transaction changed; refresh and review before retrying");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank_transactions"] });
      toast.success("Transaction categorised");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const formatAmount = (pence: number) => {
    const abs = Math.abs(pence) / 100;
    return `${pence < 0 ? "-" : ""}£${abs.toFixed(2)}`;
  };

  const uncategorisedCount = transactions.filter((t: any) => t.categorisation_status === "uncategorised").length;
  const suggestedCount = transactions.filter((t: any) => t.categorisation_status === "suggested").length;
  const uncategorisedIds = transactions.filter((t: any) => t.categorisation_status === "uncategorised").map((t: any) => t.id);

  const aiCategorise = useMutation({
    mutationFn: async () => {
      if (!canEditLedger) throw new Error("AI categorisation is not authorised");
      if (!uncategorisedIds.length) throw new Error("No uncategorised transactions");
      const { data, error } = await supabase.functions.invoke("ai-categorise", {
        body: { transaction_ids: uncategorisedIds.slice(0, 50) },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["bank_transactions"] });
      toast.success(`AI suggested categories for ${data?.updated || 0} transactions`);
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Bulk confirm all suggested → confirmed
  const bulkConfirm = useMutation({
    mutationFn: async () => {
      if (!canEditLedger || !tenantId) throw new Error("Bulk categorisation is not authorised");
      const suggested = transactions.filter((t: any) => t.tenant_id === tenantId && (!selectedClientId || t.client_id === selectedClientId) && t.categorisation_status === "suggested" && t.suggested_account_id);
      if (!suggested.length) throw new Error("No suggested transactions to confirm");
      let confirmed = 0;
      for (const t of suggested) {
        const { data, error } = await supabase.from("bank_transactions").update({
          confirmed_account_id: t.suggested_account_id,
          categorisation_status: "confirmed",
        }).eq("id", t.id).eq("tenant_id", tenantId).eq("client_id", t.client_id).eq("categorisation_status", "suggested").select("id");
        if (error) throw new Error(`Stopped after ${confirmed} confirmed transactions. Refresh before retrying.`);
        confirmed += data?.length ?? 0;
      }
      if (confirmed !== suggested.length) throw new Error(`${confirmed} of ${suggested.length} transactions confirmed; refresh to reconcile.`);
      return confirmed;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["bank_transactions"] });
      toast.success(`${count} transactions confirmed`);
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Post confirmed transactions to ledger
  const postToLedger = useMutation({
    mutationFn: async () => {
      if (!profile?.tenant_id || !canEditLedger) throw new Error("Ledger posting is not authorised");
      const confirmed = transactions.filter((t: any) => t.tenant_id === profile.tenant_id && (!selectedClientId || t.client_id === selectedClientId) && t.categorisation_status === "confirmed" && t.confirmed_account_id);
      if (!confirmed.length) throw new Error("No confirmed transactions to post");
      // Validate every row and bank/client binding before performing any irreversible RPC.
      for (const transaction of confirmed) {
        requireConsistentBankTransaction(transaction, connections, profile.tenant_id, selectedClientId);
        if (!transaction.bank_connection?.ledger_account_id ||
            !accounts.some((account: any) => account.id === transaction.bank_connection.ledger_account_id)) {
          throw new Error("A confirmed transaction has no valid bank/cash ledger mapping in this practice");
        }
        if (!accounts.some((account: any) => account.id === transaction.confirmed_account_id)) {
          throw new Error("A confirmed transaction has an unavailable ledger category");
        }
      }
      let posted = 0;
      for (const t of confirmed as any[]) {
        const { error } = await supabase.rpc("post_bank_transaction", { p_transaction_id: t.id });
        if (error) throw error;
        posted += 1;
      }
      return posted;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["bank_transactions"] });
      toast.success(`${count} posting requests completed. Check refreshed transaction statuses and the ledger.`);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const confirmedCount = transactions.filter((t: any) => t.categorisation_status === "confirmed").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="font-serif text-3xl font-semibold tracking-tight md:text-4xl">Bank feeds & imports</h1>
          <p className="text-sm text-muted-foreground">Manage manual bank accounts, statement imports and reviewed categorisation</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end [&>button]:min-h-11 sm:[&>button]:min-h-9">

          {uncategorisedCount > 0 && (
            <Button variant="outline" className="gap-2" onClick={() => aiCategorise.mutate()} disabled={aiCategorise.isPending || !canEditLedger}>
              <Sparkles className="w-4 h-4" /> {aiCategorise.isPending ? "Categorising…" : `AI Categorise (${uncategorisedCount})`}
            </Button>
          )}
          {suggestedCount > 0 && (
            <Button variant="outline" className="gap-2" onClick={() => bulkConfirm.mutate()} disabled={bulkConfirm.isPending || !canEditLedger}>
              <CheckCircle2 className="w-4 h-4" /> Confirm All ({suggestedCount})
            </Button>
          )}
          {confirmedCount > 0 && (
            <Button variant="default" className="gap-2" onClick={() => setShowPostConfirmation(true)} disabled={postToLedger.isPending || !canEditLedger}>
              <ArrowUpRight className="w-4 h-4" /> {postToLedger.isPending ? "Posting…" : `Post to Ledger (${confirmedCount})`}
            </Button>
          )}
          <Button variant="outline" className="gap-2" onClick={() => setShowAddTxn(true)} disabled={!canEditLedger}>
            <Plus className="w-4 h-4" /> Add Transaction
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => setShowCsvImport(true)} disabled={!canEditLedger}>
            <Upload className="w-4 h-4" /> Import CSV
          </Button>
          <Button className="gap-2" onClick={() => setShowAddConnection(true)} disabled={!canEditLedger}>
            <Landmark className="w-4 h-4" /> Add Bank Account
          </Button>
        </div>
      </div>

      <div role="status" className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
        Live Open Banking is not connected. Use a manual bank account and statement CSV import while secure provider consent is being developed.
      </div>
      {(clientsError || connectionsError || transactionsError || accountsError) && (
        <div role="alert" className="rounded-xl border border-destructive/50 bg-destructive/5 p-4 text-sm text-destructive">
          Some bank records could not be loaded. Counts and available actions may be incomplete. Refresh before making changes.
        </div>
      )}
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="workspace-panel">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{connections.length}</div>
            <p className="text-sm text-muted-foreground">Bank Accounts</p>
          </CardContent>
        </Card>
        <Card className="workspace-panel">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{transactions.length}</div>
            <p className="text-sm text-muted-foreground">Transactions shown (up to 200)</p>
          </CardContent>
        </Card>
        <Card className="workspace-panel">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-warning">{uncategorisedCount}</div>
            <p className="text-sm text-muted-foreground">Uncategorised</p>
          </CardContent>
        </Card>
        <Card className="workspace-panel">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-success">
              {transactions.filter((t: any) => t.categorisation_status === "posted").length}
            </div>
            <p className="text-sm text-muted-foreground">Posted</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="transactions">
        <TabsList>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="accounts">Bank Accounts</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions" className="mt-4 space-y-4">
          <div className="grid gap-3 sm:flex">
            <Select value={selectedConnection} onValueChange={setSelectedConnection}>
              <SelectTrigger className="w-full sm:w-[220px]"><SelectValue placeholder="All accounts" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All accounts</SelectItem>
                {connections.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>{c.account_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={catFilter} onValueChange={setCatFilter}>
              <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="All statuses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="uncategorised">Uncategorised</SelectItem>
                <SelectItem value="suggested">Suggested</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="posted">Posted</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card className="workspace-panel overflow-hidden">
            <CardContent className="overflow-x-auto pt-6">
              {loadingTxns ? (
                <p className="text-center text-muted-foreground py-8">Loading…</p>
              ) : transactions.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No transactions yet. Add a bank account and import transactions.</p>
              ) : (
                <Table className="min-w-[920px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Account</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((t: any) => (
                      <TableRow key={t.id}>
                        <TableCell className="text-sm">{new Date(t.transaction_date).toLocaleDateString("en-GB")}</TableCell>
                        <TableCell>
                          <div>
                            <span className="text-sm font-medium">{t.description}</span>
                            {t.reference && <span className="text-xs text-muted-foreground ml-2">Ref: {t.reference}</span>}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{t.bank_connection?.account_name || "—"}</TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          <span className={t.amount_pence >= 0 ? "text-success" : "text-destructive"}>
                            {t.amount_pence >= 0 && <ArrowDownLeft className="w-3 h-3 inline mr-1" />}
                            {t.amount_pence < 0 && <ArrowUpRight className="w-3 h-3 inline mr-1" />}
                            {formatAmount(t.amount_pence)}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs">
                          {t.confirmed_account ? (
                            <span className="font-mono">{t.confirmed_account.code} {t.confirmed_account.name}</span>
                          ) : t.suggested_account ? (
                            <span className="font-mono text-muted-foreground">{t.suggested_account.code} {t.suggested_account.name}</span>
                          ) : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge className={catStatusColors[t.categorisation_status] || "bg-muted text-muted-foreground"}>
                            {t.categorisation_status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {t.categorisation_status === "uncategorised" && (
                            <Select onValueChange={(accId) => categoriseTxn.mutate({ txnId: t.id, accountId: accId })}>
                              <SelectTrigger className="h-7 w-7 p-0 border-0">
                                <Tag className="w-3.5 h-3.5" />
                              </SelectTrigger>
                              <SelectContent>
                                {accounts.map((a: any) => (
                                  <SelectItem key={a.id} value={a.id}>{a.code} - {a.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="accounts" className="mt-4 space-y-4">
          <Card className="workspace-panel">
            <CardContent className="pt-6">
              {loadingConns ? (
                <p className="text-center text-muted-foreground py-8">Loading…</p>
              ) : connections.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No bank accounts connected yet.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {connections.map((c: any) => (
                    <Card key={c.id} className="border">
                      <CardContent className="pt-6 space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-medium">{c.account_name}</h3>
                            <p className="text-xs text-muted-foreground">{c.client?.legal_name}</p>
                          </div>
                          <Badge className={c.provider === "manual" ? (statusColors[c.status] || "bg-muted text-muted-foreground") : "bg-warning/15 text-warning-foreground"}>
                            {c.provider === "manual" ? `Manual · ${c.status}` : "Provider unavailable"}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          {c.sort_code && <div><span className="text-muted-foreground">Sort:</span> {c.sort_code}</div>}
                          {c.account_number_masked && <div><span className="text-muted-foreground">Acc:</span> ****{c.account_number_masked}</div>}
                          <div><span className="text-muted-foreground">Provider:</span> {c.provider}</div>
                          <div><span className="text-muted-foreground">Currency:</span> {c.currency}</div>
                        </div>
                        {c.balance_pence != null && (
                          <div className="text-lg font-bold">{formatAmount(c.balance_pence)}</div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Bank Account Dialog */}
      <Dialog open={showCsvImport} onOpenChange={setShowCsvImport}>
        <DialogContent>
          <DialogHeader><DialogTitle>Import bank statement CSV</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-muted/50 p-3 text-xs leading-5 text-muted-foreground">
              Supports common UK bank headings including Date, Description, Amount, Debit, Credit, Balance and Reference. Max 5 MB. Review imported lines before categorising or posting; provider connections are not active.
            </div>
            <div className="space-y-2">
              <Label>Bank account</Label>
              <Select value={csvConnectionId} onValueChange={setCsvConnectionId}>
                <SelectTrigger><SelectValue placeholder="Choose account" /></SelectTrigger>
                <SelectContent>{connections.filter((connection: any) => connection.provider === "manual").map((connection: any) => <SelectItem key={connection.id} value={connection.id}>{connection.account_name} ({connection.client?.legal_name})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>CSV file</Label>
              <Input type="file" accept=".csv,text/csv" onChange={(event) => setCsvFile(event.target.files?.[0] ?? null)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCsvImport(false)}>Cancel</Button>
            <Button onClick={() => importCsv.mutate()} disabled={!csvFile || !csvConnectionId || importCsv.isPending || !canEditLedger}>{importCsv.isPending ? "Importing…" : "Import transactions"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Bank Account Dialog */}
      <Dialog open={showAddConnection} onOpenChange={setShowAddConnection}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Bank Account</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Client *</Label>
              <Select value={connForm.client_id} onValueChange={(v) => setConnForm({ ...connForm, client_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent>
                  {clients.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.legal_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Account Name *</Label>
              <Input value={connForm.account_name} onChange={(e) => setConnForm({ ...connForm, account_name: e.target.value })} placeholder="Business Current Account" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Sort Code</Label>
                <Input value={connForm.sort_code} onChange={(e) => setConnForm({ ...connForm, sort_code: e.target.value })} placeholder="12-34-56" />
              </div>
              <div className="space-y-2">
                <Label>Account No. (last 4)</Label>
                <Input value={connForm.account_number_masked} onChange={(e) => setConnForm({ ...connForm, account_number_masked: e.target.value })} placeholder="1234" maxLength={4} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Manual CSV import only. This record does not connect to your bank automatically.</p>
            <div className="space-y-2">
              <Label>Ledger bank/cash account *</Label>
              <Select value={connForm.ledger_account_id} onValueChange={(v) => setConnForm({ ...connForm, ledger_account_id: v })}>
                <SelectTrigger><SelectValue placeholder="Choose the balancing ledger account" /></SelectTrigger>
                <SelectContent>
                  {accounts.filter((account: any) => account.code.startsWith("10")).map((account: any) => (
                    <SelectItem key={account.id} value={account.id}>{account.code} - {account.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Required so confirmed transactions post as balanced journals to the correct bank account.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddConnection(false)}>Cancel</Button>
            <Button onClick={() => addConnection.mutate()} disabled={!connForm.client_id || !connForm.account_name.trim() || !connForm.ledger_account_id || addConnection.isPending || !canEditLedger}>
              {addConnection.isPending ? "Adding…" : "Add Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Transaction Dialog */}
      <Dialog open={showAddTxn} onOpenChange={setShowAddTxn}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Transaction</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Bank Account *</Label>
              <Select value={txnForm.bank_connection_id} onValueChange={(v) => setTxnForm({ ...txnForm, bank_connection_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                <SelectContent>
                  {connections.filter((c: any) => c.provider === "manual").map((c: any) => <SelectItem key={c.id} value={c.id}>{c.account_name} ({c.client?.legal_name})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date *</Label>
                <Input type="date" value={txnForm.transaction_date} onChange={(e) => setTxnForm({ ...txnForm, transaction_date: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={txnForm.transaction_type} onValueChange={(v) => setTxnForm({ ...txnForm, transaction_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="debit">Debit (out)</SelectItem>
                    <SelectItem value="credit">Credit (in)</SelectItem>
                    
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description *</Label>
              <Input value={txnForm.description} onChange={(e) => setTxnForm({ ...txnForm, description: e.target.value })} placeholder="Amazon Web Services" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Amount (£) *</Label>
                <Input type="number" step="0.01" value={txnForm.amount} onChange={(e) => setTxnForm({ ...txnForm, amount: e.target.value })} placeholder="99.99" />
              </div>
              <div className="space-y-2">
                <Label>Reference</Label>
                <Input value={txnForm.reference} onChange={(e) => setTxnForm({ ...txnForm, reference: e.target.value })} placeholder="INV-001" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddTxn(false)}>Cancel</Button>
            <Button onClick={() => addTransaction.mutate()} disabled={!txnForm.bank_connection_id || !txnForm.description.trim() || !txnForm.amount || addTransaction.isPending || !canEditLedger}>
              {addTransaction.isPending ? "Adding…" : "Add Transaction"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={showPostConfirmation} onOpenChange={setShowPostConfirmation}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm ledger posting</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm leading-6 text-muted-foreground">
            <p>Post {confirmedCount} confirmed transaction{confirmedCount === 1 ? "" : "s"} from this authorised workspace to the ledger?</p>
            <p>This may create financial journal entries and is not an AI suggestion. Check each category and bank/cash ledger mapping before proceeding. Posting may be irreversible; a failed batch can leave some entries posted.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPostConfirmation(false)}>Cancel</Button>
            <Button disabled={!canEditLedger || postToLedger.isPending || confirmedCount === 0} onClick={() => {
              setShowPostConfirmation(false);
              postToLedger.mutate();
            }}>Confirm posting</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
