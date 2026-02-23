import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface VatTabProps {
  clientId: string;
}

const statusVariant = (s: string) => {
  if (s === "submitted" || s === "accepted") return "default" as const;
  if (s === "rejected") return "destructive" as const;
  return "secondary" as const;
};

export function VatTab({ clientId }: VatTabProps) {
  const { data: returns = [], isLoading } = useQuery({
    queryKey: ["client-vat-returns", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vat_returns")
        .select("*")
        .eq("client_id", clientId)
        .order("period_end", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return <Card className="py-12 text-center"><p className="text-sm text-muted-foreground">Loading VAT returns…</p></Card>;
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">VAT Returns</CardTitle></CardHeader>
      <CardContent>
        {returns.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No VAT returns for this client.</p>
        ) : (
          <div className="space-y-2">
            {returns.map((r: any) => (
              <div key={r.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50">
                <div>
                  <p className="text-sm font-medium">
                    {new Date(r.period_start).toLocaleDateString("en-GB")} – {new Date(r.period_end).toLocaleDateString("en-GB")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Net VAT (Box 5): £{(r.box5 / 100).toFixed(2)}
                    {r.submitted_at && ` · Submitted: ${new Date(r.submitted_at).toLocaleDateString("en-GB")}`}
                  </p>
                </div>
                <Badge variant={statusVariant(r.status)} className="text-xs capitalize">{r.status}</Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
