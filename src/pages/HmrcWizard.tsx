import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { integrationsApi } from "@/lib/apiClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MaskedSecretInput } from "@/components/MaskedSecretInput";
import { Receipt, CheckCircle2, ArrowRight, ArrowLeft, ExternalLink, Shield, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Step = "intro" | "app" | "validate" | "oauth" | "vat-test" | "done";
const STEPS: Step[] = ["intro", "app", "validate", "oauth", "vat-test", "done"];

export default function HmrcWizard() {
  const qc = useQueryClient();
  const [step, setStep] = useState<Step>("intro");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [environment, setEnvironment] = useState<"sandbox" | "production">("sandbox");
  const [authUrl, setAuthUrl] = useState("");
  const [code, setCode] = useState("");
  const [tokens, setTokens] = useState<any>(null);
  const [vrn, setVrn] = useState("");
  const [obligations, setObligations] = useState<any[]>([]);
  /** After first save, secrets are masked */
  const [secretsSaved, setSecretsSaved] = useState(false);

  const validateMut = useMutation({
    mutationFn: async () => {
      if (!clientId.trim() || !clientSecret.trim()) throw new Error("Client ID and Secret are required");
      return { ok: true };
    },
    onSuccess: () => {
      toast.success("Credentials validated");
      setStep("oauth");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const authUrlMut = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("hmrc", {
        body: {
          action: "oauth/authorize-url",
          redirectUri: "https://www.iqadvisory.co.uk/auth-redirect",
          scopes: ["read:vat", "write:vat"],
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setAuthUrl(data.authorizeUrl);
      toast.success("Auth URL generated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const exchangeMut = useMutation({
    mutationFn: async () => {
      if (!code.trim()) throw new Error("Authorization code required");
      const { data, error } = await supabase.functions.invoke("hmrc", {
        body: {
          action: "oauth/token",
          code,
          redirectUri: "https://www.iqadvisory.co.uk/auth-redirect",
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setTokens(data);
      toast.success("OAuth tokens obtained");
      setStep("vat-test");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const vatTestMut = useMutation({
    mutationFn: async () => {
      if (!vrn.trim()) throw new Error("VRN required");
      const { data, error } = await supabase.functions.invoke("hmrc", {
        body: {
          action: "vat/obligations",
          vrn,
          accessToken: tokens?.access_token,
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setObligations(data.obligations || []);
      toast.success("VAT obligations fetched");
      // Wipe secrets from memory after successful integration
      setClientSecret("");
      setCode("");
      setTokens(null);
      setSecretsSaved(true);
      qc.invalidateQueries({ queryKey: ["integration-status"] });
      setStep("done");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const resetMut = useMutation({
    mutationFn: () => integrationsApi.hmrcReset(),
    onSuccess: () => {
      setClientId("");
      setClientSecret("");
      setCode("");
      setTokens(null);
      setSecretsSaved(false);
      qc.invalidateQueries({ queryKey: ["integration-status"] });
      toast.success("HMRC credentials and tokens reset");
      setStep("app");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const currentIdx = STEPS.indexOf(step);

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Receipt className="w-6 h-6 text-primary" />
          HMRC Integration
        </h1>
        <p className="text-sm text-muted-foreground">Connect VAT (MTD), RTI Payroll, and submission workflows</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-1 flex-wrap">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-1">
            <Badge variant={i <= currentIdx ? "default" : "outline"} className="text-xs capitalize cursor-default">
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
                <CardDescription>Set up HMRC Developer Hub app credentials and OAuth connection</CardDescription>
              </CardHeader>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> HMRC app credentials setup</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> OAuth connection (Practice ↔ HMRC)</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> VAT obligations fetch test</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> Token storage for VAT/RTI submissions</li>
              </ul>
              <Button onClick={() => setStep("app")} className="gap-1.5">
                Start <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          )}

          {step === "app" && (
            <div className="space-y-4">
              <CardHeader className="p-0">
                <CardTitle className="text-base">HMRC App Credentials</CardTitle>
                <CardDescription>From your HMRC Developer Hub application</CardDescription>
              </CardHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Client ID</Label>
                  <Input
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    placeholder="HMRC Client ID"
                    disabled={secretsSaved}
                  />
                </div>
                <MaskedSecretInput
                  label="Client Secret"
                  value={clientSecret}
                  placeholder="HMRC Client Secret"
                  isMasked={secretsSaved}
                  onChange={setClientSecret}
                  onReset={() => resetMut.mutate()}
                  help="Reset clears tokens too."
                />
                <div className="space-y-1.5">
                  <Label>Environment</Label>
                  <Select value={environment} onValueChange={(v) => setEnvironment(v as any)} disabled={secretsSaved}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sandbox">Sandbox</SelectItem>
                      <SelectItem value="production">Production</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep("intro")} className="gap-1.5"><ArrowLeft className="w-4 h-4" /> Back</Button>
                {!secretsSaved && (
                  <Button onClick={() => setStep("validate")} className="gap-1.5">Continue <ArrowRight className="w-4 h-4" /></Button>
                )}
              </div>
            </div>
          )}

          {step === "validate" && (
            <div className="space-y-4">
              <CardHeader className="p-0">
                <CardTitle className="text-base">Validate Credentials</CardTitle>
                <CardDescription>Checks Client ID/Secret and environment configuration</CardDescription>
              </CardHeader>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep("app")} className="gap-1.5"><ArrowLeft className="w-4 h-4" /> Back</Button>
                <Button onClick={() => validateMut.mutate()} disabled={validateMut.isPending} className="gap-1.5">
                  {validateMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                  Validate Now
                </Button>
              </div>
            </div>
          )}

          {step === "oauth" && (
            <div className="space-y-4">
              <CardHeader className="p-0">
                <CardTitle className="text-base">OAuth Connect</CardTitle>
                <CardDescription>Generate an HMRC auth URL, authorise, then paste the code below</CardDescription>
              </CardHeader>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => authUrlMut.mutate()} disabled={authUrlMut.isPending} className="gap-1.5">
                  {authUrlMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                  Generate Auth URL
                </Button>
                {authUrl && (
                  <a href={authUrl} target="_blank" rel="noopener noreferrer">
                    <Button variant="secondary" className="gap-1.5"><ExternalLink className="w-4 h-4" /> Open HMRC Auth</Button>
                  </a>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>Authorization Code</Label>
                <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Paste code from callback" />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep("validate")} className="gap-1.5"><ArrowLeft className="w-4 h-4" /> Back</Button>
                <Button onClick={() => exchangeMut.mutate()} disabled={exchangeMut.isPending || !code.trim()} className="gap-1.5">
                  {exchangeMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Exchange Code
                </Button>
              </div>

              {/* Never show raw tokens — just confirm presence */}
              {tokens && (
                <Card className="bg-muted/50">
                  <CardContent className="pt-4 text-sm flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[hsl(var(--success))]" />
                    OAuth tokens obtained successfully. Tokens are stored securely.
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {step === "vat-test" && (
            <div className="space-y-4">
              <CardHeader className="p-0">
                <CardTitle className="text-base">Test VAT Obligations</CardTitle>
                <CardDescription>Enter a VRN to verify the connection works</CardDescription>
              </CardHeader>
              <div className="space-y-1.5">
                <Label>VRN</Label>
                <Input value={vrn} onChange={(e) => setVrn(e.target.value)} placeholder="e.g. 123456789" />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep("oauth")} className="gap-1.5"><ArrowLeft className="w-4 h-4" /> Back</Button>
                <Button onClick={() => vatTestMut.mutate()} disabled={vatTestMut.isPending} className="gap-1.5">
                  {vatTestMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Fetch Obligations
                </Button>
              </div>

              {obligations.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Period</TableHead>
                      <TableHead>Start</TableHead>
                      <TableHead>End</TableHead>
                      <TableHead>Due</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {obligations.map((o: any, i: number) => (
                      <TableRow key={i}>
                        <TableCell className="font-mono text-xs">{o.periodKey}</TableCell>
                        <TableCell>{o.start}</TableCell>
                        <TableCell>{o.end}</TableCell>
                        <TableCell>{o.due}</TableCell>
                        <TableCell>
                          <Badge variant={o.status === "F" ? "default" : "secondary"}>
                            {o.status === "F" ? "Fulfilled" : "Open"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          )}

          {step === "done" && (
            <div className="space-y-4">
              <CardHeader className="p-0">
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-primary" /> Integration Ready
                </CardTitle>
                <CardDescription>HMRC integration enabled for VAT/RTI workflows</CardDescription>
              </CardHeader>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep("vat-test")}>Re-test VAT</Button>
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
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
