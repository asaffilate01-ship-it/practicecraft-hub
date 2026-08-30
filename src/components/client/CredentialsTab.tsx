import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/hooks/usePermissions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Pencil,
  Trash2,
  KeyRound,
  Building2,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { callEdgePath } from "@/lib/edgeFunctions";

interface CredentialsTabProps {
  clientId: string;
}

type Credential = {
  id: string;
  provider: string;
  credential_type: string;
  metadata_json: Record<string, unknown>;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  is_stored: boolean;
};

const TYPE_LABELS: Record<string, string> = {
  auth_code: "Auth Code",
  director_verification_code: "Director Verification Code",
  psc_verification_code: "PSC Verification Code",
};

const TYPE_ICONS: Record<string, typeof KeyRound> = {
  auth_code: Building2,
  director_verification_code: ShieldCheck,
  psc_verification_code: ShieldCheck,
};

export function CredentialsTab({ clientId }: CredentialsTabProps) {
  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const [addOpen, setAddOpen] = useState(false);
  const [editCred, setEditCred] = useState<Credential | null>(null);

  // Form state
  const [provider, setProvider] = useState("companies_house");
  const [credType, setCredType] = useState("auth_code");
  const [value, setValue] = useState("");
  const [personName, setPersonName] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  const canEdit = can("clients", "edit");

  const { data: credentials = [], isLoading } = useQuery({
    queryKey: ["client-credentials", clientId],
    queryFn: () => callEdgePath<Credential[]>("secretarial", `credentials?clientId=${encodeURIComponent(clientId)}`),
    enabled: !!clientId,
  });

  const { data: directors = [] } = useQuery({
    queryKey: ["client-directors", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_register_directors")
        .select("id, full_name, is_active")
        .eq("client_id", clientId)
        .eq("is_active", true);
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });

  const { data: pscs = [] } = useQuery({
    queryKey: ["client-pscs", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_register_psc")
        .select("id, full_name, is_active")
        .eq("client_id", clientId)
        .eq("is_active", true);
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });

  const upsertMutation = useMutation({
    mutationFn: async (isEdit: boolean) => {
      const metadata: Record<string, unknown> = {};
      if (personName) metadata.person_name = personName;

      if (!value.trim()) throw new Error("Enter the new credential value.");
      await callEdgePath("secretarial", "credentials", {
        method: "POST",
        body: JSON.stringify({
          id: isEdit ? editCred?.id : undefined,
          clientId,
          credentialType: credType,
          value,
          metadata,
          expiresAt: expiresAt || null,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-credentials", clientId] });
      resetForm();
      toast.success(editCred ? "Credential updated" : "Credential added");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await callEdgePath("secretarial", `credentials/${encodeURIComponent(id)}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-credentials", clientId] });
      toast.success("Credential deleted");
    },
    onError: (e) => toast.error(e.message),
  });

  const resetForm = () => {
    setAddOpen(false);
    setEditCred(null);
    setProvider("companies_house");
    setCredType("auth_code");
    setValue("");
    setPersonName("");
    setExpiresAt("");
  };

  const openEdit = (cred: Credential) => {
    setEditCred(cred);
    setProvider(cred.provider);
    setCredType(cred.credential_type);
    setValue("");
    setPersonName(typeof cred.metadata_json?.person_name === "string" ? cred.metadata_json.person_name : "");
    setExpiresAt(cred.expires_at?.slice(0, 10) || "");
    setAddOpen(true);
  };

  // Get credential type options based on provider
  const getTypeOptions = () => {
    if (provider === "companies_house") {
      return [
        { value: "auth_code", label: "Auth Code" },
        { value: "director_verification_code", label: "Director Verification Code" },
        { value: "psc_verification_code", label: "PSC Verification Code" },
      ];
    }
    return [];
  };

  const needsPersonName = credType === "director_verification_code" || credType === "psc_verification_code";

  // Group credentials by provider
  const chCreds = credentials.filter((c) => c.provider === "companies_house");

  const renderCredCard = (cred: Credential) => {
    const Icon = TYPE_ICONS[cred.credential_type] || KeyRound;
    const meta = cred.metadata_json || {};
    const personName = typeof meta.person_name === "string" ? meta.person_name : null;

    return (
      <div
        key={cred.id}
        className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center">
            <Icon className="w-4 h-4 text-muted-foreground" />
          </div>
          <div>
            <div className="text-sm font-medium">
              {TYPE_LABELS[cred.credential_type] || cred.credential_type}
            </div>
            {personName && (
              <div className="text-xs text-muted-foreground">{personName}</div>
            )}
            <div className="text-xs text-muted-foreground">Encrypted · value hidden</div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {cred.expires_at && (
            <Badge variant="outline" className="text-[10px] mr-2">
              Expires {new Date(cred.expires_at).toLocaleDateString("en-GB")}
            </Badge>
          )}
          {canEdit && (
            <>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(cred)}>
                <Pencil className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={() => deleteMutation.mutate(cred.id)}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </>
          )}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold">Credentials & Access</h3>
          <p className="text-sm text-muted-foreground">
            Server-encrypted Companies House authentication and identity codes
          </p>
        </div>
        {canEdit && (
          <Button size="sm" onClick={() => { resetForm(); setAddOpen(true); }}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Add Credential
          </Button>
        )}
      </div>

      {/* Companies House section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Building2 className="w-4 h-4" /> Companies House
          </CardTitle>
          <CardDescription className="text-xs">
            Auth code, director and PSC verification codes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {chCreds.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">No Companies House credentials stored.</p>
          ) : (
            chCreds.map(renderCredCard)
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        HMRC connections use the secure OAuth connection flow. Government Gateway passwords are never stored here.
      </p>

      {/* Add/Edit Dialog */}
      <Dialog open={addOpen} onOpenChange={(open) => { if (!open) resetForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editCred ? "Edit Credential" : "Add Credential"}</DialogTitle>
            <DialogDescription>
              {editCred
                ? "Update the stored credential value."
                : "Store a new credential securely for this client."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Provider</Label>
              <Select value={provider} onValueChange={setProvider} disabled>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="companies_house">Companies House</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={credType} onValueChange={setCredType} disabled={!!editCred}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getTypeOptions().map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {needsPersonName && (
              <div className="space-y-2">
                <Label>Person</Label>
                {credType === "director_verification_code" && directors.length > 0 ? (
                  <Select value={personName} onValueChange={setPersonName}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select director..." />
                    </SelectTrigger>
                    <SelectContent>
                      {directors.map((d) => (
                        <SelectItem key={d.id} value={d.full_name}>{d.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : credType === "psc_verification_code" && pscs.length > 0 ? (
                  <Select value={personName} onValueChange={setPersonName}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select PSC..." />
                    </SelectTrigger>
                    <SelectContent>
                      {pscs.map((p) => (
                        <SelectItem key={p.id} value={p.full_name}>{p.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={personName}
                    onChange={(e) => setPersonName(e.target.value)}
                    placeholder="Person's full name"
                  />
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label>
                {credType === "gateway_password" ? "Password" : "Value"}
              </Label>
              <Input
                type={credType === "gateway_password" ? "password" : "text"}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={
                  credType === "auth_code"
                    ? "e.g. AB12CD34"
                    : credType === "gateway_id"
                    ? "e.g. 123456789012"
                    : credType === "gateway_password"
                    ? "Enter password"
                    : "Verification code"
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Expires (optional)</Label>
              <Input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>Cancel</Button>
            <Button
              onClick={() => upsertMutation.mutate(!!editCred)}
              disabled={!value.trim() || upsertMutation.isPending}
            >
              {upsertMutation.isPending ? "Saving..." : editCred ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
