import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Plus, Repeat, Trash2, Loader2, Play, Pause } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";

const FREQUENCIES = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "annually", label: "Annually" },
];

export function RecurringInvoiceBuilder() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [clientId, setClientId] = useState("");
  const [frequency, setFrequency] = useState("monthly");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [vatRate, setVatRate] = useState("20");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("tenant_id").eq("id", user!.id).single();
      return data;
    },
    enabled: !!user,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients-brief-billing"],
    queryFn: async () => {
      const { data } = await supabase.from("clients").select("id, legal_name").eq("status", "active").order("legal_name");
      return data || [];
    },
  });

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["recurring-invoices", profile?.tenant_id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("recurring_invoice_templates")
        .select("*, clients(legal_name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.tenant_id,
  });

  const createMut = useMutation({
    mutationFn: async () => {
      if (!profile?.tenant_id || !clientId) throw new Error("Select a client");
      const net = Math.round(parseFloat(amount) * 100);
      if (!net) throw new Error("Enter an amount");
      const vat = Math.round(net * (parseFloat(vatRate) / 100));
      const { error } = await (supabase as any).from("recurring_invoice_templates").insert({
        tenant_id: profile.tenant_id,
        client_id: clientId,
        frequency,
        description: description.trim(),
        net_amount_pence: net,
        vat_rate: parseFloat(vatRate),
        total_pence: net + vat,
        next_issue_date: startDate,
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring-invoices"] });
      setOpen(false);
      setClientId("");
      setDescription("");
      setAmount("");
      toast.success("Recurring invoice template created");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleMut = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await (supabase as any).from("recurring_invoice_templates").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring-invoices"] });
      toast.success("Template updated");
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold flex items-center gap-2"><Repeat className="w-4 h-4" /> Recurring Invoices</h3>
          <p className="text-xs text-muted-foreground">Auto-generate invoices on a schedule</p>
        </div>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="w-3.5 h-3.5 mr-1" /> New Template
        </Button>
      </div>

      <Card>
        <CardContent className="pt-4">
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : templates.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-8">No recurring invoices configured.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Next Issue</TableHead>
                  <TableHead>Active</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((t: any) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium text-sm">{t.clients?.legal_name}</TableCell>
                    <TableCell className="text-sm">{t.description}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs capitalize">{t.frequency}</Badge></TableCell>
                    <TableCell className="text-right font-mono text-sm">£{(t.total_pence / 100).toFixed(2)}</TableCell>
                    <TableCell className="text-xs">{t.next_issue_date ? new Date(t.next_issue_date).toLocaleDateString("en-GB") : "—"}</TableCell>
                    <TableCell>
                      <Switch checked={t.is_active} onCheckedChange={(v) => toggleMut.mutate({ id: t.id, is_active: v })} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Recurring Invoice</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Client *</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent>
                  {clients.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.legal_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Monthly bookkeeping fee" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Amount (£) *</Label>
                <Input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="250.00" />
              </div>
              <div className="space-y-2">
                <Label>VAT %</Label>
                <Input type="number" value={vatRate} onChange={e => setVatRate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Frequency</Label>
                <Select value={frequency} onValueChange={setFrequency}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FREQUENCIES.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => createMut.mutate()} disabled={createMut.isPending}>
              {createMut.isPending ? "Creating…" : "Create Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
