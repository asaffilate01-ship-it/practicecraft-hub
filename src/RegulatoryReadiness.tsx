import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight, CheckCircle2, ExternalLink, FileCheck2, FlaskConical, Hammer, KeyRound, LockKeyhole, Plus, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { WorkspacePageHeader } from "@/components/layout/WorkspacePageHeader";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { controlLabels, readinessCounts, readinessLabels, regulatoryIntegrations, regulatoryReadiness, type ControlStatus, type ReadinessModule, type ReadinessStatus } from "@/lib/regulatoryReadiness";

type CapabilityControl = Database["public"]["Tables"]["regulatory_capability_controls"]["Row"];
type ReadinessEvidence = Database["public"]["Tables"]["regulatory_readiness_evidence"]["Row"];
type AuthorityFilter = "all" | "HMRC" | "Companies House" | "Charity Commission" | "Internal";

const productStyles: Record<ReadinessStatus, string> = {
  beta: "bg-success/10 text-success border-success/20", sandbox: "bg-info/10 text-info border-info/20",
  build: "bg-muted text-muted-foreground border-border", blocked: "bg-destructive/10 text-destructive border-destructive/20",
};
const productIcons: Record<ReadinessStatus, typeof ShieldCheck> = { beta: CheckCircle2, sandbox: FlaskConical, build: Hammer, blocked: AlertTriangle };
const controlStyles: Record<ControlStatus, string> = {
  not_started: "bg-muted text-muted-foreground", building: "bg-info/10 text-info", sandbox_testing: "bg-warning/10 text-warning",
  acceptance_submitted: "bg-primary/10 text-primary", recognised: "bg-success/10 text-success", blocked: "bg-destructive/10 text-destructive",
};
const evidenceKinds = [
  ["sandbox_test", "Sandbox test"], ["fraud_header_test", "Fraud-header test"], ["schema_validation", "Schema validation"],
  ["security_review", "Security review"], ["accessibility_review", "Accessibility review"], ["provider_correspondence", "Provider correspondence"],
  ["recognition_confirmation", "Recognition confirmation"], ["incident_runbook", "Incident runbook"], ["other", "Other"],
] as const;
const emptyControlForm = () => ({ control_status: "not_started" as ControlStatus, owner_name: "", application_reference: "", target_date: "", next_review_date: "", notes: "" });
const emptyEvidenceForm = () => ({ capability_key: "", environment: "sandbox", evidence_kind: "sandbox_test", result: "pending", title: "", reference: "", evidence_url: "", tested_at: "", valid_until: "", notes: "" });

export default function RegulatoryReadiness() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { tenantId, can } = usePermissions();
  const canEdit = can("integrations", "edit");
  const [authority, setAuthority] = useState<AuthorityFilter>("all");
  const [editingModule, setEditingModule] = useState<ReadinessModule | null>(null);
  const [controlForm, setControlForm] = useState(emptyControlForm);
  const [showEvidence, setShowEvidence] = useState(false);
  const [evidenceForm, setEvidenceForm] = useState(emptyEvidenceForm);

  const { data: controls = [], isLoading: controlsLoading } = useQuery({
    queryKey: ["regulatory-controls", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.from("regulatory_capability_controls").select("*").order("capability_key");
      if (error) throw error;
      return data as CapabilityControl[];
    },
    enabled: !!tenantId,
  });
  const { data: evidence = [], isLoading: evidenceLoading } = useQuery({
    queryKey: ["regulatory-readiness-evidence", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.from("regulatory_readiness_evidence").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as ReadinessEvidence[];
    },
    enabled: !!tenantId,
  });

  const controlByKey = useMemo(() => new Map(controls.map((control) => [control.capability_key, control])), [controls]);
  const filteredModules = regulatoryReadiness.filter((item) => authority === "all" || item.authority === authority);
  const productCounts = readinessCounts();
  const productionEnabled = controls.filter((control) => control.production_enabled).length;
  const recordedRecognitions = controls.filter((control) => control.control_status === "recognised").length;
  const passedEvidence = evidence.filter((item) => item.result === "passed").length;
  const editingHasRecognitionEvidence = !!editingModule && evidence.some((item) => item.capability_key === editingModule.key && item.environment === "production" && item.evidence_kind === "recognition_confirmation" && item.result === "passed");

  const openControl = (module: ReadinessModule) => {
    const saved = controlByKey.get(module.key);
    setEditingModule(module);
    setControlForm(saved ? {
      control_status: saved.control_status as ControlStatus,
      owner_name: saved.owner_name || "", application_reference: saved.application_reference || "",
      target_date: saved.target_date || "", next_review_date: saved.next_review_date || "", notes: saved.notes || "",
    } : emptyControlForm());
  };

  const saveControl = useMutation({
    mutationFn: async () => {
      if (!tenantId || !editingModule) throw new Error("No regulatory capability selected");
      const { error } = await supabase.from("regulatory_capability_controls").upsert({
        tenant_id: tenantId, capability_key: editingModule.key, control_status: controlForm.control_status,
        owner_name: controlForm.owner_name.trim() || null, application_reference: controlForm.application_reference.trim() || null,
        target_date: controlForm.target_date || null, next_review_date: controlForm.next_review_date || null,
        notes: controlForm.notes.trim() || null, created_by_user_id: user?.id,
      }, { onConflict: "tenant_id,capability_key" });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["regulatory-controls"] }); setEditingModule(null); toast.success("Readiness control saved"); },
    onError: (error: Error) => toast.error(error.message),
  });

  const addEvidence = useMutation({
    mutationFn: async () => {
      if (!tenantId || !evidenceForm.capability_key || !evidenceForm.title.trim()) throw new Error("Choose a capability and add an evidence title");
      const { error } = await supabase.from("regulatory_readiness_evidence").insert({
        tenant_id: tenantId, capability_key: evidenceForm.capability_key, environment: evidenceForm.environment,
        evidence_kind: evidenceForm.evidence_kind, result: evidenceForm.result, title: evidenceForm.title.trim(),
        reference: evidenceForm.reference.trim() || null, evidence_url: evidenceForm.evidence_url.trim() || null,
        tested_at: evidenceForm.tested_at ? new Date(evidenceForm.tested_at).toISOString() : null,
        valid_until: evidenceForm.valid_until || null, notes: evidenceForm.notes.trim() || null, recorded_by_user_id: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["regulatory-readiness-evidence"] }); setEvidenceForm(emptyEvidenceForm()); setShowEvidence(false); toast.success("Regulatory evidence recorded"); },
    onError: (error: Error) => toast.error(error.message),
  });

  return <div className="space-y-6">
    <WorkspacePageHeader eyebrow="Go-live control" title="Regulatory Control Centre" icon={ShieldCheck}
      description="A single tenant-scoped view of product readiness, required regulator interfaces, test evidence and production kill switches."
      actions={<><Badge variant="outline">Product truth + firm evidence</Badge>{canEdit && <Button onClick={() => setShowEvidence(true)}><Plus className="mr-1.5 h-4 w-4" /> Add evidence</Button>}</>} />

    <Card className="border-warning/30 bg-warning/5"><CardContent className="flex gap-3 pt-6 text-sm leading-6"><LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-warning" /><div><strong>Recognition is not the same as a live switch.</strong> Staff can record tests and provider references, but only a server-side acceptance workflow can enable production filing. Never put passwords, API secrets, company authentication codes or OAuth tokens in these records.</div></CardContent></Card>

    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Metric label="Product modules" value={regulatoryReadiness.length} detail={`${productCounts.sandbox} at sandbox`} icon={ShieldCheck} />
      <Metric label="Recognition recorded" value={recordedRecognitions} detail="Requires supporting evidence" icon={FileCheck2} />
      <Metric label="Passed evidence" value={passedEvidence} detail={`${evidence.length} total records`} icon={CheckCircle2} />
      <Metric label="Production gates enabled" value={productionEnabled} detail="Server controlled" icon={LockKeyhole} tone={productionEnabled ? "success" : "warning"} />
    </div>

    <Tabs defaultValue="programme" className="space-y-4">
      <div className="overflow-x-auto"><TabsList className="w-max"><TabsTrigger value="programme">Programme</TabsTrigger><TabsTrigger value="apis">APIs & credentials</TabsTrigger><TabsTrigger value="evidence">Evidence register</TabsTrigger></TabsList></div>

      <TabsContent value="programme" className="space-y-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-lg font-semibold">Delivery and acceptance gates</h2><p className="text-sm text-muted-foreground">Product status is code truth; programme status is your firm's persisted implementation evidence.</p></div><Select value={authority} onValueChange={(value) => setAuthority(value as AuthorityFilter)}><SelectTrigger className="w-full sm:w-52"><SelectValue /></SelectTrigger><SelectContent>{["all", "Internal", "HMRC", "Companies House", "Charity Commission"].map((value) => <SelectItem key={value} value={value}>{value === "all" ? "All authorities" : value}</SelectItem>)}</SelectContent></Select></div>
        {controlsLoading ? <LoadingCard label="Loading regulatory controls…" /> : [1, 2, 3, 4].map((phase) => {
          const modules = filteredModules.filter((item) => item.phase === phase);
          if (!modules.length) return null;
          return <section key={phase} className="space-y-3"><div><h3 className="font-semibold">Phase {phase}</h3><p className="text-xs text-muted-foreground">{phase === 1 ? "Secure beta and complete VAT sandbox" : phase === 2 ? "Accounts production and Companies House testing" : phase === 3 ? "PAYE, Corporation Tax, charity and LLP packs" : "Self Assessment, MTD Income Tax, CIS and formations"}</p></div><div className="grid gap-3 xl:grid-cols-2">{modules.map((item) => {
            const control = controlByKey.get(item.key); const Icon = productIcons[item.status];
            return <Card key={item.key} className="workspace-panel"><CardHeader className="pb-3"><div className="flex items-start justify-between gap-3"><div className="flex min-w-0 gap-3"><div className={`mt-0.5 rounded-lg border p-2 ${productStyles[item.status]}`}><Icon className="h-4 w-4" /></div><div><CardTitle className="text-base">{item.name}</CardTitle><CardDescription className="mt-1">{item.authority}</CardDescription></div></div><Badge variant="outline" className={productStyles[item.status]}>{readinessLabels[item.status]}</Badge></div></CardHeader><CardContent className="space-y-4 text-sm">
              <div className="flex flex-wrap items-center gap-2"><Badge className={controlStyles[(control?.control_status || "not_started") as ControlStatus]}>{controlLabels[(control?.control_status || "not_started") as ControlStatus]}</Badge><Badge variant="outline" className={control?.production_enabled ? "border-success/30 text-success" : "border-destructive/20 text-destructive"}>{control?.production_enabled ? "Production enabled" : "Production locked"}</Badge>{control?.owner_name && <span className="text-xs text-muted-foreground">Owner: {control.owner_name}</span>}</div>
              <div><p className="workspace-eyebrow">Current</p><p className="mt-1 leading-5">{item.current}</p></div><div><p className="workspace-eyebrow">Next acceptance gate</p><p className="mt-1 leading-5">{item.next}</p></div>
              {control?.next_review_date && <p className="text-xs text-muted-foreground">Next review: {control.next_review_date}{control.application_reference ? ` · Ref ${control.application_reference}` : ""}</p>}
              <div className="flex flex-wrap gap-2">{item.route && <Button asChild variant="outline" size="sm"><Link to={item.route}>Open module <ArrowRight className="ml-1.5 h-3.5 w-3.5" /></Link></Button>}{canEdit && <Button variant="secondary" size="sm" onClick={() => openControl(item)}>Manage gate</Button>}</div>
            </CardContent></Card>;
          })}</div></section>;
        })}
      </TabsContent>

      <TabsContent value="apis" className="space-y-4">
        <div><h2 className="text-lg font-semibold">Required regulator interfaces</h2><p className="text-sm text-muted-foreground">REST APIs, XML gateways and portal-only handoffs are deliberately separated.</p></div>
        <div className="grid gap-3 xl:grid-cols-2">{regulatoryIntegrations.map((integration) => <Card key={integration.key} className="workspace-panel"><CardHeader className="pb-3"><div className="flex items-start justify-between gap-3"><div><CardTitle className="text-base">{integration.name}</CardTitle><CardDescription className="mt-1">{integration.authority}</CardDescription></div><Badge variant="outline">{integration.protocol}</Badge></div></CardHeader><CardContent className="space-y-4 text-sm"><div><p className="workspace-eyebrow">Coverage</p><p className="mt-1 leading-5">{integration.covers}</p></div><div><p className="workspace-eyebrow">Authentication</p><p className="mt-1 leading-5">{integration.authentication}</p></div><div><p className="workspace-eyebrow">Credentials / registration</p><ul className="mt-2 space-y-1.5">{integration.credentials.map((credential) => <li key={credential} className="flex gap-2"><KeyRound className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" /><span>{credential}</span></li>)}</ul></div><div className="rounded-lg border border-warning/25 bg-warning/5 p-3"><p className="text-xs font-semibold uppercase tracking-wide text-warning">Production gate</p><p className="mt-1 leading-5">{integration.productionGate}</p></div><Button asChild variant="outline" size="sm"><a href={integration.officialUrl} target="_blank" rel="noreferrer">Official specification <ExternalLink className="ml-1.5 h-3.5 w-3.5" /></a></Button></CardContent></Card>)}</div>
      </TabsContent>

      <TabsContent value="evidence" className="space-y-4">
        <div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">Test and recognition evidence</h2><p className="text-sm text-muted-foreground">References and links only. Submission receipts remain in the immutable submissions ledger.</p></div>{canEdit && <Button variant="outline" onClick={() => setShowEvidence(true)}><Plus className="mr-1.5 h-4 w-4" /> Add</Button>}</div>
        {evidenceLoading ? <LoadingCard label="Loading evidence…" /> : !evidence.length ? <Card className="workspace-panel"><CardContent className="flex min-h-52 flex-col items-center justify-center text-center"><FileCheck2 className="h-9 w-9 text-muted-foreground/35" /><p className="mt-3 font-semibold">No evidence recorded</p><p className="mt-1 max-w-md text-sm text-muted-foreground">Add sandbox results, schema validation, fraud-header checks, accessibility/security reviews and provider correspondence.</p></CardContent></Card> : <div className="grid gap-3 lg:grid-cols-2">{evidence.map((item) => {
          const module = regulatoryReadiness.find((entry) => entry.key === item.capability_key);
          return <Card key={item.id} className="workspace-panel"><CardContent className="space-y-3 p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{item.title}</p><p className="mt-1 text-xs text-muted-foreground">{module?.name || item.capability_key}</p></div><Badge variant={item.result === "passed" ? "default" : item.result === "failed" ? "destructive" : "outline"}>{item.result}</Badge></div><div className="flex flex-wrap gap-2 text-xs"><Badge variant="secondary">{item.environment}</Badge><Badge variant="outline">{item.evidence_kind.replaceAll("_", " ")}</Badge>{item.reference && <span className="rounded bg-muted px-2 py-1 font-mono">{item.reference}</span>}</div>{item.notes && <p className="text-sm leading-5 text-muted-foreground">{item.notes}</p>}<div className="flex items-center justify-between gap-3 text-xs text-muted-foreground"><span>{item.tested_at ? `Tested ${new Date(item.tested_at).toLocaleDateString("en-GB")}` : `Recorded ${new Date(item.created_at).toLocaleDateString("en-GB")}`}</span>{item.evidence_url && <a className="inline-flex items-center text-primary hover:underline" href={item.evidence_url} target="_blank" rel="noreferrer">Open evidence <ExternalLink className="ml-1 h-3 w-3" /></a>}</div></CardContent></Card>;
        })}</div>}
      </TabsContent>
    </Tabs>

    <Dialog open={!!editingModule} onOpenChange={(open) => !open && setEditingModule(null)}><DialogContent className="max-w-xl"><DialogHeader><DialogTitle>Manage {editingModule?.name}</DialogTitle></DialogHeader><div className="space-y-4"><div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm"><LockKeyhole className="mr-2 inline h-4 w-4 text-destructive" />This form cannot enable production filing.</div><div className="grid gap-3 sm:grid-cols-2"><div><Label>Programme status</Label><Select value={controlForm.control_status} onValueChange={(value) => setControlForm((form) => ({ ...form, control_status: value as ControlStatus }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(controlLabels).map(([value, label]) => <SelectItem key={value} value={value} disabled={value === "recognised" && !editingHasRecognitionEvidence}>{label}</SelectItem>)}</SelectContent></Select>{!editingHasRecognitionEvidence && <p className="mt-1 text-xs text-muted-foreground">Recognition needs passed production confirmation evidence first.</p>}</div><div><Label>Owner</Label><Input value={controlForm.owner_name} onChange={(event) => setControlForm((form) => ({ ...form, owner_name: event.target.value }))} placeholder="Named accountable owner" /></div></div><div><Label>Provider application/reference</Label><Input value={controlForm.application_reference} onChange={(event) => setControlForm((form) => ({ ...form, application_reference: event.target.value }))} placeholder="Non-secret reference only" /></div><div className="grid gap-3 sm:grid-cols-2"><div><Label>Target date</Label><Input type="date" value={controlForm.target_date} onChange={(event) => setControlForm((form) => ({ ...form, target_date: event.target.value }))} /></div><div><Label>Next review</Label><Input type="date" value={controlForm.next_review_date} onChange={(event) => setControlForm((form) => ({ ...form, next_review_date: event.target.value }))} /></div></div><div><Label>Notes / blocker</Label><Textarea rows={4} value={controlForm.notes} onChange={(event) => setControlForm((form) => ({ ...form, notes: event.target.value }))} /></div><div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setEditingModule(null)}>Cancel</Button><Button onClick={() => saveControl.mutate()} disabled={saveControl.isPending}>{saveControl.isPending ? "Saving…" : "Save control"}</Button></div></div></DialogContent></Dialog>

    <Dialog open={showEvidence} onOpenChange={setShowEvidence}><DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto"><DialogHeader><DialogTitle>Add regulatory evidence</DialogTitle></DialogHeader><div className="space-y-4"><div className="rounded-lg border border-warning/25 bg-warning/5 p-3 text-sm"><strong>Do not paste secrets.</strong> Use non-sensitive application/test references and controlled evidence links.</div><div><Label>Capability</Label><Select value={evidenceForm.capability_key} onValueChange={(value) => setEvidenceForm((form) => ({ ...form, capability_key: value }))}><SelectTrigger><SelectValue placeholder="Choose module" /></SelectTrigger><SelectContent>{regulatoryReadiness.map((item) => <SelectItem key={item.key} value={item.key}>{item.name}</SelectItem>)}</SelectContent></Select></div><div><Label>Evidence title</Label><Input value={evidenceForm.title} onChange={(event) => setEvidenceForm((form) => ({ ...form, title: event.target.value }))} placeholder="VAT sandbox scenario 1 passed" /></div><div className="grid gap-3 sm:grid-cols-3"><div><Label>Environment</Label><Select value={evidenceForm.environment} onValueChange={(value) => setEvidenceForm((form) => ({ ...form, environment: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="sandbox">Sandbox</SelectItem><SelectItem value="production">Production acceptance</SelectItem></SelectContent></Select></div><div><Label>Evidence type</Label><Select value={evidenceForm.evidence_kind} onValueChange={(value) => setEvidenceForm((form) => ({ ...form, evidence_kind: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{evidenceKinds.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div><div><Label>Result</Label><Select value={evidenceForm.result} onValueChange={(value) => setEvidenceForm((form) => ({ ...form, result: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["pending", "passed", "failed", "expired"].map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></div></div><div className="grid gap-3 sm:grid-cols-2"><div><Label>Provider/test reference</Label><Input value={evidenceForm.reference} onChange={(event) => setEvidenceForm((form) => ({ ...form, reference: event.target.value }))} /></div><div><Label>Evidence URL</Label><Input type="url" value={evidenceForm.evidence_url} onChange={(event) => setEvidenceForm((form) => ({ ...form, evidence_url: event.target.value }))} placeholder="https://controlled-location/..." /></div></div><div className="grid gap-3 sm:grid-cols-2"><div><Label>Tested at</Label><Input type="datetime-local" value={evidenceForm.tested_at} onChange={(event) => setEvidenceForm((form) => ({ ...form, tested_at: event.target.value }))} /></div><div><Label>Valid until</Label><Input type="date" value={evidenceForm.valid_until} onChange={(event) => setEvidenceForm((form) => ({ ...form, valid_until: event.target.value }))} /></div></div><div><Label>Notes</Label><Textarea rows={3} value={evidenceForm.notes} onChange={(event) => setEvidenceForm((form) => ({ ...form, notes: event.target.value }))} /></div><div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setShowEvidence(false)}>Cancel</Button><Button onClick={() => addEvidence.mutate()} disabled={addEvidence.isPending}>{addEvidence.isPending ? "Saving…" : "Record evidence"}</Button></div></div></DialogContent></Dialog>
  </div>;
}

function Metric({ label, value, detail, icon: Icon, tone }: { label: string; value: number; detail: string; icon: typeof ShieldCheck; tone?: "success" | "warning" }) {
  return <Card className="workspace-panel"><CardContent className="flex items-center justify-between p-4"><div><p className="workspace-eyebrow">{label}</p><p className="mt-2 text-2xl font-semibold">{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></div><div className={`rounded-xl p-2.5 ${tone === "success" ? "bg-success/10 text-success" : tone === "warning" ? "bg-warning/10 text-warning" : "bg-primary/10 text-primary"}`}><Icon className="h-5 w-5" /></div></CardContent></Card>;
}

function LoadingCard({ label }: { label: string }) {
  return <Card className="workspace-panel"><CardContent className="py-16 text-center text-sm text-muted-foreground">{label}</CardContent></Card>;
}
