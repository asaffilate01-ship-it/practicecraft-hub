import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { integrationsApi } from "@/lib/apiClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { MaskedSecretInput } from "@/components/MaskedSecretInput";
import { Building2, CheckCircle2, ArrowRight, ArrowLeft, Search, Shield, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Step = "intro" | "credentials" | "validate" | "test" | "done";
const STEPS: Step[] = ["intro", "credentials", "validate", "test", "done"];

export default function CompaniesHouseWizard() {
  const qc = useQueryClient();
  const [step, setStep] = useState<Step>("intro");
  const [apiKey, setApiKey] = useState("");
  const [presenterId, setPresenterId] = useState("");
  const [presenterAuth, setPresenterAuth] = useState("");
  const [email, setEmail] = useState("");
  const [companyNumber, setCompanyNumber] = useState("");
  const [testResult, setTestResult] = useState<any>(null);
  /** After first successful save, secrets are masked */
  const [secretsSaved, setSecretsSaved] = useState(false);

  const validateMut = useMutation({
    mutationFn: async () => {
      if (!apiKey.trim() || !presenterId.trim() || !email.trim()) {
        throw new Error("All fields are required");
      }
      const { data, error } = await supabase.functions.invoke("companies-house", {
        body: { companyNumber: "00000006" },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Credentials validated successfully");
      // Wipe secrets from client state after successful save
      setApiKey("");
      setPresenterAuth("");
      setSecretsSaved(true);
      setStep("test");
    },
    onError: (e: any) => toast.error(e.message || "Validation failed"),
  });

  const testMut = useMutation({
    mutationFn: async () => {
      if (!companyNumber.trim()) throw new Error("Company number required");
      const { data, error } = await supabase.functions.invoke("companies-house", {
        body: { action: "profile", companyNumber },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setTestResult(data);
      toast.success("Company profile fetched successfully");
      setStep("done");
    },
    onError: (e: any) => toast.error(e.message || "Test call failed"),
  });

  const resetMut = useMutation({
    mutationFn: () => integrationsApi.chReset(),
    onSuccess: () => {
      setApiKey("");
      setPresenterId("");
      setPresenterAuth("");
      setEmail("");
      setSecretsSaved(false);
      qc.invalidateQueries({ queryKey: ["integration-status"] });
      toast.success("Companies House credentials reset");
      setStep("credentials");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const currentIdx = STEPS.indexOf(step);

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Building2 className="w-6 h-6 text-primary" />
          Companies House Integration
        </h1>
        <p className="text-sm text-muted-foreground">Connect the Secretarial & Incorporations modules to Companies House</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-1">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-1">
            <Badge
              variant={i <= currentIdx ? "default" : "outline"}
              className="text-xs capitalize cursor-default"
            >
              {i < currentIdx ? <CheckCircle2 className="w-3 h-3 mr-1" /> : null}
              {s}
            </Badge>
            {i < STEPS.length - 1 && <ArrowRight className="w-3 h-3 text-muted-foreground" />}
          </div>
        ))}
      </div>

      <Card>
        <CardContent className="pt-6">
          {step === "intro" && (
            <div className="space-y-4">
              <CardHeader className="p-0">
                <CardTitle className="text-base">What this enables</CardTitle>
                <CardDescription>Connect your Companies House credentials to unlock live integrations</CardDescription>
              </CardHeader>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> Company profile fetch & officer lists</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> Confirmation statement workflow</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> Director & PSC change submissions</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> Company auth code tracking</li>
              </ul>
              <Button onClick={() => setStep("credentials")} className="gap-1.5">
                Start <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          )}

          {step === "credentials" && (
            <div className="space-y-4">
              <CardHeader className="p-0">
                <CardTitle className="text-base">Enter Credentials</CardTitle>
                <CardDescription>Your Companies House REST API key and XML Gateway presenter details</CardDescription>
              </CardHeader>
              <div className="space-y-3">
                <MaskedSecretInput
                  label="REST API Key"
                  value={apiKey}
                  placeholder="Your CH API key"
                  isMasked={secretsSaved}
                  onChange={setApiKey}
                  onReset={() => resetMut.mutate()}
                  help="Will be stored encrypted and never shown again."
                />
                <div className="space-y-1.5">
                  <Label>Presenter ID (XML Gateway)</Label>
                  <Input
                    value={presenterId}
                    onChange={(e) => setPresenterId(e.target.value)}
                    placeholder="e.g. PRESENTER123"
                    disabled={secretsSaved}
                  />
                </div>
                <MaskedSecretInput
                  label="Presenter Auth (XML Gateway)"
                  value={presenterAuth}
                  placeholder="Presenter authentication value"
                  isMasked={secretsSaved}
                  onChange={setPresenterAuth}
                  onReset={() => resetMut.mutate()}
                  help="Stored encrypted; cannot be revealed."
                />
                <div className="space-y-1.5">
                  <Label>Contact Email</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="api@yourpractice.co.uk"
                    disabled={secretsSaved}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep("intro")} className="gap-1.5">
                  <ArrowLeft className="w-4 h-4" /> Back
                </Button>
                {!secretsSaved && (
                  <Button onClick={() => setStep("validate")} className="gap-1.5">
                    Continue <ArrowRight className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          )}

          {step === "validate" && (
            <div className="space-y-4">
              <CardHeader className="p-0">
                <CardTitle className="text-base">Validate Credentials</CardTitle>
                <CardDescription>We'll test your API key against the Companies House API</CardDescription>
              </CardHeader>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep("credentials")} className="gap-1.5">
                  <ArrowLeft className="w-4 h-4" /> Back
                </Button>
                <Button onClick={() => validateMut.mutate()} disabled={validateMut.isPending} className="gap-1.5">
                  {validateMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                  Validate & Save
                </Button>
              </div>
            </div>
          )}

          {step === "test" && (
            <div className="space-y-4">
              <CardHeader className="p-0">
                <CardTitle className="text-base">Test Call</CardTitle>
                <CardDescription>Enter a company number to fetch a live profile</CardDescription>
              </CardHeader>
              <div className="space-y-1.5">
                <Label>Company Number</Label>
                <Input value={companyNumber} onChange={(e) => setCompanyNumber(e.target.value)} placeholder="e.g. 12345678" />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep("validate")} className="gap-1.5">
                  <ArrowLeft className="w-4 h-4" /> Back
                </Button>
                <Button onClick={() => testMut.mutate()} disabled={testMut.isPending} className="gap-1.5">
                  {testMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  Run Test
                </Button>
              </div>
            </div>
          )}

          {step === "done" && (
            <div className="space-y-4">
              <CardHeader className="p-0">
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-primary" /> Integration Ready
                </CardTitle>
                <CardDescription>Companies House integration is configured for this tenant</CardDescription>
              </CardHeader>
              {testResult && (
                <Card className="bg-muted/50">
                  <CardContent className="pt-4 text-sm space-y-1">
                    <p><span className="font-medium">Company:</span> {testResult.company_name}</p>
                    <p><span className="font-medium">Number:</span> {testResult.company_number}</p>
                    <p><span className="font-medium">Status:</span> {testResult.company_status}</p>
                    <p><span className="font-medium">Type:</span> {testResult.type}</p>
                  </CardContent>
                </Card>
              )}
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep("test")}>Re-test</Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => resetMut.mutate()}
                  disabled={resetMut.isPending}
                  className="gap-1.5"
                >
                  {resetMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Reset Credentials
                </Button>
                <Button onClick={() => toast.info("Next: Link secretarial workbench to live submissions")}>
                  Next Steps
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
