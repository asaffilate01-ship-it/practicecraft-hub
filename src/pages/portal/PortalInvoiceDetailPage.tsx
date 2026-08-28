import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";

export default function PortalInvoiceDetailPage() {
  const { invoiceId = "" } = useParams();

  const { data: inv, isLoading } = useQuery({
    queryKey: ["portal-invoice-detail", invoiceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .eq("id", invoiceId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!invoiceId,
  });

  const { data: lines = [] } = useQuery({
    queryKey: ["portal-invoice-lines", invoiceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoice_lines")
        .select("*")
        .eq("invoice_id", invoiceId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!invoiceId,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!inv) {
    return (
      <div className="p-6 space-y-4">
        <Link to="/portal/invoices"><Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button></Link>
        <p className="text-muted-foreground">Invoice not found.</p>
      </div>
    );
  }

  const statusVariant = (s: string): "default" | "secondary" | "destructive" | "outline" => {
    if (s === "paid") return "default";
    if (s === "overdue") return "destructive";
    return "outline";
  };

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <Link to="/portal/invoices"><Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1" /> Back to Invoices</Button></Link>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{inv.invoice_number}</CardTitle>
            <Badge variant={statusVariant(inv.status)}>{inv.status}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-muted-foreground">Issued:</span> {new Date(inv.issue_date).toLocaleDateString()}</div>
            <div><span className="text-muted-foreground">Due:</span> {inv.due_date ? new Date(inv.due_date).toLocaleDateString() : "—"}</div>
            <div><span className="text-muted-foreground">Subtotal:</span> £{Number(inv.subtotal).toFixed(2)}</div>
            <div><span className="text-muted-foreground">VAT:</span> £{Number(inv.vat_amount).toFixed(2)}</div>
            <div className="font-semibold"><span className="text-muted-foreground">Total:</span> £{Number(inv.total).toFixed(2)}</div>
            <div><span className="text-muted-foreground">Paid:</span> £{Number(inv.amount_paid || 0).toFixed(2)}</div>
          </div>

          {lines.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <div className="grid grid-cols-12 bg-muted/50 text-xs font-medium text-muted-foreground px-4 py-2">
                <div className="col-span-6">Description</div>
                <div className="col-span-2 text-right">Qty</div>
                <div className="col-span-2 text-right">Rate</div>
                <div className="col-span-2 text-right">Amount</div>
              </div>
              {lines.map((line: any) => (
                <div key={line.id} className="grid grid-cols-12 px-4 py-2 border-t text-sm">
                  <div className="col-span-6">{line.description}</div>
                  <div className="col-span-2 text-right">{line.quantity}</div>
                  <div className="col-span-2 text-right">£{Number(line.unit_price || 0).toFixed(2)}</div>
                  <div className="col-span-2 text-right">£{Number(line.line_total || 0).toFixed(2)}</div>
                </div>
              ))}
            </div>
          )}

          {inv.notes && <p className="text-sm text-muted-foreground">{inv.notes}</p>}

          {inv.status !== "paid" && inv.stripe_checkout_url && (
            <Button className="w-full" asChild>
              <a href={inv.stripe_checkout_url} target="_blank" rel="noopener noreferrer">
                Pay £{Number(inv.total).toFixed(2)}
              </a>
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
