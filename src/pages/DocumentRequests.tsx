import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileQuestion, Plus, Search, Send, CheckCircle2, Clock, Eye, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pending", variant: "secondary" },
  sent: { label: "Sent", variant: "outline" },
  partially_fulfilled: { label: "Partial", variant: "outline" },
  fulfilled: { label: "Fulfilled", variant: "default" },
  cancelled: { label: "Cancelled", variant: "destructive" },
};

const DOC_TYPE_OPTIONS = [
  "ID Document", "Proof of Address", "Bank Statement", "Tax Return",
  "P60", "Dividend Voucher", "Invoice", "Receipt", "Engagement Letter", "Other",
];

export default function DocumentRequests() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [docTypes, setDocTypes] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState("");

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
    queryKey: ["document-requests", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("document_requests")
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
      if (!selectedClientId || !title.trim()) throw new Error("Client and title are required");
      const { error } = await supabase.from("document_requests").insert({
        tenant_id: profileQ.data!.tenant_id,
        client_id: selectedClientId,
        requested_by_user_id: user!.id,
        title: title.trim(),
        description: description.trim() || null,
        document_types: docTypes,
        due_date: dueDate || null,
        status: "sent",
        sent_at: new Date().toISOString(),
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Document request sent to client");
      queryClient.invalidateQueries({ queryKey: ["document-requests"] });
      setCreateOpen(false);
      setTitle("");
      setDescription("");
      setDocTypes([]);
      setDueDate("");
      setSelectedClientId("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const markFulfilledMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("document_requests").update({
        status: "fulfilled",
        completed_at: new Date().toISOString(),
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document-requests"] });
      toast.success("Request marked as fulfilled");
    },
  });

  const filtered = requests.filter((r: any) => {
    if (!search) return true;
    return r.client?.legal_name?.toLowerCase().includes(search.toLowerCase()) ||
           r.title?.toLowerCase().includes(search.toLowerCase());
  });

  const stats = {
    total: requests.length,
    pending: requests.filter((r: any) => r.status === "sent" || r.status === "pending").length,
    fulfilled: requests.filter((r: any) => r.status === "fulfilled").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "var(--font-heading)" }}>
            Document Requests
          </h1>
          <p className="text-sm text-muted-foreground">Request documents from clients via the portal</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-1.5" /> New Request
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Total Requests</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Awaiting</p>
          <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Fulfilled</p>
          <p className="text-2xl font-bold text-primary">{stats.fulfilled}</p>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search requests…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="fulfilled">Fulfilled</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Requests table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <FileQuestion className="w-12 h-12 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No document requests found.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Request</TableHead>
                  <TableHead>Documents</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r: any) => {
                  const s = STATUS_MAP[r.status] || STATUS_MAP.pending;
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium text-sm">{r.client?.legal_name}</TableCell>
                      <TableCell>
                        <p className="text-sm">{r.title}</p>
                        {r.description && <p className="text-xs text-muted-foreground truncate max-w-[200px]">{r.description}</p>}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {(r.document_types || []).map((dt: string) => (
                            <Badge key={dt} variant="outline" className="text-[10px]">{dt}</Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {r.due_date ? format(new Date(r.due_date), "dd MMM yyyy") : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={s.variant} className="text-xs">{s.label}</Badge>
                      </TableCell>
                      <TableCell>
                        {r.status !== "fulfilled" && r.status !== "cancelled" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => markFulfilledMut.mutate(r.id)}
                            className="text-xs gap-1"
                          >
                            <CheckCircle2 className="w-3 h-3" /> Fulfil
                          </Button>
                        )}
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
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>New Document Request</DialogTitle></DialogHeader>
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
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Year-end bank statements" />
            </div>
            <div className="space-y-1.5">
              <Label>Description (optional)</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What do you need and why…" rows={2} />
            </div>
            <div className="space-y-1.5">
              <Label>Document Types Needed</Label>
              <div className="flex flex-wrap gap-1.5">
                {DOC_TYPE_OPTIONS.map((dt) => (
                  <Badge
                    key={dt}
                    variant={docTypes.includes(dt) ? "default" : "outline"}
                    className="cursor-pointer text-xs"
                    onClick={() => setDocTypes(prev =>
                      prev.includes(dt) ? prev.filter(x => x !== dt) : [...prev, dt]
                    )}
                  >
                    {dt}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Due Date (optional)</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={() => createMut.mutate()} disabled={createMut.isPending} className="gap-1.5">
              {createMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Send Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
