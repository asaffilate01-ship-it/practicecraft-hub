import { ChangeEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight, CheckCircle, Database, FileSpreadsheet, Upload } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WorkspacePageHeader } from "@/components/layout/WorkspacePageHeader";
import { useAuth } from "@/contexts/AuthContext";
import { useClientContext } from "@/contexts/ClientContext";
import { usePermissions } from "@/hooks/usePermissions";
import { supabase } from "@/integrations/supabase/client";

type ImportRow = { source_code: string; source_name: string; debit: number; credit: number; mapped_code: string | null };
const money = (value: number) => value ? `£${value.toLocaleString("en-GB", { minimumFractionDigits: 2 })}` : "—";

function parseCsvLine(line: string) {
  const values: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"' && line[index + 1] === '"') { value += '"'; index += 1; }
    else if (character === '"') quoted = !quoted;
    else if (character === "," && !quoted) { values.push(value.trim()); value = ""; }
    else value += character;
  }
  values.push(value.trim());
  return values;
}

function parseTrialBalance(csv: string) {
  const lines = csv.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) throw new Error("The CSV does not contain any trial-balance rows");
  const headers = parseCsvLine(lines[0]).map((header) => header.toLowerCase().replace(/[^a-z]/g, ""));
  const column = (...names: string[]) => headers.findIndex((header) => names.includes(header));
  const codeIndex = column("code", "accountcode", "nominalcode");
  const nameIndex = column("name", "accountname", "description");
  const debitIndex = column("debit", "debits");
  const creditIndex = column("credit", "credits");
  if ([codeIndex, nameIndex, debitIndex, creditIndex].some((index) => index < 0)) throw new Error("CSV headings must include account code, account name, debit and credit");
  return lines.slice(1).map((line) => { const values = parseCsvLine(line); return { source_code: values[codeIndex], source_name: values[nameIndex], debit: Number(values[debitIndex]?.replace(/[,£]/g, "")) || 0, credit: Number(values[creditIndex]?.replace(/[,£]/g, "")) || 0, mapped_code: null } satisfies ImportRow; }).filter((row) => row.source_code || row.source_name);
}

export default function TrialBalanceImport() {
  const queryClient = useQueryClient();
  const { tenantId } = usePermissions();
  const { user } = useAuth();
  const { selectedClientId } = useClientContext();
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<ImportRow[]>([]);

  const { data: accounts = [] } = useQuery({ queryKey: ["trial-balance-coa", tenantId], queryFn: async () => { const { data, error } = await supabase.from("chart_of_accounts").select("code,name").eq("is_active", true).order("code"); if (error) throw error; return data; }, enabled: !!tenantId });
  const { data: clients = [] } = useQuery({ queryKey: ["trial-balance-clients", tenantId], queryFn: async () => { const { data, error } = await supabase.from("clients").select("id,legal_name").eq("status", "active").order("legal_name"); if (error) throw error; return data; }, enabled: !!tenantId, staleTime: 60_000 });
  const { data: history = [] } = useQuery({ queryKey: ["tb-import-history", tenantId, selectedClientId], queryFn: async () => { let query = supabase.from("tb_imports").select("id,client_id,source,file_name,status,rows_total,rows_mapped,rows_posted,created_at,clients(legal_name)").order("created_at", { ascending: false }); if (selectedClientId) query = query.eq("client_id", selectedClientId); const { data, error } = await query; if (error) throw error; return data; }, enabled: !!tenantId });

  const mapped = rows.filter((row) => row.mapped_code).length;
  const progress = rows.length ? Math.round((mapped / rows.length) * 100) : 0;
  const debitTotal = useMemo(() => rows.reduce((sum, row) => sum + row.debit, 0), [rows]);
  const creditTotal = useMemo(() => rows.reduce((sum, row) => sum + row.credit, 0), [rows]);

  const readFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const parsed = parseTrialBalance(await file.text());
      const mappedRows = parsed.map((row) => ({ ...row, mapped_code: accounts.some((account) => account.code === row.source_code) ? row.source_code : null }));
      setRows(mappedRows);
      setFileName(file.name);
      toast.success(`${mappedRows.length} trial-balance rows parsed`);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Unable to parse CSV"); }
  };

  const saveImport = useMutation({
    mutationFn: async () => {
      if (!tenantId || !selectedClientId) throw new Error("Select a client in the workspace bar first");
      if (!rows.length) throw new Error("Upload a CSV trial balance first");
      if (Math.abs(debitTotal - creditTotal) > 0.005) throw new Error("The trial balance is not balanced");
      const { error } = await supabase.from("tb_imports").insert({ tenant_id: tenantId, client_id: selectedClientId, source: "csv", file_name: fileName, status: mapped === rows.length ? "mapped" : "mapping_required", mapping_json: { rows }, rows_total: rows.length, rows_mapped: mapped, rows_posted: 0, imported_by: user?.id });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["tb-import-history"] }); setRows([]); setFileName(""); toast.success("Trial balance saved for review"); },
    onError: (error: Error) => toast.error(error.message),
  });

  const updateMapping = (index: number, mappedCode: string) => setRows((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, mapped_code: mappedCode } : row));

  return <div className="space-y-6"><WorkspacePageHeader eyebrow="Accounts migration" title="Trial Balance Import" icon={Upload} description="Parse a real CSV, map it to the practice chart of accounts and retain a reviewable import record." actions={<Select value={selectedClientId || ""} disabled><SelectTrigger className="w-full bg-card sm:w-72"><SelectValue placeholder="Select a client in the top bar" /></SelectTrigger><SelectContent>{clients.map((client) => <SelectItem key={client.id} value={client.id}>{client.legal_name}</SelectItem>)}</SelectContent></Select>} />
    <Tabs defaultValue="import"><TabsList className="w-max min-w-full justify-start"><TabsTrigger value="import"><FileSpreadsheet className="mr-1 h-4 w-4" /> New import</TabsTrigger><TabsTrigger value="history"><Database className="mr-1 h-4 w-4" /> Import history</TabsTrigger></TabsList>
      <TabsContent value="import" className="space-y-4"><Card className="workspace-panel"><CardContent className="space-y-4 p-5"><div><Label>Trial balance CSV</Label><Input type="file" accept=".csv,text/csv" onChange={readFile} /><p className="mt-2 text-xs text-muted-foreground">Required headings: account code, account name, debit and credit. Xero, QuickBooks and Sage direct connectors remain disabled until OAuth connections are configured.</p></div></CardContent></Card>
        {!!rows.length && <><div className="flex flex-wrap items-center gap-3"><Progress value={progress} className="h-2 min-w-40 flex-1" /><span className="text-sm font-medium">{mapped}/{rows.length} mapped</span>{mapped < rows.length && <Badge variant="destructive">{rows.length - mapped} unmapped</Badge>}</div><Card className="workspace-panel overflow-hidden"><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>Source</TableHead><TableHead className="text-right">Debit</TableHead><TableHead className="text-right">Credit</TableHead><TableHead><ArrowRight className="h-4 w-4" /></TableHead><TableHead>Mapped account</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>{rows.map((row, index) => <TableRow key={`${row.source_code}-${index}`}><TableCell><p className="font-mono text-xs">{row.source_code}</p><p className="text-sm">{row.source_name}</p></TableCell><TableCell className="text-right font-mono">{money(row.debit)}</TableCell><TableCell className="text-right font-mono">{money(row.credit)}</TableCell><TableCell><ArrowRight className="h-4 w-4 text-muted-foreground" /></TableCell><TableCell><Select value={row.mapped_code || ""} onValueChange={(value) => updateMapping(index, value)}><SelectTrigger className="min-w-56"><SelectValue placeholder="Map account" /></SelectTrigger><SelectContent>{accounts.map((account) => <SelectItem key={account.code} value={account.code}>{account.code} · {account.name}</SelectItem>)}</SelectContent></Select></TableCell><TableCell>{row.mapped_code ? <CheckCircle className="h-4 w-4 text-emerald-600" /> : <AlertTriangle className="h-4 w-4 text-amber-500" />}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card><div className="grid gap-3 sm:grid-cols-3"><Card className="workspace-panel"><CardContent className="p-4"><p className="workspace-eyebrow">Debit</p><p className="mt-2 font-mono text-xl font-semibold">{money(debitTotal)}</p></CardContent></Card><Card className="workspace-panel"><CardContent className="p-4"><p className="workspace-eyebrow">Credit</p><p className="mt-2 font-mono text-xl font-semibold">{money(creditTotal)}</p></CardContent></Card><Card className="workspace-panel"><CardContent className="p-4"><p className="workspace-eyebrow">Difference</p><p className="mt-2 font-mono text-xl font-semibold">{money(Math.abs(debitTotal - creditTotal))}</p></CardContent></Card></div><div className="flex justify-end"><Button onClick={() => saveImport.mutate()} disabled={saveImport.isPending || !selectedClientId}>{saveImport.isPending ? "Saving…" : "Save for review"}</Button></div></>}
      </TabsContent>
      <TabsContent value="history"><Card className="workspace-panel overflow-hidden"><CardContent className="p-0">{!history.length ? <p className="py-16 text-center text-sm text-muted-foreground">No trial-balance imports found.</p> : <Table><TableHeader><TableRow><TableHead>Client</TableHead><TableHead>File</TableHead><TableHead>Source</TableHead><TableHead className="text-right">Rows</TableHead><TableHead className="text-right">Mapped</TableHead><TableHead className="text-right">Posted</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>{history.map((item) => <TableRow key={item.id}><TableCell className="font-medium">{item.clients?.legal_name}</TableCell><TableCell>{item.file_name || "—"}</TableCell><TableCell><Badge variant="outline">{item.source}</Badge></TableCell><TableCell className="text-right">{item.rows_total}</TableCell><TableCell className="text-right">{item.rows_mapped}</TableCell><TableCell className="text-right">{item.rows_posted}</TableCell><TableCell><Badge variant="secondary">{item.status}</Badge></TableCell></TableRow>)}</TableBody></Table>}</CardContent></Card></TabsContent>
    </Tabs>
  </div>;
}
