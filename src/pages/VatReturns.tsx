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
import { Plus, FileText, Send, Eye, Upload, Download, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useRef, useCallback } from "react";
import { HmrcConnectButton } from "@/components/HmrcConnectButton";
import { HmrcObligations } from "@/components/vat/HmrcObligations";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

function parseCsvToBoxes(csvText: string): Partial<Record<string, string>> | null {
  const lines = csvText.trim().split(/\r?\n/).filter(l => l.trim());
  const result: Partial<Record<string, string>> = {};

  // Strategy 1: Look for rows with box labels/numbers and values
  for (const line of lines) {
    const cells = line.split(",").map(c => c.trim().replace(/^"|"$/g, ""));
    
    // Try to find box number in cells
    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i].toLowerCase();
      const boxMatch = cell.match(/box\s*(\d)/);
      if (boxMatch) {
        const boxNum = parseInt(boxMatch[1]);
        if (boxNum >= 1 && boxNum <= 9) {
          // Look for a numeric value in subsequent cells
          for (let j = i + 1; j < cells.length; j++) {
            const val = cells[j].replace(/[£,\s]/g, "");
            if (val && !isNaN(parseFloat(val))) {
              result[`box${boxNum}`] = parseFloat(val).toString();
              break;
            }
          }
        }
      }
    }
  }

  if (Object.keys(result).length > 0) return result;

  // Strategy 2: If CSV is just 9 values (one per line or comma-separated)
  const allValues: string[] = [];
  for (const line of lines) {
    const cells = line.split(",").map(c => c.trim().replace(/^"|"$/g, "").replace(/[£,\s]/g, ""));
    for (const c of cells) {
      if (c && !isNaN(parseFloat(c))) allValues.push(parseFloat(c).toString());
    }
  }

  if (allValues.length >= 7) {
    // Map first 9 values to boxes
    const editableBoxes = [1, 2, 4, 6, 7, 8, 9];
    const mapping = allValues.length >= 9
      ? [1, 2, 3, 4, 5, 6, 7, 8, 9]
      : editableBoxes;
    
    mapping.forEach((boxNum, i) => {
      if (allValues[i] !== undefined) {
        result[`box${boxNum}`] = allValues[i];
      }
    });
    return Object.keys(result).length > 0 ? result : null;
  }

  return null;
}

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
  const [editReturn, setEditReturn] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null);
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

  const updateReturn = useMutation({
    mutationFn: async () => {
      if (!editReturn) return;
      const box3val = (parseFloat(form.box1) || 0) + (parseFloat(form.box2) || 0);
      const box5val = box3val - (parseFloat(form.box4) || 0);
      const { error } = await supabase.from("vat_returns").update({
        client_id: form.client_id || null,
        period_start: form.period_start,
        period_end: form.period_end,
        box1: parseFloat(form.box1) || 0,
        box2: parseFloat(form.box2) || 0,
        box3: box3val,
        box4: parseFloat(form.box4) || 0,
        box5: box5val,
        box6: parseFloat(form.box6) || 0,
        box7: parseFloat(form.box7) || 0,
        box8: parseFloat(form.box8) || 0,
        box9: parseFloat(form.box9) || 0,
        notes: form.notes.trim() || null,
      }).eq("id", editReturn.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vat_returns"] });
      setEditReturn(null);
      setForm({ client_id: "", period_start: "", period_end: "", notes: "", box1: "0", box2: "0", box4: "0", box6: "0", box7: "0", box8: "0", box9: "0" });
      toast.success("VAT return updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteReturn = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("vat_returns").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vat_returns"] });
      setDeleteConfirm(null);
      setViewReturn(null);
      toast.success("VAT return deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const openEditReturn = (v: any) => {
    setForm({
      client_id: v.client_id || "",
      period_start: v.period_start,
      period_end: v.period_end,
      notes: v.notes || "",
      box1: String(v.box1 || 0),
      box2: String(v.box2 || 0),
      box4: String(v.box4 || 0),
      box6: String(v.box6 || 0),
      box7: String(v.box7 || 0),
      box8: String(v.box8 || 0),
      box9: String(v.box9 || 0),
    });
    setEditReturn(v);
    setViewReturn(null);
  };

  const csvInputRef = useRef<HTMLInputElement>(null);

  const handleCsvUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".csv") && file.type !== "text/csv") {
      toast.error("Please upload a CSV file");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const boxes = parseCsvToBoxes(text);
      if (!boxes) {
        toast.error("Could not parse box values from CSV. Ensure it contains Box 1–9 labels or 9 numeric values.");
        return;
      }
      setForm(prev => ({
        ...prev,
        box1: boxes.box1 ?? prev.box1,
        box2: boxes.box2 ?? prev.box2,
        box4: boxes.box4 ?? prev.box4,
        box6: boxes.box6 ?? prev.box6,
        box7: boxes.box7 ?? prev.box7,
        box8: boxes.box8 ?? prev.box8,
        box9: boxes.box9 ?? prev.box9,
      }));
      toast.success("CSV imported — box values populated");
    };
    reader.readAsText(file);
    // Reset so same file can be re-uploaded
    if (csvInputRef.current) csvInputRef.current.value = "";
  }, []);

  const downloadCsvTemplate = useCallback(() => {
    const csv = [
      "Box,Label,Value",
      "Box 1,VAT due on sales,0",
      "Box 2,VAT due on acquisitions (EC),0",
      "Box 3,Total VAT due (1 + 2),0",
      "Box 4,VAT reclaimed on purchases,0",
      "Box 5,Net VAT (3 − 4),0",
      "Box 6,Total sales (excl. VAT),0",
      "Box 7,Total purchases (excl. VAT),0",
      "Box 8,Total EC supplies,0",
      "Box 9,Total EC acquisitions,0",
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "vat_return_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }, []);

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
        <div className="flex gap-2">
          {profile?.tenant_id && (
            <HmrcConnectButton
              clientId=""
              tenantId={profile.tenant_id}
              scopes="read:vat write:vat"
              label="Connect HMRC (VAT)"
            />
          )}
          <Button className="gap-2" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4" /> New VAT Return
          </Button>
        </div>
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
                      <div className="flex gap-0.5">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewReturn(v)} title="View">
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        {v.status === "draft" && (
                          <>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditReturn(v)} title="Edit">
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteConfirm(v)} title="Delete">
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
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
          <div className="flex gap-2 mb-1">
            <input ref={csvInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleCsvUpload} />
            <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => csvInputRef.current?.click()}>
              <Upload className="w-3.5 h-3.5" /> Import CSV
            </Button>
            <Button type="button" variant="ghost" size="sm" className="gap-1.5" onClick={downloadCsvTemplate}>
              <Download className="w-3.5 h-3.5" /> Template
            </Button>
          </div>
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
                  <>
                    <Button variant="outline" size="sm" onClick={() => openEditReturn(viewReturn)}>
                      <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
                    </Button>
                    <Button variant="outline" onClick={() => updateStatus.mutate({ id: viewReturn.id, status: "ready" })}>
                      Mark Ready
                    </Button>
                  </>
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

      {/* Edit VAT Return Dialog */}
      <Dialog open={!!editReturn} onOpenChange={(open) => { if (!open) { setEditReturn(null); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit VAT Return</DialogTitle></DialogHeader>
          <div className="flex gap-2 mb-1">
            <input ref={csvInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleCsvUpload} />
            <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => csvInputRef.current?.click()}>
              <Upload className="w-3.5 h-3.5" /> Re-import CSV
            </Button>
          </div>
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
                <Label>Period Start</Label>
                <Input type="date" value={form.period_start} onChange={(e) => setForm({ ...form, period_start: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Period End</Label>
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
            <Button variant="outline" onClick={() => setEditReturn(null)}>Cancel</Button>
            <Button onClick={() => updateReturn.mutate()} disabled={!form.period_start || !form.period_end || updateReturn.isPending}>
              {updateReturn.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete VAT Return Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => { if (!open) setDeleteConfirm(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete VAT Return?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this VAT return. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deleteReturn.mutate(deleteConfirm?.id)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
