import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, RefreshCw, Globe, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";

const SAMPLE_CURRENCIES = [
  { code: "GBP", name: "British Pound", symbol: "£", exchange_rate: 1.0, is_base: true, is_active: true },
  { code: "EUR", name: "Euro", symbol: "€", exchange_rate: 1.1628, is_base: false, is_active: true },
  { code: "USD", name: "US Dollar", symbol: "$", exchange_rate: 1.2645, is_base: false, is_active: true },
  { code: "CHF", name: "Swiss Franc", symbol: "CHF", exchange_rate: 1.1234, is_base: false, is_active: false },
];

const SAMPLE_EC_SALES = [
  { customer_name: "Müller GmbH", customer_vat_number: "DE123456789", country_code: "DE", supply_type: "goods", value_gbp_pence: 1250000, period: "Q1 2026", status: "draft" },
  { customer_name: "Dubois SARL", customer_vat_number: "FR98765432100", country_code: "FR", supply_type: "services", value_gbp_pence: 875000, period: "Q1 2026", status: "draft" },
  { customer_name: "Rossi SpA", customer_vat_number: "IT12345678901", country_code: "IT", supply_type: "goods", value_gbp_pence: 2340000, period: "Q4 2025", status: "submitted" },
];

export default function MultiCurrency() {
  const [currencies, setCurrencies] = useState(SAMPLE_CURRENCIES);
  const [showAddCurrency, setShowAddCurrency] = useState(false);
  const [newCurrency, setNewCurrency] = useState({ code: "", name: "", symbol: "", exchange_rate: "" });

  const handleAddCurrency = () => {
    if (!newCurrency.code || !newCurrency.name) return;
    setCurrencies(prev => [...prev, {
      code: newCurrency.code.toUpperCase(),
      name: newCurrency.name,
      symbol: newCurrency.symbol || newCurrency.code,
      exchange_rate: parseFloat(newCurrency.exchange_rate) || 1.0,
      is_base: false,
      is_active: true,
    }]);
    setShowAddCurrency(false);
    setNewCurrency({ code: "", name: "", symbol: "", exchange_rate: "" });
    toast.success("Currency added");
  };

  const handleRefreshRates = () => {
    toast.success("Exchange rates refreshed from ECB feed");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Multi-Currency & EC Sales</h1>
          <p className="text-muted-foreground">Manage foreign currencies, exchange rates, and EC Sales Lists</p>
        </div>
      </div>

      <Tabs defaultValue="currencies">
        <TabsList>
          <TabsTrigger value="currencies"><Globe className="h-4 w-4 mr-1" />Currencies</TabsTrigger>
          <TabsTrigger value="ec-sales"><FileSpreadsheet className="h-4 w-4 mr-1" />EC Sales List</TabsTrigger>
        </TabsList>

        <TabsContent value="currencies" className="space-y-4">
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={handleRefreshRates}>
              <RefreshCw className="h-4 w-4 mr-1" />Refresh ECB Rates
            </Button>
            <Dialog open={showAddCurrency} onOpenChange={setShowAddCurrency}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="h-4 w-4 mr-1" />Add Currency</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add Currency</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Code (ISO)</Label><Input placeholder="EUR" value={newCurrency.code} onChange={e => setNewCurrency(p => ({ ...p, code: e.target.value }))} /></div>
                    <div><Label>Symbol</Label><Input placeholder="€" value={newCurrency.symbol} onChange={e => setNewCurrency(p => ({ ...p, symbol: e.target.value }))} /></div>
                  </div>
                  <div><Label>Name</Label><Input placeholder="Euro" value={newCurrency.name} onChange={e => setNewCurrency(p => ({ ...p, name: e.target.value }))} /></div>
                  <div><Label>Exchange Rate (to GBP)</Label><Input type="number" step="0.0001" placeholder="1.1628" value={newCurrency.exchange_rate} onChange={e => setNewCurrency(p => ({ ...p, exchange_rate: e.target.value }))} /></div>
                  <Button onClick={handleAddCurrency} className="w-full">Add Currency</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Symbol</TableHead>
                    <TableHead className="text-right">Rate (to GBP)</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currencies.map(c => (
                    <TableRow key={c.code}>
                      <TableCell className="font-mono font-semibold">{c.code}</TableCell>
                      <TableCell>{c.name}</TableCell>
                      <TableCell>{c.symbol}</TableCell>
                      <TableCell className="text-right font-mono">
                        {c.is_base ? "1.0000 (base)" : c.exchange_rate.toFixed(4)}
                      </TableCell>
                      <TableCell>
                        {c.is_base ? <Badge variant="default">Base</Badge> :
                         c.is_active ? <Badge variant="secondary">Active</Badge> :
                         <Badge variant="outline">Inactive</Badge>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ec-sales" className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total EC Goods</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">£35,900.00</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total EC Services</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">£8,750.00</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Entries This Quarter</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">2</div></CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>EC Sales Entries</CardTitle>
                <div className="flex gap-2">
                  <Select defaultValue="Q1 2026">
                    <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Q1 2026">Q1 2026</SelectItem>
                      <SelectItem value="Q4 2025">Q4 2025</SelectItem>
                      <SelectItem value="Q3 2025">Q3 2025</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button size="sm"><Plus className="h-4 w-4 mr-1" />Add Entry</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>VAT Number</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Value (GBP)</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {SAMPLE_EC_SALES.map((entry, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{entry.customer_name}</TableCell>
                      <TableCell className="font-mono text-sm">{entry.customer_vat_number}</TableCell>
                      <TableCell>{entry.country_code}</TableCell>
                      <TableCell className="capitalize">{entry.supply_type}</TableCell>
                      <TableCell className="text-right font-mono">£{(entry.value_gbp_pence / 100).toLocaleString("en-GB", { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell>
                        <Badge variant={entry.status === "submitted" ? "default" : "secondary"}>{entry.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
