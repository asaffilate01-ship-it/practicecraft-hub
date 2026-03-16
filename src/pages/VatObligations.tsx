import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, Calendar, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useClientContext } from "@/contexts/ClientContext";
import { toast } from "sonner";
import { DueDatePill } from "@/components/ui/due-date-pill";

export default function VatObligations() {
  const { selectedClientId } = useClientContext();

  const { data: obligations = [], isLoading, refetch } = useQuery({
    queryKey: ["vat-obligations", selectedClientId],
    queryFn: async () => {
      let q = supabase.from("vat_returns").select("*, clients(legal_name)").order("period_end", { ascending: false });
      if (selectedClientId) q = q.eq("client_id", selectedClientId);
      const { data, error } = await q.limit(50);
      if (error) throw error;
      return data || [];
    },
  });

  const statusIcon = (s: string) => {
    if (s === "submitted") return <CheckCircle2 className="w-4 h-4 text-success" />;
    if (s === "draft") return <Clock className="w-4 h-4 text-warning" />;
    return <AlertCircle className="w-4 h-4 text-muted-foreground" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">VAT Obligations</h1>
          <p className="text-sm text-muted-foreground">HMRC VAT obligations tracker</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { refetch(); toast.success("Refreshed"); }}>
          <RefreshCw className="w-4 h-4 mr-2" /> Refresh
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />)}</div>
      ) : obligations.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground"><Calendar className="w-10 h-10 mx-auto mb-3 opacity-40" /><p>No VAT obligations found.</p></CardContent></Card>
      ) : (
        <div className="space-y-3">
          {obligations.map((ob) => (
            <Card key={ob.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex items-center gap-3">
                  {statusIcon(ob.status)}
                  <div>
                    <p className="text-sm font-medium">{(ob as any).clients?.legal_name}</p>
                    <p className="text-xs text-muted-foreground">{ob.period_start} → {ob.period_end}</p>
                  </div>
                </div>
                <Badge variant={ob.status === "submitted" ? "default" : "secondary"}>{ob.status}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
