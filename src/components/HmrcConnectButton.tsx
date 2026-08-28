import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface HmrcConnectButtonProps {
  clientId: string;
  /** @deprecated Tenant identity is derived from the authenticated session. */
  tenantId?: string;
  /** Space-separated HMRC scopes e.g. "read:vat write:vat" */
  scopes?: string;
  /** Label for the button */
  label?: string;
  /** If already connected */
  connected?: boolean;
  variant?: "default" | "outline" | "secondary";
  size?: "default" | "sm" | "lg";
}

export function HmrcConnectButton({
  clientId,
  scopes = "read:vat write:vat",
  label = "Connect to HMRC",
  connected = false,
  variant = "outline",
  size = "sm",
}: HmrcConnectButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleConnect() {
    if (!clientId) {
      toast.error("Select a client before connecting HMRC");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("hmrc", {
        body: { action: "oauth/authorize-url", clientId, scopes: scopes.split(" ") },
      });
      if (error) throw error;
      if (!data?.authorizeUrl) throw new Error(data?.error || "Failed to get HMRC authorize URL");
      window.location.href = data.authorizeUrl;
    } catch (err: unknown) {
      console.error("HMRC connect error:", err);
      toast.error(err instanceof Error ? err.message : "Failed to start HMRC connection");
      setLoading(false);
    }
  }

  if (connected) {
    return (
      <Badge variant="outline" className="gap-1 text-xs">
        <CheckCircle2 className="w-3 h-3 text-primary" />
        HMRC Connected
      </Badge>
    );
  }

  return (
    <Button
      variant={variant}
      size={size}
      className="gap-1.5"
      onClick={handleConnect}
      disabled={loading}
    >
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <ExternalLink className="w-3.5 h-3.5" />
      )}
      {label}
    </Button>
  );
}
