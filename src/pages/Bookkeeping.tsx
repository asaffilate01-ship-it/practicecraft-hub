import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, BookOpen, Trash2, Check, Upload, Camera } from "lucide-react";
import { toast } from "sonner";
import { ReceiptUploader } from "@/components/bookkeeping/ReceiptUploader";
import { useClientContext } from "@/contexts/ClientContext";

const accountTypes = [
  { value: "asset", label: "Asset" },
  { value: "liability", label: "Liability" },
  { value: "equity", label: "Equity" },
  { value: "income", label: "Income" },
  { value: "expense", label: "Expense" },
];

const accountTypeColors: Record<string, string> = {
  asset: "bg-info text-info-foreground",
  liability: "bg-destructive text-destructive-foreground",
  equity: "bg-secondary text-secondary-foreground",
  income: "bg-success text-success-foreground",
  expense: "bg-warning text-warning-foreground",
};

export default function Bookkeeping() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { selectedClientId } = useClientContext();
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [showAddJournal, setShowAddJournal] = useState(false);
  const [accountForm, setAccountForm] = useState({ code: "", name: "", account_type: "expense" });
  const [journalForm, setJournalForm] = useState({ entry_date: new Date().toISOString().split("T")[0], reference: "", narration: "", client_id: "" });
  const [journalLines, setJournalLines] = useState<{ account_id: string; debit: string; credit: string; description: string }[]>([
    { account_id: "", debit: "", credit: "", description: "" },
    { account_id: "", debit: "", credit: "", description: "" },
  ]);

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("tenant_id").eq("id", user!.id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: accounts = [], isLoading: loadingAccounts } = useQuery({
    queryKey: ["chart_of_accounts", profile?.tenant_id],
    queryFn: async () => {
      const { data, error } = await supabase.from("chart_of_accounts").select("*").order("code");
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.tenant_id,
  });

  const { data: journals = [], isLoading: loadingJournals } = useQuery({
    queryKey: ["journal_entries", profile?.tenant_id],
    queryFn: async () => {
      const { data, error } = await supabase.from("journal_entries").select("*, journal_lines(*, chart_of_accounts(code, name)), clients(legal_name)").order("entry_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.tenant_id,
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

  const addAccount = useMutation({
    mutationFn: async () => {
      if (!profile?.tenant_id) throw new Error("No tenant");
      const { error } = await supabase.from("chart_of_accounts").insert({
        tenant_id: profile.tenant_id,
        code: accountForm.code.trim(),
        name: accountForm.name.trim(),
        account_type: accountForm.account_type,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chart_of_accounts"] });
      setShowAddAccount(false);
      setAccountForm({ code: "", name: "", account_type: "expense" });
      toast.success("Account added");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteAccount = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("chart_of_accounts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chart_of_accounts"] });
      toast.success("Account deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const addJournal = useMutation({
    mutationFn: async () => {
      if (!profile?.tenant_id) throw new Error("No tenant");
      const validLines = journalLines.filter(l => l.account_id && (parseFloat(l.debit) > 0 || parseFloat(l.credit) > 0));
      if (validLines.length < 2) throw new Error("At least 2 lines required");

      const totalDebit = validLines.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0);
      const totalCredit = validLines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0);
      if (Math.abs(totalDebit - totalCredit) > 0.01) throw new Error(`Debits (£${totalDebit.toFixed(2)}) must equal Credits (£${totalCredit.toFixed(2)})`);

      const { data: entry, error: entryError } = await supabase.from("journal_entries").insert({
        tenant_id: profile.tenant_id,
        entry_date: journalForm.entry_date,
        reference: journalForm.reference.trim() || null,
        narration: journalForm.narration.trim() || null,
        client_id: journalForm.client_id || null,
        created_by: user?.id,
      }).select("id").single();
      if (entryError) throw entryError;

      const { error: linesError } = await supabase.from("journal_lines").insert(
        validLines.map(l => ({
          journal_entry_id: entry.id,
          account_id: l.account_id,
          debit: parseFloat(l.debit) || 0,
          credit: parseFloat(l.credit) || 0,
          description: l.description.trim() || null,
        }))
      );
      if (linesError) throw linesError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["journal_entries"] });
      setShowAddJournal(false);
      setJournalForm({ entry_date: new Date().toISOString().split("T")[0], reference: "", narration: "", client_id: "" });
      setJournalLines([{ account_id: "", debit: "", credit: "", description: "" }, { account_id: "", debit: "", credit: "", description: "" }]);
      toast.success("Journal entry created");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const postJournal = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("journal_entries").update({ is_posted: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["journal_entries"] });
      toast.success("Journal posted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Trial Balance calculation
  const trialBalance = accounts.map((acc: any) => {
    let totalDebit = 0;
    let totalCredit = 0;
    journals.forEach((j: any) => {
      if (j.is_posted && j.journal_lines) {
        j.journal_lines.forEach((line: any) => {
          if (line.account_id === acc.id) {
            totalDebit += parseFloat(line.debit) || 0;
            totalCredit += parseFloat(line.credit) || 0;
          }
        });
      }
    });
    const netDebit = totalDebit - totalCredit;
    return { ...acc, totalDebit, totalCredit, balanceDebit: netDebit > 0 ? netDebit : 0, balanceCredit: netDebit < 0 ? Math.abs(netDebit) : 0 };
  }).filter((a: any) => a.totalDebit > 0 || a.totalCredit > 0);

  const tbTotalDebit = trialBalance.reduce((s: number, a: any) => s + a.balanceDebit, 0);
  const tbTotalCredit = trialBalance.reduce((s: number, a: any) => s + a.balanceCredit, 0);

  const addJournalLine = () => setJournalLines([...journalLines, { account_id: "", debit: "", credit: "", description: "" }]);
  const removeJournalLine = (i: number) => setJournalLines(journalLines.filter((_, idx) => idx !== i));
  const updateJournalLine = (i: number, field: string, value: string) => {
    const updated = [...journalLines];
    (updated[i] as any)[field] = value;
    setJournalLines(updated);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Bookkeeping</h1>
        <p className="text-sm text-muted-foreground">Double-entry ledger, chart of accounts & trial balance</p>
      </div>

      <Tabs defaultValue="accounts">
        <TabsList>
          <TabsTrigger value="accounts">Chart of Accounts</TabsTrigger>
          <TabsTrigger value="journals">Journal Entries</TabsTrigger>
          <TabsTrigger value="trial-balance">Trial Balance</TabsTrigger>
          <TabsTrigger value="receipts" className="gap-1"><Camera className="w-3.5 h-3.5" /> Receipts & Import</TabsTrigger>
        </TabsList>

        {/* Chart of Accounts */}
        <TabsContent value="accounts" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button className="gap-2" onClick={() => setShowAddAccount(true)}>
              <Plus className="w-4 h-4" /> Add Account
            </Button>
          </div>
          <Card>
            <CardContent className="pt-6">
              {loadingAccounts ? (
                <p className="text-center text-muted-foreground py-8">Loading...</p>
              ) : accounts.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No accounts yet. Add your first account to get started.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accounts.map((a: any) => (
                      <TableRow key={a.id}>
                        <TableCell className="font-mono text-sm">{a.code}</TableCell>
                        <TableCell className="font-medium">{a.name}</TableCell>
                        <TableCell><Badge className={accountTypeColors[a.account_type] || "bg-secondary text-secondary-foreground"}>{a.account_type}</Badge></TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteAccount.mutate(a.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Journal Entries */}
        <TabsContent value="journals" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button className="gap-2" onClick={() => setShowAddJournal(true)}>
              <Plus className="w-4 h-4" /> New Journal Entry
            </Button>
          </div>
          <Card>
            <CardContent className="pt-6">
              {loadingJournals ? (
                <p className="text-center text-muted-foreground py-8">Loading...</p>
              ) : journals.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No journal entries yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Narration</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Lines</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {journals.map((j: any) => (
                      <TableRow key={j.id}>
                        <TableCell className="text-sm">{new Date(j.entry_date).toLocaleDateString("en-GB")}</TableCell>
                        <TableCell className="font-mono text-sm">{j.reference || "—"}</TableCell>
                        <TableCell className="text-sm">{j.narration || "—"}</TableCell>
                        <TableCell className="text-sm">{j.clients?.legal_name || "—"}</TableCell>
                        <TableCell className="text-sm">{j.journal_lines?.length || 0}</TableCell>
                        <TableCell>
                          {j.is_posted ? (
                            <Badge className="bg-success text-success-foreground">Posted</Badge>
                          ) : (
                            <Badge variant="outline">Draft</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {!j.is_posted && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-success" onClick={() => postJournal.mutate(j.id)} title="Post journal">
                              <Check className="w-3.5 h-3.5" />
                            </Button>
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

        {/* Trial Balance */}
        <TabsContent value="trial-balance" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Trial Balance</CardTitle>
              <CardDescription>Based on posted journal entries only</CardDescription>
            </CardHeader>
            <CardContent>
              {trialBalance.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No posted entries yet. Post journal entries to see the trial balance.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Account</TableHead>
                      <TableHead className="text-right">Debit (£)</TableHead>
                      <TableHead className="text-right">Credit (£)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trialBalance.map((a: any) => (
                      <TableRow key={a.id}>
                        <TableCell className="font-mono text-sm">{a.code}</TableCell>
                        <TableCell className="font-medium">{a.name}</TableCell>
                        <TableCell className="text-right font-mono">{a.balanceDebit > 0 ? a.balanceDebit.toFixed(2) : ""}</TableCell>
                        <TableCell className="text-right font-mono">{a.balanceCredit > 0 ? a.balanceCredit.toFixed(2) : ""}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-bold border-t-2">
                      <TableCell colSpan={2}>Total</TableCell>
                      <TableCell className="text-right font-mono">{tbTotalDebit.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-mono">{tbTotalCredit.toFixed(2)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Receipts & Import */}
        <TabsContent value="receipts" className="mt-4 space-y-4">
          {selectedClientId && profile?.tenant_id ? (
            <ReceiptUploader
              clientId={selectedClientId}
              accounts={accounts.map((a: any) => ({ id: a.id, code: a.code, name: a.name, account_type: a.account_type }))}
              tenantId={profile.tenant_id}
            />
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Camera className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm font-medium">Select a client from the top bar to scan receipts</p>
                <p className="text-xs mt-1">The Receipt Scanner uses AI to extract supplier, amounts, and VAT from images — then posts directly to the ledger.</p>
              </CardContent>
            </Card>
          )}

          {/* CSV Bank Statement Import */}
          <Card>
            <CardContent className="pt-6 space-y-3">
              <div className="flex items-center gap-2">
                <Upload className="w-4 h-4" />
                <h3 className="text-sm font-semibold">CSV Bank Statement Import</h3>
              </div>
              <p className="text-xs text-muted-foreground">
                Upload a CSV bank statement (Date, Description, Amount columns). Transactions will be created as uncategorised bank transactions for review.
              </p>
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => {
                  if (!selectedClientId) { toast.error("Select a client first"); return; }
                  const input = document.createElement("input");
                  input.type = "file";
                  input.accept = ".csv";
                  input.onchange = async (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (!file || !profile?.tenant_id) return;
                    const text = await file.text();
                    const lines = text.split("\n").filter(Boolean);
                    if (lines.length < 2) { toast.error("CSV must have a header row and at least one data row"); return; }
                    const rows = lines.slice(1).map(line => {
                      const cols = line.split(",").map(c => c.trim().replace(/^"|"$/g, ""));
                      return { date: cols[0], description: cols[1], amount: parseFloat(cols[2] || "0") };
                    }).filter(r => r.description && !isNaN(r.amount));

                    if (rows.length === 0) { toast.error("No valid rows found. Expected: Date, Description, Amount"); return; }

                    // Find or create a default bank connection placeholder
                    const { data: bankConns } = await supabase.from("bank_connections").select("id").eq("client_id", selectedClientId).limit(1);
                    let bankConnId = bankConns?.[0]?.id;
                    if (!bankConnId) {
                      const { data: newConn } = await supabase.from("bank_connections").insert({
                        tenant_id: profile.tenant_id,
                        client_id: selectedClientId,
                        account_name: "CSV Import",
                        provider: "csv",
                        status: "active",
                      }).select("id").single();
                      bankConnId = newConn?.id;
                    }
                    if (!bankConnId) { toast.error("Could not create bank connection"); return; }

                    const txRows = rows.map(r => ({
                      tenant_id: profile.tenant_id,
                      client_id: selectedClientId,
                      bank_connection_id: bankConnId,
                      transaction_date: r.date || new Date().toISOString().split("T")[0],
                      description: r.description,
                      amount_pence: Math.round(r.amount * 100),
                      categorisation_status: "uncategorised",
                    }));

                    const { error } = await supabase.from("bank_transactions").insert(txRows);
                    if (error) { toast.error(error.message); return; }
                    toast.success(`Imported ${txRows.length} bank transactions for categorisation`);
                  };
                  input.click();
                }}
              >
                <Upload className="w-4 h-4" /> Import CSV Bank Statement
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Account Dialog */}
      <Dialog open={showAddAccount} onOpenChange={setShowAddAccount}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Account</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Account Code *</Label>
                <Input value={accountForm.code} onChange={(e) => setAccountForm({ ...accountForm, code: e.target.value })} placeholder="1000" />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={accountForm.account_type} onValueChange={(v) => setAccountForm({ ...accountForm, account_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {accountTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Account Name *</Label>
              <Input value={accountForm.name} onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })} placeholder="Cash at Bank" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddAccount(false)}>Cancel</Button>
            <Button onClick={() => addAccount.mutate()} disabled={!accountForm.code.trim() || !accountForm.name.trim() || addAccount.isPending}>
              {addAccount.isPending ? "Adding..." : "Add Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Journal Entry Dialog */}
      <Dialog open={showAddJournal} onOpenChange={setShowAddJournal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>New Journal Entry</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Date *</Label>
                <Input type="date" value={journalForm.entry_date} onChange={(e) => setJournalForm({ ...journalForm, entry_date: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Reference</Label>
                <Input value={journalForm.reference} onChange={(e) => setJournalForm({ ...journalForm, reference: e.target.value })} placeholder="JNL-001" />
              </div>
              <div className="space-y-2">
                <Label>Client</Label>
                <Select value={journalForm.client_id} onValueChange={(v) => setJournalForm({ ...journalForm, client_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                  <SelectContent>
                    {clients.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.legal_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Narration</Label>
              <Input value={journalForm.narration} onChange={(e) => setJournalForm({ ...journalForm, narration: e.target.value })} placeholder="Purchase of equipment" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Lines</Label>
                <Button variant="ghost" size="sm" onClick={addJournalLine}><Plus className="w-3.5 h-3.5 mr-1" /> Add Line</Button>
              </div>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Account</TableHead>
                      <TableHead className="w-28">Debit (£)</TableHead>
                      <TableHead className="w-28">Credit (£)</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {journalLines.map((line, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <Select value={line.account_id} onValueChange={(v) => updateJournalLine(i, "account_id", v)}>
                            <SelectTrigger className="h-8"><SelectValue placeholder="Select account" /></SelectTrigger>
                            <SelectContent>
                              {accounts.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.code} - {a.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input className="h-8 font-mono" value={line.debit} onChange={(e) => updateJournalLine(i, "debit", e.target.value)} placeholder="0.00" />
                        </TableCell>
                        <TableCell>
                          <Input className="h-8 font-mono" value={line.credit} onChange={(e) => updateJournalLine(i, "credit", e.target.value)} placeholder="0.00" />
                        </TableCell>
                        <TableCell>
                          {journalLines.length > 2 && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeJournalLine(i)}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/50">
                      <TableCell className="font-medium text-right">Totals:</TableCell>
                      <TableCell className="font-mono font-medium">{journalLines.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0).toFixed(2)}</TableCell>
                      <TableCell className="font-mono font-medium">{journalLines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0).toFixed(2)}</TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddJournal(false)}>Cancel</Button>
            <Button onClick={() => addJournal.mutate()} disabled={addJournal.isPending}>
              {addJournal.isPending ? "Saving..." : "Create Entry"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
