import { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/hooks/usePermissions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Camera, FileCheck2, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

type ExtractionResult = {
  document_id: string;
  extraction: {
    supplier_name: string;
    receipt_date?: string;
    currency?: string;
    total_pence: number;
    subtotal_pence?: number;
    vat_pence?: number;
    confidence: "high" | "medium" | "low";
  };
};
type Props = {
  clientId: string;
  tenantId: string;
  accounts: Array<{ id: string; code: string; name: string; account_type: string }>;
};
const money = (v: number | undefined) =>
  v == null ? "Requires review" : new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(v / 100);

export function ReceiptUploader({ clientId, tenantId }: Props) {
  const { tenantId: activeTenantId, can, loading } = usePermissions();
  const allowed = !loading && !!clientId && !!activeTenantId && activeTenantId === tenantId &&
    can("documents", "upload") && can("ledger", "view") && can("ocr", "view");
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [result, setResult] = useState<ExtractionResult | null>(null);

  const scan = useMutation({
    mutationFn: async (file: File) => {
      if (!allowed) throw new Error("Receipt extraction is not authorised in this practice");
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
          file.size <= 0 || file.size > 10 * 1024 * 1024)
        throw new Error("Choose a JPEG, PNG or WebP receipt up to 10 MB");
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Please sign in again before uploading a receipt");
      const body = new FormData();
      body.append("file", file);
      body.append("client_id", clientId);
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/receipt-ocr`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
        body,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Receipt extraction unavailable");
      if (!data.document_id || !data.extraction) throw new Error("Receipt extraction returned no reviewable draft");
      return data as ExtractionResult;
    },
    onSuccess: data => {
      setResult(data);
      toast.success("Receipt extracted and saved for human review. Nothing was posted.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Camera className="h-4 w-4" /> Receipt extraction
          </CardTitle>
          <CardDescription>
            Scan a JPEG, PNG or WebP receipt (up to 10 MB). AI output is a draft:
            review the source document, amounts and VAT eligibility before posting.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            aria-label="Choose receipt image"
            className="sr-only"
            onChange={event => {
              const file = event.target.files?.[0];
              if (file) scan.mutate(file);
              event.currentTarget.value = "";
            }}
          />
          <Button variant="outline" className="w-full gap-2" disabled={!allowed || scan.isPending}
            onClick={() => inputRef.current?.click()}>
            {scan.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {scan.isPending ? "Extracting…" : "Scan receipt for review"}
          </Button>
          {!allowed && <p role="status" className="text-xs text-muted-foreground">
            Receipt scanning requires documents.upload, ledger.view and ocr.view for this practice.
          </p>}
          <Button variant="ghost" className="w-full" onClick={() => navigate("/receipt-reviews")}>
            Open saved receipt review queue
          </Button>
        </CardContent>
      </Card>

      <Dialog open={!!result} onOpenChange={open => { if (!open) setResult(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileCheck2 className="h-5 w-5" /> Extraction saved for review
            </DialogTitle>
          </DialogHeader>
          {result && (
            <div className="space-y-4 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="font-semibold">{result.extraction.supplier_name}</span>
                <Badge variant="secondary">{result.extraction.confidence} AI confidence</Badge>
              </div>
              <dl className="grid grid-cols-2 gap-3 rounded-xl bg-muted/40 p-4">
                <div><dt className="text-muted-foreground">Receipt date</dt><dd>{result.extraction.receipt_date || "Missing"}</dd></div>
                <div><dt className="text-muted-foreground">Currency</dt><dd>{result.extraction.currency || "Missing"}</dd></div>
                <div><dt className="text-muted-foreground">Net</dt><dd>{money(result.extraction.subtotal_pence)}</dd></div>
                <div><dt className="text-muted-foreground">VAT</dt><dd>{money(result.extraction.vat_pence)}</dd></div>
                <div className="col-span-2"><dt className="text-muted-foreground">Gross</dt><dd className="font-semibold">{money(result.extraction.total_pence)}</dd></div>
              </dl>
              <p className="text-xs leading-5 text-muted-foreground">
                No journal entry has been created. AI confidence is not assurance that the receipt, business purpose or VAT treatment is correct.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setResult(null)}>Review later</Button>
            <Button onClick={() => {
              if (!result) return;
              const params = new URLSearchParams({ client: clientId, document: result.document_id });
              setResult(null);
              navigate(`/receipt-reviews?${params.toString()}`);
            }}>Open review</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
