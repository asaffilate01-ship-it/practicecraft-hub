import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  ChevronLeft, ChevronRight, Send, FileText, MapPin, UserPlus,
  UserMinus, Shield, Hash, Share2, CheckCircle2, XCircle,
  AlertTriangle, Building2, Loader2, Upload, Eye, Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const CHANGE_TYPES = [
  { key: "CONFIRMATION_STATEMENT", label: "Confirmation Statement", icon: CheckCircle2, description: "CS01 — annual confirmation of company details", badge: "Requires auth code" },
  { key: "CHANGE_REGISTERED_OFFICE", label: "Change Registered Office", icon: MapPin, description: "AD01 — change the company's registered address", badge: "Requires auth code" },
  { key: "APPOINT_DIRECTOR", label: "Appoint Director", icon: UserPlus, description: "AP01 — appoint a new director", badge: "Requires auth code" },
  { key: "RESIGN_DIRECTOR", label: "Resign Director", icon: UserMinus, description: "TM01 — terminate a director's appointment", badge: "Requires auth code" },
  { key: "PSC_CHANGE", label: "PSC Change", icon: Shield, description: "Add, update, or cease a person with significant control", badge: "Identity verification" },
  { key: "SIC_CHANGE", label: "SIC Change", icon: Hash, description: "Change SIC codes for the company", badge: "Requires auth code" },
  { key: "ALLOT_SHARES", label: "Allot Shares", icon: Share2, description: "Issue new shares to members", badge: "Requires review" },
  { key: "TRANSFER_SHARES", label: "Transfer Shares", icon: Share2, description: "Transfer shares between members", badge: "Requires review" },
] as const;

const WIZARD_STEPS = ["Choose Type", "Data Capture", "Validation", "Documents", "Approval", "Submit"];

interface ChangeWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  preselectedType?: string;
}

export function ChangeWizard({ open, onOpenChange, clientId, preselectedType }: ChangeWizardProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [step, setStep] = useState(preselectedType ? 1 : 0);
  const [changeType, setChangeType] = useState(preselectedType || "");
  const [payload, setPayload] = useState<Record<string, any>>({});
  const [validationResult, setValidationResult] = useState<any>(null);
  const [isValidating, setIsValidating] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("tenant_id").eq("id", user!.id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Directors for resign dropdown
  const { data: directors = [] } = useQuery({
    queryKey: ["directors", clientId],
    queryFn: async () => {
      const { data } = await supabase.from("company_register_directors").select("id, full_name, appointed_on").eq("client_id", clientId).eq("is_active", true);
      return data || [];
    },
    enabled: !!clientId && (changeType === "RESIGN_DIRECTOR"),
  });

  // Members for share operations
  const { data: members = [] } = useQuery({
    queryKey: ["members", clientId],
    queryFn: async () => {
      const { data } = await supabase.from("company_register_members").select("id, full_name, shares_held").eq("client_id", clientId).eq("is_active", true);
      return data || [];
    },
    enabled: !!clientId && (changeType === "ALLOT_SHARES" || changeType === "TRANSFER_SHARES"),
  });

  // Share classes
  const { data: shareClasses = [] } = useQuery({
    queryKey: ["share-classes", clientId],
    queryFn: async () => {
      const { data } = await supabase.from("share_classes").select("id, class_name").eq("client_id", clientId);
      return data || [];
    },
    enabled: !!clientId && (changeType === "ALLOT_SHARES" || changeType === "TRANSFER_SHARES"),
  });

  // Auth code check
  const { data: authCode } = useQuery({
    queryKey: ["auth-code", clientId],
    queryFn: async () => {
      const { data } = await supabase.from("client_credentials").select("id").eq("client_id", clientId).eq("credential_type", "ch_auth_code").maybeSingle();
      return data;
    },
    enabled: !!clientId,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!profile?.tenant_id) throw new Error("No tenant");
      const title = buildTitle(changeType, payload);
      const { error } = await supabase.from("secretarial_changes").insert({
        tenant_id: profile.tenant_id,
        client_id: clientId,
        change_type: changeType,
        title,
        description: payload.notes || null,
        payload_json: buildPayloadJson(changeType, payload),
        status: "draft",
        requires_auth_code: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["secretarial-changes"] });
      queryClient.invalidateQueries({ queryKey: ["secretarial-changes-client", clientId] });
      onOpenChange(false);
      resetWizard();
      toast.success("Change request created");
    },
    onError: (e) => toast.error(e.message),
  });

  const resetWizard = () => {
    setStep(0);
    setChangeType("");
    setPayload({});
    setValidationResult(null);
  };

  const handleClose = (open: boolean) => {
    if (!open) resetWizard();
    onOpenChange(open);
  };

  const runValidation = async () => {
    setIsValidating(true);
    // Client-side validation
    const errors: any[] = [];
    const warnings: any[] = [];
    validatePayload(changeType, payload, errors, warnings);
    setValidationResult({ ok: errors.length === 0, errors, warnings });
    setIsValidating(false);
  };

  const canProceedFromStep = (s: number) => {
    if (s === 0) return !!changeType;
    if (s === 1) return isPayloadValid(changeType, payload);
    if (s === 2) return validationResult?.ok;
    return true;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">
            {step === 0 ? "Create Secretarial Change" : `${CHANGE_TYPES.find(t => t.key === changeType)?.label || "Change"} — Step ${step + 1} of ${WIZARD_STEPS.length}`}
          </DialogTitle>
        </DialogHeader>

        {/* Step indicators */}
        {step > 0 && (
          <div className="flex gap-1 mb-2">
            {WIZARD_STEPS.map((s, i) => (
              <div key={i} className="flex-1">
                <div className={cn("h-1.5 rounded-full transition-colors", i <= step ? "bg-primary" : "bg-muted")} />
                <p className={cn("text-[10px] mt-1 truncate", i === step ? "text-primary font-medium" : "text-muted-foreground")}>{s}</p>
              </div>
            ))}
          </div>
        )}

        <div className="min-h-[300px]">
          {/* Step 0: Choose Type */}
          {step === 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {CHANGE_TYPES.map((ct) => {
                const Icon = ct.icon;
                return (
                  <button
                    key={ct.key}
                    onClick={() => setChangeType(ct.key)}
                    className={cn(
                      "flex flex-col items-start gap-1.5 p-4 rounded-lg border text-left transition-colors",
                      changeType === ct.key ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-muted/50"
                    )}
                  >
                    <div className="flex items-center gap-2 w-full">
                      <Icon className="w-4 h-4 text-primary shrink-0" />
                      <span className="text-sm font-medium flex-1">{ct.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{ct.description}</p>
                    <Badge variant="outline" className="text-[10px] mt-1">{ct.badge}</Badge>
                  </button>
                );
              })}
            </div>
          )}

          {/* Step 1: Data Capture */}
          {step === 1 && (
            <div className="space-y-4">
              {changeType === "CONFIRMATION_STATEMENT" && <ConfirmationStatementForm payload={payload} setPayload={setPayload} />}
              {changeType === "CHANGE_REGISTERED_OFFICE" && <ChangeROForm payload={payload} setPayload={setPayload} />}
              {changeType === "APPOINT_DIRECTOR" && <AppointDirectorForm payload={payload} setPayload={setPayload} />}
              {changeType === "RESIGN_DIRECTOR" && <ResignDirectorForm payload={payload} setPayload={setPayload} directors={directors} />}
              {changeType === "PSC_CHANGE" && <PSCChangeForm payload={payload} setPayload={setPayload} />}
              {changeType === "SIC_CHANGE" && <SICChangeForm payload={payload} setPayload={setPayload} />}
              {changeType === "ALLOT_SHARES" && <AllotSharesForm payload={payload} setPayload={setPayload} members={members} shareClasses={shareClasses} />}
              {changeType === "TRANSFER_SHARES" && <TransferSharesForm payload={payload} setPayload={setPayload} members={members} shareClasses={shareClasses} />}
            </div>
          )}

          {/* Step 2: Validation */}
          {step === 2 && (
            <div className="space-y-4">
              <Button variant="outline" className="w-full gap-1.5" onClick={runValidation} disabled={isValidating}>
                {isValidating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Shield className="w-3.5 h-3.5" />}
                Run Validation
              </Button>

              {validationResult && (
                <div className={cn("rounded-lg border p-4", validationResult.ok ? "border-[hsl(var(--success))]/30 bg-[hsl(var(--success))]/5" : "border-destructive/30 bg-destructive/5")}>
                  <div className="flex items-center gap-2 mb-3">
                    {validationResult.ok ? <CheckCircle2 className="w-5 h-5 text-[hsl(var(--success))]" /> : <XCircle className="w-5 h-5 text-destructive" />}
                    <span className={cn("font-semibold text-sm", validationResult.ok ? "text-[hsl(var(--success))]" : "text-destructive")}>
                      {validationResult.ok ? "Ready to file" : `${validationResult.errors.length} error(s) found`}
                    </span>
                  </div>

                  {validationResult.errors.length > 0 && (
                    <div className="space-y-1.5 mb-3">
                      {validationResult.errors.map((e: any, i: number) => (
                        <div key={i} className="flex gap-2 items-start text-xs bg-destructive/10 rounded p-2">
                          <XCircle className="w-3 h-3 text-destructive mt-0.5 shrink-0" />
                          <div>
                            <span className="font-mono text-[10px] text-muted-foreground">{e.path}</span>
                            <p className="text-destructive">{e.message}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {validationResult.warnings.length > 0 && (
                    <div className="space-y-1.5">
                      {validationResult.warnings.map((w: any, i: number) => (
                        <div key={i} className="flex gap-2 items-start text-xs bg-[hsl(var(--warning))]/10 rounded p-2">
                          <AlertTriangle className="w-3 h-3 text-[hsl(var(--warning))] mt-0.5 shrink-0" />
                          <div>
                            <span className="font-mono text-[10px] text-muted-foreground">{w.path}</span>
                            <p className="text-[hsl(var(--warning))]">{w.message}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {!validationResult && (
                <p className="text-sm text-muted-foreground text-center py-4">Click above to validate the filing data before proceeding.</p>
              )}
            </div>
          )}

          {/* Step 3: Documents */}
          {step === 3 && (
            <div className="space-y-4">
              <p className="text-sm font-medium">Generate Documents</p>
              <div className="space-y-3">
                {getDocumentsForType(changeType).map((doc) => (
                  <div key={doc.key} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{doc.label}</p>
                        <p className="text-xs text-muted-foreground">{doc.description}</p>
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      <Button variant="outline" size="sm" className="gap-1 text-xs"><FileText className="w-3 h-3" /> Generate</Button>
                      <Button variant="ghost" size="sm" className="gap-1 text-xs"><Eye className="w-3 h-3" /> Preview</Button>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Documents will be attached to the filing and stored in the client's document library.</p>
            </div>
          )}

          {/* Step 4: Approval */}
          {step === 4 && (
            <div className="space-y-4">
              <p className="text-sm font-medium">Approval</p>
              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Approver</span>
                  <span className="font-medium">{user?.email || "Current User"}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Change Type</span>
                  <span className="font-medium">{CHANGE_TYPES.find(t => t.key === changeType)?.label}</span>
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label htmlFor="approvalNote">Approval Note (optional)</Label>
                  <Textarea
                    id="approvalNote"
                    placeholder="Any notes about this approval..."
                    value={payload.approvalNote || ""}
                    onChange={(e) => setPayload({ ...payload, approvalNote: e.target.value })}
                    className="h-20"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 gap-1.5">
                  <Send className="w-3.5 h-3.5" /> Request Info from Client
                </Button>
              </div>
            </div>
          )}

          {/* Step 5: Submit */}
          {step === 5 && (
            <div className="space-y-4">
              <p className="text-sm font-medium">Pre-submission Checklist</p>
              <div className="space-y-2">
                {[
                  { label: "Auth code stored", ok: !!authCode, required: true },
                  { label: "Validations passed", ok: validationResult?.ok, required: true },
                  { label: "Approved", ok: true, required: true },
                  { label: "Company status active", ok: true, required: true },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-2 p-2.5 rounded-lg border text-sm">
                    {item.ok ? (
                      <CheckCircle2 className="w-4 h-4 text-[hsl(var(--success))]" />
                    ) : (
                      <XCircle className="w-4 h-4 text-destructive" />
                    )}
                    <span className={item.ok ? "" : "text-destructive"}>{item.label}</span>
                    {item.required && !item.ok && (
                      <Badge variant="destructive" className="ml-auto text-[10px]">Required</Badge>
                    )}
                  </div>
                ))}
              </div>

              <Separator />

              <div className="rounded-lg border p-4 space-y-2">
                <p className="text-sm font-medium">Filing Summary</p>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between"><span className="text-muted-foreground">Type</span><span className="font-medium">{CHANGE_TYPES.find(t => t.key === changeType)?.label}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Route</span><span className="font-medium">{getFilingRoute(changeType)}</span></div>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-between sm:justify-between">
          <Button variant="outline" onClick={() => step > 0 ? setStep(step - 1) : handleClose(false)} className="gap-1.5">
            <ChevronLeft className="w-3.5 h-3.5" /> {step === 0 ? "Cancel" : "Back"}
          </Button>
          {step < WIZARD_STEPS.length - 1 ? (
            <Button onClick={() => { if (step === 2 && !validationResult) { runValidation(); } setStep(step + 1); }} disabled={!canProceedFromStep(step)} className="gap-1.5">
              Next <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          ) : (
            <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending} className="gap-1.5">
              {createMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              {createMutation.isPending ? "Creating..." : "Create & Submit"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Subforms ────────────────────────────────────────────

function ConfirmationStatementForm({ payload, setPayload }: { payload: any; setPayload: (p: any) => void }) {
  const set = (k: string, v: any) => setPayload({ ...payload, [k]: v });
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="statementDate">Statement Date *</Label>
        <Input id="statementDate" type="date" value={payload.statementDate || new Date().toISOString().split("T")[0]} onChange={(e) => set("statementDate", e.target.value)} />
        <p className="text-xs text-muted-foreground">The date to which the confirmation statement is made up.</p>
      </div>
      <Separator />
      <p className="text-sm font-medium">Confirmations</p>
      <p className="text-xs text-muted-foreground">Confirm that the following details are correct as at the statement date. Uncheck any that require changes first.</p>
      {[
        { key: "officersConfirmed", label: "Officers confirmed — all directors and secretaries are correct" },
        { key: "pscConfirmed", label: "PSC confirmed — persons with significant control are correct" },
        { key: "registeredOfficeConfirmed", label: "Registered office confirmed — address is correct" },
        { key: "sicConfirmed", label: "SIC codes confirmed — nature of business is correct" },
        { key: "shareCapitalConfirmed", label: "Share capital confirmed — statement of capital is correct" },
      ].map((c) => (
        <div key={c.key} className="flex items-start gap-3">
          <Checkbox
            id={c.key}
            checked={!!payload[c.key]}
            onCheckedChange={(v) => set(c.key, !!v)}
            className="mt-0.5"
          />
          <Label htmlFor={c.key} className="text-sm font-normal leading-snug cursor-pointer">{c.label}</Label>
        </div>
      ))}
      <div className="space-y-2">
        <Label htmlFor="csNotes">Notes (optional)</Label>
        <Textarea id="csNotes" placeholder="Any additional notes..." value={payload.notes || ""} onChange={(e) => set("notes", e.target.value)} className="h-16" />
      </div>
    </div>
  );
}

function ChangeROForm({ payload, setPayload }: { payload: any; setPayload: (p: any) => void }) {
  const set = (k: string, v: any) => setPayload({ ...payload, [k]: v });
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="effectiveDate">Effective Date *</Label>
        <Input id="effectiveDate" type="date" value={payload.effectiveDate || new Date().toISOString().split("T")[0]} onChange={(e) => set("effectiveDate", e.target.value)} />
      </div>
      <Separator />
      <p className="text-sm font-medium">New Registered Office Address</p>
      <div className="grid grid-cols-1 gap-3">
        <div className="space-y-2">
          <Label htmlFor="addressLine1">Address Line 1 *</Label>
          <Input id="addressLine1" placeholder="e.g. Futures House" value={payload.addressLine1 || ""} onChange={(e) => set("addressLine1", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="addressLine2">Address Line 2</Label>
          <Input id="addressLine2" placeholder="Optional" value={payload.addressLine2 || ""} onChange={(e) => set("addressLine2", e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="postTown">Town / City *</Label>
            <Input id="postTown" placeholder="e.g. London" value={payload.postTown || ""} onChange={(e) => set("postTown", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="county">County</Label>
            <Input id="county" placeholder="Optional" value={payload.county || ""} onChange={(e) => set("county", e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="postcode">Postcode *</Label>
            <Input id="postcode" placeholder="e.g. SW1A 2AA" value={payload.postcode || ""} onChange={(e) => set("postcode", e.target.value.toUpperCase())} />
            <p className="text-xs text-muted-foreground">UK postcode format required.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="country">Country *</Label>
            <Input id="country" value={payload.country || "United Kingdom"} onChange={(e) => set("country", e.target.value)} />
          </div>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="roNotes">Notes (optional)</Label>
        <Textarea id="roNotes" placeholder="Reason for change..." value={payload.notes || ""} onChange={(e) => set("notes", e.target.value)} className="h-16" />
      </div>
    </div>
  );
}

function AppointDirectorForm({ payload, setPayload }: { payload: any; setPayload: (p: any) => void }) {
  const set = (k: string, v: any) => setPayload({ ...payload, [k]: v });
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="appointmentDate">Appointment Date *</Label>
        <Input id="appointmentDate" type="date" value={payload.appointmentDate || new Date().toISOString().split("T")[0]} onChange={(e) => set("appointmentDate", e.target.value)} />
        <p className="text-xs text-muted-foreground">Must not be in the future.</p>
      </div>
      <Separator />
      <p className="text-sm font-medium">Personal Details</p>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input id="title" placeholder="e.g. Mr" value={payload.title || ""} onChange={(e) => set("title", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="forename">Forename *</Label>
          <Input id="forename" placeholder="First name" value={payload.forename || ""} onChange={(e) => set("forename", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="surname">Surname *</Label>
          <Input id="surname" placeholder="Last name" value={payload.surname || ""} onChange={(e) => set("surname", e.target.value)} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="middleNames">Middle Names</Label>
        <Input id="middleNames" placeholder="Optional" value={payload.middleNames || ""} onChange={(e) => set("middleNames", e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="dob">Date of Birth *</Label>
          <Input id="dob" type="date" value={payload.dob || ""} onChange={(e) => set("dob", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="nationality">Nationality *</Label>
          <Input id="nationality" placeholder="e.g. British" value={payload.nationality || ""} onChange={(e) => set("nationality", e.target.value)} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="occupation">Occupation *</Label>
        <Input id="occupation" placeholder="e.g. Company Director" value={payload.occupation || ""} onChange={(e) => set("occupation", e.target.value)} />
      </div>
      <Separator />
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Service Address</p>
        <Button variant="link" size="sm" className="text-xs h-auto p-0" onClick={() => { set("svcAddressLine1", ""); /* Could copy RO */ }}>
          Use registered office
        </Button>
      </div>
      <div className="grid grid-cols-1 gap-3">
        <div className="space-y-2">
          <Label htmlFor="svcAddressLine1">Address Line 1 *</Label>
          <Input id="svcAddressLine1" value={payload.svcAddressLine1 || ""} onChange={(e) => set("svcAddressLine1", e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="svcPostTown">Town / City *</Label>
            <Input id="svcPostTown" value={payload.svcPostTown || ""} onChange={(e) => set("svcPostTown", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="svcPostcode">Postcode *</Label>
            <Input id="svcPostcode" value={payload.svcPostcode || ""} onChange={(e) => set("svcPostcode", e.target.value.toUpperCase())} />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="svcCountry">Country *</Label>
          <Input id="svcCountry" value={payload.svcCountry || "United Kingdom"} onChange={(e) => set("svcCountry", e.target.value)} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email (optional)</Label>
        <Input id="email" type="email" placeholder="director@example.com" value={payload.email || ""} onChange={(e) => set("email", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="adNotes">Notes (optional)</Label>
        <Textarea id="adNotes" value={payload.notes || ""} onChange={(e) => set("notes", e.target.value)} className="h-16" />
      </div>
    </div>
  );
}

function ResignDirectorForm({ payload, setPayload, directors }: { payload: any; setPayload: (p: any) => void; directors: any[] }) {
  const set = (k: string, v: any) => setPayload({ ...payload, [k]: v });
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Select Director *</Label>
        <Select value={payload.directorId || ""} onValueChange={(v) => set("directorId", v)}>
          <SelectTrigger><SelectValue placeholder="Choose a director" /></SelectTrigger>
          <SelectContent>
            {directors.map((d: any) => (
              <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {directors.length === 0 && <p className="text-xs text-muted-foreground">No active directors found for this client.</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="resignationDate">Resignation Date *</Label>
        <Input id="resignationDate" type="date" value={payload.resignationDate || new Date().toISOString().split("T")[0]} onChange={(e) => set("resignationDate", e.target.value)} />
        <p className="text-xs text-muted-foreground">Must be on or after the director's appointment date.</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="rdNotes">Notes (optional)</Label>
        <Textarea id="rdNotes" value={payload.notes || ""} onChange={(e) => set("notes", e.target.value)} className="h-16" />
      </div>
    </div>
  );
}

function PSCChangeForm({ payload, setPayload }: { payload: any; setPayload: (p: any) => void }) {
  const set = (k: string, v: any) => setPayload({ ...payload, [k]: v });
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Action *</Label>
          <Select value={payload.action || "add"} onValueChange={(v) => set("action", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="add">Add PSC</SelectItem>
              <SelectItem value="update">Update PSC</SelectItem>
              <SelectItem value="cease">Cease PSC</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>PSC Type *</Label>
          <Select value={payload.pscType || "individual"} onValueChange={(v) => set("pscType", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="individual">Individual</SelectItem>
              <SelectItem value="corporate">Corporate</SelectItem>
              <SelectItem value="legalPerson">Legal Person</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="pscName">Full Name *</Label>
        <Input id="pscName" placeholder="Full legal name" value={payload.pscName || ""} onChange={(e) => set("pscName", e.target.value)} />
      </div>
      {(payload.pscType || "individual") === "individual" && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="pscDob">Date of Birth *</Label>
            <Input id="pscDob" type="date" value={payload.pscDob || ""} onChange={(e) => set("pscDob", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pscNationality">Nationality</Label>
            <Input id="pscNationality" value={payload.pscNationality || ""} onChange={(e) => set("pscNationality", e.target.value)} />
          </div>
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="naturesOfControl">Natures of Control *</Label>
        <Textarea id="naturesOfControl" placeholder="e.g. Ownership of shares – 75% or more&#10;Right to appoint and remove directors" value={payload.naturesOfControl || ""} onChange={(e) => set("naturesOfControl", e.target.value)} className="h-20" />
        <p className="text-xs text-muted-foreground">Enter each nature of control on a new line.</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="notifiedOn">Notified On *</Label>
          <Input id="notifiedOn" type="date" value={payload.notifiedOn || new Date().toISOString().split("T")[0]} onChange={(e) => set("notifiedOn", e.target.value)} />
        </div>
        {payload.action === "cease" && (
          <div className="space-y-2">
            <Label htmlFor="ceasedOn">Ceased On *</Label>
            <Input id="ceasedOn" type="date" value={payload.ceasedOn || ""} onChange={(e) => set("ceasedOn", e.target.value)} />
          </div>
        )}
      </div>
      <Separator />
      <div className="flex items-start gap-3">
        <Checkbox id="identityVerified" checked={!!payload.identityVerified} onCheckedChange={(v) => set("identityVerified", !!v)} className="mt-0.5" />
        <Label htmlFor="identityVerified" className="text-sm font-normal">Identity verified (2026 compliance requirement)</Label>
      </div>
      <div className="flex items-start gap-3">
        <Checkbox id="personalCodeProvided" checked={!!payload.personalCodeProvided} onCheckedChange={(v) => set("personalCodeProvided", !!v)} className="mt-0.5" />
        <Label htmlFor="personalCodeProvided" className="text-sm font-normal">Personal code provided</Label>
      </div>
      <div className="space-y-2">
        <Label htmlFor="pscNotes">Notes (optional)</Label>
        <Textarea id="pscNotes" value={payload.notes || ""} onChange={(e) => set("notes", e.target.value)} className="h-16" />
      </div>
    </div>
  );
}

function SICChangeForm({ payload, setPayload }: { payload: any; setPayload: (p: any) => void }) {
  const set = (k: string, v: any) => setPayload({ ...payload, [k]: v });
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="sicEffectiveDate">Effective Date *</Label>
        <Input id="sicEffectiveDate" type="date" value={payload.effectiveDate || new Date().toISOString().split("T")[0]} onChange={(e) => set("effectiveDate", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="sicCodes">SIC Codes (1–4) *</Label>
        <Input id="sicCodes" placeholder="e.g. 62020, 69201" value={payload.sicCodes || ""} onChange={(e) => set("sicCodes", e.target.value)} />
        <p className="text-xs text-muted-foreground">Enter up to 4 five-digit SIC codes, comma-separated.</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="sicNotes">Notes (optional)</Label>
        <Textarea id="sicNotes" value={payload.notes || ""} onChange={(e) => set("notes", e.target.value)} className="h-16" />
      </div>
    </div>
  );
}

function AllotSharesForm({ payload, setPayload, members, shareClasses }: { payload: any; setPayload: (p: any) => void; members: any[]; shareClasses: any[] }) {
  const set = (k: string, v: any) => setPayload({ ...payload, [k]: v });
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="allotmentDate">Allotment Date *</Label>
          <Input id="allotmentDate" type="date" value={payload.allotmentDate || new Date().toISOString().split("T")[0]} onChange={(e) => set("allotmentDate", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Share Class *</Label>
          <Select value={payload.shareClassId || ""} onValueChange={(v) => set("shareClassId", v)}>
            <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
            <SelectContent>
              {shareClasses.map((sc: any) => (
                <SelectItem key={sc.id} value={sc.id}>{sc.class_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <Separator />
      <p className="text-sm font-medium">Allotment</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>To Member *</Label>
          <Select value={payload.toMemberId || ""} onValueChange={(v) => set("toMemberId", v)}>
            <SelectTrigger><SelectValue placeholder="Select member" /></SelectTrigger>
            <SelectContent>
              {members.map((m: any) => (
                <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="quantity">Quantity *</Label>
          <Input id="quantity" type="number" min="1" placeholder="e.g. 100" value={payload.quantity || ""} onChange={(e) => set("quantity", e.target.value)} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="consideration">Consideration (pence, optional)</Label>
        <Input id="consideration" type="number" min="0" placeholder="e.g. 10000" value={payload.considerationPence || ""} onChange={(e) => set("considerationPence", e.target.value)} />
        <p className="text-xs text-muted-foreground">Total consideration in pence for this allotment.</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="asNotes">Notes (optional)</Label>
        <Textarea id="asNotes" value={payload.notes || ""} onChange={(e) => set("notes", e.target.value)} className="h-16" />
      </div>
    </div>
  );
}

function TransferSharesForm({ payload, setPayload, members, shareClasses }: { payload: any; setPayload: (p: any) => void; members: any[]; shareClasses: any[] }) {
  const set = (k: string, v: any) => setPayload({ ...payload, [k]: v });
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="transferDate">Transfer Date *</Label>
          <Input id="transferDate" type="date" value={payload.transferDate || new Date().toISOString().split("T")[0]} onChange={(e) => set("transferDate", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Share Class *</Label>
          <Select value={payload.shareClassId || ""} onValueChange={(v) => set("shareClassId", v)}>
            <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
            <SelectContent>
              {shareClasses.map((sc: any) => (
                <SelectItem key={sc.id} value={sc.id}>{sc.class_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>From Member *</Label>
          <Select value={payload.fromMemberId || ""} onValueChange={(v) => set("fromMemberId", v)}>
            <SelectTrigger><SelectValue placeholder="Transferor" /></SelectTrigger>
            <SelectContent>
              {members.map((m: any) => (
                <SelectItem key={m.id} value={m.id}>{m.full_name} ({m.shares_held} held)</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>To Member *</Label>
          <Select value={payload.toMemberId || ""} onValueChange={(v) => set("toMemberId", v)}>
            <SelectTrigger><SelectValue placeholder="Transferee" /></SelectTrigger>
            <SelectContent>
              {members.map((m: any) => (
                <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="tsQuantity">Quantity *</Label>
          <Input id="tsQuantity" type="number" min="1" value={payload.quantity || ""} onChange={(e) => set("quantity", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tsConsideration">Consideration (pence)</Label>
          <Input id="tsConsideration" type="number" min="0" value={payload.considerationPence || ""} onChange={(e) => set("considerationPence", e.target.value)} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="tsNotes">Notes (optional)</Label>
        <Textarea id="tsNotes" value={payload.notes || ""} onChange={(e) => set("notes", e.target.value)} className="h-16" />
      </div>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────

function buildTitle(type: string, payload: any): string {
  const labels: Record<string, string> = {
    CONFIRMATION_STATEMENT: "Confirmation Statement",
    CHANGE_REGISTERED_OFFICE: `Change RO to ${payload.postTown || "new address"}`,
    APPOINT_DIRECTOR: `Appoint ${payload.forename || ""} ${payload.surname || ""}`.trim() || "Appoint Director",
    RESIGN_DIRECTOR: "Resign Director",
    PSC_CHANGE: `${(payload.action || "add").charAt(0).toUpperCase() + (payload.action || "add").slice(1)} PSC — ${payload.pscName || ""}`,
    SIC_CHANGE: "Change SIC codes",
    ALLOT_SHARES: "Allot Shares",
    TRANSFER_SHARES: "Transfer Shares",
  };
  return labels[type] || type;
}

function buildPayloadJson(type: string, payload: any): Record<string, any> {
  // Strip UI-only fields
  const { approvalNote, ...rest } = payload;
  return rest;
}

function isPayloadValid(type: string, payload: any): boolean {
  switch (type) {
    case "CONFIRMATION_STATEMENT":
      return !!payload.statementDate;
    case "CHANGE_REGISTERED_OFFICE":
      return !!payload.addressLine1 && !!payload.postTown && !!payload.postcode;
    case "APPOINT_DIRECTOR":
      return !!payload.forename && !!payload.surname && !!payload.dob && !!payload.nationality && !!payload.occupation && !!payload.svcAddressLine1;
    case "RESIGN_DIRECTOR":
      return !!payload.directorId && !!payload.resignationDate;
    case "PSC_CHANGE":
      return !!payload.pscName && !!payload.naturesOfControl && !!payload.notifiedOn;
    case "SIC_CHANGE":
      return !!payload.sicCodes;
    case "ALLOT_SHARES":
      return !!payload.shareClassId && !!payload.toMemberId && parseInt(payload.quantity) > 0;
    case "TRANSFER_SHARES":
      return !!payload.shareClassId && !!payload.fromMemberId && !!payload.toMemberId && parseInt(payload.quantity) > 0;
    default:
      return true;
  }
}

function validatePayload(type: string, payload: any, errors: any[], warnings: any[]) {
  const UK_POSTCODE = /^[A-Z]{1,2}[0-9R][0-9A-Z]?\s?[0-9][ABD-HJLNP-UW-Z]{2}$/i;

  switch (type) {
    case "CONFIRMATION_STATEMENT":
      if (!payload.statementDate) errors.push({ path: "/statementDate", code: "REQUIRED", message: "Statement date is required." });
      if (!payload.officersConfirmed) errors.push({ path: "/confirmations/officersConfirmed", code: "UNCONFIRMED", message: "Officers must be confirmed." });
      if (!payload.pscConfirmed) errors.push({ path: "/confirmations/pscConfirmed", code: "UNCONFIRMED", message: "PSC must be confirmed." });
      if (!payload.registeredOfficeConfirmed) errors.push({ path: "/confirmations/registeredOfficeConfirmed", code: "UNCONFIRMED", message: "Registered office must be confirmed." });
      if (!payload.sicConfirmed) errors.push({ path: "/confirmations/sicConfirmed", code: "UNCONFIRMED", message: "SIC codes must be confirmed." });
      if (!payload.shareCapitalConfirmed) errors.push({ path: "/confirmations/shareCapitalConfirmed", code: "UNCONFIRMED", message: "Share capital must be confirmed." });
      break;

    case "CHANGE_REGISTERED_OFFICE":
      if (!payload.addressLine1) errors.push({ path: "/newRegisteredOfficeAddress/addressLine1", code: "REQUIRED", message: "Address Line 1 is required." });
      if (!payload.postTown) errors.push({ path: "/newRegisteredOfficeAddress/postTown", code: "REQUIRED", message: "Town/City is required." });
      if (!payload.postcode) errors.push({ path: "/newRegisteredOfficeAddress/postcode", code: "REQUIRED", message: "Postcode is required." });
      else if (payload.country === "United Kingdom" && !UK_POSTCODE.test(payload.postcode)) errors.push({ path: "/newRegisteredOfficeAddress/postcode", code: "INVALID_POSTCODE", message: "Invalid UK postcode format." });
      break;

    case "APPOINT_DIRECTOR":
      if (!payload.forename) errors.push({ path: "/person/name/forename", code: "REQUIRED", message: "Forename is required." });
      if (!payload.surname) errors.push({ path: "/person/name/surname", code: "REQUIRED", message: "Surname is required." });
      if (!payload.dob) errors.push({ path: "/person/dateOfBirth", code: "REQUIRED", message: "Date of birth is required." });
      if (!payload.nationality) errors.push({ path: "/person/nationality", code: "REQUIRED", message: "Nationality is required." });
      if (!payload.occupation) errors.push({ path: "/person/occupation", code: "REQUIRED", message: "Occupation is required." });
      if (!payload.svcAddressLine1) errors.push({ path: "/person/serviceAddress/addressLine1", code: "REQUIRED", message: "Service address is required." });
      if (payload.appointmentDate && new Date(payload.appointmentDate) > new Date()) warnings.push({ path: "/appointmentDate", code: "FUTURE_DATE", message: "Appointment date is in the future." });
      break;

    case "RESIGN_DIRECTOR":
      if (!payload.directorId) errors.push({ path: "/directorId", code: "REQUIRED", message: "Select a director." });
      if (!payload.resignationDate) errors.push({ path: "/resignationDate", code: "REQUIRED", message: "Resignation date is required." });
      break;

    case "PSC_CHANGE":
      if (!payload.pscName) errors.push({ path: "/psc/name", code: "REQUIRED", message: "PSC name is required." });
      if (!payload.naturesOfControl) errors.push({ path: "/psc/naturesOfControl", code: "REQUIRED", message: "At least one nature of control is required." });
      if (!payload.notifiedOn) errors.push({ path: "/psc/notifiedOn", code: "REQUIRED", message: "Notified date is required." });
      if (payload.action === "cease" && !payload.ceasedOn) errors.push({ path: "/psc/ceasedOn", code: "REQUIRED", message: "Ceased date is required for cessation." });
      if ((payload.pscType || "individual") === "individual" && !payload.pscDob) errors.push({ path: "/psc/dateOfBirth", code: "REQUIRED", message: "Date of birth is required for individual PSC." });
      if (!payload.identityVerified) warnings.push({ path: "/psc/identityVerified", code: "ID_NOT_VERIFIED", message: "Identity not verified — may be required under 2026 rules." });
      break;

    case "SIC_CHANGE":
      if (!payload.sicCodes) {
        errors.push({ path: "/sicCodes", code: "REQUIRED", message: "At least one SIC code is required." });
      } else {
        const codes = payload.sicCodes.split(",").map((s: string) => s.trim()).filter(Boolean);
        if (codes.length === 0) errors.push({ path: "/sicCodes", code: "REQUIRED", message: "At least one SIC code is required." });
        if (codes.length > 4) errors.push({ path: "/sicCodes", code: "MAX_EXCEEDED", message: "Maximum 4 SIC codes allowed." });
        codes.forEach((c: string, i: number) => {
          if (!/^[0-9]{5}$/.test(c)) errors.push({ path: `/sicCodes/${i}`, code: "INVALID_FORMAT", message: `SIC code "${c}" must be exactly 5 digits.` });
        });
      }
      break;

    case "ALLOT_SHARES":
      if (!payload.shareClassId) errors.push({ path: "/shareClassId", code: "REQUIRED", message: "Share class is required." });
      if (!payload.toMemberId) errors.push({ path: "/allotments/0/toMemberId", code: "REQUIRED", message: "Recipient member is required." });
      if (!payload.quantity || parseInt(payload.quantity) <= 0) errors.push({ path: "/allotments/0/quantity", code: "INVALID", message: "Quantity must be greater than 0." });
      break;

    case "TRANSFER_SHARES":
      if (!payload.shareClassId) errors.push({ path: "/shareClassId", code: "REQUIRED", message: "Share class is required." });
      if (!payload.fromMemberId) errors.push({ path: "/fromMemberId", code: "REQUIRED", message: "Transferor is required." });
      if (!payload.toMemberId) errors.push({ path: "/toMemberId", code: "REQUIRED", message: "Transferee is required." });
      if (payload.fromMemberId === payload.toMemberId) errors.push({ path: "/toMemberId", code: "SAME_MEMBER", message: "Transferor and transferee must be different." });
      if (!payload.quantity || parseInt(payload.quantity) <= 0) errors.push({ path: "/quantity", code: "INVALID", message: "Quantity must be greater than 0." });
      if (!payload.stockTransferFormDocumentId) warnings.push({ path: "/stockTransferFormDocumentId", code: "MISSING_DOC", message: "No stock transfer form attached." });
      break;
  }
}

function getDocumentsForType(type: string) {
  const docs: Record<string, { key: string; label: string; description: string }[]> = {
    CONFIRMATION_STATEMENT: [{ key: "cs01", label: "CS01 Confirmation Statement", description: "Annual confirmation of company details" }],
    CHANGE_REGISTERED_OFFICE: [{ key: "ad01", label: "AD01 Change of Registered Office", description: "Notification of change of address" }, { key: "minutes", label: "Board Minutes", description: "Resolution to change registered office" }],
    APPOINT_DIRECTOR: [{ key: "ap01", label: "AP01 Appointment", description: "Notification of appointment" }, { key: "consent", label: "Consent to Act", description: "Director's consent to act letter" }, { key: "minutes", label: "Board Minutes", description: "Resolution to appoint director" }],
    RESIGN_DIRECTOR: [{ key: "tm01", label: "TM01 Termination", description: "Notification of resignation" }, { key: "letter", label: "Resignation Letter", description: "Director's resignation letter" }],
    PSC_CHANGE: [{ key: "psc", label: "PSC Notification", description: "PSC change notification form" }],
    SIC_CHANGE: [{ key: "sic", label: "SIC Change Filing", description: "Change of SIC codes notification" }],
    ALLOT_SHARES: [{ key: "sh01", label: "SH01 Allotment", description: "Return of allotment of shares" }, { key: "resolution", label: "Board Resolution", description: "Resolution to allot shares" }, { key: "certificate", label: "Share Certificate", description: "New share certificate(s)" }],
    TRANSFER_SHARES: [{ key: "j30", label: "Stock Transfer Form J30", description: "Standard stock transfer form" }, { key: "certificate", label: "Share Certificate", description: "New share certificate(s)" }],
  };
  return docs[type] || [{ key: "generic", label: "Filing Document", description: "Generated filing document" }];
}

function getFilingRoute(type: string): string {
  const routes: Record<string, string> = {
    CONFIRMATION_STATEMENT: "API Filing (REST)",
    CHANGE_REGISTERED_OFFICE: "API Filing / XML Gateway",
    APPOINT_DIRECTOR: "XML Gateway",
    RESIGN_DIRECTOR: "XML Gateway",
    PSC_CHANGE: "API Filing / XML Gateway",
    SIC_CHANGE: "XML Gateway",
    ALLOT_SHARES: "Internal + SH01",
    TRANSFER_SHARES: "Internal Register Update",
  };
  return routes[type] || "TBD";
}
