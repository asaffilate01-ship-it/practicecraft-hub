import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Send, FileText, CheckCircle, XCircle, Clock, Trash2 } from "lucide-react";
import { toast } from "sonner";

type Proposal = {
  id: string;
  title: string;
  prospect_name: string;
  prospect_email: string;
  status: "draft" | "sent" | "accepted" | "declined" | "expired";
  services: { name: string; fee_pence: number }[];
  total_fee_pence: number;
  fee_frequency: string;
  valid_until: string;
  created_at: string;
};

const SAMPLE_PROPOSALS: Proposal[] = [
  {
    id: "1", title: "Annual Compliance Package", prospect_name: "Acme Ltd", prospect_email: "info@acme.co.uk",
    status: "sent", services: [
      { name: "Bookkeeping", fee_pence: 30000 }, { name: "VAT (MTD)", fee_pence: 15000 },
      { name: "Accounts Production", fee_pence: 50000 }, { name: "Corporation Tax", fee_pence: 25000 },
    ], total_fee_pence: 120000, fee_frequency: "monthly", valid_until: "2026-04-15", created_at: "2026-03-10",
  },
  {
    id: "2", title: "Payroll Service", prospect_name: "Beta Services Ltd", prospect_email: "hr@beta.co.uk",
    status: "accepted", services: [
      { name: "Payroll (RTI)", fee_pence: 20000 }, { name: "Pensions Auto-Enrolment", fee_pence: 5000 },
    ], total_fee_pence: 25000, fee_frequency: "monthly", valid_until: "2026-03-30", created_at: "2026-03-01",
  },
  {
    id: "3", title: "Full Practice Package", prospect_name: "Gamma Holdings", prospect_email: "accounts@gamma.co.uk",
    status: "draft", services: [
      { name: "Bookkeeping", fee_pence: 40000 }, { name: "VAT (MTD)", fee_pence: 15000 },
      { name: "Payroll (RTI)", fee_pence: 25000 }, { name: "Accounts Production", fee_pence: 60000 },
      { name: "Corporation Tax", fee_pence: 30000 }, { name: "Company Secretarial", fee_pence: 10000 },
    ], total_fee_pence: 180000, fee_frequency: "monthly", valid_until: "2026-04-30", created_at: "2026-03-14",
  },
];

const AVAILABLE_SERVICES = [
  "Bookkeeping", "VAT (MTD)", "Payroll (RTI)", "Accounts Production",
  "Corporation Tax", "Self Assessment", "Company Secretarial", "AML/KYC",
  "Pensions Auto-Enrolment", "CIS", "MTD Income Tax",
];

const statusConfig: Record<string, { icon: typeof Clock; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  draft: { icon: FileText, variant: "outline" },
  sent: { icon: Send, variant: "secondary" },
  accepted: { icon: CheckCircle, variant: "default" },
  declined: { icon: XCircle, variant: "destructive" },
  expired: { icon: Clock, variant: "outline" },
};

export default function Proposals() {
  const [proposals] = useState(SAMPLE_PROPOSALS);
  const [showCreate, setShowCreate] = useState(false);
  const [newProposal, setNewProposal] = useState({
    title: "", prospect_name: "", prospect_email: "", fee_frequency: "monthly", valid_until: "", terms: "",
    services: [] as { name: string; fee_pence: number }[],
  });

  const addService = () => {
    setNewProposal(p => ({ ...p, services: [...p.services, { name: "", fee_pence: 0 }] }));
  };

  const updateService = (idx: number, field: string, value: string | number) => {
    setNewProposal(p => ({
      ...p,
      services: p.services.map((s, i) => i === idx ? { ...s, [field]: value } : s),
    }));
  };

  const removeService = (idx: number) => {
    setNewProposal(p => ({ ...p, services: p.services.filter((_, i) => i !== idx) }));
  };

  const totalFee = newProposal.services.reduce((sum, s) => sum + (s.fee_pence || 0), 0);

  const handleCreate = () => {
    toast.success("Proposal created as draft");
    setShowCreate(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Proposals & Engagement Letters</h1>
          <p className="text-muted-foreground">Create fee proposals, send to prospects, convert to engagements</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1" />New Proposal</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Create Proposal</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Title</Label><Input placeholder="Annual Compliance Package" value={newProposal.title} onChange={e => setNewProposal(p => ({ ...p, title: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Prospect Name</Label><Input placeholder="Acme Ltd" value={newProposal.prospect_name} onChange={e => setNewProposal(p => ({ ...p, prospect_name: e.target.value }))} /></div>
                <div><Label>Prospect Email</Label><Input placeholder="info@acme.co.uk" value={newProposal.prospect_email} onChange={e => setNewProposal(p => ({ ...p, prospect_email: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Fee Frequency</Label>
                  <Select value={newProposal.fee_frequency} onValueChange={v => setNewProposal(p => ({ ...p, fee_frequency: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="annually">Annually</SelectItem>
                      <SelectItem value="one_off">One-off</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Valid Until</Label><Input type="date" value={newProposal.valid_until} onChange={e => setNewProposal(p => ({ ...p, valid_until: e.target.value }))} /></div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Services & Fees</Label>
                  <Button variant="outline" size="sm" onClick={addService}><Plus className="h-3 w-3 mr-1" />Add Service</Button>
                </div>
                {newProposal.services.map((svc, idx) => (
                  <div key={idx} className="flex gap-2 items-end">
                    <div className="flex-1">
                      <Select value={svc.name} onValueChange={v => updateService(idx, "name", v)}>
                        <SelectTrigger><SelectValue placeholder="Select service" /></SelectTrigger>
                        <SelectContent>
                          {AVAILABLE_SERVICES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-32">
                      <Input type="number" placeholder="Fee (£)" value={svc.fee_pence ? svc.fee_pence / 100 : ""} onChange={e => updateService(idx, "fee_pence", Math.round(parseFloat(e.target.value || "0") * 100))} />
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeService(idx)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                ))}
                {newProposal.services.length > 0 && (
                  <div className="text-right font-semibold text-foreground">
                    Total: £{(totalFee / 100).toFixed(2)} / {newProposal.fee_frequency}
                  </div>
                )}
              </div>

              <div><Label>Terms & Conditions</Label><Textarea placeholder="Payment terms, scope of work..." value={newProposal.terms} onChange={e => setNewProposal(p => ({ ...p, terms: e.target.value }))} /></div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowCreate(false)} className="flex-1">Cancel</Button>
                <Button onClick={handleCreate} className="flex-1">Create Draft</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {(["draft", "sent", "accepted", "declined"] as const).map(status => {
          const count = proposals.filter(p => p.status === status).length;
          const cfg = statusConfig[status];
          const Icon = cfg.icon;
          return (
            <Card key={status}>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground capitalize">{status}</CardTitle></CardHeader>
              <CardContent className="flex items-center gap-2">
                <Icon className="h-5 w-5 text-muted-foreground" />
                <span className="text-2xl font-bold">{count}</span>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Prospect</TableHead>
                <TableHead>Services</TableHead>
                <TableHead className="text-right">Fee</TableHead>
                <TableHead>Frequency</TableHead>
                <TableHead>Valid Until</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {proposals.map(p => {
                const cfg = statusConfig[p.status];
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.title}</TableCell>
                    <TableCell>
                      <div>{p.prospect_name}</div>
                      <div className="text-xs text-muted-foreground">{p.prospect_email}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {p.services.slice(0, 3).map((s, i) => (
                          <Badge key={i} variant="outline" className="text-xs">{s.name}</Badge>
                        ))}
                        {p.services.length > 3 && <Badge variant="outline" className="text-xs">+{p.services.length - 3}</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono">£{(p.total_fee_pence / 100).toFixed(2)}</TableCell>
                    <TableCell className="capitalize">{p.fee_frequency}</TableCell>
                    <TableCell>{p.valid_until}</TableCell>
                    <TableCell><Badge variant={cfg.variant}>{p.status}</Badge></TableCell>
                    <TableCell>
                      {p.status === "draft" && (
                        <Button variant="ghost" size="sm" onClick={() => toast.success("Proposal sent to " + p.prospect_email)}>
                          <Send className="h-4 w-4" />
                        </Button>
                      )}
                      {p.status === "accepted" && (
                        <Button variant="ghost" size="sm" onClick={() => toast.success("Engagement letter generated")}>
                          <FileText className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
