import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useClientContext } from "@/contexts/ClientContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Landmark, Plus, RefreshCw, ArrowUpRight, ArrowDownLeft, CheckCircle2, Tag, Sparkles } from "lucide-react";
import { toast } from "sonner";

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
  const [showAddConnection, setShowAddConnection] = useState(false);
  const [showAddTxn, setShowAddTxn] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState<string>("all");
  const [catFilter, setCatFilter] = useState<string>("all");
  const [connForm, setConnForm] = useState({ client_id: "", account_name: "", account_number_masked: "", sort_code: "", provider: "manual" });
  const [txnForm, setTxnForm] = useState({ bank_connection_id: "", transaction_date: new Date().toISOString().split("T")[0], description: "", amount: "", reference: "", transaction_type: "debit" });

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
    queryKey: ["clients-list", profile?.tenant_id],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("id, legal_name").order("legal_name");
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.tenant_id,
  });

  const { data: connections = [], isLoading: loadingConns } = useQuery({
    queryKey: ["bank_connections", profile?.tenant_id, selectedClientId],
    queryFn: async () => {
      let q = supabase
        .from("bank_connections")
        .select("*, client:clients(legal_name)")
        .order("created_at", { ascending: false });
      if (selectedClientId) q = q.eq("client_id", selectedClientId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.tenant_id,
  });

  const { data: transactions = [], isLoading: loadingTxns } = useQuery({
    queryKey: ["bank_transactions", profile?.tenant_id, selectedConnection, catFilter],
    queryFn: async () => {
      let query = supabase
        .from("bank_transactions")
        .select("*, bank_connection:bank_connections(account_name), suggested_account:chart_of_accounts!bank_transactions_suggested_account_id_fkey(code, name), confirmed_account:chart_of_accounts!bank_transactions_confirmed_account_id_fkey(code, name)")
        .order("transaction_date", { ascending: false })
        .limit(200);

      if (selectedConnection !== "all") query = query.eq("bank_connection_id", selectedConnection);
      if (catFilter !== "all") query = query.eq("categorisation_status", catFilter);

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.tenant_id,
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ["chart_of_accounts", profile?.tenant_id],
    queryFn: async () => {
      const { data, error } = await supabase.from("chart_of_accounts").select("id, code, name").order("code");
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.tenant_id,
  });

  const addConnection = useMutation({
    mutationFn: async () => {
      if (!profile?.tenant_id) throw new Error("No tenant");
      const { error } = await supabase.from("bank_connections").insert({
        tenant_id: profile.tenant_id,
        client_id: connForm.client_id,
        account_name: connForm.account_name.trim(),
        account_number_masked: connForm.account_number_masked.trim() || null,
        sort_code: connForm.sort_code.trim() || null,
        provider: connForm.provider,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank_connections"] });
      setShowAddConnection(false);
      setConnForm({ client_id: "", account_name: "", account_number_masked: "", sort_code: "", provider: "manual" });
      toast.success("Bank account added");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const addTransaction = useMutation({
    mutationFn: async () => {
      if (!profile?.tenant_id) throw new Error("No tenant");
      const conn = connections.find((c: any) => c.id === txnForm.bank_connection_id);
      if (!conn) throw new Error("Select a bank account");
      const amountPence = Math.round(parseFloat(txnForm.amount) * 100);
      if (isNaN(amountPence) || amountPence === 0) throw new Error("Enter a valid amount");

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

  const categoriseTxn = useMutation({
    mutationFn: async ({ txnId, accountId }: { txnId: string; accountId: string }) => {
      const { error } = await supabase.from("bank_transactions").update({
        confirmed_account_id: accountId,
        categorisation_status: "confirmed",
      }).eq("id", txnId);
      if (error) throw error;
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
      const suggested = transactions.filter((t: any) => t.categorisation_status === "suggested" && t.suggested_account_id);
      if (!suggested.length) throw new Error("No suggested transactions to confirm");
      for (const t of suggested) {
        await supabase.from("bank_transactions").update({
          confirmed_account_id: (t as any).suggested_account_id,
          categorisation_status: "confirmed",
        }).eq("id", (t as any).id);
      }
      return suggested.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["bank_transactions"] });
      toast.success(`${count} transactions confirmed`);
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Sync via Open Banking
  const syncOpenBanking = useMutation({
    mutationFn: async () => {
      const obConnections = connections.filter((c: any) => c.provider === "truelayer" && c.status === "active");
      if (!obConnections.length) throw new Error("No active Open Banking connections. Add one first.");
      const { data, error } = await supabase.functions.invoke("open-banking", {
        body: {
          action: "sync_transactions",
          connection_ids: obConnections.map((c: any) => c.id),
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["bank_transactions"] });
      queryClient.invalidateQueries({ queryKey: ["bank_connections"] });
      toast.success(`Synced ${data?.imported || 0} new transactions from Open Banking`);
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Post confirmed transactions to ledger
  const postToLedger = useMutation({
    mutationFn: async () => {
      if (!profile?.tenant_id) throw new Error("No tenant");
      const confirmed = transactions.filter((t: any) => t.categorisation_status === "confirmed" && t.confirmed_account_id);
      if (!confirmed.length) throw new Error("No confirmed transactions to post");
      for (const t of confirmed as any[]) {
        const bankAcc = accounts.find((a: any) => a.code === "1000");
        if (!bankAcc) continue;
        const { data: journal } = await supabase.from("journal_entries").insert({
          tenant_id: profile.tenant_id,
          client_id: t.client_id,
          entry_date: t.transaction_date,
          reference: `BF-${t.id.slice(0, 8)}`,
          narration: t.description,
          is_posted: true,
        }).select().single();
        if (!journal) continue;
        const lines = t.amount_pence >= 0
          ? [
              { journal_entry_id: journal.id, account_id: bankAcc.id, debit: Math.abs(t.amount_pence) / 100, credit: 0, description: t.description },
              { journal_entry_id: journal.id, account_id: t.confirmed_account_id, debit: 0, credit: Math.abs(t.amount_pence) / 100, description: t.description },
            ]
          : [
              { journal_entry_id: journal.id, account_id: t.confirmed_account_id, debit: Math.abs(t.amount_pence) / 100, credit: 0, description: t.description },
              { journal_entry_id: journal.id, account_id: bankAcc.id, debit: 0, credit: Math.abs(t.amount_pence) / 100, description: t.description },
            ];
        await supabase.from("journal_lines").insert(lines);
        await supabase.from("bank_transactions").update({
          categorisation_status: "posted",
          journal_entry_id: journal.id,
        }).eq("id", t.id);
      }
      return confirmed.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["bank_transactions"] });
      toast.success(`${count} transactions posted to ledger`);
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bank Feeds</h1>
          <p className="text-sm text-muted-foreground">Manage bank connections and imported transactions</p>
        </div>
        <div className="flex gap-2">
          {uncategorisedCount > 0 && (
            <Button variant="outline" className="gap-2" onClick={() => aiCategorise.mutate()} disabled={aiCategorise.isPending}>
              <Sparkles className="w-4 h-4" /> {aiCategorise.isPending ? "Categorising…" : `AI Categorise (${uncategorisedCount})`}
            </Button>
          )}
          <Button variant="outline" className="gap-2" onClick={() => setShowAddTxn(true)}>
            <Plus className="w-4 h-4" /> Add Transaction
          </Button>
          <Button className="gap-2" onClick={() => setShowAddConnection(true)}>
            <Landmark className="w-4 h-4" /> Add Bank Account
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{connections.length}</div>
            <p className="text-sm text-muted-foreground">Bank Accounts</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{transactions.length}</div>
            <p className="text-sm text-muted-foreground">Transactions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-warning">{uncategorisedCount}</div>
            <p className="text-sm text-muted-foreground">Uncategorised</p>
          </CardContent>
        </Card>
        <Card>
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
          <div className="flex gap-3">
            <Select value={selectedConnection} onValueChange={setSelectedConnection}>
              <SelectTrigger className="w-[220px]"><SelectValue placeholder="All accounts" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All accounts</SelectItem>
                {connections.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>{c.account_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={catFilter} onValueChange={setCatFilter}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="All statuses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="uncategorised">Uncategorised</SelectItem>
                <SelectItem value="suggested">Suggested</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="posted">Posted</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardContent className="pt-6">
              {loadingTxns ? (
                <p className="text-center text-muted-foreground py-8">Loading…</p>
              ) : transactions.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No transactions yet. Add a bank account and import transactions.</p>
              ) : (
                <Table>
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
          <Card>
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
                          <Badge className={statusColors[c.status] || "bg-muted text-muted-foreground"}>
                            {c.status}
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
            <div className="space-y-2">
              <Label>Provider</Label>
              <Select value={connForm.provider} onValueChange={(v) => setConnForm({ ...connForm, provider: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual Import</SelectItem>
                  <SelectItem value="truelayer">TrueLayer (Open Banking)</SelectItem>
                  <SelectItem value="plaid">Plaid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddConnection(false)}>Cancel</Button>
            <Button onClick={() => addConnection.mutate()} disabled={!connForm.client_id || !connForm.account_name.trim() || addConnection.isPending}>
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
                  {connections.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.account_name} ({c.client?.legal_name})</SelectItem>)}
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
                    <SelectItem value="transfer">Transfer</SelectItem>
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
            <Button onClick={() => addTransaction.mutate()} disabled={!txnForm.bank_connection_id || !txnForm.description.trim() || !txnForm.amount || addTransaction.isPending}>
              {addTransaction.isPending ? "Adding…" : "Add Transaction"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
