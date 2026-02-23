import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Zap, ArrowUpDown } from "lucide-react";
import { toast } from "sonner";

export default function CategorisationRules() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [showAdd, setShowAdd] = useState(false);
  const [editRule, setEditRule] = useState<any>(null);
  const [form, setForm] = useState({
    name: "", match_type: "contains", match_field: "description", match_value: "",
    target_account_id: "", vat_code: "", auto_post: false, priority: "100", client_id: "",
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

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ["categorisation_rules", profile?.tenant_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categorisation_rules")
        .select("*, target_account:chart_of_accounts!categorisation_rules_target_account_id_fkey(code, name), client:clients(legal_name)")
        .order("priority", { ascending: true });
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

  const { data: clients = [] } = useQuery({
    queryKey: ["clients-list", profile?.tenant_id],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("id, legal_name").order("legal_name");
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.tenant_id,
  });

  const saveRule = useMutation({
    mutationFn: async () => {
      if (!profile?.tenant_id) throw new Error("No tenant");
      const payload = {
        tenant_id: profile.tenant_id,
        name: form.name.trim(),
        match_type: form.match_type,
        match_field: form.match_field,
        match_value: form.match_value.trim(),
        target_account_id: form.target_account_id,
        vat_code: form.vat_code || null,
        auto_post: form.auto_post,
        priority: parseInt(form.priority) || 100,
        client_id: form.client_id || null,
        created_by: user?.id,
      };

      if (editRule) {
        const { error } = await supabase.from("categorisation_rules").update(payload).eq("id", editRule.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("categorisation_rules").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categorisation_rules"] });
      setShowAdd(false);
      setEditRule(null);
      resetForm();
      toast.success(editRule ? "Rule updated" : "Rule created");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteRule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("categorisation_rules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categorisation_rules"] });
      toast.success("Rule deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleRule = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("categorisation_rules").update({ is_active: active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["categorisation_rules"] }),
    onError: (e: any) => toast.error(e.message),
  });

  const resetForm = () => setForm({
    name: "", match_type: "contains", match_field: "description", match_value: "",
    target_account_id: "", vat_code: "", auto_post: false, priority: "100", client_id: "",
  });

  const openEdit = (rule: any) => {
    setForm({
      name: rule.name || "",
      match_type: rule.match_type || "contains",
      match_field: rule.match_field || "description",
      match_value: rule.match_value || "",
      target_account_id: rule.target_account_id || "",
      vat_code: rule.vat_code || "",
      auto_post: rule.auto_post || false,
      priority: String(rule.priority ?? 100),
      client_id: rule.client_id || "",
    });
    setEditRule(rule);
    setShowAdd(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Auto-Categorisation Rules</h1>
          <p className="text-sm text-muted-foreground">Define rules to automatically categorise bank transactions</p>
        </div>
        <Button className="gap-2" onClick={() => { resetForm(); setEditRule(null); setShowAdd(true); }}>
          <Plus className="w-4 h-4" /> Add Rule
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <p className="text-center text-muted-foreground py-8">Loading…</p>
          ) : rules.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <Zap className="w-10 h-10 mx-auto text-muted-foreground" />
              <p className="text-muted-foreground">No categorisation rules yet.</p>
              <p className="text-sm text-muted-foreground">Create rules to automatically match bank transactions to ledger accounts.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"><ArrowUpDown className="w-3.5 h-3.5" /></TableHead>
                  <TableHead>Rule Name</TableHead>
                  <TableHead>Match</TableHead>
                  <TableHead>Target Account</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>VAT</TableHead>
                  <TableHead>Auto-post</TableHead>
                  <TableHead>Hits</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((r: any) => (
                  <TableRow key={r.id} className={!r.is_active ? "opacity-50" : ""}>
                    <TableCell className="font-mono text-xs text-muted-foreground">{r.priority}</TableCell>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell>
                      <div className="text-xs">
                        <Badge variant="outline" className="mr-1">{r.match_field}</Badge>
                        <Badge variant="secondary" className="mr-1">{r.match_type}</Badge>
                        <code className="text-xs bg-muted px-1 py-0.5 rounded">{r.match_value}</code>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {r.target_account ? `${r.target_account.code} ${r.target_account.name}` : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{r.client?.legal_name || "All"}</TableCell>
                    <TableCell className="text-xs">{r.vat_code || "—"}</TableCell>
                    <TableCell>{r.auto_post ? <Badge className="bg-success text-success-foreground">Yes</Badge> : <Badge variant="outline">No</Badge>}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{r.hit_count}</TableCell>
                    <TableCell>
                      <Switch checked={r.is_active} onCheckedChange={(v) => toggleRule.mutate({ id: r.id, active: v })} />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-0.5">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(r)}><Pencil className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteRule.mutate(r.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Rule Dialog */}
      <Dialog open={showAdd} onOpenChange={(open) => { if (!open) { setShowAdd(false); setEditRule(null); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editRule ? "Edit Rule" : "New Categorisation Rule"}</DialogTitle></DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            <div className="space-y-2">
              <Label>Rule Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="AWS hosting charges" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Match Field</Label>
                <Select value={form.match_field} onValueChange={(v) => setForm({ ...form, match_field: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="description">Description</SelectItem>
                    <SelectItem value="reference">Reference</SelectItem>
                    <SelectItem value="amount">Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Match Type</Label>
                <Select value={form.match_type} onValueChange={(v) => setForm({ ...form, match_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contains">Contains</SelectItem>
                    <SelectItem value="exact">Exact</SelectItem>
                    <SelectItem value="starts_with">Starts with</SelectItem>
                    <SelectItem value="regex">Regex</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Match Value *</Label>
                <Input value={form.match_value} onChange={(e) => setForm({ ...form, match_value: e.target.value })} placeholder="AMAZON WEB" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Target Account *</Label>
              <Select value={form.target_account_id} onValueChange={(v) => setForm({ ...form, target_account_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                <SelectContent>
                  {accounts.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.code} - {a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Client (optional)</Label>
                <Select value={form.client_id} onValueChange={(v) => setForm({ ...form, client_id: v })}>
                  <SelectTrigger><SelectValue placeholder="All clients" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All clients</SelectItem>
                    {clients.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.legal_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>VAT Code</Label>
                <Select value={form.vat_code} onValueChange={(v) => setForm({ ...form, vat_code: v })}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    <SelectItem value="standard">Standard (20%)</SelectItem>
                    <SelectItem value="reduced">Reduced (5%)</SelectItem>
                    <SelectItem value="zero">Zero-rated</SelectItem>
                    <SelectItem value="exempt">Exempt</SelectItem>
                    <SelectItem value="outside">Outside scope</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Priority (lower = first)</Label>
                <Input type="number" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} />
              </div>
              <div className="flex items-center gap-3 pt-6">
                <Switch checked={form.auto_post} onCheckedChange={(v) => setForm({ ...form, auto_post: v })} />
                <Label>Auto-post journal</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAdd(false); setEditRule(null); }}>Cancel</Button>
            <Button onClick={() => saveRule.mutate()} disabled={!form.name.trim() || !form.match_value.trim() || !form.target_account_id || saveRule.isPending}>
              {saveRule.isPending ? "Saving…" : editRule ? "Update Rule" : "Create Rule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
