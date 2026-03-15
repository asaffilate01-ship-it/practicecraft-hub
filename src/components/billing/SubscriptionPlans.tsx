import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import { StripeCheckoutButton } from "./StripeCheckoutButton";

const plans = [
  {
    code: "starter",
    name: "Starter",
    price: "£49",
    description: "For small practices getting started",
    features: ["Up to 25 clients", "2 staff users", "Bookkeeping & VAT MTD", "Accounts production", "Document vault", "Client portal"],
    highlight: false,
  },
  {
    code: "professional",
    name: "Professional",
    price: "£99",
    description: "For growing practices",
    features: ["Up to 100 clients", "5 staff users", "Everything in Starter", "Payroll RTI", "Company secretarial", "AML/KYC workbench", "Time recording & WIP", "Email templates"],
    highlight: true,
  },
  {
    code: "enterprise",
    name: "Enterprise",
    price: "£199",
    description: "For established firms",
    features: ["Unlimited clients", "Unlimited users", "Everything in Professional", "White-label portal", "Priority support", "Custom branding", "API access", "Dedicated onboarding"],
    highlight: false,
  },
];

interface Props {
  currentPlan?: string;
}

export function SubscriptionPlans({ currentPlan }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {plans.map((plan) => {
        const isCurrent = currentPlan === plan.code;
        return (
          <Card
            key={plan.code}
            className={`relative ${plan.highlight ? "border-primary shadow-lg" : ""}`}
          >
            {plan.highlight && (
              <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
                Most Popular
              </Badge>
            )}
            <CardHeader>
              <CardTitle className="text-lg">{plan.name}</CardTitle>
              <CardDescription>{plan.description}</CardDescription>
              <div className="pt-2">
                <span className="text-3xl font-bold">{plan.price}</span>
                <span className="text-muted-foreground text-sm">/month</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              {isCurrent ? (
                <Badge variant="secondary" className="w-full justify-center py-2">
                  Current Plan
                </Badge>
              ) : (
                <StripeCheckoutButton
                  planCode={plan.code}
                  label={`Upgrade to ${plan.name}`}
                  variant={plan.highlight ? "default" : "outline"}
                />
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
