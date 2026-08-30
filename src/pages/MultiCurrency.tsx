import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileSpreadsheet, Globe, Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WorkspacePageHeader } from "@/components/layout/WorkspacePageHeader";
import { useClientContext } from "@/contexts/ClientContext";
import { usePermissions } from "@/hooks/usePermissions";
import { supabase } from "@/integrations/supabase/client";

const currencyForm = () => ({ code: "", name: "", symbol: "", exchange_rate: "" });
const entryForm = () => ({ client_id: "", customer_name: "", customer_vat_number: "", country_code: "", supply_type: "goods", value_gbp: "", period_start: "", period_end: "" });
const money = (pence: number) => `£${(pence / 100).toLocaleString("en-GB", { minimumFractionDigits: 2 })}`;

export default function MultiCurrency() {
  const queryClient = useQueryClient();
  const { tenantId } = usePermissions();
  const { selectedClientId } = useClientContext();
  const [showCurrency, setShowCurrency] = useState(false);
  const [showEntry, setShowEntry] = useState(false);
  const [newCurrency, setNewCurrency] = useState(currencyForm);
  const [newEntry, setNewEntry] = useState(entryForm);

  const { data: currencies = [] } = useQuery({ queryKey: ["currencies", tenantId], queryFn: async () => { const { data, error } = await supabase.from("currencies").select("id,code,name,symbol,exchange_rate,is_base,is_active,rate_updated_at").order("is_base", { ascending: false }).order("code"); if (error) throw error; return data; }, enabled: !!tenantId });
  const { data: entries = [] } = useQuery({ queryKey: ["ec-sales-entries", tenantId, selectedClientId], queryFn: async () => { let query = supabase.from("ec_sales_entries").select("id,customer_name,customer_vat_number,country_code,supply_type,value_gbp_pence,period_start,period_end,status,client_id").order("period_end", { ascending: false }); if (selectedClientId) query = query.eq("client_id", selectedClientId); const { data, error } = await query; if (error) throw error; return data; }, enabled: !!tenantId });
  const { data: clients = [] } = useQuery({ queryKey: ["multi-currency-clients", tenantId], queryFn: async () => { const { data, error } = await supabase.from("clients").select("id,legal_name").eq("status", "active").order("legal_name"); if (error) throw error; return data; }, enabled: !!tenantId, staleTime: 60_000 });

  const addCurrency = useMutation({
    mutationFn: async () => {
      if (!tenantId || !newCurrency.code.trim() || !newCurrency.name.trim()) throw new Error("Add an ISO code and currency name");
      const { error } = await supabase.from("currencies").insert({ tenant_id: tenantId, code: newCurrency.code.trim().toUpperCase(), name: newCurrency.name.trim(), symbol: newCurrency.symbol.trim() || newCurrency.code.trim().toUpperCase(), exchange_rate: Number(newCurrency.exchange_rate) || 1, is_base: false, is_active: true });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["currencies"] }); setNewCurrency(currencyForm()); setShowCurrency(false); toast.success("Currency saved"); },
    onError: (error: Error) => toast.error(error.message),
  });

  const addEntry = useMutation({
    mutationFn: async () => {
      const clientId = newEntry.client_id || selectedClientId;
      if (!tenantId || !clientId || !newEntry.customer_name.trim() || !newEntry.period_start || !newEntry.period_end) throw new Error("Select a client and complete the customer and period fields");
      const { error } = await supabase.from("ec_sales_entries").insert({ tenant_id: tenantId, client_id: clientId, customer_name: newEntry.customer_name.trim(), customer_vat_number: newEntry.customer_vat_number.trim(), country_code: newEntry.country_code.trim().toUpperCase(), supply_type: newEntry.supply_type, value_gbp_pence: Math.round(Number(newEntry.value_gbp || 0) * 100), period_start: newEntry.period_start, period_end: newEntry.period_end, status: "draft" });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["ec-sales-entries"] }); setNewEntry(entryForm()); setShowEntry(false); toast.success("EC Sales entry saved"); },
    onError: (error: Error) => toast.error(error.message),
  });

  const goodsTotal = entries.filter((entry) => entry.supply_type === "goods").reduce((sum, entry) => sum + entry.value_gbp_pence, 0);
  const servicesTotal = entries.filter((entry) => entry.supply_type === "services").reduce((sum, entry) => sum + entry.value_gbp_pence, 0);

  return <div className="space-y-6"><WorkspacePageHeader eyebrow="International transactions" title="Multi-Currency & EC Sales" icon={Globe} description="Persistent currencies, practice exchange rates and client EC Sales data." />
    <Tabs defaultValue="currencies"><TabsList className="w-max min-w-full justify-start"><TabsTrigger value="currencies"><Globe className="mr-1 h-4 w-4" /> Currencies</TabsTrigger><TabsTrigger value="ec-sales"><FileSpreadsheet className="mr-1 h-4 w-4" /> EC Sales List</TabsTrigger></TabsList>
      <TabsContent value="currencies" className="space-y-4"><div className="flex flex-wrap justify-end gap-2"><Button variant="outline" size="sm" disabled title="Connect an approved market-data provider before enabling automatic rates"><RefreshCw className="mr-1 h-4 w-4" /> Rate provider required</Button><Dialog open={showCurrency} onOpenChange={setShowCurrency}><DialogTrigger asChild><Button size="sm"><Plus className="mr-1 h-4 w-4" /> Add currency</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Add currency</DialogTitle></DialogHeader><div className="space-y-3"><div className="grid grid-cols-2 gap-3"><div><Label>ISO code</Label><Input value={newCurrency.code} onChange={(event) => setNewCurrency((value) => ({ ...value, code: event.target.value }))} /></div><div><Label>Symbol</Label><Input value={newCurrency.symbol} onChange={(event) => setNewCurrency((value) => ({ ...value, symbol: event.target.value }))} /></div></div><div><Label>Name</Label><Input value={newCurrency.name} onChange={(event) => setNewCurrency((value) => ({ ...value, name: event.target.value }))} /></div><div><Label>Rate to GBP</Label><Input type="number" step="0.000001" min="0" value={newCurrency.exchange_rate} onChange={(event) => setNewCurrency((value) => ({ ...value, exchange_rate: event.target.value }))} /></div><Button className="w-full" onClick={() => addCurrency.mutate()} disabled={addCurrency.isPending}>Save currency</Button></div></DialogContent></Dialog></div>
        <Card className="workspace-panel overflow-hidden"><CardContent className="p-0">{!currencies.length ? <p className="py-16 text-center text-sm text-muted-foreground">No currencies configured.</p> : <Table><TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead>Symbol</TableHead><TableHead className="text-right">Rate to GBP</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>{currencies.map((currency) => <TableRow key={currency.id}><TableCell className="font-mono font-semibold">{currency.code}</TableCell><TableCell>{currency.name}</TableCell><TableCell>{currency.symbol}</TableCell><TableCell className="text-right font-mono">{Number(currency.exchange_rate).toFixed(6)}</TableCell><TableCell>{currency.is_base ? <Badge>Base</Badge> : <Badge variant={currency.is_active ? "secondary" : "outline"}>{currency.is_active ? "Active" : "Inactive"}</Badge>}</TableCell></TableRow>)}</TableBody></Table>}</CardContent></Card>
      </TabsContent>
      <TabsContent value="ec-sales" className="space-y-4"><div className="grid grid-cols-2 gap-3 lg:grid-cols-3"><Card className="workspace-panel"><CardContent className="p-4"><p className="workspace-eyebrow">Goods</p><p className="mt-2 text-2xl font-semibold">{money(goodsTotal)}</p></CardContent></Card><Card className="workspace-panel"><CardContent className="p-4"><p className="workspace-eyebrow">Services</p><p className="mt-2 text-2xl font-semibold">{money(servicesTotal)}</p></CardContent></Card><Card className="workspace-panel col-span-2 lg:col-span-1"><CardContent className="p-4"><p className="workspace-eyebrow">Entries</p><p className="mt-2 text-2xl font-semibold">{entries.length}</p></CardContent></Card></div>
        <div className="flex justify-end"><Dialog open={showEntry} onOpenChange={setShowEntry}><DialogTrigger asChild><Button size="sm"><Plus className="mr-1 h-4 w-4" /> Add entry</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Add EC Sales entry</DialogTitle></DialogHeader><div className="space-y-3"><div><Label>Client</Label><Select value={newEntry.client_id || selectedClientId || ""} onValueChange={(value) => setNewEntry((entry) => ({ ...entry, client_id: value }))}><SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger><SelectContent>{clients.map((client) => <SelectItem key={client.id} value={client.id}>{client.legal_name}</SelectItem>)}</SelectContent></Select></div><div><Label>Customer</Label><Input value={newEntry.customer_name} onChange={(event) => setNewEntry((entry) => ({ ...entry, customer_name: event.target.value }))} /></div><div className="grid grid-cols-2 gap-3"><div><Label>VAT number</Label><Input value={newEntry.customer_vat_number} onChange={(event) => setNewEntry((entry) => ({ ...entry, customer_vat_number: event.target.value }))} /></div><div><Label>Country code</Label><Input maxLength={2} value={newEntry.country_code} onChange={(event) => setNewEntry((entry) => ({ ...entry, country_code: event.target.value }))} /></div></div><div className="grid grid-cols-2 gap-3"><div><Label>Supply</Label><Select value={newEntry.supply_type} onValueChange={(value) => setNewEntry((entry) => ({ ...entry, supply_type: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="goods">Goods</SelectItem><SelectItem value="services">Services</SelectItem></SelectContent></Select></div><div><Label>Value GBP</Label><Input type="number" min="0" value={newEntry.value_gbp} onChange={(event) => setNewEntry((entry) => ({ ...entry, value_gbp: event.target.value }))} /></div></div><div className="grid grid-cols-2 gap-3"><div><Label>Period start</Label><Input type="date" value={newEntry.period_start} onChange={(event) => setNewEntry((entry) => ({ ...entry, period_start: event.target.value }))} /></div><div><Label>Period end</Label><Input type="date" value={newEntry.period_end} onChange={(event) => setNewEntry((entry) => ({ ...entry, period_end: event.target.value }))} /></div></div><Button className="w-full" onClick={() => addEntry.mutate()} disabled={addEntry.isPending}>Save entry</Button></div></DialogContent></Dialog></div>
        <Card className="workspace-panel overflow-hidden"><CardContent className="p-0">{!entries.length ? <p className="py-16 text-center text-sm text-muted-foreground">No EC Sales entries found.</p> : <Table><TableHeader><TableRow><TableHead>Customer</TableHead><TableHead>VAT number</TableHead><TableHead>Country</TableHead><TableHead>Type</TableHead><TableHead className="text-right">Value</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>{entries.map((entry) => <TableRow key={entry.id}><TableCell className="font-medium">{entry.customer_name}</TableCell><TableCell className="font-mono text-xs">{entry.customer_vat_number}</TableCell><TableCell>{entry.country_code}</TableCell><TableCell className="capitalize">{entry.supply_type}</TableCell><TableCell className="text-right font-mono">{money(entry.value_gbp_pence)}</TableCell><TableCell><Badge variant="outline">{entry.status}</Badge></TableCell></TableRow>)}</TableBody></Table>}</CardContent></Card>
      </TabsContent>
    </Tabs>
  </div>;
}
