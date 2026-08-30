import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { InvoicePaymentButton } from "@/components/billing/InvoicePaymentButton";
import { Loader2, FileText } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type PortalInvoice = Pick<Database["public"]["Tables"]["invoices"]["Row"],
  "id" | "invoice_number" | "issue_date" | "due_date" | "total" | "amount_paid" | "status" | "stripe_checkout_url"
>;

export default function PortalInvoicesPage() {
  const { user } = useAuth();

  const { data: portalUser } = useQuery({
    queryKey: ["portal-user", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("portal_users")
        .select("client_id, tenant_id")
        .eq("user_id", user!.id)
        .eq("status", "active")
        .limit(1)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["portal-invoices", portalUser?.client_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("id, invoice_number, issue_date, due_date, total, amount_paid, status, stripe_checkout_url")
        .eq("client_id", portalUser!.client_id!)
        .order("issue_date", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!portalUser?.client_id,
  });

  const statusVariant = (s: string): "default" | "secondary" | "destructive" | "outline" => {
    if (s === "paid") return "default";
    if (s === "overdue") return "destructive";
    if (s === "sent") return "outline";
    return "secondary";
  };

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
            <div className="col-span-2">Date</div>
            <div className="col-span-2">Due</div>
            <div className="col-span-2 text-right">Amount</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-1 text-right">Action</div>
          </div>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : invoices.length === 0 ? (
            <div className="flex flex-col items-center py-12 gap-2">
              <FileText className="w-8 h-8 text-muted-foreground opacity-40" />
              <p className="text-sm text-muted-foreground">No invoices yet.</p>
            </div>
          ) : (
            (invoices as PortalInvoice[]).map((inv) => (
              <div key={inv.id} className="grid grid-cols-12 px-4 py-3 border-t text-sm items-center">
                <div className="col-span-3 font-medium">
                  <Link to={`/portal/invoices/${inv.id}`} className="text-primary hover:underline">
                    {inv.invoice_number}
                  </Link>
                </div>
                <div className="col-span-2 text-muted-foreground">{new Date(inv.issue_date).toLocaleDateString()}</div>
                <div className="col-span-2 text-muted-foreground">{new Date(inv.due_date).toLocaleDateString()}</div>
                <div className="col-span-2 text-right font-medium">£{Number(inv.total).toFixed(2)}</div>
                <div className="col-span-2">
                  <Badge variant={statusVariant(inv.status)}>{inv.status}</Badge>
                </div>
                <div className="col-span-1 text-right">
                  {inv.status !== "paid" && (
                    <InvoicePaymentButton invoiceId={inv.id} checkoutUrl={inv.stripe_checkout_url} />
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
