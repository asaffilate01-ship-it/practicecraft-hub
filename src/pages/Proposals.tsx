import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, Clock, FileText, Plus, Send, Trash2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { WorkspacePageHeader } from "@/components/layout/WorkspacePageHeader";
import { useAuth } from "@/contexts/AuthContext";
import { useClientContext } from "@/contexts/ClientContext";
import { usePermissions } from "@/hooks/usePermissions";
import { supabase } from "@/integrations/supabase/client";

type ServiceLine = { name: string; fee_pence: number };
type Proposal = {
  id: string;
  title: string;
  prospect_name: string | null;
  prospect_email: string | null;
  status: string;
  services_json: unknown;
  total_fee_pence: number;
  fee_frequency: string;
  valid_until: string | null;
};

const AVAILABLE_SERVICES = ["Bookkeeping", "VAT (MTD)", "Payroll (RTI)", "Accounts Production", "Corporation Tax", "Self Assessment", "Company Secretarial", "AML/KYC", "Pensions Auto-Enrolment", "CIS", "MTD Income Tax"];
const statusConfig: Record<string, { icon: typeof Clock; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  draft: { icon: FileText, variant: "outline" }, sent: { icon: Send, variant: "secondary" }, accepted: { icon: CheckCircle, variant: "default" }, declined: { icon: XCircle, variant: "destructive" }, expired: { icon: Clock, variant: "outline" },
};
const emptyForm = () => ({ title: "", prospect_name: "", prospect_email: "", fee_frequency: "monthly", valid_until: "", terms: "", services: [] as ServiceLine[] });
const serviceLines = (value: unknown): ServiceLine[] => Array.isArray(value) ? value.filter((item): item is ServiceLine => !!item && typeof item === "object" && "name" in item && "fee_pence" in item) : [];

export default function Proposals() {
  const queryClient = useQueryClient();
  const { tenantId } = usePermissions();
  const { user } = useAuth();
  const { selectedClientId } = useClientContext();
  const [showCreate, setShowCreate] = useState(false);
  const [newProposal, setNewProposal] = useState(emptyForm);

  const { data: proposals = [], isLoading } = useQuery({
    queryKey: ["proposals", tenantId, selectedClientId],
    queryFn: async () => {
      let query = supabase.from("proposals").select("id,title,prospect_name,prospect_email,status,services_json,total_fee_pence,fee_frequency,valid_until").order("updated_at", { ascending: false });
      if (selectedClientId) query = query.eq("client_id", selectedClientId);
      const { data, error } = await query;
      if (error) throw error;
      return data as Proposal[];
    },
    enabled: !!tenantId,
  });

  const createProposal = useMutation({
    mutationFn: async () => {
      if (!tenantId || !newProposal.title.trim()) throw new Error("Add a proposal title");
      const lines = newProposal.services.filter((service) => service.name && service.fee_pence >= 0);
      if (!lines.length) throw new Error("Add at least one service");
      const { error } = await supabase.from("proposals").insert({
        tenant_id: tenantId, client_id: selectedClientId, title: newProposal.title.trim(), prospect_name: newProposal.prospect_name.trim() || null, prospect_email: newProposal.prospect_email.trim() || null,
        services_json: lines, fee_breakdown_json: lines, total_fee_pence: lines.reduce((sum, service) => sum + service.fee_pence, 0), fee_frequency: newProposal.fee_frequency,
        valid_until: newProposal.valid_until || null, terms_text: newProposal.terms.trim() || null, created_by: user?.id, status: "draft",
      });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["proposals"] }); setNewProposal(emptyForm()); setShowCreate(false); toast.success("Proposal saved as draft"); },
    onError: (error: Error) => toast.error(error.message),
  });

  const addService = () => setNewProposal((proposal) => ({ ...proposal, services: [...proposal.services, { name: "", fee_pence: 0 }] }));
  const updateService = (index: number, field: keyof ServiceLine, value: string | number) => setNewProposal((proposal) => ({ ...proposal, services: proposal.services.map((service, itemIndex) => itemIndex === index ? { ...service, [field]: value } : service) }));
  const removeService = (index: number) => setNewProposal((proposal) => ({ ...proposal, services: proposal.services.filter((_, itemIndex) => itemIndex !== index) }));
  const totalFee = newProposal.services.reduce((sum, service) => sum + service.fee_pence, 0);

  const createDialog = <Dialog open={showCreate} onOpenChange={setShowCreate}><DialogTrigger asChild><Button><Plus className="mr-1 h-4 w-4" /> New proposal</Button></DialogTrigger><DialogContent className="max-h-[88vh] max-w-2xl overflow-y-auto"><DialogHeader><DialogTitle>Create proposal</DialogTitle></DialogHeader><div className="space-y-4">
    <div><Label>Title</Label><Input placeholder="Annual compliance package" value={newProposal.title} onChange={(event) => setNewProposal((proposal) => ({ ...proposal, title: event.target.value }))} /></div>
    <div className="grid gap-3 sm:grid-cols-2"><div><Label>Prospect name</Label><Input value={newProposal.prospect_name} onChange={(event) => setNewProposal((proposal) => ({ ...proposal, prospect_name: event.target.value }))} /></div><div><Label>Prospect email</Label><Input type="email" value={newProposal.prospect_email} onChange={(event) => setNewProposal((proposal) => ({ ...proposal, prospect_email: event.target.value }))} /></div></div>
    <div className="grid gap-3 sm:grid-cols-2"><div><Label>Fee frequency</Label><Select value={newProposal.fee_frequency} onValueChange={(value) => setNewProposal((proposal) => ({ ...proposal, fee_frequency: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="monthly">Monthly</SelectItem><SelectItem value="quarterly">Quarterly</SelectItem><SelectItem value="annually">Annually</SelectItem><SelectItem value="one_off">One-off</SelectItem></SelectContent></Select></div><div><Label>Valid until</Label><Input type="date" value={newProposal.valid_until} onChange={(event) => setNewProposal((proposal) => ({ ...proposal, valid_until: event.target.value }))} /></div></div>
    <div className="space-y-2"><div className="flex items-center justify-between"><Label>Services and fees</Label><Button variant="outline" size="sm" onClick={addService}><Plus className="mr-1 h-3 w-3" /> Add service</Button></div>{newProposal.services.map((service, index) => <div key={index} className="grid grid-cols-[1fr_7rem_2.5rem] gap-2"><Select value={service.name} onValueChange={(value) => updateService(index, "name", value)}><SelectTrigger><SelectValue placeholder="Select service" /></SelectTrigger><SelectContent>{AVAILABLE_SERVICES.map((name) => <SelectItem key={name} value={name}>{name}</SelectItem>)}</SelectContent></Select><Input type="number" min="0" placeholder="Fee (£)" value={service.fee_pence ? service.fee_pence / 100 : ""} onChange={(event) => updateService(index, "fee_pence", Math.round(Number(event.target.value || 0) * 100))} /><Button variant="ghost" size="icon" onClick={() => removeService(index)} aria-label="Remove service"><Trash2 className="h-4 w-4 text-destructive" /></Button></div>)}{newProposal.services.length > 0 && <p className="text-right text-sm font-semibold">£{(totalFee / 100).toFixed(2)} / {newProposal.fee_frequency.replace("one_off", "one-off")}</p>}</div>
    <div><Label>Terms and scope</Label><Textarea value={newProposal.terms} onChange={(event) => setNewProposal((proposal) => ({ ...proposal, terms: event.target.value }))} /></div>
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button><Button onClick={() => createProposal.mutate()} disabled={createProposal.isPending}>{createProposal.isPending ? "Saving…" : "Save draft"}</Button></div>
  </div></DialogContent></Dialog>;

  return <div className="space-y-6"><WorkspacePageHeader eyebrow="Onboarding and fees" title="Proposals & Engagements" icon={FileText} description="Create persistent fee proposals, scope services and prepare engagement acceptance." actions={createDialog} />
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{["draft", "sent", "accepted", "declined"].map((status) => { const config = statusConfig[status]; const Icon = config.icon; return <Card key={status} className="workspace-panel"><CardContent className="flex items-center justify-between p-4"><div><p className="workspace-eyebrow">{status}</p><p className="mt-2 text-2xl font-semibold">{proposals.filter((proposal) => proposal.status === status).length}</p></div><Icon className="h-5 w-5 text-muted-foreground" /></CardContent></Card>; })}</div>
    {isLoading ? <Card className="workspace-panel"><CardContent className="py-16 text-center text-sm text-muted-foreground">Loading proposals…</CardContent></Card> : !proposals.length ? <Card className="workspace-panel"><CardContent className="flex min-h-56 flex-col items-center justify-center text-center"><FileText className="h-9 w-9 text-muted-foreground/35" /><p className="mt-3 font-semibold">No proposals found</p><p className="mt-1 text-sm text-muted-foreground">Create the first draft for {selectedClientId ? "the selected client" : "a prospect"}.</p></CardContent></Card> : <Card className="workspace-panel overflow-hidden"><CardContent className="p-0"><div className="divide-y md:hidden">{proposals.map((proposal) => <div key={proposal.id} className="p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{proposal.title}</p><p className="mt-1 text-xs text-muted-foreground">{proposal.prospect_name || "Linked client"}</p></div><Badge variant={(statusConfig[proposal.status] ?? statusConfig.draft).variant}>{proposal.status}</Badge></div><div className="mt-3 flex justify-between text-sm"><span>{serviceLines(proposal.services_json).length} services</span><span className="font-mono font-semibold">£{(proposal.total_fee_pence / 100).toFixed(2)}</span></div></div>)}</div><div className="hidden md:block"><Table><TableHeader><TableRow><TableHead>Proposal</TableHead><TableHead>Prospect</TableHead><TableHead>Services</TableHead><TableHead className="text-right">Fee</TableHead><TableHead>Frequency</TableHead><TableHead>Valid until</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>{proposals.map((proposal) => <TableRow key={proposal.id}><TableCell className="font-medium">{proposal.title}</TableCell><TableCell><p>{proposal.prospect_name || "Linked client"}</p><p className="text-xs text-muted-foreground">{proposal.prospect_email}</p></TableCell><TableCell>{serviceLines(proposal.services_json).length}</TableCell><TableCell className="text-right font-mono">£{(proposal.total_fee_pence / 100).toFixed(2)}</TableCell><TableCell className="capitalize">{proposal.fee_frequency.replace("_", " ")}</TableCell><TableCell>{proposal.valid_until || "—"}</TableCell><TableCell><Badge variant={(statusConfig[proposal.status] ?? statusConfig.draft).variant}>{proposal.status}</Badge></TableCell></TableRow>)}</TableBody></Table></div></CardContent></Card>}
  </div>;
}
