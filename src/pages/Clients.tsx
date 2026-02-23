import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

const entityLabels: Record<string, string> = {
  ltd: "Ltd", sole_trader: "Sole Trader", partnership: "Partnership",
  llp: "LLP", charity: "Charity", trust: "Trust",
};

const statusColor: Record<string, "default" | "secondary" | "outline"> = {
  active: "default", prospect: "secondary", dormant: "outline", ceased: "outline",
};

const emptyForm = {
  legal_name: "", trading_name: "", entity_type: "ltd", status: "active",
  email: "", phone: "", company_number: "", vat_number: "", utr: "", nino: "", paye_reference: "", charity_number: "",
};

export default function Clients() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editClient, setEditClient] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("tenant_id").eq("id", user!.id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["clients", profile?.tenant_id],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("*").order("legal_name");
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.tenant_id,
  });

  const addClient = useMutation({
    mutationFn: async () => {
      if (!profile?.tenant_id) throw new Error("No tenant");
      const { error } = await supabase.from("clients").insert({
        tenant_id: profile.tenant_id,
        legal_name: form.legal_name.trim(),
        trading_name: form.trading_name.trim() || null,
        entity_type: form.entity_type as any,
        status: form.status as any,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        company_number: form.company_number.trim() || null,
        vat_number: form.vat_number.trim() || null,
        utr: form.utr.trim() || null,
        nino: form.nino.trim() || null,
        paye_reference: form.paye_reference.trim() || null,
        charity_number: form.charity_number.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      setShowAdd(false);
      setForm(emptyForm);
      toast.success("Client added");
    },
    onError: (e) => toast.error(e.message),
  });

  const updateClient = useMutation({
    mutationFn: async () => {
      if (!editClient) return;
      const { error } = await supabase.from("clients").update({
        legal_name: form.legal_name.trim(),
        trading_name: form.trading_name.trim() || null,
        entity_type: form.entity_type as any,
        status: form.status as any,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        company_number: form.company_number.trim() || null,
        vat_number: form.vat_number.trim() || null,
        utr: form.utr.trim() || null,
        nino: form.nino.trim() || null,
        paye_reference: form.paye_reference.trim() || null,
        charity_number: form.charity_number.trim() || null,
      }).eq("id", editClient.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      setEditClient(null);
      setForm(emptyForm);
      toast.success("Client updated");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteClient = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clients").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      setEditClient(null);
      toast.success("Client deleted");
    },
    onError: (e) => toast.error(e.message),
  });

  const openEdit = (client: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setForm({
      legal_name: client.legal_name || "",
      trading_name: client.trading_name || "",
      entity_type: client.entity_type || "ltd",
      status: client.status || "active",
      email: client.email || "",
      phone: client.phone || "",
      company_number: client.company_number || "",
      vat_number: client.vat_number || "",
      utr: client.utr || "",
      nino: client.nino || "",
      paye_reference: client.paye_reference || "",
      charity_number: client.charity_number || "",
    });
    setEditClient(client);
  };

  const filtered = clients.filter((c: any) => {
    const matchSearch = c.legal_name.toLowerCase().includes(search.toLowerCase()) ||
      (c.email && c.email.toLowerCase().includes(search.toLowerCase())) ||
      (c.trading_name && c.trading_name.toLowerCase().includes(search.toLowerCase()));
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const ClientFormFields = () => (
    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Legal Name *</Label>
          <Input value={form.legal_name} onChange={(e) => setForm({ ...form, legal_name: e.target.value })} placeholder="ACME Ltd" />
        </div>
        <div className="space-y-2">
          <Label>Trading Name</Label>
          <Input value={form.trading_name} onChange={(e) => setForm({ ...form, trading_name: e.target.value })} placeholder="ACME" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Entity Type</Label>
          <Select value={form.entity_type} onValueChange={(v) => setForm({ ...form, entity_type: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(entityLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="prospect">Prospect</SelectItem>
              <SelectItem value="dormant">Dormant</SelectItem>
              <SelectItem value="ceased">Ceased</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Email</Label>
          <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="info@acme.co.uk" />
        </div>
        <div className="space-y-2">
          <Label>Phone</Label>
          <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="020 1234 5678" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Company Number</Label>
          <Input value={form.company_number} onChange={(e) => setForm({ ...form, company_number: e.target.value })} placeholder="12345678" />
        </div>
        <div className="space-y-2">
          <Label>VAT Number</Label>
          <Input value={form.vat_number} onChange={(e) => setForm({ ...form, vat_number: e.target.value })} placeholder="GB123456789" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>UTR</Label>
          <Input value={form.utr} onChange={(e) => setForm({ ...form, utr: e.target.value })} placeholder="1234567890" />
        </div>
        <div className="space-y-2">
          <Label>NINO</Label>
          <Input value={form.nino} onChange={(e) => setForm({ ...form, nino: e.target.value })} placeholder="AB123456C" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>PAYE Reference</Label>
          <Input value={form.paye_reference} onChange={(e) => setForm({ ...form, paye_reference: e.target.value })} placeholder="123/AB456" />
        </div>
        <div className="space-y-2">
          <Label>Charity Number</Label>
          <Input value={form.charity_number} onChange={(e) => setForm({ ...form, charity_number: e.target.value })} placeholder="1234567" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clients</h1>
          <p className="text-sm text-muted-foreground">Manage your client portfolio</p>
        </div>
        <Button className="gap-2" onClick={() => { setForm(emptyForm); setShowAdd(true); }}>
          <Plus className="w-4 h-4" /> Add Client
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search clients..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="prospect">Prospect</SelectItem>
                <SelectItem value="dormant">Dormant</SelectItem>
                <SelectItem value="ceased">Ceased</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-12 text-center text-muted-foreground">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              {clients.length === 0 ? "No clients yet. Add your first client to get started." : "No clients match your filters."}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client Name</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>VAT No.</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c: any) => (
                  <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/clients/${c.id}`)}>
                    <TableCell>
                      <div>
                        <span className="font-medium">{c.legal_name}</span>
                        {c.trading_name && <span className="text-xs text-muted-foreground ml-2">t/a {c.trading_name}</span>}
                      </div>
                    </TableCell>
                    <TableCell><Badge variant="secondary" className="text-xs">{entityLabels[c.entity_type] || c.entity_type}</Badge></TableCell>
                    <TableCell><Badge variant={statusColor[c.status] || "outline"} className="text-xs capitalize">{c.status}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{c.vat_number || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{c.email || "—"}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => openEdit(c, e)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Client Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add New Client</DialogTitle></DialogHeader>
          <ClientFormFields />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={() => addClient.mutate()} disabled={!form.legal_name.trim() || addClient.isPending}>
              {addClient.isPending ? "Adding..." : "Add Client"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Client Dialog */}
      <Dialog open={!!editClient} onOpenChange={(open) => { if (!open) { setEditClient(null); setForm(emptyForm); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>Edit Client</DialogTitle>
              <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => deleteClient.mutate(editClient?.id)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </DialogHeader>
          <ClientFormFields />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditClient(null); setForm(emptyForm); }}>Cancel</Button>
            <Button onClick={() => updateClient.mutate()} disabled={!form.legal_name.trim() || updateClient.isPending}>
              {updateClient.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
