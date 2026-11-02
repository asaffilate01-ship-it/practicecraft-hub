import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck } from "lucide-react";

type Result = { state: "checking" | "working" | "saved" | "failed"; message: string };
export default function BankOAuthCallback() {
  const { user } = useAuth();
  const { tenantId, can, loading } = usePermissions();
  const started = useRef(false);
  const [result, setResult] = useState<Result>({
    state: "checking", message: "Verifying the mock-bank callback and staff access…",
  });
  useEffect(() => {
    if (!user || !tenantId || loading || started.current) return;
    started.current = true;
    // OAuth authorisation codes and state are ephemeral. Remove them from the
    // address bar before any rendering of a status or retry screen.
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");
    const providerError = params.get("error");
    window.history.replaceState(window.history.state, "", window.location.pathname);
    if (!can("ledger", "edit") || !can("integrations", "edit")) {
      setResult({ state: "failed", message: "You do not have permission to finalise this sandbox consent." });
      return;
    }
    if (providerError) {
      setResult({ state: "failed", message: "Mock-bank authorisation was declined or cancelled. Start a new attempt." });
      return;
    }
    if (!code || !state) {
      setResult({ state: "failed", message: "No valid sandbox authorisation callback was received." });
      return;
    }
    setResult({ state: "working", message: "Verifying one-use state and storing the sandbox credential securely…" });
    void (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("open-banking", {
          body: { action: "complete_consent", code, state },
        });
        if (error || data?.status !== "authorised_unlinked") {
          throw new Error("Consent could not be verified");
        }
        setResult({
          state: "saved",
          message: "Mock-bank consent was verified and saved. No live bank account is linked and no transaction was imported.",
        });
      } catch {
        setResult({
          state: "failed",
          message: "Sandbox consent could not be completed. The one-use code cannot be retried; start a new session.",
        });
      }
    })();
  }, [user, tenantId, loading, can]);

  return (
    <div className="mx-auto max-w-lg py-10">
      <Card className="workspace-panel">
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5"/> Bank consent verification</CardTitle>
            <Badge variant="secondary">Sandbox only</Badge>
          </div>
          <CardDescription>
            A fictitious bank authorisation test, not a live banking connection or a consent expiry guarantee.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <p role="status" className={result.state === "failed" ? "text-sm text-destructive" : "text-sm text-muted-foreground"}>
            {result.message}
          </p>
          <Button asChild variant="outline" disabled={result.state === "working"}>
            <Link to="/bank-feeds">Back to bank imports</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
