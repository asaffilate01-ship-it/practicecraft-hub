import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/hooks/usePermissions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
  Eye,
  EyeOff,
  Plus,
  Pencil,
  Trash2,
  KeyRound,
  Building2,
  ShieldCheck,
  Lock,
} from "lucide-react";
import { toast } from "sonner";

interface CredentialsTabProps {
  clientId: string;
}

type Credential = {
  id: string;
  provider: string;
  credential_type: string;
  ciphertext: string;
  metadata_json: Record<string, any>;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
};

const PROVIDER_LABELS: Record<string, string> = {
  companies_house: "Companies House",
  hmrc: "HMRC",
};

const TYPE_LABELS: Record<string, string> = {
  auth_code: "Auth Code",
  director_verification_code: "Director Verification Code",
  psc_verification_code: "PSC Verification Code",
  gateway_id: "Government Gateway ID",
  gateway_password: "Government Gateway Password",
};

const TYPE_ICONS: Record<string, typeof KeyRound> = {
  auth_code: Building2,
  director_verification_code: ShieldCheck,
  psc_verification_code: ShieldCheck,
  gateway_id: KeyRound,
  gateway_password: Lock,
};

function MaskedValue({ value, alwaysMask = false }: { value: string; alwaysMask?: boolean }) {
  const [visible, setVisible] = useState(false);

  if (alwaysMask && !visible) {
    return (
      <div className="flex items-center gap-2">
        <span className="font-mono text-sm">{"•".repeat(Math.min(value.length, 12))}</span>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setVisible(true)}>
          <Eye className="w-3.5 h-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-sm">{visible || !alwaysMask ? value : "•".repeat(12)}</span>
      {alwaysMask && (
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setVisible(false)}>
          <EyeOff className="w-3.5 h-3.5" />
        </Button>
      )}
    </div>
  );
}

export function CredentialsTab({ clientId }: CredentialsTabProps) {
  const queryClient = useQueryClient();
  const { tenantId, can } = usePermissions();
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
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_credentials")
        .select("*")
        .eq("client_id", clientId)
        .order("provider", { ascending: true })
        .order("credential_type", { ascending: true });
      if (error) throw error;
      return data as Credential[];
    },
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
      const metadata: Record<string, any> = {};
      if (personName) metadata.person_name = personName;

      if (isEdit && editCred) {
        const { error } = await supabase
          .from("client_credentials")
          .update({
            ciphertext: value,
            metadata_json: metadata,
            expires_at: expiresAt || null,
          })
          .eq("id", editCred.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("client_credentials").insert({
          client_id: clientId,
          tenant_id: tenantId!,
          provider,
          credential_type: credType,
          ciphertext: value,
          metadata_json: metadata,
          expires_at: expiresAt || null,
        });
        if (error) throw error;
      }
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
      const { error } = await supabase.from("client_credentials").delete().eq("id", id);
      if (error) throw error;
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
    setValue(cred.ciphertext);
    setPersonName(cred.metadata_json?.person_name || "");
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
    return [
      { value: "gateway_id", label: "Government Gateway ID" },
      { value: "gateway_password", label: "Government Gateway Password" },
    ];
  };

  const needsPersonName = credType === "director_verification_code" || credType === "psc_verification_code";

  // Group credentials by provider
  const chCreds = credentials.filter((c) => c.provider === "companies_house");
  const hmrcCreds = credentials.filter((c) => c.provider === "hmrc");

  const renderCredCard = (cred: Credential) => {
    const Icon = TYPE_ICONS[cred.credential_type] || KeyRound;
    const meta = cred.metadata_json || {};

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
            {meta.person_name && (
              <div className="text-xs text-muted-foreground">{meta.person_name}</div>
            )}
            <MaskedValue value={cred.ciphertext} alwaysMask />
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
            Securely stored authentication codes and gateway credentials
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

      {/* HMRC section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <KeyRound className="w-4 h-4" /> HMRC Government Gateway
          </CardTitle>
          <CardDescription className="text-xs">
            Gateway User ID and password for HMRC services
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {hmrcCreds.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">No HMRC Gateway credentials stored.</p>
          ) : (
            hmrcCreds.map(renderCredCard)
          )}
        </CardContent>
      </Card>

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
              <Select value={provider} onValueChange={(v) => { setProvider(v); setCredType(v === "companies_house" ? "auth_code" : "gateway_id"); }} disabled={!!editCred}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="companies_house">Companies House</SelectItem>
                  <SelectItem value="hmrc">HMRC</SelectItem>
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
