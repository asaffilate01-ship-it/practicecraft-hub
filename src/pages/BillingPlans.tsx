import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, Crown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function BillingPlans() {
  const { data: plans = [], isLoading } = useQuery({
    queryKey: ["subscription-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("*")
        .order("price_monthly_pence", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: currentSub } = useQuery({
    queryKey: ["current-subscription"],
    queryFn: async () => {
      const { data } = await supabase
        .from("tenant_subscriptions")
        .select("*, subscription_plans(*)")
        .in("status", ["active", "trial"])
        .limit(1)
        .single();
      return data;
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Billing Plans</h1>
        <p className="text-sm text-muted-foreground">Manage your subscription and plan features</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-64 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan: any) => {
            const isCurrent = currentSub?.plan_id === plan.id;
            const modules: string[] = plan.allowed_modules || [];
            return (
              <Card key={plan.id} className={isCurrent ? "border-primary ring-2 ring-primary/20" : ""}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{plan.name}</CardTitle>
                    {isCurrent && <Badge><Crown className="w-3 h-3 mr-1" /> Current</Badge>}
                  </div>
                  <div className="mt-2">
                    <span className="text-3xl font-bold">£{((plan.price_monthly_pence || 0) / 100).toFixed(0)}</span>
                    <span className="text-sm text-muted-foreground">/month</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm space-y-1">
                    <div className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-success" /><span>{plan.max_clients === -1 ? "Unlimited" : plan.max_clients} clients</span></div>
                    <div className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-success" /><span>{plan.max_users === -1 ? "Unlimited" : plan.max_users} users</span></div>
                    {modules.slice(0, 5).map((m: string) => (
                      <div key={m} className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-success" /><span className="capitalize">{m.replace(/_/g, " ")}</span></div>
                    ))}
                    {modules.length > 5 && <p className="text-xs text-muted-foreground">+{modules.length - 5} more modules</p>}
                  </div>
                  {!isCurrent && (
                    <Button className="w-full" variant={plan.code === "pro" ? "default" : "outline"}>
                      {plan.price_monthly_pence > (currentSub?.subscription_plans as any)?.price_monthly_pence ? "Upgrade" : "Switch"}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
