import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/hooks/usePermissions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plug, CheckCircle2, XCircle, ExternalLink, Receipt, Building2, CreditCard, Landmark } from "lucide-react";
import { useNavigate } from "react-router-dom";

const integrations = [
  { key: "hmrc", label: "HMRC (MTD)", description: "VAT, Self Assessment, PAYE RTI submissions", icon: Receipt, route: "/practice/integrations/hmrc" },
  { key: "companies_house", label: "Companies House", description: "Secretarial filings, company profile sync", icon: Building2, route: "/practice/integrations/companies-house" },
  { key: "stripe", label: "Stripe", description: "Client invoice payments and subscriptions", icon: CreditCard, route: null },
  { key: "gocardless", label: "GoCardless", description: "Direct Debit collections", icon: CreditCard, route: null },
  { key: "open_banking", label: "Open Banking (TrueLayer)", description: "Bank feed imports and reconciliation", icon: Landmark, route: null },
];

export default function IntegrationsHub() {
  const { tenantId } = usePermissions();
  const navigate = useNavigate();

  const { data: health, isLoading } = useQuery({
    queryKey: ["integration-health", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("integration_health")
        .select("*");
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  const getStatus = (key: string) => {
    const h = health?.find((h: any) => h.provider === key);
    return h ? { status: h.status, lastCheck: h.last_checked_at } : null;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Integrations</h1>
        <p className="text-muted-foreground">Connect to HMRC, Companies House, payment providers, and banking APIs.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {integrations.map((int) => {
          const Icon = int.icon;
          const st = getStatus(int.key);
          return (
            <Card key={int.key} className="hover:border-primary/50 transition-colors">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-muted"><Icon className="h-5 w-5" /></div>
                  <div className="flex-1">
                    <span>{int.label}</span>
                    <CardDescription className="mt-0.5">{int.description}</CardDescription>
                  </div>
                  {st ? (
                    <Badge variant={st.status === "connected" ? "default" : st.status === "error" ? "destructive" : "secondary"}>
                      {st.status === "connected" ? <><CheckCircle2 className="h-3 w-3 mr-1" /> Connected</> :
                       st.status === "error" ? <><XCircle className="h-3 w-3 mr-1" /> Error</> : st.status}
                    </Badge>
                  ) : (
                    <Badge variant="outline">Not configured</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  {st?.lastCheck && (
                    <p className="text-xs text-muted-foreground">Last checked: {new Date(st.lastCheck).toLocaleString("en-GB")}</p>
                  )}
                  {int.route ? (
                    <Button variant="outline" size="sm" onClick={() => navigate(int.route!)}>
                      Configure <ExternalLink className="h-3 w-3 ml-1" />
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" disabled>Configure</Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
