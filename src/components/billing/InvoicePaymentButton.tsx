import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { CreditCard, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface Props {
  invoiceId: string;
  checkoutUrl?: string | null;
}

export function InvoicePaymentButton({ invoiceId, checkoutUrl }: Props) {
  const { tenantId } = usePermissions();
  const [loading, setLoading] = useState(false);

  if (checkoutUrl) {
    return (
      <Button variant="outline" size="sm" className="gap-1.5" asChild>
        <a href={checkoutUrl} target="_blank" rel="noreferrer">
          <ExternalLink className="w-3.5 h-3.5" /> Pay Online
        </a>
      </Button>
    );
  }

  const handleCreate = async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("stripe", {
        body: { action: "create-invoice-payment", invoiceId, tenantId },
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
        toast.success("Payment link created");
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to create payment link");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={handleCreate} disabled={loading} className="gap-1.5">
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CreditCard className="w-3.5 h-3.5" />}
      Generate Payment Link
    </Button>
  );
}
