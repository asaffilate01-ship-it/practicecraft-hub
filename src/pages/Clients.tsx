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
import { Plus, Search, Filter } from "lucide-react";
import { toast } from "sonner";

const entityLabels: Record<string, string> = {
  ltd: "Ltd", sole_trader: "Sole Trader", partnership: "Partnership",
  llp: "LLP", charity: "Charity", trust: "Trust",
};

const statusColor: Record<string, "default" | "secondary" | "outline"> = {
  active: "default", prospect: "secondary", dormant: "outline", ceased: "outline",
};

export default function Clients() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ legal_name: "", entity_type: "ltd" as string, email: "", phone: "", company_number: "", vat_number: "" });

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
        entity_type: form.entity_type as any,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        company_number: form.company_number.trim() || null,
        vat_number: form.vat_number.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      setShowAdd(false);
      setForm({ legal_name: "", entity_type: "ltd", email: "", phone: "", company_number: "", vat_number: "" });
      toast.success("Client added");
    },
    onError: (e) => toast.error(e.message),
  });

  const filtered = clients.filter((c: any) =>
    c.legal_name.toLowerCase().includes(search.toLowerCase()) ||
    (c.email && c.email.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clients</h1>
          <p className="text-sm text-muted-foreground">Manage your client portfolio</p>
        </div>
        <Button className="gap-2" onClick={() => setShowAdd(true)}>
          <Plus className="w-4 h-4" /> Add Client
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search clients..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-12 text-center text-muted-foreground">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              {clients.length === 0 ? "No clients yet. Add your first client to get started." : "No clients match your search."}
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c: any) => (
                  <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/clients/${c.id}`)}>
                    <TableCell className="font-medium">{c.legal_name}</TableCell>
                    <TableCell><Badge variant="secondary" className="text-xs">{entityLabels[c.entity_type] || c.entity_type}</Badge></TableCell>
                    <TableCell><Badge variant={statusColor[c.status] || "outline"} className="text-xs capitalize">{c.status}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{c.vat_number || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{c.email || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Client Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Client</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Legal Name *</Label>
              <Input value={form.legal_name} onChange={(e) => setForm({ ...form, legal_name: e.target.value })} placeholder="ACME Ltd" />
            </div>
            <div className="space-y-2">
              <Label>Entity Type</Label>
              <Select value={form.entity_type} onValueChange={(v) => setForm({ ...form, entity_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(entityLabels).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="info@acme.co.uk" />
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={() => addClient.mutate()} disabled={!form.legal_name.trim() || addClient.isPending}>
              {addClient.isPending ? "Adding..." : "Add Client"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
