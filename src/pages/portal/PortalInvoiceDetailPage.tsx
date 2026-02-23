import { useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const MOCK_INVOICES: Record<string, any> = {
  "inv-1": { number: "INV-0042", issuedAt: "2026-01-15", dueDate: "2026-02-15", amountPence: 120000, status: "paid", payUrl: null },
  "inv-2": { number: "INV-0043", issuedAt: "2026-02-01", dueDate: "2026-03-01", amountPence: 95000, status: "outstanding", payUrl: "https://example.com/pay/inv-2" },
  "inv-3": { number: "INV-0044", issuedAt: "2026-02-15", dueDate: "2026-03-15", amountPence: 150000, status: "outstanding", payUrl: "https://example.com/pay/inv-3" },
};

export default function PortalInvoiceDetailPage() {
  const { invoiceId = "" } = useParams();
  const inv = MOCK_INVOICES[invoiceId];

  if (!inv) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Invoice not found.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Invoice</h1>
        <p className="text-sm text-muted-foreground">{inv.number}</p>
      </div>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm font-semibold">{inv.number}</div>
              <div className="text-xs text-muted-foreground">Issued: {inv.issuedAt} • Due: {inv.dueDate}</div>
            </div>
            <Badge variant={inv.status === "paid" ? "secondary" : "outline"}>{inv.status}</Badge>
          </div>

          <div className="text-3xl font-semibold">£{(inv.amountPence / 100).toFixed(2)}</div>

          <div className="flex gap-2">
            {inv.payUrl ? (
              <Button asChild>
                <a href={inv.payUrl} target="_blank" rel="noreferrer">Pay now</a>
              </Button>
            ) : (
              <Button disabled>No payment link</Button>
            )}
            <Button variant="outline" onClick={() => alert("Wire PDF download")}>
              Download PDF
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Note: In production, payment links are generated via Stripe / GoCardless / Access PaySuite.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
