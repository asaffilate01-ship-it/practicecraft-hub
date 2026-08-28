import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

/**
 * HMRC OAuth callback handler.
 * 
 * URL: /auth-redirect?code=...&state=<opaque single-use value>
 * 
 * 1. Captures the authorization code from HMRC
 * 2. Calls the HMRC edge function to exchange it for tokens
 * 3. Stores application-encrypted tokens in server-only integration storage
 * 4. Redirects back to the relevant client page
 */
export default function HmrcCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Connecting to HMRC...");
  const [clientId, setClientId] = useState<string | null>(null);

  useEffect(() => {
    const code = params.get("code");
    const state = params.get("state");
    const error = params.get("error");
    const errorDescription = params.get("error_description");

    if (error) {
      setStatus("error");
      setMessage(errorDescription || `HMRC returned error: ${error}`);
      return;
    }

    if (!code || !state) {
      setStatus("error");
      setMessage("Missing authorization code or state parameter from HMRC.");
      return;
    }

    exchangeAndStore(code, state);
  }, [params]);

  async function exchangeAndStore(code: string, state: string) {
    try {
      setMessage("Exchanging authorization code with HMRC...");

      const { data, error } = await supabase.functions.invoke("hmrc", {
        body: { action: "oauth/exchange-and-store", code, state },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "HMRC token exchange failed");

      setClientId(data.clientId || null);
      setStatus("success");
      setMessage("HMRC connected successfully. The authorisation is stored securely.");
    } catch (err: unknown) {
      console.error("HMRC OAuth error:", err);
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Failed to connect to HMRC.");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            {status === "loading" && <Loader2 className="w-5 h-5 animate-spin text-primary" />}
            {status === "success" && <CheckCircle2 className="w-5 h-5 text-primary" />}
            {status === "error" && <XCircle className="w-5 h-5 text-destructive" />}
            HMRC Authorization
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-sm text-muted-foreground">{message}</p>

          {status === "success" && (
            <Button onClick={() => navigate(clientId ? `/clients/${clientId}` : "/")}>
              Continue to {clientId ? "Client" : "Dashboard"}
            </Button>
          )}

          {status === "error" && (
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={() => navigate("/")}>
                Go to Dashboard
              </Button>
              <Button onClick={() => window.location.reload()}>
                Retry
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
