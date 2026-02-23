import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  FileSignature, ShieldCheck, BookOpen, Briefcase, CheckCircle2,
  ChevronRight, ChevronLeft, Plus, Eye,
} from "lucide-react";
import { toast } from "sonner";

const STEPS = [
  { key: "engagement", label: "Engagement", icon: FileSignature },
  { key: "aml", label: "AML / KYC", icon: ShieldCheck },
  { key: "coa", label: "Chart of Accounts", icon: BookOpen },
  { key: "services", label: "Services", icon: Briefcase },
  { key: "review", label: "Review & Complete", icon: CheckCircle2 },
] as const;

type StepKey = typeof STEPS[number]["key"];

const stepColors: Record<string, string> = {
  engagement: "bg-info text-info-foreground",
  aml: "bg-warning text-warning-foreground",
  coa: "bg-accent text-accent-foreground",
  services: "bg-secondary text-secondary-foreground",
  review: "bg-success text-success-foreground",
};

export default function ClientOnboarding() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [showWizard, setShowWizard] = useState(false);
  const [wizardClientId, setWizardClientId] = useState("");
  const [currentStep, setCurrentStep] = useState<StepKey>("engagement");
  const [stepState, setStepState] = useState({
    engagementSigned: false,
    amlStarted: false,
    coaTemplateId: "",
    selectedServices: [] as string[],
    notes: "",
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

  const { data: onboardings = [], isLoading } = useQuery({
    queryKey: ["client_onboarding", profile?.tenant_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_onboarding")
        .select("*, client:clients(legal_name, entity_type)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.tenant_id,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients-list", profile?.tenant_id],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("id, legal_name, entity_type").order("legal_name");
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.tenant_id,
  });

  const { data: coaTemplates = [] } = useQuery({
    queryKey: ["coa_templates", profile?.tenant_id],
    queryFn: async () => {
      const { data, error } = await supabase.from("coa_templates").select("id, name, entity_type, is_default").order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.tenant_id,
  });

  const { data: services = [] } = useQuery({
    queryKey: ["engagement_services", profile?.tenant_id],
    queryFn: async () => {
      const { data, error } = await supabase.from("engagement_services").select("id, name, description").order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.tenant_id,
  });

  const startOnboarding = useMutation({
    mutationFn: async () => {
      if (!profile?.tenant_id || !wizardClientId) throw new Error("Select a client");
      const { error } = await supabase.from("client_onboarding").insert({
        tenant_id: profile.tenant_id,
        client_id: wizardClientId,
        started_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client_onboarding"] });
      setCurrentStep("engagement");
      setStepState({ engagementSigned: false, amlStarted: false, coaTemplateId: "", selectedServices: [], notes: "" });
      toast.success("Onboarding started");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateOnboarding = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: any }) => {
      const { error } = await supabase.from("client_onboarding").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client_onboarding"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const completeOnboarding = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("client_onboarding").update({
        status: "completed",
        current_step: "review",
        engagement_signed: stepState.engagementSigned,
        coa_template_id: stepState.coaTemplateId || null,
        selected_services: stepState.selectedServices,
        notes: stepState.notes || null,
        completed_at: new Date().toISOString(),
        steps_json: { engagement: true, aml: stepState.amlStarted, coa: !!stepState.coaTemplateId, services: stepState.selectedServices.length > 0, review: true },
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client_onboarding"] });
      setShowWizard(false);
      toast.success("Client onboarding completed!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const activeOnboarding = onboardings.find((o: any) => o.status === "in_progress" && o.client_id === wizardClientId);
  const currentStepIdx = STEPS.findIndex(s => s.key === currentStep);
  const goNext = () => { if (currentStepIdx < STEPS.length - 1) setCurrentStep(STEPS[currentStepIdx + 1].key); };
  const goBack = () => { if (currentStepIdx > 0) setCurrentStep(STEPS[currentStepIdx - 1].key); };

  const toggleService = (name: string) => {
    setStepState(prev => ({
      ...prev,
      selectedServices: prev.selectedServices.includes(name)
        ? prev.selectedServices.filter(s => s !== name)
        : [...prev.selectedServices, name],
    }));
  };

  const clientsWithOnboarding = new Set(onboardings.filter((o: any) => o.status === "in_progress").map((o: any) => o.client_id));
  const availableClients = clients.filter((c: any) => !clientsWithOnboarding.has(c.id));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Client Onboarding</h1>
          <p className="text-sm text-muted-foreground">Guided onboarding wizard — engagement, AML, CoA, services</p>
        </div>
        <Button className="gap-2" onClick={() => setShowWizard(true)}>
          <Plus className="w-4 h-4" /> Start Onboarding
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <p className="text-center text-muted-foreground py-8">Loading…</p>
          ) : onboardings.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <CheckCircle2 className="w-10 h-10 mx-auto text-muted-foreground" />
              <p className="text-muted-foreground">No onboarding workflows yet.</p>
              <p className="text-sm text-muted-foreground">Start onboarding a client to guide them through engagement, AML checks, and setup.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Current Step</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {onboardings.map((o: any) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-medium">{o.client?.legal_name || "—"}</TableCell>
                    <TableCell><Badge variant="secondary" className="text-xs capitalize">{o.client?.entity_type || "—"}</Badge></TableCell>
                    <TableCell>
                      <Badge className={stepColors[o.current_step] || "bg-muted text-muted-foreground"}>
                        {STEPS.find(s => s.key === o.current_step)?.label || o.current_step}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={o.status === "completed" ? "default" : "outline"} className={o.status === "completed" ? "bg-success text-success-foreground" : ""}>
                        {o.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{new Date(o.created_at).toLocaleDateString("en-GB")}</TableCell>
                    <TableCell>
                      {o.status === "in_progress" && (
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setWizardClientId(o.client_id); setShowWizard(true); }} title="Continue">
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showWizard} onOpenChange={setShowWizard}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Client Onboarding Wizard</DialogTitle></DialogHeader>

          {!activeOnboarding && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Select Client *</Label>
                <Select value={wizardClientId} onValueChange={setWizardClientId}>
                  <SelectTrigger><SelectValue placeholder="Choose a client" /></SelectTrigger>
                  <SelectContent>
                    {availableClients.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.legal_name} ({c.entity_type})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => startOnboarding.mutate()} disabled={!wizardClientId || startOnboarding.isPending}>
                {startOnboarding.isPending ? "Starting…" : "Start Onboarding"}
              </Button>
            </div>
          )}

          {activeOnboarding && (
            <>
              <div className="flex items-center gap-1 overflow-x-auto pb-2">
                {STEPS.map((s, i) => (
                  <button
                    key={s.key}
                    onClick={() => setCurrentStep(s.key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                      currentStep === s.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    <s.icon className="w-3.5 h-3.5" />
                    {s.label}
                  </button>
                ))}
              </div>

              <Separator />

              {currentStep === "engagement" && (
                <div className="space-y-4">
                  <CardDescription>Send and track the engagement letter for this client.</CardDescription>
                  <label className="flex items-center gap-3 p-4 rounded-lg border cursor-pointer hover:bg-muted/50">
                    <Checkbox checked={stepState.engagementSigned} onCheckedChange={(v) => setStepState(s => ({ ...s, engagementSigned: !!v }))} />
                    <div>
                      <p className="font-medium text-sm">Engagement letter signed</p>
                      <p className="text-xs text-muted-foreground">Client has signed the engagement letter</p>
                    </div>
                  </label>
                </div>
              )}

              {currentStep === "aml" && (
                <div className="space-y-4">
                  <CardDescription>Initiate AML/KYC checks for this client.</CardDescription>
                  <label className="flex items-center gap-3 p-4 rounded-lg border cursor-pointer hover:bg-muted/50">
                    <Checkbox checked={stepState.amlStarted} onCheckedChange={(v) => setStepState(s => ({ ...s, amlStarted: !!v }))} />
                    <div>
                      <p className="font-medium text-sm">AML/KYC case created</p>
                      <p className="text-xs text-muted-foreground">ID verification and risk assessment initiated</p>
                    </div>
                  </label>
                  <p className="text-xs text-muted-foreground">Go to AML / KYC workbench to complete full checks.</p>
                </div>
              )}

              {currentStep === "coa" && (
                <div className="space-y-4">
                  <CardDescription>Assign a chart of accounts template for the client.</CardDescription>
                  <div className="space-y-2">
                    <Label>CoA Template</Label>
                    <Select value={stepState.coaTemplateId} onValueChange={(v) => setStepState(s => ({ ...s, coaTemplateId: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select template" /></SelectTrigger>
                      <SelectContent>
                        {coaTemplates.map((t: any) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name} ({t.entity_type}) {t.is_default ? "⭐" : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {currentStep === "services" && (
                <div className="space-y-4">
                  <CardDescription>Select engagement services for this client.</CardDescription>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {services.map((svc: any) => (
                      <label key={svc.id} className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50">
                        <Checkbox
                          checked={stepState.selectedServices.includes(svc.name)}
                          onCheckedChange={() => toggleService(svc.name)}
                        />
                        <div>
                          <p className="font-medium text-sm">{svc.name}</p>
                          {svc.description && <p className="text-xs text-muted-foreground">{svc.description}</p>}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {currentStep === "review" && (
                <div className="space-y-4">
                  <CardDescription>Review the onboarding summary and complete.</CardDescription>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between p-3 rounded-lg bg-muted/50">
                      <span className="text-muted-foreground">Engagement signed</span>
                      <Badge variant={stepState.engagementSigned ? "default" : "outline"}>
                        {stepState.engagementSigned ? "Yes" : "No"}
                      </Badge>
                    </div>
                    <div className="flex justify-between p-3 rounded-lg bg-muted/50">
                      <span className="text-muted-foreground">AML/KYC started</span>
                      <Badge variant={stepState.amlStarted ? "default" : "outline"}>
                        {stepState.amlStarted ? "Yes" : "No"}
                      </Badge>
                    </div>
                    <div className="flex justify-between p-3 rounded-lg bg-muted/50">
                      <span className="text-muted-foreground">CoA Template</span>
                      <span>{coaTemplates.find((t: any) => t.id === stepState.coaTemplateId)?.name || "Not selected"}</span>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <span className="text-muted-foreground">Services ({stepState.selectedServices.length})</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {stepState.selectedServices.map(s => <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>)}
                        {stepState.selectedServices.length === 0 && <span className="text-xs text-muted-foreground">None selected</span>}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea value={stepState.notes} onChange={(e) => setStepState(s => ({ ...s, notes: e.target.value }))} placeholder="Any additional notes…" />
                  </div>
                </div>
              )}

              <Separator />

              <div className="flex justify-between">
                <Button variant="outline" onClick={goBack} disabled={currentStepIdx === 0}>
                  <ChevronLeft className="w-4 h-4 mr-1" /> Back
                </Button>
                {currentStep === "review" ? (
                  <Button onClick={() => completeOnboarding.mutate(activeOnboarding.id)} disabled={completeOnboarding.isPending} className="bg-success text-success-foreground hover:bg-success/90">
                    {completeOnboarding.isPending ? "Completing…" : "Complete Onboarding"}
                  </Button>
                ) : (
                  <Button onClick={goNext}>
                    Next <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
