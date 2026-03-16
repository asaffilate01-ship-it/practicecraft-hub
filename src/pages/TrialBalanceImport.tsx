import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Upload, FileSpreadsheet, Database, ArrowRight, CheckCircle, AlertTriangle, X } from "lucide-react";
import { toast } from "sonner";

type ImportRow = {
  source_code: string;
  source_name: string;
  debit: number;
  credit: number;
  mapped_code: string | null;
  mapped_name: string | null;
  status: "mapped" | "unmapped" | "skipped";
};

const SAMPLE_IMPORT: ImportRow[] = [
  { source_code: "1000", source_name: "Bank Current Account", debit: 45230.50, credit: 0, mapped_code: "1000", mapped_name: "Bank - Current Account", status: "mapped" },
  { source_code: "1100", source_name: "Trade Debtors", debit: 12800.00, credit: 0, mapped_code: "1100", mapped_name: "Accounts Receivable (Debtors)", status: "mapped" },
  { source_code: "2100", source_name: "Trade Creditors", debit: 0, credit: 8900.00, mapped_code: "2000", mapped_name: "Accounts Payable (Creditors)", status: "mapped" },
  { source_code: "2200", source_name: "VAT Liability", debit: 0, credit: 3450.00, mapped_code: "1300", mapped_name: "VAT Control", status: "mapped" },
  { source_code: "4000", source_name: "Revenue", debit: 0, credit: 185000.00, mapped_code: "4000", mapped_name: "Sales", status: "mapped" },
  { source_code: "5000", source_name: "Purchases", debit: 92000.00, credit: 0, mapped_code: "5000", mapped_name: "Cost of Sales", status: "mapped" },
  { source_code: "6100", source_name: "Wages & Salaries", debit: 48000.00, credit: 0, mapped_code: "6000", mapped_name: "Staff Wages", status: "mapped" },
  { source_code: "7200", source_name: "Directors Loan", debit: 5000.00, credit: 0, mapped_code: null, mapped_name: null, status: "unmapped" },
  { source_code: "7500", source_name: "Sundry Expenses", debit: 1200.00, credit: 0, mapped_code: null, mapped_name: null, status: "unmapped" },
];

const PAST_IMPORTS = [
  { id: "1", client: "Acme Ltd", source: "Xero", date: "2026-03-10", rows: 42, mapped: 40, posted: 40, status: "completed" },
  { id: "2", client: "Beta Services", source: "CSV", date: "2026-03-05", rows: 28, mapped: 28, posted: 28, status: "completed" },
  { id: "3", client: "Delta Holdings", source: "QuickBooks", date: "2026-02-28", rows: 65, mapped: 62, posted: 0, status: "mapped" },
];

export default function TrialBalanceImport() {
  const [importStep, setImportStep] = useState<"source" | "mapping" | "review">("source");
  const [selectedSource, setSelectedSource] = useState("");
  const [importRows] = useState(SAMPLE_IMPORT);

  const mapped = importRows.filter(r => r.status === "mapped").length;
  const unmapped = importRows.filter(r => r.status === "unmapped").length;
  const progress = Math.round((mapped / importRows.length) * 100);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Trial Balance Import & Migration</h1>
          <p className="text-muted-foreground">Import from Xero, QuickBooks, CSV, or migrate from other software</p>
        </div>
      </div>

      <Tabs defaultValue="import">
        <TabsList>
          <TabsTrigger value="import"><Upload className="h-4 w-4 mr-1" />New Import</TabsTrigger>
          <TabsTrigger value="history"><Database className="h-4 w-4 mr-1" />Import History</TabsTrigger>
        </TabsList>

        <TabsContent value="import" className="space-y-4">
          {/* Step indicator */}
          <div className="flex items-center gap-4">
            {(["source", "mapping", "review"] as const).map((step, i) => (
              <div key={step} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                  importStep === step ? "bg-primary text-primary-foreground" :
                  (["source","mapping","review"].indexOf(importStep) > i) ? "bg-primary/20 text-primary" :
                  "bg-muted text-muted-foreground"
                }`}>{i + 1}</div>
                <span className="text-sm font-medium capitalize">{step === "source" ? "Select Source" : step === "mapping" ? "Map Accounts" : "Review & Post"}</span>
                {i < 2 && <ArrowRight className="h-4 w-4 text-muted-foreground" />}
              </div>
            ))}
          </div>

          {importStep === "source" && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { id: "csv", label: "CSV / Excel", desc: "Upload a CSV or Excel trial balance file", icon: FileSpreadsheet },
                { id: "xero", label: "Xero", desc: "Connect and import directly from Xero", icon: Database },
                { id: "quickbooks", label: "QuickBooks", desc: "Import trial balance from QuickBooks Online", icon: Database },
                { id: "sage", label: "Sage / IRIS", desc: "Migrate from Sage, IRIS, or Capium export", icon: Database },
              ].map(source => (
                <Card key={source.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${selectedSource === source.id ? "ring-2 ring-primary" : ""}`}
                  onClick={() => setSelectedSource(source.id)}>
                  <CardHeader className="pb-2">
                    <source.icon className="h-8 w-8 text-primary mb-2" />
                    <CardTitle className="text-base">{source.label}</CardTitle>
                    <CardDescription className="text-xs">{source.desc}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}

          {importStep === "source" && selectedSource && (
            <Card>
              <CardContent className="pt-6 space-y-4">
                {selectedSource === "csv" ? (
                  <>
                    <div><Label>Upload File</Label><Input type="file" accept=".csv,.xlsx,.xls" /></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Date Format</Label>
                        <Select defaultValue="dd/mm/yyyy">
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="dd/mm/yyyy">DD/MM/YYYY</SelectItem>
                            <SelectItem value="mm/dd/yyyy">MM/DD/YYYY</SelectItem>
                            <SelectItem value="yyyy-mm-dd">YYYY-MM-DD</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div><Label>Period End Date</Label><Input type="date" /></div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-muted-foreground mb-4">Connect your {selectedSource === "xero" ? "Xero" : selectedSource === "quickbooks" ? "QuickBooks" : "Sage/IRIS"} account to import</p>
                    <Button>Connect & Authenticate</Button>
                  </div>
                )}
                <Button className="w-full" onClick={() => { setImportStep("mapping"); toast.success("File parsed - " + importRows.length + " rows found"); }}>
                  Parse & Continue
                </Button>
              </CardContent>
            </Card>
          )}

          {importStep === "mapping" && (
            <>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Progress value={progress} className="h-2" />
                </div>
                <span className="text-sm font-medium">{mapped}/{importRows.length} mapped</span>
                {unmapped > 0 && <Badge variant="destructive">{unmapped} unmapped</Badge>}
              </div>
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Source Code</TableHead>
                        <TableHead>Source Name</TableHead>
                        <TableHead className="text-right">Debit</TableHead>
                        <TableHead className="text-right">Credit</TableHead>
                        <TableHead><ArrowRight className="h-4 w-4" /></TableHead>
                        <TableHead>Mapped Account</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importRows.map((row, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-mono">{row.source_code}</TableCell>
                          <TableCell>{row.source_name}</TableCell>
                          <TableCell className="text-right font-mono">{row.debit ? `£${row.debit.toLocaleString("en-GB", { minimumFractionDigits: 2 })}` : "-"}</TableCell>
                          <TableCell className="text-right font-mono">{row.credit ? `£${row.credit.toLocaleString("en-GB", { minimumFractionDigits: 2 })}` : "-"}</TableCell>
                          <TableCell><ArrowRight className="h-4 w-4 text-muted-foreground" /></TableCell>
                          <TableCell>
                            {row.mapped_code ? (
                              <span className="font-mono text-sm">{row.mapped_code} - {row.mapped_name}</span>
                            ) : (
                              <Select>
                                <SelectTrigger className="w-full"><SelectValue placeholder="Map account..." /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="1000">1000 - Bank</SelectItem>
                                  <SelectItem value="2400">2400 - Director Loan</SelectItem>
                                  <SelectItem value="6900">6900 - Sundry Expenses</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                          </TableCell>
                          <TableCell>
                            {row.status === "mapped" ? <CheckCircle className="h-4 w-4 text-green-600" /> :
                             row.status === "unmapped" ? <AlertTriangle className="h-4 w-4 text-amber-500" /> :
                             <X className="h-4 w-4 text-muted-foreground" />}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setImportStep("source")}>Back</Button>
                <Button onClick={() => { setImportStep("review"); toast.success("Mapping saved"); }}>Continue to Review</Button>
              </div>
            </>
          )}

          {importStep === "review" && (
            <Card>
              <CardHeader><CardTitle>Import Summary</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold">{importRows.length}</div>
                    <div className="text-sm text-muted-foreground">Total Rows</div>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{mapped}</div>
                    <div className="text-sm text-muted-foreground">Mapped</div>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-amber-600">{unmapped}</div>
                    <div className="text-sm text-muted-foreground">Unmapped</div>
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setImportStep("mapping")}>Back to Mapping</Button>
                  <Button onClick={() => { toast.success("Trial balance posted to ledger"); setImportStep("source"); }}>
                    Post to Ledger
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Rows</TableHead>
                    <TableHead className="text-right">Mapped</TableHead>
                    <TableHead className="text-right">Posted</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {PAST_IMPORTS.map(imp => (
                    <TableRow key={imp.id}>
                      <TableCell className="font-medium">{imp.client}</TableCell>
                      <TableCell><Badge variant="outline">{imp.source}</Badge></TableCell>
                      <TableCell>{imp.date}</TableCell>
                      <TableCell className="text-right">{imp.rows}</TableCell>
                      <TableCell className="text-right">{imp.mapped}</TableCell>
                      <TableCell className="text-right">{imp.posted}</TableCell>
                      <TableCell>
                        <Badge variant={imp.status === "completed" ? "default" : "secondary"}>{imp.status}</Badge>
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
