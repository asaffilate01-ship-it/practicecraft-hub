import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/hooks/usePermissions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { CreditCard, CheckCircle2 } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type PaymentInvoice = Database["public"]["Tables"]["invoices"]["Row"] & {
  clients: { legal_name: string } | null;
};

export default function PaymentHistory() {
  const { tenantId } = usePermissions();

  const { data: invoices, isLoading } = useQuery({
    queryKey: ["payment-history", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("*, clients(legal_name)")
        .in("status", ["paid", "partially_paid"])
        .order("paid_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(amount);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Payment History</h1>
        <p className="text-muted-foreground">All received payments and reconciliation status.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5" /> Received Payments</CardTitle>
          <CardDescription>{invoices?.length || 0} payments found</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : !invoices?.length ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No payments recorded yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Paid Date</TableHead>
                  <TableHead>Method</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(invoices as PaymentInvoice[]).map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-mono text-sm">{inv.invoice_number || inv.id.slice(0, 8)}</TableCell>
                    <TableCell className="font-medium">{inv.clients?.legal_name || "—"}</TableCell>
                    <TableCell>{formatCurrency(inv.total || 0)}</TableCell>
                    <TableCell>
                      <Badge variant={inv.status === "paid" ? "default" : "secondary"}>
                        {inv.status === "paid" ? <><CheckCircle2 className="h-3 w-3 mr-1" /> Paid</> : inv.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{inv.paid_at ? new Date(inv.paid_at).toLocaleDateString("en-GB") : "—"}</TableCell>
                    <TableCell>{inv.payment_method || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
