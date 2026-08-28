import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Upload, Camera, FileText, Check, X, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

type ExtractionResult = {
  document_id: string;
  extraction: {
    supplier_name: string;
    receipt_date?: string;
    currency?: string;
    subtotal_pence?: number;
    vat_pence?: number;
    total_pence: number;
    vat_rate?: number;
    payment_method?: string;
    suggested_account_code?: string;
    line_items?: Array<{ description: string; total_pence: number }>;
    confidence: string;
  };
  suggested_account: { id: string; code: string; name: string } | null;
};

type Props = {
  clientId: string;
  accounts: Array<{ id: string; code: string; name: string; account_type: string }>;
  tenantId: string;
};

export function ReceiptUploader({ clientId, accounts, tenantId }: Props) {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [showApproval, setShowApproval] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [bankAccountId, setBankAccountId] = useState("");

  const pence = (v: number) => `£${(v / 100).toFixed(2)}`;

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("client_id", clientId);

      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/receipt-ocr`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: formData,
        }
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Upload failed");
      }
      return res.json() as Promise<ExtractionResult>;
    },
    onSuccess: (data) => {
      setResult(data);
      if (data.suggested_account) {
        setSelectedAccountId(data.suggested_account.id);
      }
      setShowApproval(true);
      toast.success("Receipt scanned successfully");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const approveMutation = useMutation({
    mutationFn: async () => {
      if (!result || !selectedAccountId) throw new Error("Select an expense account");
      if (!bankAccountId) throw new Error("Select the bank or cash account used for payment");
      const ext = result.extraction;

      // Create journal entry directly
      const { data: journal, error: jErr } = await supabase
        .from("journal_entries")
        .insert({
          tenant_id: tenantId,
          client_id: clientId,
          narration: `Receipt: ${ext.supplier_name} ${ext.receipt_date || ""}`,
          reference: `RCT-${result.document_id.slice(0, 8)}`,
          is_posted: false,
        })
        .select()
        .single();
      if (jErr) throw jErr;

      const vatPence = ext.vat_pence || 0;
      const vatAccount = vatPence > 0 ? accounts.find(a => a.code === "1300") : undefined;
      const netPence = vatAccount ? (ext.subtotal_pence || ext.total_pence - vatPence) : ext.total_pence;
      const lines: any[] = [
        { journal_entry_id: journal.id, account_id: selectedAccountId, debit: netPence / 100, credit: 0, description: `${ext.supplier_name} expense` },
      ];
      if (vatPence > 0) {
        // Find VAT control account
        if (vatAccount) {
          lines.push({ journal_entry_id: journal.id, account_id: vatAccount.id, debit: vatPence / 100, credit: 0, description: "Input VAT" });
        }
      }
      lines.push({ journal_entry_id: journal.id, account_id: bankAccountId, debit: 0, credit: ext.total_pence / 100, description: "Payment" });

      const { error: lErr } = await supabase.from("journal_lines").insert(lines);
      if (lErr) {
        await supabase.from("journal_entries").delete().eq("id", journal.id);
        throw lErr;
      }
      const { error: postErr } = await supabase.from("journal_entries").update({ is_posted: true }).eq("id", journal.id);
      if (postErr) throw postErr;
      await supabase.from("documents").update({ status: "processed" }).eq("id", result.document_id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["journal_entries"] });
      setShowApproval(false);
      setResult(null);
      toast.success("Receipt posted to ledger");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadMutation.mutate(file);
  };

  const expenseAccounts = accounts.filter(a => a.account_type === "expense");
  const bankAccounts = accounts.filter(a => a.code.startsWith("10"));

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Camera className="w-4 h-4" /> Receipt Scanner
          </CardTitle>
          <CardDescription>Upload a receipt image for AI-powered data extraction and ledger posting</CardDescription>
        </CardHeader>
        <CardContent>
          <input ref={fileRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handleFileChange} />
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="gap-2 flex-1"
              onClick={() => fileRef.current?.click()}
              disabled={uploadMutation.isPending}
            >
              {uploadMutation.isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Scanning…</>
              ) : (
                <><Upload className="w-4 h-4" /> Upload Receipt</>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showApproval} onOpenChange={setShowApproval}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" /> Receipt Extraction
            </DialogTitle>
          </DialogHeader>
          {result && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{result.extraction.supplier_name}</span>
                <Badge variant={result.extraction.confidence === "high" ? "default" : "secondary"}>
                  {result.extraction.confidence} confidence
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Date:</span> {result.extraction.receipt_date || "—"}</div>
                <div><span className="text-muted-foreground">Payment:</span> {result.extraction.payment_method || "—"}</div>
                <div><span className="text-muted-foreground">Subtotal:</span> {result.extraction.subtotal_pence ? pence(result.extraction.subtotal_pence) : "—"}</div>
                <div><span className="text-muted-foreground">VAT ({result.extraction.vat_rate || 0}%):</span> {result.extraction.vat_pence ? pence(result.extraction.vat_pence) : "—"}</div>
              </div>

              <div className="text-lg font-bold text-right">
                Total: {pence(result.extraction.total_pence)}
              </div>

              {result.extraction.line_items && result.extraction.line_items.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.extraction.line_items.map((item, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-sm">{item.description}</TableCell>
                        <TableCell className="text-right text-sm font-mono">{pence(item.total_pence)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              <div className="space-y-3 border-t pt-3">
                <div className="space-y-2">
                  <Label>Expense Account *</Label>
                  <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                    <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                    <SelectContent>
                      {expenseAccounts.map(a => (
                        <SelectItem key={a.id} value={a.id}>{a.code} - {a.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Paid From (Bank/Cash Account) *</Label>
                  <Select value={bankAccountId} onValueChange={setBankAccountId}>
                    <SelectTrigger><SelectValue placeholder="Select bank" /></SelectTrigger>
                    <SelectContent>
                      {bankAccounts.map(a => (
                        <SelectItem key={a.id} value={a.id}>{a.code} - {a.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproval(false)} className="gap-1">
              <X className="w-3.5 h-3.5" /> Reject
            </Button>
            <Button onClick={() => approveMutation.mutate()} disabled={!selectedAccountId || !bankAccountId || approveMutation.isPending} className="gap-1">
              <Check className="w-3.5 h-3.5" /> {approveMutation.isPending ? "Posting…" : "Approve & Post"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
