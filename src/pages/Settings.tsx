import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { integrationsApi } from "@/lib/apiClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { MaskedSecretInput } from "@/components/MaskedSecretInput";
import { Upload, Palette, Building2, User, Shield, Plug, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { RoleEditor } from "@/components/settings/RoleEditor";

export default function Settings() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user!.id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: tenant, isLoading } = useQuery({
    queryKey: ["tenant", profile?.tenant_id],
    queryFn: async () => {
      const { data, error } = await supabase.from("tenants").select("*").eq("id", profile!.tenant_id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.tenant_id,
  });

  const [firmForm, setFirmForm] = useState<any>(null);
  const [profileForm, setProfileForm] = useState<any>(null);

  // Initialize forms when data loads
  const firm = firmForm ?? tenant;
  const prof = profileForm ?? profile;

  const updateTenant = useMutation({
    mutationFn: async (updates: any) => {
      const { error } = await supabase.from("tenants").update(updates).eq("id", tenant!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant"] });
      setFirmForm(null);
      toast.success("Settings saved");
    },
    onError: (e) => toast.error(e.message),
  });

  const updateProfile = useMutation({
    mutationFn: async (updates: any) => {
      const { error } = await supabase.from("profiles").update(updates).eq("id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      setProfileForm(null);
      toast.success("Profile updated");
    },
    onError: (e) => toast.error(e.message),
  });

  const uploadLogo = async (file: File) => {
    if (!tenant) return;
    const ext = file.name.split(".").pop();
    const path = `${tenant.id}/logo.${ext}`;

    const { error: uploadError } = await supabase.storage.from("tenant-assets").upload(path, file, { upsert: true });
    if (uploadError) { toast.error(uploadError.message); return; }

    const { data: urlData } = supabase.storage.from("tenant-assets").getPublicUrl(path);
    updateTenant.mutate({ logo_url: urlData.publicUrl });
  };

  if (isLoading || !tenant || !profile) {
    return <div className="flex items-center justify-center py-20"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your practice settings and branding</p>
      </div>

      <Tabs defaultValue="branding">
        <TabsList>
          <TabsTrigger value="branding" className="gap-1.5"><Palette className="w-3.5 h-3.5" /> Branding</TabsTrigger>
          <TabsTrigger value="firm" className="gap-1.5"><Building2 className="w-3.5 h-3.5" /> Firm Details</TabsTrigger>
          <TabsTrigger value="profile" className="gap-1.5"><User className="w-3.5 h-3.5" /> My Profile</TabsTrigger>
          <TabsTrigger value="integrations" className="gap-1.5"><Plug className="w-3.5 h-3.5" /> Integrations</TabsTrigger>
          <TabsTrigger value="roles" className="gap-1.5"><Shield className="w-3.5 h-3.5" /> Roles & Permissions</TabsTrigger>
        </TabsList>

        {/* Branding Tab */}
        <TabsContent value="branding" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Logo</CardTitle>
              <CardDescription>Upload your practice logo for white-label branding</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-6">
                <div className="w-24 h-24 rounded-xl border-2 border-dashed border-border flex items-center justify-center bg-muted/30 overflow-hidden">
                  {firm?.logo_url ? (
                    <img src={firm.logo_url} alt="Logo" className="w-full h-full object-contain p-2" />
                  ) : (
                    <Upload className="w-8 h-8 text-muted-foreground" />
                  )}
                </div>
                <div className="space-y-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) uploadLogo(file);
                    }}
                  />
                  <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="w-3.5 h-3.5 mr-1.5" /> Upload Logo
                  </Button>
                  <p className="text-xs text-muted-foreground">PNG, JPG or SVG. Max 2MB.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Brand Colours</CardTitle>
              <CardDescription>Customise your practice colour scheme</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Primary Colour</Label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={firm?.brand_primary_color || "#0EA5E9"}
                      onChange={(e) => setFirmForm({ ...firm, brand_primary_color: e.target.value })}
                      className="w-10 h-10 rounded-lg border cursor-pointer"
                    />
                    <Input
                      value={firm?.brand_primary_color || "#0EA5E9"}
                      onChange={(e) => setFirmForm({ ...firm, brand_primary_color: e.target.value })}
                      className="font-mono text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Secondary Colour</Label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={firm?.brand_secondary_color || "#0F172A"}
                      onChange={(e) => setFirmForm({ ...firm, brand_secondary_color: e.target.value })}
                      className="w-10 h-10 rounded-lg border cursor-pointer"
                    />
                    <Input
                      value={firm?.brand_secondary_color || "#0F172A"}
                      onChange={(e) => setFirmForm({ ...firm, brand_secondary_color: e.target.value })}
                      className="font-mono text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div className="rounded-xl border p-4 space-y-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Preview</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: firm?.brand_primary_color || "#0EA5E9" }}>
                    IQ
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: firm?.brand_secondary_color || "#0F172A" }}>
                      {firm?.firm_name || "Your Practice"}
                    </p>
                    <p className="text-xs text-muted-foreground">Practice Management</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" style={{ backgroundColor: firm?.brand_primary_color || "#0EA5E9" }}>Primary Button</Button>
                  <Button size="sm" variant="outline" style={{ borderColor: firm?.brand_primary_color || "#0EA5E9", color: firm?.brand_primary_color || "#0EA5E9" }}>Secondary</Button>
                </div>
              </div>

              <Button onClick={() => updateTenant.mutate({ brand_primary_color: firm?.brand_primary_color, brand_secondary_color: firm?.brand_secondary_color })} disabled={updateTenant.isPending}>
                {updateTenant.isPending ? "Saving..." : "Save Brand Colours"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Firm Details Tab */}
        <TabsContent value="firm" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Practice Information</CardTitle>
              <CardDescription>Your firm's contact and business details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Firm Name</Label>
                  <Input
                    value={firm?.firm_name || ""}
                    onChange={(e) => setFirmForm({ ...firm, firm_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Trading Name</Label>
                  <Input
                    value={firm?.trading_name || ""}
                    onChange={(e) => setFirmForm({ ...firm, trading_name: e.target.value })}
                    placeholder="Optional"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Support Email</Label>
                  <Input
                    type="email"
                    value={firm?.support_email || ""}
                    onChange={(e) => setFirmForm({ ...firm, support_email: e.target.value })}
                    placeholder="support@yourfirm.co.uk"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    value={firm?.phone || ""}
                    onChange={(e) => setFirmForm({ ...firm, phone: e.target.value })}
                    placeholder="020 1234 5678"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Primary Domain</Label>
                  <Input
                    value={firm?.primary_domain || ""}
                    onChange={(e) => setFirmForm({ ...firm, primary_domain: e.target.value })}
                    placeholder="portal.yourfirm.co.uk"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Timezone</Label>
                  <Input
                    value={firm?.timezone || "Europe/London"}
                    onChange={(e) => setFirmForm({ ...firm, timezone: e.target.value })}
                  />
                </div>
              </div>
              <Separator />
              <Button
                onClick={() => updateTenant.mutate({
                  firm_name: firm?.firm_name,
                  trading_name: firm?.trading_name || null,
                  support_email: firm?.support_email || null,
                  phone: firm?.phone || null,
                  primary_domain: firm?.primary_domain || null,
                  timezone: firm?.timezone || "Europe/London",
                })}
                disabled={updateTenant.isPending}
              >
                {updateTenant.isPending ? "Saving..." : "Save Firm Details"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Profile Tab */}
        <TabsContent value="profile" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Your Profile</CardTitle>
              <CardDescription>Manage your personal information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input
                    value={prof?.full_name || ""}
                    onChange={(e) => setProfileForm({ ...prof, full_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={user?.email || ""} disabled className="bg-muted" />
                </div>
              </div>
              <Button
                onClick={() => updateProfile.mutate({ full_name: prof?.full_name })}
                disabled={updateProfile.isPending}
              >
                {updateProfile.isPending ? "Saving..." : "Update Profile"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Integrations Tab */}
        <TabsContent value="integrations" className="mt-4 space-y-4">
          <IntegrationsSettings />
        </TabsContent>

        {/* Roles & Permissions Tab */}
        <TabsContent value="roles" className="mt-4">
          <RoleEditor />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/** Integrations settings — shows masked secrets with reset buttons */
function IntegrationsSettings() {
  const qc = useQueryClient();

  const statusQ = useQuery({
    queryKey: ["integration-status"],
    queryFn: () => integrationsApi.status(),
    staleTime: 60_000,
  });

  const chResetMut = useMutation({
    mutationFn: () => integrationsApi.chReset(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["integration-status"] });
      toast.success("Companies House credentials reset");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const hmrcResetMut = useMutation({
    mutationFn: () => integrationsApi.hmrcReset(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["integration-status"] });
      toast.success("HMRC credentials reset");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const status = statusQ.data;

  return (
    <div className="space-y-4">
      {/* Companies House */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="w-4 h-4" /> Companies House
            </CardTitle>
            <CardDescription>REST API + XML Gateway for secretarial filings</CardDescription>
          </div>
          <Badge variant={status?.companiesHouse?.enabled ? "default" : "outline"} className="gap-1">
            {status?.companiesHouse?.enabled
              ? <><CheckCircle2 className="w-3 h-3" /> Connected</>
              : <><XCircle className="w-3 h-3" /> Not configured</>}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          <MaskedSecretInput
            label="REST API Key"
            value={status?.companiesHouse?.apiKey || ""}
            isMasked={status?.companiesHouse?.enabled || false}
            onChange={() => {}}
            onReset={() => chResetMut.mutate()}
            help="Stored encrypted. Reset to re-enter."
          />
          <div className="space-y-1.5">
            <Label>Presenter ID</Label>
            <Input value={status?.companiesHouse?.presenterId || "—"} disabled className="bg-muted" />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <a href="/practice/integrations/companies-house">Open Wizard</a>
            </Button>
            {status?.companiesHouse?.enabled && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => chResetMut.mutate()}
                disabled={chResetMut.isPending}
                className="gap-1"
              >
                {chResetMut.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                Reset All
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* HMRC */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="w-4 h-4" /> HMRC
            </CardTitle>
            <CardDescription>MTD VAT, Self Assessment, RTI Payroll via OAuth2</CardDescription>
          </div>
          <Badge variant="outline" className="gap-1">
            <XCircle className="w-3 h-3" /> Check wizard
          </Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          <MaskedSecretInput
            label="Client Secret"
            value="***"
            isMasked={true}
            onChange={() => {}}
            onReset={() => hmrcResetMut.mutate()}
            help="Reset clears OAuth tokens too."
          />
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <a href="/practice/integrations/hmrc">Open Wizard</a>
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => hmrcResetMut.mutate()}
              disabled={hmrcResetMut.isPending}
              className="gap-1"
            >
              {hmrcResetMut.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
              Reset All
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
