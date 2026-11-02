import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FlaskConical, Link2Off, ShieldCheck, ExternalLink } from "lucide-react";
import { toast } from "sonner";

type Consent = {
  id: string;
  client_id: string;
  initiated_by: string;
  status: "authorised_unlinked" | "disconnected";
  account_count: number;
  token_expires_at: string;
  created_at: string;
  disconnected_at: string | null;
};
type Status = {
  enabled: boolean;
  consents_supported: boolean;
  mode: "sandbox_mock_consent" | "manual_csv_only";
  live_provider_enabled: false;
  transaction_import_enabled: false;
  message: string;
};

export function BankOAuthPilot({ selectedClientId }: { selectedClientId: string | null }) {
  const { user } = useAuth();
  const { tenantId, can, loading } = usePermissions();
  const queryClient = useQueryClient();
  const canRead = !!user && !!tenantId && !loading && can("ledger", "view");
  const canStart = canRead && can("ledger", "edit") && can("integrations", "edit");
  const status = useQuery({
    queryKey: ["taxlounge-bank-oauth-status", tenantId, user?.id],
    enabled: canRead,
    retry: false,
    staleTime: 60000,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("open-banking", {
        body: { action: "connection_status" },
      });
      if (error) throw error;
      return data as Status;
    },
  });
  const history = useQuery({
    queryKey: ["taxlounge-bank-oauth-consents", tenantId, user?.id, selectedClientId],
    enabled: canRead && status.data?.consents_supported === true,
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("open-banking", {
        body: { action: "list_consents", ...(selectedClientId ? { client_id: selectedClientId } : {}) },
      });
      if (error) throw error;
      return (data?.consents ?? []) as Consent[];
    },
  });
  const connect = useMutation({
    mutationFn: async () => {
      if (!canStart || !selectedClientId || !status.data?.enabled) {
        throw new Error("Choose an authorised client and enable sandbox pilot permissions first");
      }
      const { data, error } = await supabase.functions.invoke("open-banking", {
        body: { action: "start_consent", client_id: selectedClientId },
      });
      if (error || typeof data?.auth_url !== "string") throw new Error("Mock-bank authorisation is not available");
      const uri = new URL(data.auth_url);
      if (uri.origin !== "https://auth.truelayer-sandbox.com" ||
          uri.searchParams.get("providers") !== "uk-cs-mock") {
        throw new Error("Refusing an untrusted provider redirect");
      }
      return uri.toString();
    },
    onSuccess: authUrl => { window.location.assign(authUrl); },
    onError: (error: Error) => toast.error(error.message),
  });
  const disconnect = useMutation({
    mutationFn: async (consentId: string) => {
      if (!canStart || !status.data?.consents_supported) throw new Error("Consent changes are not authorised");
      const { data, error } = await supabase.functions.invoke("open-banking", {
        body: { action: "disconnect_consent", consent_id: consentId },
      });
      if (error || data?.locally_disconnected !== true) throw new Error("Could not remove the stored sandbox credential");
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["taxlounge-bank-oauth-consents", tenantId, user?.id] });
      toast.success("Stored mock-bank token deleted. External bank consent, if any, must be revoked separately.");
    },
    onError: (error: Error) => toast.error(error.message),
  });
  if (!canRead) return null;
  return (
    <Card className="workspace-panel">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <FlaskConical className="h-4 w-4 text-primary" />
            Open Banking consent lab
          </CardTitle>
          <Badge variant="secondary">
            {status.data?.enabled ? "Mock bank sandbox" : "Disabled for live banking"}
          </Badge>
        </div>
        <CardDescription>
          Test one-use consent and verified account access with a fictitious sandbox bank.
          This does not connect live bank accounts, refresh credentials, import bank transactions or post anything.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {status.isError && <p role="alert" className="text-sm text-destructive">
          Banking status could not be verified. Sandbox connection is unavailable.
        </p>}
        <p role="status" className="text-sm text-muted-foreground">
          {status.isLoading ? "Checking sandbox availability…" : (status.data?.message || "Live banking is unavailable. Manual CSV import remains supported.")}
        </p>
        {status.data?.enabled && (
          <>
            <Button variant="outline" disabled={!canStart || !selectedClientId || connect.isPending}
              onClick={() => connect.mutate()} className="min-h-11 w-full sm:w-auto">
              <ExternalLink className="mr-2 h-4 w-4"/>
              {connect.isPending ? "Preparing a secure redirect…" : "Test mock-bank consent"}
            </Button>
            {!selectedClientId && <p className="text-xs text-muted-foreground">Select a client workspace first; consent is always client-bound.</p>}
            {!canStart && <p className="text-xs text-muted-foreground">ledger.edit and integrations.edit permissions are required to initiate consent.</p>}
          </>
        )}
        {status.data?.consents_supported && (
          <div className="space-y-2">
              <p className="text-sm font-medium">Recent sandbox consents</p>
              {history.isError && <p role="alert" className="text-sm text-destructive">Sandbox consent history is unavailable.</p>}
              {(history.data ?? []).length === 0 && !history.isLoading &&
                <p className="text-sm text-muted-foreground">No completed sandbox consents are visible.</p>}
              {(history.data ?? []).map(consent => (
                <div key={consent.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{consent.status === "disconnected"
                      ? "Stored sandbox credential deleted"
                      : new Date(consent.token_expires_at).getTime() <= Date.now()
                        ? "Sandbox access token expired — no connection"
                        : "Sandbox consent saved — account unlinked"}</p>
                    <p className="text-xs text-muted-foreground">{consent.account_count} mock account(s) · {new Date(consent.created_at).toLocaleDateString("en-GB")}</p>
                  </div>
                  {canStart && consent.initiated_by === user?.id && consent.status !== "disconnected" &&
                    <Button variant="outline" size="sm" disabled={disconnect.isPending}
                      onClick={() => disconnect.mutate(consent.id)}>
                      <Link2Off className="mr-1.5 h-4 w-4"/>Delete stored token
                    </Button>}
                </div>
              ))}
          </div>
        )}
        <div className="flex items-start gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4 shrink-0"/>
          No provider tokens are returned to the browser. Production onboarding remains gated pending contractual, regulatory and account-linking acceptance.
        </div>
      </CardContent>
    </Card>
  );
}
