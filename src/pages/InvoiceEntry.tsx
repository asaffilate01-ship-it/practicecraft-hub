import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useClientContext } from "@/contexts/ClientContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, FileText, ShoppingCart, Wallet } from "lucide-react";
import { toast } from "sonner";

type InvoiceType = "purchase" | "sales" | "petty_cash";

export default function InvoiceEntry() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { selectedClientId } = useClientContext();
  const [activeTab, setActiveTab] = useState<InvoiceType>("purchase");
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    supplier_or_customer: "",
    reference: "",
    description: "",
    net_amount: "",
    vat_amount: "",
    account_id: "",
    bank_account_id: "",
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

  const { data: accounts = [] } = useQuery({
    queryKey: ["chart_of_accounts", profile?.tenant_id],
    queryFn: async () => {
      const { data, error } = await supabase.from("chart_of_accounts").select("id, code, name, account_type").order("code");
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.tenant_id,
  });

  const { data: recentJournals = [], isLoading } = useQuery({
    queryKey: ["recent-invoices", profile?.tenant_id, selectedClientId, activeTab],
    queryFn: async () => {
      const prefix = activeTab === "purchase" ? "PI-" : activeTab === "sales" ? "SI-" : "PC-";
      let q = supabase
        .from("journal_entries")
        .select("id, entry_date, reference, narration, is_posted, created_at")
        .like("reference", `${prefix}%`)
        .order("entry_date", { ascending: false })
        .limit(30);
      if (selectedClientId) q = q.eq("client_id", selectedClientId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.tenant_id,
  });

  const postMutation = useMutation({
    mutationFn: async () => {
      if (!profile?.tenant_id || !selectedClientId) throw new Error("Select a client first");
      const net = Math.round(parseFloat(form.net_amount) * 100);
      const vat = form.vat_amount ? Math.round(parseFloat(form.vat_amount) * 100) : 0;
      const gross = net + vat;
      if (isNaN(net) || net === 0) throw new Error("Enter a valid net amount");

      const prefix = activeTab === "purchase" ? "PI" : activeTab === "sales" ? "SI" : "PC";
      const ref = `${prefix}-${Date.now().toString(36).toUpperCase()}`;

      // Create journal entry
      const { data: journal, error: jErr } = await supabase
        .from("journal_entries")
        .insert({
          tenant_id: profile.tenant_id,
          client_id: selectedClientId,
          entry_date: form.date,
          reference: ref,
          narration: `${form.supplier_or_customer}: ${form.description}`,
          is_posted: true,
        })
        .select()
        .single();
      if (jErr) throw jErr;

      const lines: any[] = [];

      if (activeTab === "purchase") {
        // Debit expense, credit creditors
        lines.push({ journal_entry_id: journal.id, account_id: form.account_id, debit: net / 100, credit: 0, description: form.description });
        if (vat > 0) {
          const vatAcc = accounts.find(a => a.code === "1300");
          if (vatAcc) lines.push({ journal_entry_id: journal.id, account_id: vatAcc.id, debit: vat / 100, credit: 0, description: "Input VAT" });
        }
        const credAcc = accounts.find(a => a.code === "2000");
        if (credAcc) lines.push({ journal_entry_id: journal.id, account_id: credAcc.id, debit: 0, credit: gross / 100, description: `${form.supplier_or_customer}` });
      } else if (activeTab === "sales") {
        // Debit debtors, credit income
        const debtAcc = accounts.find(a => a.code === "1100");
        if (debtAcc) lines.push({ journal_entry_id: journal.id, account_id: debtAcc.id, debit: gross / 100, credit: 0, description: `${form.supplier_or_customer}` });
        lines.push({ journal_entry_id: journal.id, account_id: form.account_id, debit: 0, credit: net / 100, description: form.description });
        if (vat > 0) {
          const vatAcc = accounts.find(a => a.code === "1300");
          if (vatAcc) lines.push({ journal_entry_id: journal.id, account_id: vatAcc.id, debit: 0, credit: vat / 100, description: "Output VAT" });
        }
      } else {
        // Petty cash: debit expense, credit bank
        lines.push({ journal_entry_id: journal.id, account_id: form.account_id, debit: gross / 100, credit: 0, description: form.description });
        if (form.bank_account_id) {
          lines.push({ journal_entry_id: journal.id, account_id: form.bank_account_id, debit: 0, credit: gross / 100, description: "Petty cash payment" });
        }
      }

      if (lines.length > 0) {
        const { error: lErr } = await supabase.from("journal_lines").insert(lines);
        if (lErr) throw lErr;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recent-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["journal_entries"] });
      setShowForm(false);
      setForm({ date: new Date().toISOString().slice(0, 10), supplier_or_customer: "", reference: "", description: "", net_amount: "", vat_amount: "", account_id: "", bank_account_id: "" });
      toast.success(`${activeTab === "purchase" ? "Purchase" : activeTab === "sales" ? "Sales" : "Petty cash"} entry posted`);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const expenseAccounts = accounts.filter(a => a.account_type === "expense");
  const incomeAccounts = accounts.filter(a => a.account_type === "income");
  const bankAccounts = accounts.filter(a => a.code.startsWith("10"));

  const tabConfig = {
    purchase: { icon: ShoppingCart, label: "Purchase Invoices", entityLabel: "Supplier", accounts: expenseAccounts },
    sales: { icon: FileText, label: "Sales Invoices", entityLabel: "Customer", accounts: incomeAccounts },
    petty_cash: { icon: Wallet, label: "Petty Cash", entityLabel: "Payee", accounts: expenseAccounts },
  };

  const cfg = tabConfig[activeTab];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Quick Entry</h1>
          <p className="text-sm text-muted-foreground">Fast invoice and petty cash entry with automatic ledger posting</p>
        </div>
        <Button className="gap-2" onClick={() => setShowForm(true)} disabled={!selectedClientId}>
          <Plus className="w-4 h-4" /> New Entry
        </Button>
      </div>

      {!selectedClientId && (
        <Card><CardContent className="py-8 text-center text-muted-foreground">Select a client to begin</CardContent></Card>
      )}

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as InvoiceType)}>
        <TabsList>
          <TabsTrigger value="purchase" className="gap-1"><ShoppingCart className="w-3.5 h-3.5" /> Purchase</TabsTrigger>
          <TabsTrigger value="sales" className="gap-1"><FileText className="w-3.5 h-3.5" /> Sales</TabsTrigger>
          <TabsTrigger value="petty_cash" className="gap-1"><Wallet className="w-3.5 h-3.5" /> Petty Cash</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{cfg.label}</CardTitle>
              <CardDescription>Recent entries posted to the ledger</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-center text-muted-foreground py-8">Loading…</p>
              ) : recentJournals.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No entries yet</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentJournals.map((j: any) => (
                      <TableRow key={j.id}>
                        <TableCell className="text-sm">{new Date(j.entry_date).toLocaleDateString("en-GB")}</TableCell>
                        <TableCell className="font-mono text-xs">{j.reference}</TableCell>
                        <TableCell className="text-sm">{j.narration}</TableCell>
                        <TableCell><Badge variant={j.is_posted ? "default" : "secondary"}>{j.is_posted ? "Posted" : "Draft"}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <cfg.icon className="w-4 h-4" /> New {cfg.label.replace(/s$/, "")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Date *</Label>
                <Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Reference</Label>
                <Input value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })} placeholder="INV-001" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{cfg.entityLabel} *</Label>
              <Input value={form.supplier_or_customer} onChange={e => setForm({ ...form, supplier_or_customer: e.target.value })} placeholder={`${cfg.entityLabel} name`} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Brief description" rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Net Amount (£) *</Label>
                <Input type="number" step="0.01" value={form.net_amount} onChange={e => setForm({ ...form, net_amount: e.target.value })} placeholder="100.00" />
              </div>
              <div className="space-y-2">
                <Label>VAT (£)</Label>
                <Input type="number" step="0.01" value={form.vat_amount} onChange={e => setForm({ ...form, vat_amount: e.target.value })} placeholder="20.00" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{activeTab === "sales" ? "Income" : "Expense"} Account *</Label>
              <Select value={form.account_id} onValueChange={v => setForm({ ...form, account_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                <SelectContent>
                  {cfg.accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.code} - {a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {activeTab === "petty_cash" && (
              <div className="space-y-2">
                <Label>Paid From (Bank)</Label>
                <Select value={form.bank_account_id} onValueChange={v => setForm({ ...form, bank_account_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select bank" /></SelectTrigger>
                  <SelectContent>
                    {bankAccounts.map(a => <SelectItem key={a.id} value={a.id}>{a.code} - {a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={() => postMutation.mutate()} disabled={!form.supplier_or_customer || !form.net_amount || !form.account_id || postMutation.isPending}>
              {postMutation.isPending ? "Posting…" : "Post to Ledger"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
