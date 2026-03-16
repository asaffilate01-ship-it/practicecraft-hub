import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Eye, CreditCard, Banknote } from "lucide-react";
import { toast } from "sonner";
import { InvoicePaymentButton } from "@/components/billing/InvoicePaymentButton";
import { SubscriptionPlans } from "@/components/billing/SubscriptionPlans";
import { RecurringInvoiceBuilder } from "@/components/billing/RecurringInvoiceBuilder";
import { DunningWorkflow } from "@/components/billing/DunningWorkflow";

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-info text-info-foreground",
  paid: "bg-success text-success-foreground",
  overdue: "bg-destructive text-destructive-foreground",
  cancelled: "bg-muted text-muted-foreground",
};

export default function Billing() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [showCreate, setShowCreate] = useState(false);
  const [viewInvoice, setViewInvoice] = useState<any>(null);
  const [form, setForm] = useState({
    client_id: "", invoice_number: "", issue_date: new Date().toISOString().split("T")[0], due_date: "", notes: "",
  });
  const [lines, setLines] = useState<{ description: string; quantity: string; unit_price: string; vat_rate: string }[]>([
    { description: "", quantity: "1", unit_price: "", vat_rate: "20" },
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

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["invoices", profile?.tenant_id],
    queryFn: async () => {
      const { data, error } = await supabase.from("invoices").select("*, clients(legal_name), invoice_lines(*)").order("issue_date", { ascending: false });
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

  const calcLine = (l: any) => {
    const qty = parseFloat(l.quantity) || 0;
    const price = parseFloat(l.unit_price) || 0;
    return qty * price;
  };

  const subtotal = lines.reduce((s, l) => s + calcLine(l), 0);
  const vatAmount = lines.reduce((s, l) => s + calcLine(l) * ((parseFloat(l.vat_rate) || 0) / 100), 0);
  const total = subtotal + vatAmount;

  const createInvoice = useMutation({
    mutationFn: async () => {
      if (!profile?.tenant_id) throw new Error("No tenant");
      const validLines = lines.filter(l => l.description.trim() && parseFloat(l.unit_price) > 0);
      if (validLines.length === 0) throw new Error("Add at least one line item");

      const { data: inv, error: invError } = await supabase.from("invoices").insert({
        tenant_id: profile.tenant_id,
        client_id: form.client_id || null,
        invoice_number: form.invoice_number.trim(),
        issue_date: form.issue_date,
        due_date: form.due_date || null,
        subtotal,
        vat_amount: vatAmount,
        total,
        notes: form.notes.trim() || null,
      }).select("id").single();
      if (invError) throw invError;

      const { error: linesError } = await supabase.from("invoice_lines").insert(
        validLines.map(l => ({
          invoice_id: inv.id,
          description: l.description.trim(),
          quantity: parseFloat(l.quantity) || 1,
          unit_price: parseFloat(l.unit_price) || 0,
          vat_rate: parseFloat(l.vat_rate) || 20,
          line_total: calcLine(l),
        }))
      );
      if (linesError) throw linesError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      setShowCreate(false);
      setForm({ client_id: "", invoice_number: "", issue_date: new Date().toISOString().split("T")[0], due_date: "", notes: "" });
      setLines([{ description: "", quantity: "1", unit_price: "", vat_rate: "20" }]);
      toast.success("Invoice created");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, amount_paid }: { id: string; status: string; amount_paid?: number }) => {
      const updates: any = { status };
      if (amount_paid !== undefined) updates.amount_paid = amount_paid;
      const { error } = await supabase.from("invoices").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      setViewInvoice(null);
      toast.success("Invoice updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const addLine = () => setLines([...lines, { description: "", quantity: "1", unit_price: "", vat_rate: "20" }]);
  const removeLine = (i: number) => setLines(lines.filter((_, idx) => idx !== i));
  const updateLine = (i: number, field: string, value: string) => {
    const updated = [...lines];
    (updated[i] as any)[field] = value;
    setLines(updated);
  };

  const nextInvoiceNumber = () => {
    const nums = invoices.map((i: any) => {
      const match = i.invoice_number.match(/(\d+)$/);
      return match ? parseInt(match[1]) : 0;
    });
    const max = nums.length > 0 ? Math.max(...nums) : 0;
    return `INV-${String(max + 1).padStart(4, "0")}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Billing</h1>
          <p className="text-sm text-muted-foreground">Invoicing, recurring billing, payment tracking & collections</p>
        </div>
        <Button className="gap-2" onClick={() => { setForm({ ...form, invoice_number: nextInvoiceNumber() }); setShowCreate(true); }}>
          <Plus className="w-4 h-4" /> New Invoice
        </Button>
      </div>

      <Tabs defaultValue="invoices">
        <TabsList>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="recurring">Recurring</TabsTrigger>
          <TabsTrigger value="dunning">Collections</TabsTrigger>
          <TabsTrigger value="subscription">Subscription</TabsTrigger>
        </TabsList>

        <TabsContent value="subscription" className="mt-4">
          <SubscriptionPlans currentPlan="starter" />
        </TabsContent>

        <TabsContent value="recurring" className="mt-4">
          <RecurringInvoiceBuilder />
        </TabsContent>

        <TabsContent value="dunning" className="mt-4">
          <DunningWorkflow />
        </TabsContent>

        <TabsContent value="invoices" className="mt-4 space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1"><Banknote className="w-4 h-4" /> Outstanding</div>
              <p className="text-2xl font-bold font-mono">
                £{invoices.filter((i: any) => i.status === "sent" || i.status === "overdue").reduce((s: number, i: any) => s + (parseFloat(i.total) - parseFloat(i.amount_paid)), 0).toFixed(2)}
              </p>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1"><CreditCard className="w-4 h-4" /> Paid (All Time)</div>
              <p className="text-2xl font-bold font-mono">
                £{invoices.filter((i: any) => i.status === "paid").reduce((s: number, i: any) => s + parseFloat(i.total), 0).toFixed(2)}
              </p>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1"><Banknote className="w-4 h-4" /> Overdue</div>
              <p className="text-2xl font-bold font-mono text-destructive">
                £{invoices.filter((i: any) => i.status === "overdue").reduce((s: number, i: any) => s + (parseFloat(i.total) - parseFloat(i.amount_paid)), 0).toFixed(2)}
              </p>
            </Card>
          </div>

          <Card>
            <CardContent className="pt-6">
              {isLoading ? (
                <p className="text-center text-muted-foreground py-8">Loading...</p>
              ) : invoices.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No invoices yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Due</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((inv: any) => (
                      <TableRow key={inv.id}>
                        <TableCell className="font-mono text-sm font-medium">{inv.invoice_number}</TableCell>
                        <TableCell>{inv.clients?.legal_name || "—"}</TableCell>
                        <TableCell className="text-sm">{new Date(inv.issue_date).toLocaleDateString("en-GB")}</TableCell>
                        <TableCell className="text-sm">{inv.due_date ? new Date(inv.due_date).toLocaleDateString("en-GB") : "—"}</TableCell>
                        <TableCell className="text-right font-mono">£{parseFloat(inv.total).toFixed(2)}</TableCell>
                        <TableCell><Badge className={statusColors[inv.status]}>{inv.status}</Badge></TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewInvoice(inv)}>
                            <Eye className="w-3.5 h-3.5" />
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
      </Tabs>

      {/* Create Invoice Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>New Invoice</DialogTitle></DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Invoice Number *</Label>
                <Input value={form.invoice_number} onChange={(e) => setForm({ ...form, invoice_number: e.target.value })} placeholder="INV-0001" />
              </div>
              <div className="space-y-2">
                <Label>Client</Label>
                <Select value={form.client_id} onValueChange={(v) => setForm({ ...form, client_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                  <SelectContent>
                    {clients.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.legal_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Issue Date *</Label>
                <Input type="date" value={form.issue_date} onChange={(e) => setForm({ ...form, issue_date: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Line Items</Label>
                <Button variant="ghost" size="sm" onClick={addLine}><Plus className="w-3.5 h-3.5 mr-1" /> Add Line</Button>
              </div>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead className="w-20">Qty</TableHead>
                      <TableHead className="w-28">Price (£)</TableHead>
                      <TableHead className="w-20">VAT %</TableHead>
                      <TableHead className="w-28 text-right">Total</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lines.map((line, i) => (
                      <TableRow key={i}>
                        <TableCell><Input className="h-8" value={line.description} onChange={(e) => updateLine(i, "description", e.target.value)} placeholder="Service description" /></TableCell>
                        <TableCell><Input className="h-8 font-mono" value={line.quantity} onChange={(e) => updateLine(i, "quantity", e.target.value)} /></TableCell>
                        <TableCell><Input className="h-8 font-mono" value={line.unit_price} onChange={(e) => updateLine(i, "unit_price", e.target.value)} placeholder="0.00" /></TableCell>
                        <TableCell><Input className="h-8 font-mono" value={line.vat_rate} onChange={(e) => updateLine(i, "vat_rate", e.target.value)} /></TableCell>
                        <TableCell className="text-right font-mono text-sm">£{calcLine(line).toFixed(2)}</TableCell>
                        <TableCell>
                          {lines.length > 1 && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeLine(i)}><Trash2 className="w-3 h-3" /></Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex justify-end">
                <div className="text-sm space-y-1 text-right">
                  <div><span className="text-muted-foreground">Subtotal:</span> <span className="font-mono ml-2">£{subtotal.toFixed(2)}</span></div>
                  <div><span className="text-muted-foreground">VAT:</span> <span className="font-mono ml-2">£{vatAmount.toFixed(2)}</span></div>
                  <div className="font-bold text-base"><span>Total:</span> <span className="font-mono ml-2">£{total.toFixed(2)}</span></div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Payment terms, bank details..." rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={() => createInvoice.mutate()} disabled={!form.invoice_number.trim() || createInvoice.isPending}>
              {createInvoice.isPending ? "Saving..." : "Create Invoice"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Invoice Dialog */}
      <Dialog open={!!viewInvoice} onOpenChange={(open) => { if (!open) setViewInvoice(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Invoice {viewInvoice?.invoice_number}</DialogTitle></DialogHeader>
          {viewInvoice && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Client:</span> <span className="font-medium ml-1">{viewInvoice.clients?.legal_name || "—"}</span></div>
                <div><span className="text-muted-foreground">Status:</span> <Badge className={`ml-1 ${statusColors[viewInvoice.status]}`}>{viewInvoice.status}</Badge></div>
                <div><span className="text-muted-foreground">Issued:</span> <span className="font-medium ml-1">{new Date(viewInvoice.issue_date).toLocaleDateString("en-GB")}</span></div>
                <div><span className="text-muted-foreground">Due:</span> <span className="font-medium ml-1">{viewInvoice.due_date ? new Date(viewInvoice.due_date).toLocaleDateString("en-GB") : "—"}</span></div>
              </div>

              {viewInvoice.invoice_lines?.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {viewInvoice.invoice_lines.map((l: any) => (
                      <TableRow key={l.id}>
                        <TableCell className="text-sm">{l.description}</TableCell>
                        <TableCell className="text-right font-mono text-sm">{l.quantity}</TableCell>
                        <TableCell className="text-right font-mono text-sm">£{parseFloat(l.unit_price).toFixed(2)}</TableCell>
                        <TableCell className="text-right font-mono text-sm">£{parseFloat(l.line_total).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              <div className="text-right text-lg font-bold font-mono">Total: £{parseFloat(viewInvoice.total).toFixed(2)}</div>

              <div className="flex gap-2 justify-end">
                {viewInvoice.status === "draft" && (
                  <Button variant="outline" size="sm" onClick={() => updateStatus.mutate({ id: viewInvoice.id, status: "sent" })}>Mark as Sent</Button>
                )}
                {(viewInvoice.status === "sent" || viewInvoice.status === "overdue") && (
                  <>
                    <Button variant="outline" size="sm" onClick={() => updateStatus.mutate({ id: viewInvoice.id, status: "paid", amount_paid: parseFloat(viewInvoice.total) })}>Mark Paid</Button>
                    <InvoicePaymentButton invoiceId={viewInvoice.id} amount={parseFloat(viewInvoice.total)} />
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
