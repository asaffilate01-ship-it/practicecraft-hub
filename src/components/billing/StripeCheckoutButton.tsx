import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { CreditCard, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  planCode: string;
  label?: string;
  variant?: "default" | "outline" | "secondary";
}

export function StripeCheckoutButton({ planCode, label, variant = "default" }: Props) {
  const { tenantId } = usePermissions();
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("stripe", {
        body: {
          action: "create-checkout",
          tenantId,
          planCode,
          successUrl: `${window.location.origin}/settings?checkout=success`,
          cancelUrl: `${window.location.origin}/settings?checkout=cancelled`,
        },
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to start checkout");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant={variant} onClick={handleCheckout} disabled={loading} className="gap-2">
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
      {label || `Upgrade to ${planCode}`}
    </Button>
  );
}
