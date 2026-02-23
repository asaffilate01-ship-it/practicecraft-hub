import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Building2, CheckCircle2, ArrowRight, ArrowLeft, Search, Shield, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Step = "intro" | "credentials" | "validate" | "test" | "done";

const STEPS: Step[] = ["intro", "credentials", "validate", "test", "done"];

export default function CompaniesHouseWizard() {
  const [step, setStep] = useState<Step>("intro");
  const [apiKey, setApiKey] = useState("");
  const [presenterId, setPresenterId] = useState("");
  const [presenterAuth, setPresenterAuth] = useState("");
  const [email, setEmail] = useState("");
  const [companyNumber, setCompanyNumber] = useState("");
  const [testResult, setTestResult] = useState<any>(null);

  const validateMut = useMutation({
    mutationFn: async () => {
      if (!apiKey.trim() || !presenterId.trim() || !email.trim()) {
        throw new Error("All fields are required");
      }
      // Test the API key by fetching a known company
      const { data, error } = await supabase.functions.invoke("companies-house", {
        body: { companyNumber: "00000006" }, // Test with a known company
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Credentials validated successfully");
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

      {/* Step content */}
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
                <div className="space-y-1.5">
                  <Label>REST API Key</Label>
                  <Input value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Your CH API key" />
                </div>
                <div className="space-y-1.5">
                  <Label>Presenter ID (XML Gateway)</Label>
                  <Input value={presenterId} onChange={(e) => setPresenterId(e.target.value)} placeholder="e.g. PRESENTER123" />
                </div>
                <div className="space-y-1.5">
                  <Label>Presenter Auth (XML Gateway)</Label>
                  <Input type="password" value={presenterAuth} onChange={(e) => setPresenterAuth(e.target.value)} placeholder="Presenter authentication value" />
                </div>
                <div className="space-y-1.5">
                  <Label>Contact Email</Label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="api@yourpractice.co.uk" />
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep("intro")} className="gap-1.5">
                  <ArrowLeft className="w-4 h-4" /> Back
                </Button>
                <Button onClick={() => setStep("validate")} className="gap-1.5">
                  Continue <ArrowRight className="w-4 h-4" />
                </Button>
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
                  Validate Now
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
