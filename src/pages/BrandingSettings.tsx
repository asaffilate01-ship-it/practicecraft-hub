import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Upload, Palette, Eye } from "lucide-react";
import { toast } from "sonner";

export default function BrandingSettings() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { tenantId } = usePermissions();
  const logoRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const { data: tenant } = useQuery({
    queryKey: ["tenant-branding", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.from("tenants").select("*").eq("id", tenantId!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  const [colors, setColors] = useState({
    primary: "",
    accent: "",
  });

  const primaryColor = colors.primary || (tenant as any)?.brand_primary_color || "#1e40af";
  const accentColor = colors.accent || (tenant as any)?.brand_accent_color || "#059669";

  const updateBranding = useMutation({
    mutationFn: async (updates: Record<string, any>) => {
      const { error } = await supabase.from("tenants").update(updates).eq("id", tenantId!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-branding"] });
      toast.success("Branding updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("Max 2MB"); return; }

    setUploading(true);
    try {
      const path = `${tenantId}/logo-${Date.now()}.${file.name.split(".").pop()}`;
      const { error: uploadError } = await supabase.storage.from("tenant-assets").upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("tenant-assets").getPublicUrl(path);
      await updateBranding.mutateAsync({ logo_url: urlData.publicUrl });
      toast.success("Logo uploaded");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  };

  const saveColors = () => {
    updateBranding.mutate({
      brand_primary_color: primaryColor,
      brand_accent_color: accentColor,
    });
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Branding</h1>
        <p className="text-muted-foreground">Customise your logo, colours, and client portal appearance.</p>
      </div>

      {/* Logo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Upload className="h-5 w-5" /> Practice Logo</CardTitle>
          <CardDescription>Appears on the portal, invoices, and emails. Max 2MB, PNG/SVG recommended.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {(tenant as any)?.logo_url && (
            <div className="border rounded-lg p-4 bg-muted/30 inline-block">
              <img src={(tenant as any).logo_url} alt="Logo" className="h-16 object-contain" />
            </div>
          )}
          <div>
            <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
            <Button variant="outline" onClick={() => logoRef.current?.click()} disabled={uploading}>
              {uploading ? "Uploading…" : "Upload New Logo"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Colours */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Palette className="h-5 w-5" /> Brand Colours</CardTitle>
          <CardDescription>Set primary and accent colours for your portal and documents.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Primary Colour</Label>
              <div className="flex gap-2 items-center">
                <input type="color" value={primaryColor} onChange={(e) => setColors(c => ({ ...c, primary: e.target.value }))} className="h-10 w-14 rounded border cursor-pointer" />
                <Input value={primaryColor} onChange={(e) => setColors(c => ({ ...c, primary: e.target.value }))} className="font-mono" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Accent Colour</Label>
              <div className="flex gap-2 items-center">
                <input type="color" value={accentColor} onChange={(e) => setColors(c => ({ ...c, accent: e.target.value }))} className="h-10 w-14 rounded border cursor-pointer" />
                <Input value={accentColor} onChange={(e) => setColors(c => ({ ...c, accent: e.target.value }))} className="font-mono" />
              </div>
            </div>
          </div>
          <Button onClick={saveColors} disabled={updateBranding.isPending}>Save Colours</Button>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Eye className="h-5 w-5" /> Portal Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <div className="h-14 flex items-center px-4 gap-3" style={{ backgroundColor: primaryColor }}>
              {(tenant as any)?.logo_url && <img src={(tenant as any).logo_url} alt="" className="h-8 object-contain" />}
              <span className="text-white font-semibold">{(tenant as any)?.firm_name || "Your Practice"}</span>
            </div>
            <div className="p-6 bg-background">
              <p className="text-muted-foreground text-sm">This is how your portal header will appear to clients.</p>
              <Button className="mt-4" style={{ backgroundColor: accentColor }}>Example Button</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
