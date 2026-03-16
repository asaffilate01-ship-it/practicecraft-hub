import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PenTool, Plus, Search, Send, CheckCircle2, Clock, Eye, XCircle, Bell, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof Clock }> = {
  pending: { label: "Pending", variant: "secondary", icon: Clock },
  sent: { label: "Sent", variant: "outline", icon: Send },
  viewed: { label: "Viewed", variant: "outline", icon: Eye },
  signed: { label: "Signed", variant: "default", icon: CheckCircle2 },
  declined: { label: "Declined", variant: "destructive", icon: XCircle },
  expired: { label: "Expired", variant: "secondary", icon: Clock },
};

export default function ESignatures() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [title, setTitle] = useState("");
  const [signerName, setSignerName] = useState("");
  const [signerEmail, setSignerEmail] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const profileQ = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("tenant_id").eq("id", user!.id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients-brief"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("id, legal_name").eq("status", "active").order("legal_name");
      if (error) throw error;
      return data;
    },
  });

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["signature-requests", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("signature_requests")
        .select("*, client:clients(legal_name)")
        .order("created_at", { ascending: false });
      if (statusFilter !== "all") query = query.eq("status", statusFilter);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const createMut = useMutation({
    mutationFn: async () => {
      if (!selectedClientId || !title.trim() || !signerName.trim() || !signerEmail.trim()) {
        throw new Error("All fields are required");
      }

      let documentPath: string | null = null;

      // Upload document if provided
      if (file) {
        const ext = file.name.split(".").pop();
        const path = `${profileQ.data!.tenant_id}/esign/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("client-documents").upload(path, file);
        if (upErr) throw upErr;
        documentPath = path;
      }

      const { error } = await supabase.from("signature_requests").insert({
        tenant_id: profileQ.data!.tenant_id,
        client_id: selectedClientId,
        title: title.trim(),
        signer_name: signerName.trim(),
        signer_email: signerEmail.trim(),
        status: "sent",
        sent_at: new Date().toISOString(),
        created_by_user_id: user!.id,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        document_storage_path: documentPath,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Signature request sent");
      queryClient.invalidateQueries({ queryKey: ["signature-requests"] });
      setCreateOpen(false);
      setTitle("");
      setSignerName("");
      setSignerEmail("");
      setSelectedClientId("");
      setFile(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const sendReminderMut = useMutation({
    mutationFn: async (id: string) => {
      const { data: req } = await supabase.from("signature_requests").select("reminder_count").eq("id", id).single();
      const { error } = await supabase.from("signature_requests").update({
        reminder_count: (req?.reminder_count || 0) + 1,
        last_reminder_at: new Date().toISOString(),
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["signature-requests"] });
      toast.success("Reminder sent");
    },
  });

  const markSignedMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("signature_requests").update({
        status: "signed",
        signed_at: new Date().toISOString(),
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["signature-requests"] });
      toast.success("Marked as signed");
    },
  });

  const filtered = requests.filter((r: any) => {
    if (!search) return true;
    return r.client?.legal_name?.toLowerCase().includes(search.toLowerCase()) ||
           r.title?.toLowerCase().includes(search.toLowerCase()) ||
           r.signer_name?.toLowerCase().includes(search.toLowerCase());
  });

  const stats = {
    total: requests.length,
    awaiting: requests.filter((r: any) => ["sent", "viewed", "pending"].includes(r.status)).length,
    signed: requests.filter((r: any) => r.status === "signed").length,
    declined: requests.filter((r: any) => r.status === "declined").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "var(--font-heading)" }}>
            e-Signatures
          </h1>
          <p className="text-sm text-muted-foreground">Send documents for signature, track status, and store signed copies</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-1.5" /> New Signature Request
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Awaiting</p>
          <p className="text-2xl font-bold text-amber-600">{stats.awaiting}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Signed</p>
          <p className="text-2xl font-bold text-primary">{stats.signed}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Declined</p>
          <p className="text-2xl font-bold text-destructive">{stats.declined}</p>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="viewed">Viewed</SelectItem>
            <SelectItem value="signed">Signed</SelectItem>
            <SelectItem value="declined">Declined</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <PenTool className="w-12 h-12 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No signature requests found.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Signer</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reminders</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r: any) => {
                  const sc = STATUS_CONFIG[r.status] || STATUS_CONFIG.pending;
                  const Icon = sc.icon;
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium text-sm">{r.title}</TableCell>
                      <TableCell className="text-sm">{r.client?.legal_name}</TableCell>
                      <TableCell>
                        <p className="text-sm">{r.signer_name}</p>
                        <p className="text-xs text-muted-foreground">{r.signer_email}</p>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {r.sent_at ? format(new Date(r.sent_at), "dd MMM yyyy") : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={sc.variant} className="text-xs gap-1">
                          <Icon className="w-3 h-3" /> {sc.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {r.reminder_count || 0}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {["sent", "viewed"].includes(r.status) && (
                            <>
                              <Button variant="ghost" size="sm" onClick={() => sendReminderMut.mutate(r.id)} className="text-xs gap-1">
                                <Bell className="w-3 h-3" /> Remind
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => markSignedMut.mutate(r.id)} className="text-xs gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Mark Signed
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Signature Request</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Client</Label>
              <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                <SelectTrigger><SelectValue placeholder="Select client…" /></SelectTrigger>
                <SelectContent>
                  {clients.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.legal_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Document Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Engagement Letter 2025/26" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Signer Name</Label>
                <Input value={signerName} onChange={(e) => setSignerName(e.target.value)} placeholder="John Smith" />
              </div>
              <div className="space-y-1.5">
                <Label>Signer Email</Label>
                <Input type="email" value={signerEmail} onChange={(e) => setSignerEmail(e.target.value)} placeholder="john@example.com" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Attach Document (PDF)</Label>
              <div className="flex items-center gap-3">
                <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} className="gap-1.5">
                  <Upload className="w-3.5 h-3.5" /> {file ? file.name : "Choose file…"}
                </Button>
                {file && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => setFile(null)} className="text-xs text-muted-foreground">
                    Remove
                  </Button>
                )}
                <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={() => createMut.mutate()} disabled={createMut.isPending} className="gap-1.5">
              {createMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Send for Signature
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
