import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { KPICard } from "@/components/dashboard/KPICard";
import {
  Plus, Building2, FileText, CreditCard, Send, Users, ShieldCheck,
  ChevronRight, ChevronLeft, Check, AlertCircle, Eye, Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const pipelineStages = [
  { key: "draft", label: "Draft", color: "bg-muted-foreground" },
  { key: "in_progress", label: "In Progress", color: "bg-[hsl(var(--info))]" },
  { key: "awaiting_kyc", label: "Awaiting KYC", color: "bg-[hsl(var(--warning))]" },
  { key: "awaiting_payment", label: "Awaiting Payment", color: "bg-[hsl(280,65%,60%)]" },
  { key: "queued", label: "Queued", color: "bg-primary" },
  { key: "submitted", label: "Submitted", color: "bg-primary" },
  { key: "accepted", label: "Accepted", color: "bg-[hsl(var(--success))]" },
  { key: "rejected", label: "Rejected", color: "bg-destructive" },
];

const wizardSteps = [
  { label: "Company Name & SIC", icon: Building2 },
  { label: "Registered Office", icon: FileText },
  { label: "Directors & PSC", icon: Users },
  { label: "Share Structure", icon: CreditCard },
  { label: "KYC / AML", icon: ShieldCheck },
  { label: "Payment", icon: CreditCard },
  { label: "Review & Submit", icon: Send },
];

export default function Incorporations() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const [viewApp, setViewApp] = useState<any>(null);
  const [wizardForm, setWizardForm] = useState({
    proposed_name: "",
    sic_codes: "",
    address_line1: "",
    address_line2: "",
    city: "",
    postcode: "",
    country: "England",
    director_first: "",
    director_last: "",
    director_dob: "",
    director_nationality: "British",
    share_class: "Ordinary",
    share_count: "1",
    nominal_value: "1.00",
    currency: "GBP",
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

  const { data: applications = [], isLoading } = useQuery({
    queryKey: ["incorp-applications", profile?.tenant_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("incorporation_applications")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.tenant_id,
  });

  const createApp = useMutation({
    mutationFn: async () => {
      if (!profile?.tenant_id) throw new Error("No tenant");
      const { error } = await supabase.from("incorporation_applications").insert({
        tenant_id: profile.tenant_id,
        proposed_name: wizardForm.proposed_name.trim(),
        sic_codes: wizardForm.sic_codes.split(",").map(s => s.trim()).filter(Boolean),
        registered_office_json: {
          address_line1: wizardForm.address_line1,
          address_line2: wizardForm.address_line2,
          city: wizardForm.city,
          postcode: wizardForm.postcode,
          country: wizardForm.country,
        },
        data_json: {
          directors: [{
            first_name: wizardForm.director_first,
            last_name: wizardForm.director_last,
            date_of_birth: wizardForm.director_dob,
            nationality: wizardForm.director_nationality,
          }],
          shares: {
            class_name: wizardForm.share_class,
            total_shares: parseInt(wizardForm.share_count) || 1,
            nominal_value_pence: Math.round(parseFloat(wizardForm.nominal_value) * 100) || 100,
            currency: wizardForm.currency,
          },
        },
        status: "draft",
        created_by_user_id: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incorp-applications"] });
      setShowWizard(false);
      setWizardStep(0);
      toast.success("Incorporation application created");
    },
    onError: (e) => toast.error(e.message),
  });

  // Pipeline counts
  const countByStatus = pipelineStages.reduce((acc, s) => {
    acc[s.key] = applications.filter((a: any) => a.status === s.key).length;
    return acc;
  }, {} as Record<string, number>);

  const totalActive = applications.filter((a: any) => !["accepted", "rejected", "cancelled"].includes(a.status)).length;
  const totalAccepted = countByStatus.accepted || 0;
  const totalRejected = countByStatus.rejected || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Incorporations</h1>
          <p className="text-sm text-muted-foreground">LTD company formation — Companies House filing pipeline</p>
        </div>
        <Button className="gap-1.5" onClick={() => { setShowWizard(true); setWizardStep(0); }}>
          <Plus className="w-3.5 h-3.5" /> New Incorporation
        </Button>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Active Applications" value={totalActive} change="In pipeline" changeType="neutral" icon={FileText} iconColor="bg-[hsl(var(--info))]/10" />
        <KPICard title="Awaiting KYC" value={countByStatus.awaiting_kyc || 0} change={countByStatus.awaiting_kyc ? "Action needed" : "None pending"} changeType={countByStatus.awaiting_kyc ? "negative" : "positive"} icon={ShieldCheck} iconColor="bg-warning/10" />
        <KPICard title="Accepted" value={totalAccepted} change="Incorporations" changeType="positive" icon={Check} iconColor="bg-[hsl(var(--success))]/10" />
        <KPICard title="Rejected" value={totalRejected} change={totalRejected ? "Review required" : "None"} changeType={totalRejected ? "negative" : "positive"} icon={AlertCircle} iconColor="bg-destructive/10" />
      </div>

      {/* Pipeline */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Pipeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-1 overflow-x-auto pb-2">
            {pipelineStages.map((stage) => (
              <div key={stage.key} className="flex-1 min-w-[100px]">
                <div className="flex items-center gap-1.5 mb-1">
                  <div className={cn("w-2 h-2 rounded-full", stage.color)} />
                  <span className="text-xs font-medium truncate">{stage.label}</span>
                </div>
                <div className="text-2xl font-bold text-center py-3 rounded-lg bg-muted/50">
                  {countByStatus[stage.key] || 0}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Applications Table */}
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <p className="text-center text-muted-foreground py-8">Loading...</p>
          ) : applications.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Building2 className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No incorporation applications yet.</p>
              <p className="text-xs mt-1">Start a new company formation to see it here.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company Name</TableHead>
                  <TableHead>Entity Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>CH Number</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {applications.map((app: any) => {
                  const stage = pipelineStages.find(s => s.key === app.status);
                  return (
                    <TableRow key={app.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell className="font-medium">{app.proposed_name || "Unnamed"}</TableCell>
                      <TableCell><Badge variant="secondary" className="text-xs uppercase">{app.entity_type}</Badge></TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <div className={cn("w-2 h-2 rounded-full", stage?.color || "bg-muted")} />
                          <span className="text-sm capitalize">{app.status.replace(/_/g, " ")}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={app.payment_status === "paid" ? "default" : "outline"} className="text-xs capitalize">{app.payment_status}</Badge>
                      </TableCell>
                      <TableCell className="text-sm font-mono text-muted-foreground">{app.ch_company_number || "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(app.updated_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewApp(app)}>
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Incorporation Wizard */}
      <Dialog open={showWizard} onOpenChange={setShowWizard}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>New Incorporation — Step {wizardStep + 1} of {wizardSteps.length}</DialogTitle>
          </DialogHeader>

          {/* Step indicators */}
          <div className="flex gap-1 mb-4">
            {wizardSteps.map((step, i) => (
              <div key={i} className="flex-1">
                <div
                  className={cn(
                    "h-1.5 rounded-full transition-colors",
                    i <= wizardStep ? "bg-primary" : "bg-muted"
                  )}
                />
                <p className={cn("text-[10px] mt-1 truncate", i === wizardStep ? "text-primary font-medium" : "text-muted-foreground")}>{step.label}</p>
              </div>
            ))}
          </div>

          <div className="min-h-[240px]">
            {wizardStep === 0 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Proposed Company Name *</Label>
                  <Input value={wizardForm.proposed_name} onChange={(e) => setWizardForm({ ...wizardForm, proposed_name: e.target.value })} placeholder="ACME Solutions Ltd" />
                  <p className="text-xs text-muted-foreground">Include "Ltd" or "Limited" at the end.</p>
                </div>
                <div className="space-y-2">
                  <Label>SIC Codes (comma-separated)</Label>
                  <Input value={wizardForm.sic_codes} onChange={(e) => setWizardForm({ ...wizardForm, sic_codes: e.target.value })} placeholder="62020, 69201" />
                </div>
              </div>
            )}

            {wizardStep === 1 && (
              <div className="space-y-4">
                <p className="text-sm font-medium">Registered Office Address</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 col-span-2">
                    <Label>Address Line 1 *</Label>
                    <Input value={wizardForm.address_line1} onChange={(e) => setWizardForm({ ...wizardForm, address_line1: e.target.value })} placeholder="10 Downing Street" />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>Address Line 2</Label>
                    <Input value={wizardForm.address_line2} onChange={(e) => setWizardForm({ ...wizardForm, address_line2: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>City *</Label>
                    <Input value={wizardForm.city} onChange={(e) => setWizardForm({ ...wizardForm, city: e.target.value })} placeholder="London" />
                  </div>
                  <div className="space-y-2">
                    <Label>Postcode *</Label>
                    <Input value={wizardForm.postcode} onChange={(e) => setWizardForm({ ...wizardForm, postcode: e.target.value })} placeholder="SW1A 2AA" />
                  </div>
                </div>
              </div>
            )}

            {wizardStep === 2 && (
              <div className="space-y-4">
                <p className="text-sm font-medium">Director Details</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>First Name *</Label>
                    <Input value={wizardForm.director_first} onChange={(e) => setWizardForm({ ...wizardForm, director_first: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Last Name *</Label>
                    <Input value={wizardForm.director_last} onChange={(e) => setWizardForm({ ...wizardForm, director_last: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Date of Birth *</Label>
                    <Input type="date" value={wizardForm.director_dob} onChange={(e) => setWizardForm({ ...wizardForm, director_dob: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Nationality</Label>
                    <Input value={wizardForm.director_nationality} onChange={(e) => setWizardForm({ ...wizardForm, director_nationality: e.target.value })} />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Additional directors and PSCs can be added after creation.</p>
              </div>
            )}

            {wizardStep === 3 && (
              <div className="space-y-4">
                <p className="text-sm font-medium">Share Structure</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Share Class</Label>
                    <Input value={wizardForm.share_class} onChange={(e) => setWizardForm({ ...wizardForm, share_class: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Number of Shares</Label>
                    <Input type="number" min="1" value={wizardForm.share_count} onChange={(e) => setWizardForm({ ...wizardForm, share_count: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Nominal Value (£)</Label>
                    <Input type="number" step="0.01" value={wizardForm.nominal_value} onChange={(e) => setWizardForm({ ...wizardForm, nominal_value: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Currency</Label>
                    <Select value={wizardForm.currency} onValueChange={(v) => setWizardForm({ ...wizardForm, currency: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="GBP">GBP</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {wizardStep === 4 && (
              <div className="space-y-4">
                <p className="text-sm font-medium">KYC / AML Checks</p>
                <div className="rounded-lg border p-4 text-center text-muted-foreground">
                  <ShieldCheck className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Identity verification and AML checks will be initiated after the application is saved.</p>
                  <p className="text-xs mt-1">Upload ID documents and proof of address in the application detail view.</p>
                </div>
              </div>
            )}

            {wizardStep === 5 && (
              <div className="space-y-4">
                <p className="text-sm font-medium">Payment</p>
                <div className="rounded-lg border p-4 text-center text-muted-foreground">
                  <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Payment will be collected before Companies House submission.</p>
                  <p className="text-xs mt-1">Standard incorporation fee: £12 (same-day: £30)</p>
                </div>
              </div>
            )}

            {wizardStep === 6 && (
              <div className="space-y-4">
                <p className="text-sm font-medium">Review Application</p>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-muted-foreground">Company Name</span>
                    <span className="font-medium">{wizardForm.proposed_name || "—"}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-muted-foreground">SIC Codes</span>
                    <span className="font-medium">{wizardForm.sic_codes || "—"}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-muted-foreground">Registered Office</span>
                    <span className="font-medium text-right">{[wizardForm.address_line1, wizardForm.city, wizardForm.postcode].filter(Boolean).join(", ") || "—"}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-muted-foreground">Director</span>
                    <span className="font-medium">{[wizardForm.director_first, wizardForm.director_last].filter(Boolean).join(" ") || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Shares</span>
                    <span className="font-medium">{wizardForm.share_count} × {wizardForm.share_class} @ £{wizardForm.nominal_value}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex justify-between">
            <Button variant="outline" onClick={() => wizardStep > 0 ? setWizardStep(wizardStep - 1) : setShowWizard(false)} className="gap-1.5">
              <ChevronLeft className="w-3.5 h-3.5" /> {wizardStep === 0 ? "Cancel" : "Back"}
            </Button>
            {wizardStep < wizardSteps.length - 1 ? (
              <Button onClick={() => setWizardStep(wizardStep + 1)} className="gap-1.5">
                Next <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            ) : (
              <Button onClick={() => createApp.mutate()} disabled={!wizardForm.proposed_name.trim() || createApp.isPending} className="gap-1.5">
                <Send className="w-3.5 h-3.5" /> {createApp.isPending ? "Saving..." : "Create Application"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Application Dialog */}
      <Dialog open={!!viewApp} onOpenChange={(open) => { if (!open) setViewApp(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Application Details</DialogTitle></DialogHeader>
          {viewApp && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">Company:</span> <span className="font-medium ml-1">{viewApp.proposed_name || "—"}</span></div>
                <div><span className="text-muted-foreground">Entity:</span> <Badge variant="secondary" className="ml-1 text-xs uppercase">{viewApp.entity_type}</Badge></div>
                <div><span className="text-muted-foreground">Status:</span> <span className="font-medium ml-1 capitalize">{viewApp.status.replace(/_/g, " ")}</span></div>
                <div><span className="text-muted-foreground">Payment:</span> <Badge variant={viewApp.payment_status === "paid" ? "default" : "outline"} className="ml-1 text-xs capitalize">{viewApp.payment_status}</Badge></div>
                {viewApp.ch_company_number && <div className="col-span-2"><span className="text-muted-foreground">CH Number:</span> <span className="font-mono font-medium ml-1">{viewApp.ch_company_number}</span></div>}
              </div>
              <div className="text-xs text-muted-foreground border-t pt-2">
                Created: {new Date(viewApp.created_at).toLocaleDateString("en-GB")} · Updated: {new Date(viewApp.updated_at).toLocaleDateString("en-GB")}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
