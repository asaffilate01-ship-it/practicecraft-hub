import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpenCheck, Building2, Plus, Users } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/hooks/usePermissions";
import { useClientContext } from "@/contexts/ClientContext";
import { WorkspacePageHeader } from "@/components/layout/WorkspacePageHeader";

export default function PartnershipsWorkbench() {
  const { tenantId } = usePermissions();
  const queryClient = useQueryClient();
  const sb = supabase as any;
  const [clientId, setClientId] = useState("");
  const { selectedClientId, selectClient } = useClientContext();

  const { data: clients = [] } = useQuery({
    queryKey: ["partnership-clients", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("id,legal_name,entity_type,status").in("entity_type", ["partnership", "llp"]).order("legal_name");
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });
  useEffect(() => {
    if (clientId) return;
    const selectedClient = clients.find((client) => client.id === selectedClientId) ?? clients[0];
    if (selectedClient) setClientId(selectedClient.id);
  }, [clients, clientId, selectedClientId]);
  const selected = clients.find((client) => client.id === clientId);
  const chooseClient = (id: string) => {
    setClientId(id);
    const client = clients.find((item) => item.id === id);
    if (client) selectClient(client.id, client.legal_name);
  };

  const { data: profile } = useQuery({
    queryKey: ["partnership-profile", clientId],
    queryFn: async () => (await sb.from("partnership_profiles").select("*").eq("client_id", clientId).maybeSingle()).data,
    enabled: !!clientId,
  });
  const { data: partners = [] } = useQuery({
    queryKey: ["partners", clientId],
    queryFn: async () => (await sb.from("partners").select("id,display_name,partner_type,profit_share_percent,left_at").eq("client_id", clientId).order("display_name")).data || [],
    enabled: !!clientId,
  });
  const { data: returns = [] } = useQuery({
    queryKey: ["partnership-returns", clientId],
    queryFn: async () => (await sb.from("partnership_returns").select("id,tax_year,status,created_at").eq("client_id", clientId).order("tax_year", { ascending: false })).data || [],
    enabled: !!clientId,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["partnership-profile", clientId] });
    queryClient.invalidateQueries({ queryKey: ["partnership-returns", clientId] });
  };
  const setup = useMutation({
    mutationFn: async () => {
      if (!tenantId || !clientId || !selected) throw new Error("Select a partnership or LLP client");
      const { error } = await sb.from("partnership_profiles").upsert({ tenant_id: tenantId, client_id: clientId, partnership_type: selected.entity_type }, { onConflict: "client_id" });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Partnership profile created"); refresh(); },
    onError: (error: Error) => toast.error(error.message),
  });
  const addReturn = useMutation({
    mutationFn: async () => {
      if (!tenantId || !profile?.id) throw new Error("Create the partnership profile first");
      const year = new Date().getUTCFullYear();
      const { error } = await sb.from("partnership_returns").insert({ tenant_id: tenantId, client_id: clientId, partnership_profile_id: profile.id, tax_year: `${year - 1}-${String(year).slice(-2)}` });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("SA800 workspace created"); refresh(); },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="space-y-6">
      <WorkspacePageHeader eyebrow="Entity compliance" title="Partnerships & LLPs" icon={Users} description="Accounts production, partner allocations, SA800 preparation and LLP Companies House controls." actions={<Select value={clientId} onValueChange={chooseClient}><SelectTrigger className="w-full bg-card lg:w-80"><SelectValue placeholder="Select partnership or LLP" /></SelectTrigger><SelectContent>{clients.map((client) => <SelectItem key={client.id} value={client.id}>{client.legal_name} · {client.entity_type.toUpperCase()}</SelectItem>)}</SelectContent></Select>} />
      <Card className="workspace-panel border-warning/30 bg-warning/5"><CardContent className="pt-6 text-sm">SA800 and LLP filing states remain preparation-only until the current HMRC XML and Companies House iXBRL test suites are accepted. Partner allocations require explicit review before a return can be marked ready.</CardContent></Card>
      {!clients.length ? <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">Add a Partnership or LLP client to begin.</CardContent></Card> : <div className="grid gap-4 lg:grid-cols-3">
        <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Building2 className="h-4 w-4" /> Entity profile</CardTitle><CardDescription>UTR, Companies House number, accounting date and nominated partner.</CardDescription></CardHeader><CardContent className="space-y-4"><Badge variant="outline">{selected?.entity_type?.toUpperCase()}</Badge><Button className="w-full" variant="outline" onClick={() => setup.mutate()} disabled={setup.isPending}>{profile ? "Refresh profile" : "Create profile"}</Button></CardContent></Card>
        <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Users className="h-4 w-4" /> Partners</CardTitle><CardDescription>Join/leave dates, partner type and profit/loss allocation controls.</CardDescription></CardHeader><CardContent><div className="text-3xl font-semibold">{partners.filter((partner: any) => !partner.left_at).length}</div><p className="mt-2 text-xs text-muted-foreground">Active partners recorded</p></CardContent></Card>
        <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><BookOpenCheck className="h-4 w-4" /> Returns & accounts</CardTitle><CardDescription>SA800 preparation, partner statements and LLP accounts review.</CardDescription></CardHeader><CardContent className="space-y-4"><div className="text-3xl font-semibold">{returns.length}</div><Button className="w-full" variant="outline" onClick={() => addReturn.mutate()} disabled={!profile || addReturn.isPending}><Plus className="mr-1.5 h-4 w-4" /> New SA800 workspace</Button></CardContent></Card>
      </div>}
    </div>
  );
}
