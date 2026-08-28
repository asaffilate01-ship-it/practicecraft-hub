import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building, Gift, Landmark, Plus, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/hooks/usePermissions";

const today = () => new Date().toISOString().slice(0, 10);
const yearStart = () => `${new Date().getUTCFullYear()}-01-01`;

export default function CharitiesWorkbench() {
  const { tenantId } = usePermissions();
  const queryClient = useQueryClient();
  const sb = supabase as any;
  const [clientId, setClientId] = useState("");

  const { data: clients = [] } = useQuery({
    queryKey: ["charity-clients", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("id,legal_name,status").eq("entity_type", "charity").order("legal_name");
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  useEffect(() => {
    if (!clientId && clients[0]?.id) setClientId(clients[0].id);
  }, [clients, clientId]);

  const { data: profile } = useQuery({
    queryKey: ["charity-profile", clientId],
    queryFn: async () => {
      const { data, error } = await sb.from("charity_profiles").select("*").eq("client_id", clientId).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });

  const { data: claims = [] } = useQuery({
    queryKey: ["gift-aid-claims", clientId],
    queryFn: async () => (await sb.from("gift_aid_claims").select("*").eq("client_id", clientId).order("created_at", { ascending: false })).data || [],
    enabled: !!clientId,
  });

  const { data: annualReturns = [] } = useQuery({
    queryKey: ["charity-annual-returns", clientId],
    queryFn: async () => (await sb.from("charity_annual_returns").select("*").eq("client_id", clientId).order("financial_year_end", { ascending: false })).data || [],
    enabled: !!clientId,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["charity-profile", clientId] });
    queryClient.invalidateQueries({ queryKey: ["gift-aid-claims", clientId] });
    queryClient.invalidateQueries({ queryKey: ["charity-annual-returns", clientId] });
  };

  const setup = useMutation({
    mutationFn: async () => {
      if (!tenantId || !clientId) throw new Error("Select a charity client");
      const { data, error } = await sb.from("charity_profiles").upsert({ tenant_id: tenantId, client_id: clientId, legal_structure: "cio" }, { onConflict: "client_id" }).select().single();
      if (error) throw error;
      await sb.from("charity_applications").insert({ tenant_id: tenantId, client_id: clientId, charity_profile_id: data.id, application_type: "registration" });
    },
    onSuccess: () => { toast.success("Charity setup workspace created"); refresh(); },
    onError: (error: Error) => toast.error(error.message),
  });

  const addClaim = useMutation({
    mutationFn: async () => {
      if (!tenantId || !clientId || !profile?.id) throw new Error("Create the charity profile first");
      const { error } = await sb.from("gift_aid_claims").insert({
        tenant_id: tenantId, client_id: clientId, charity_profile_id: profile.id,
        claim_reference: `GA-${Date.now()}`, period_start: yearStart(), period_end: today(),
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Gift Aid claim workspace created"); refresh(); },
    onError: (error: Error) => toast.error(error.message),
  });

  const addReturn = useMutation({
    mutationFn: async () => {
      if (!tenantId || !clientId || !profile?.id) throw new Error("Create the charity profile first");
      const { error } = await sb.from("charity_annual_returns").insert({ tenant_id: tenantId, client_id: clientId, charity_profile_id: profile.id, financial_year_end: today() });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Annual return workspace created"); refresh(); },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div><div className="flex items-center gap-2"><Landmark className="h-6 w-6 text-primary" /><h1 className="text-2xl font-bold">Charities</h1></div><p className="mt-1 text-sm text-muted-foreground">Registration, charity accounts, Gift Aid claims and Charity Commission annual-return preparation.</p></div>
        <Select value={clientId} onValueChange={setClientId}><SelectTrigger className="w-full lg:w-80"><SelectValue placeholder="Select charity client" /></SelectTrigger><SelectContent>{clients.map((client) => <SelectItem key={client.id} value={client.id}>{client.legal_name}</SelectItem>)}</SelectContent></Select>
      </div>

      <Card className="border-warning/30 bg-warning/5"><CardContent className="flex gap-3 pt-6 text-sm"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-warning" /><p>Gift Aid transmission remains test-only until the HMRC Charities Online XML test pack passes. Charity Commission annual returns are prepared here and then evidenced after submission through the Commission online service.</p></CardContent></Card>

      {!clients.length ? <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">Add a client with entity type “Charity” to begin.</CardContent></Card> : (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Building className="h-4 w-4" /> Charity setup</CardTitle><CardDescription>Legal structure, governing document, trustees and registration evidence.</CardDescription></CardHeader><CardContent className="space-y-4"><Badge variant="outline">{profile?.registration_status?.replaceAll("_", " ") || "Not started"}</Badge><Button className="w-full" variant="outline" onClick={() => setup.mutate()} disabled={setup.isPending}>{profile ? "Add registration workspace" : "Create setup workspace"}</Button></CardContent></Card>
          <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Gift className="h-4 w-4" /> Gift Aid</CardTitle><CardDescription>Donation schedules, declarations, review totals and HMRC submission evidence.</CardDescription></CardHeader><CardContent className="space-y-4"><div className="text-3xl font-semibold">{claims.length}</div><p className="text-xs text-muted-foreground">Claims in this client workspace</p><Button className="w-full" variant="outline" onClick={() => addClaim.mutate()} disabled={!profile || addClaim.isPending}><Plus className="mr-1.5 h-4 w-4" /> New claim</Button></CardContent></Card>
          <Card><CardHeader><CardTitle className="text-base">Annual return</CardTitle><CardDescription>Financial data, trustee review, manual submission reference and filed evidence.</CardDescription></CardHeader><CardContent className="space-y-4"><div className="text-3xl font-semibold">{annualReturns.length}</div><p className="text-xs text-muted-foreground">Annual-return workspaces</p><Button className="w-full" variant="outline" onClick={() => addReturn.mutate()} disabled={!profile || addReturn.isPending}><Plus className="mr-1.5 h-4 w-4" /> New annual return</Button></CardContent></Card>
        </div>
      )}
    </div>
  );
}
