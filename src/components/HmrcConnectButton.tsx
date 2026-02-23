import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface HmrcConnectButtonProps {
  clientId: string;
  tenantId: string;
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
  tenantId,
  scopes = "read:vat write:vat",
  label = "Connect to HMRC",
  connected = false,
  variant = "outline",
  size = "sm",
}: HmrcConnectButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleConnect() {
    setLoading(true);
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      const state = `${clientId}:${tenantId}:${scopes.replace(/\s/g, ",")}`;

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/hmrc/oauth/authorize-url`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            redirectUri: "https://www.iqadvisory.co.uk/auth-redirect",
            state,
            scopes: scopes.split(" "),
          }),
        }
      );

      if (!res.ok) throw new Error("Failed to get HMRC authorize URL");

      const { authorizeUrl } = await res.json();
      // Redirect user to HMRC login
      window.location.href = authorizeUrl;
    } catch (err: any) {
      console.error("HMRC connect error:", err);
      toast.error(err.message || "Failed to start HMRC connection");
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
