import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const MOCK_INVOICES = [
  { id: "inv-1", number: "INV-0042", issuedAt: "2026-01-15", dueDate: "2026-02-15", amountPence: 120000, status: "paid" },
  { id: "inv-2", number: "INV-0043", issuedAt: "2026-02-01", dueDate: "2026-03-01", amountPence: 95000, status: "outstanding" },
  { id: "inv-3", number: "INV-0044", issuedAt: "2026-02-15", dueDate: "2026-03-15", amountPence: 150000, status: "outstanding" },
];

export default function PortalInvoicesPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Invoices</h1>
        <p className="text-sm text-muted-foreground">View and pay your invoices.</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="grid grid-cols-12 bg-muted/50 text-xs font-medium text-muted-foreground px-4 py-2">
            <div className="col-span-3">Invoice</div>
            <div className="col-span-2">Issued</div>
            <div className="col-span-2">Due</div>
            <div className="col-span-2">Amount</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-1 text-right">Action</div>
          </div>
          {MOCK_INVOICES.map((inv) => (
            <div key={inv.id} className="grid grid-cols-12 px-4 py-3 border-t text-sm items-center">
              <div className="col-span-3 font-medium">{inv.number}</div>
              <div className="col-span-2 text-muted-foreground">{inv.issuedAt}</div>
              <div className="col-span-2 text-muted-foreground">{inv.dueDate}</div>
              <div className="col-span-2">£{(inv.amountPence / 100).toFixed(2)}</div>
              <div className="col-span-2">
                <Badge variant={inv.status === "paid" ? "secondary" : "outline"}>{inv.status}</Badge>
              </div>
              <div className="col-span-1 text-right">
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/portal/invoices/${inv.id}`}>Open</Link>
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
