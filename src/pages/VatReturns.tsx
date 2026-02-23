import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, FileText, Send, Eye } from "lucide-react";
import { toast } from "sonner";

const boxLabels = [
  "Box 1 – VAT due on sales",
  "Box 2 – VAT due on acquisitions (EC)",
  "Box 3 – Total VAT due (1 + 2)",
  "Box 4 – VAT reclaimed on purchases",
  "Box 5 – Net VAT (3 − 4)",
  "Box 6 – Total sales (excl. VAT)",
  "Box 7 – Total purchases (excl. VAT)",
  "Box 8 – Total EC supplies",
  "Box 9 – Total EC acquisitions",
];

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  ready: "bg-warning text-warning-foreground",
  submitted: "bg-success text-success-foreground",
  rejected: "bg-destructive text-destructive-foreground",
};

export default function VatReturns() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [showCreate, setShowCreate] = useState(false);
  const [viewReturn, setViewReturn] = useState<any>(null);
  const [form, setForm] = useState({
    client_id: "", period_start: "", period_end: "", notes: "",
    box1: "0", box2: "0", box4: "0", box6: "0", box7: "0", box8: "0", box9: "0",
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

  const { data: vatReturns = [], isLoading } = useQuery({
    queryKey: ["vat_returns", profile?.tenant_id],
    queryFn: async () => {
      const { data, error } = await supabase.from("vat_returns").select("*, clients(legal_name)").order("period_end", { ascending: false });
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

  const box3 = (parseFloat(form.box1) || 0) + (parseFloat(form.box2) || 0);
  const box5 = box3 - (parseFloat(form.box4) || 0);

  const createReturn = useMutation({
    mutationFn: async () => {
      if (!profile?.tenant_id) throw new Error("No tenant");
      const { error } = await supabase.from("vat_returns").insert({
        tenant_id: profile.tenant_id,
        client_id: form.client_id || null,
        period_start: form.period_start,
        period_end: form.period_end,
        box1: parseFloat(form.box1) || 0,
        box2: parseFloat(form.box2) || 0,
        box3,
        box4: parseFloat(form.box4) || 0,
        box5,
        box6: parseFloat(form.box6) || 0,
        box7: parseFloat(form.box7) || 0,
        box8: parseFloat(form.box8) || 0,
        box9: parseFloat(form.box9) || 0,
        notes: form.notes.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vat_returns"] });
      setShowCreate(false);
      setForm({ client_id: "", period_start: "", period_end: "", notes: "", box1: "0", box2: "0", box4: "0", box6: "0", box7: "0", box8: "0", box9: "0" });
      toast.success("VAT return created");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: any = { status };
      if (status === "submitted") updates.submitted_at = new Date().toISOString();
      const { error } = await supabase.from("vat_returns").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vat_returns"] });
      setViewReturn(null);
      toast.success("Status updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">VAT (MTD)</h1>
          <p className="text-sm text-muted-foreground">Making Tax Digital VAT returns & HMRC submission tracking</p>
        </div>
        <Button className="gap-2" onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4" /> New VAT Return
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <p className="text-center text-muted-foreground py-8">Loading...</p>
          ) : vatReturns.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No VAT returns yet. Create your first return to get started.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-right">Net VAT (Box 5)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vatReturns.map((v: any) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-medium">{v.clients?.legal_name || "—"}</TableCell>
                    <TableCell className="text-sm">
                      {new Date(v.period_start).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" })}
                      {" → "}
                      {new Date(v.period_end).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" })}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {v.box5 >= 0 ? "£" : "-£"}{Math.abs(v.box5).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[v.status] || "bg-muted text-muted-foreground"}>{v.status}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {v.submitted_at ? new Date(v.submitted_at).toLocaleDateString("en-GB") : "—"}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewReturn(v)}>
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

      {/* Create VAT Return Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>New VAT Return</DialogTitle></DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label>Client</Label>
                <Select value={form.client_id} onValueChange={(v) => setForm({ ...form, client_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                  <SelectContent>
                    {clients.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.legal_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Period Start *</Label>
                <Input type="date" value={form.period_start} onChange={(e) => setForm({ ...form, period_start: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Period End *</Label>
                <Input type="date" value={form.period_end} onChange={(e) => setForm({ ...form, period_end: e.target.value })} />
              </div>
            </div>

            <div className="border rounded-lg p-4 space-y-3">
              <p className="text-sm font-semibold">9-Box VAT Calculation</p>
              {[
                { key: "box1", editable: true },
                { key: "box2", editable: true },
                { key: "box3", editable: false, value: box3.toFixed(2) },
                { key: "box4", editable: true },
                { key: "box5", editable: false, value: box5.toFixed(2) },
                { key: "box6", editable: true },
                { key: "box7", editable: true },
                { key: "box8", editable: true },
                { key: "box9", editable: true },
              ].map((box, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground flex-1">{boxLabels[i]}</span>
                  <Input
                    className="w-32 h-8 font-mono text-right"
                    value={box.editable ? (form as any)[box.key] : box.value}
                    onChange={box.editable ? (e) => setForm({ ...form, [box.key]: e.target.value }) : undefined}
                    readOnly={!box.editable}
                    disabled={!box.editable}
                  />
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Internal notes..." rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={() => createReturn.mutate()} disabled={!form.period_start || !form.period_end || createReturn.isPending}>
              {createReturn.isPending ? "Saving..." : "Create Return"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View VAT Return Dialog */}
      <Dialog open={!!viewReturn} onOpenChange={(open) => { if (!open) setViewReturn(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>VAT Return Details</DialogTitle></DialogHeader>
          {viewReturn && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Client:</span> <span className="font-medium ml-1">{viewReturn.clients?.legal_name || "—"}</span></div>
                <div><span className="text-muted-foreground">Status:</span> <Badge className={`ml-1 ${statusColors[viewReturn.status]}`}>{viewReturn.status}</Badge></div>
                <div><span className="text-muted-foreground">Period:</span> <span className="font-medium ml-1">{new Date(viewReturn.period_start).toLocaleDateString("en-GB")} – {new Date(viewReturn.period_end).toLocaleDateString("en-GB")}</span></div>
                {viewReturn.submitted_at && <div><span className="text-muted-foreground">Submitted:</span> <span className="font-medium ml-1">{new Date(viewReturn.submitted_at).toLocaleDateString("en-GB")}</span></div>}
              </div>

              <div className="border rounded-lg p-4 space-y-2">
                {boxLabels.map((label, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-mono font-medium">£{parseFloat(viewReturn[`box${i + 1}`]).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              {viewReturn.notes && <p className="text-sm text-muted-foreground">{viewReturn.notes}</p>}

              <div className="flex gap-2 justify-end">
                {viewReturn.status === "draft" && (
                  <Button variant="outline" onClick={() => updateStatus.mutate({ id: viewReturn.id, status: "ready" })}>
                    Mark Ready
                  </Button>
                )}
                {viewReturn.status === "ready" && (
                  <Button className="gap-1.5" onClick={() => updateStatus.mutate({ id: viewReturn.id, status: "submitted" })}>
                    <Send className="w-3.5 h-3.5" /> Mark Submitted
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
