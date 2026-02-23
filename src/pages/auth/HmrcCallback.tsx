import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

/**
 * HMRC OAuth callback handler.
 * 
 * URL: /auth-redirect?code=...&state=clientId:tenantId:scopes
 * 
 * 1. Captures the authorization code from HMRC
 * 2. Calls the HMRC edge function to exchange it for tokens
 * 3. Stores the tokens encrypted in client_credentials
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

    // Parse state: clientId:tenantId:scopes
    const [parsedClientId, parsedTenantId, scopeStr] = state.split(":");
    setClientId(parsedClientId);

    exchangeAndStore(code, parsedClientId, parsedTenantId, scopeStr);
  }, []);

  async function exchangeAndStore(code: string, clientId: string, tenantId: string, scopeStr: string) {
    try {
      setMessage("Exchanging authorization code with HMRC...");

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/hmrc/oauth/exchange-and-store`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            code,
            redirectUri: "https://www.iqadvisory.co.uk/auth-redirect",
            clientId,
            tenantId,
            scopes: scopeStr || "read:vat write:vat",
          }),
        }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Exchange failed with status ${res.status}`);
      }

      setStatus("success");
      setMessage("HMRC connected successfully! Tokens stored securely.");
    } catch (err: any) {
      console.error("HMRC OAuth error:", err);
      setStatus("error");
      setMessage(err.message || "Failed to connect to HMRC.");
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
