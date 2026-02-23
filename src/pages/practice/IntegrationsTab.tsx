import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { integrationsApi } from "@/lib/apiClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MaskedSecretInput } from "@/components/MaskedSecretInput";
import { Building2, Shield, CheckCircle2, XCircle, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export function IntegrationsTab() {
  const qc = useQueryClient();

  const statusQ = useQuery({
    queryKey: ["integration-status"],
    queryFn: () => integrationsApi.status(),
    staleTime: 60_000,
  });

  const chResetMut = useMutation({
    mutationFn: () => integrationsApi.chReset(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["integration-status"] });
      toast.success("Companies House credentials reset");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const hmrcResetMut = useMutation({
    mutationFn: () => integrationsApi.hmrcReset(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["integration-status"] });
      toast.success("HMRC credentials reset");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const status = statusQ.data;

  const integrations = [
    {
      key: "companiesHouse",
      title: "Companies House",
      description: "REST API + XML Gateway for secretarial filings",
      icon: Building2,
      enabled: status?.companiesHouse?.enabled,
      wizardUrl: "/practice/integrations/companies-house",
      onReset: () => chResetMut.mutate(),
      isResetting: chResetMut.isPending,
      secretLabel: "REST API Key",
      secretValue: status?.companiesHouse?.apiKey || "",
      extraFields: [
        { label: "Presenter ID", value: status?.companiesHouse?.presenterId || "—" },
      ],
    },
    {
      key: "hmrc",
      title: "HMRC",
      description: "MTD VAT, PAYE RTI, and Self Assessment APIs",
      icon: Shield,
      enabled: status?.hmrc?.enabled,
      wizardUrl: "/practice/integrations/hmrc",
      onReset: () => hmrcResetMut.mutate(),
      isResetting: hmrcResetMut.isPending,
      secretLabel: "Client Secret",
      secretValue: status?.hmrc?.clientSecret || "",
      extraFields: [
        { label: "Client ID", value: status?.hmrc?.clientId || "—" },
        { label: "Environment", value: status?.hmrc?.environment || "—" },
      ],
    },
  ];

  return (
    <div className="space-y-4">
      {integrations.map((integ) => (
        <Card key={integ.key}>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <integ.icon className="w-4 h-4" /> {integ.title}
              </CardTitle>
              <CardDescription>{integ.description}</CardDescription>
            </div>
            <Badge variant={integ.enabled ? "default" : "outline"} className="gap-1">
              {integ.enabled
                ? <><CheckCircle2 className="w-3 h-3" /> Connected</>
                : <><XCircle className="w-3 h-3" /> Not configured</>}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            <MaskedSecretInput
              label={integ.secretLabel}
              value={integ.secretValue}
              isMasked={integ.enabled || false}
              onChange={() => {}}
              onReset={integ.onReset}
              help="Stored encrypted. Reset to re-enter."
            />
            {integ.extraFields?.map((f) => (
              <div key={f.label} className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">{f.label}</label>
                <div className="text-sm font-mono bg-muted rounded-md px-3 py-2">{f.value}</div>
              </div>
            ))}
            <div className="flex gap-2 pt-1">
              <Button variant="outline" size="sm" asChild className="gap-1.5">
                <a href={integ.wizardUrl}>
                  <ExternalLink className="w-3 h-3" /> Open Wizard
                </a>
              </Button>
              {integ.enabled && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={integ.onReset}
                  disabled={integ.isResetting}
                  className="gap-1"
                >
                  {integ.isResetting ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                  Reset All
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
