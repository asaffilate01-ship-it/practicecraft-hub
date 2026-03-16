import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Receipt } from "lucide-react";

export default function PortalVatPage() {
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

  const { data: client } = useQuery({
    queryKey: ["portal-client-vat", portalUser?.client_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("vat_number")
        .eq("id", portalUser!.client_id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!portalUser?.client_id,
  });

  const { data: returns = [], isLoading } = useQuery({
    queryKey: ["portal-vat-returns", portalUser?.client_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vat_returns")
        .select("id, period_start, period_end, box1, box5, status, submitted_at")
        .eq("client_id", portalUser!.client_id!)
        .order("period_end", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
    enabled: !!portalUser?.client_id,
  });

  const statusVariant = (s: string): "default" | "secondary" | "destructive" | "outline" => {
    if (s === "submitted" || s === "accepted") return "default";
    if (s === "draft") return "secondary";
    return "outline";
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">VAT</h1>
        <p className="text-sm text-muted-foreground">
          {client?.vat_number ? `VRN: ${client.vat_number}` : "Your VAT returns and obligations."}
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Returns</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="grid grid-cols-12 bg-muted/50 text-xs font-medium text-muted-foreground px-4 py-2">
            <div className="col-span-4">Period</div>
            <div className="col-span-2 text-right">Output VAT</div>
            <div className="col-span-2 text-right">Net VAT</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-2">Submitted</div>
          </div>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : returns.length === 0 ? (
            <div className="flex flex-col items-center py-12 gap-2">
              <Receipt className="w-8 h-8 text-muted-foreground opacity-40" />
              <p className="text-sm text-muted-foreground">No VAT returns on file.</p>
            </div>
          ) : (
            returns.map((r: any) => (
              <div key={r.id} className="grid grid-cols-12 px-4 py-3 border-t text-sm items-center">
                <div className="col-span-4 font-medium">
                  {new Date(r.period_start).toLocaleDateString()} – {new Date(r.period_end).toLocaleDateString()}
                </div>
                <div className="col-span-2 text-right">£{Number(r.box1 || 0).toFixed(2)}</div>
                <div className="col-span-2 text-right font-medium">£{Number(r.box5 || 0).toFixed(2)}</div>
                <div className="col-span-2">
                  <Badge variant={statusVariant(r.status)}>{r.status}</Badge>
                </div>
                <div className="col-span-2 text-xs text-muted-foreground">
                  {r.submitted_at ? new Date(r.submitted_at).toLocaleDateString() : "—"}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
