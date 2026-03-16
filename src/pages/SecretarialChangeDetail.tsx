import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FileText, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function SecretarialChangeDetail() {
  const { changeId } = useParams();
  const navigate = useNavigate();

  const { data: filing, isLoading } = useQuery({
    queryKey: ["ch-filing", changeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ch_filings")
        .select("*, clients(legal_name)")
        .eq("id", changeId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!changeId,
  });

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  }

  const statusColor = filing?.status === "accepted" ? "default" : filing?.status === "rejected" ? "destructive" : "secondary";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/secretarial")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Companies House Filing</h1>
          <p className="text-sm text-muted-foreground">{(filing as any)?.clients?.legal_name} · {filing?.filing_type}</p>
        </div>
        <Badge variant={statusColor} className="ml-auto">{filing?.status}</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Filing Details</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Type</span><span>{filing?.filing_type}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Description</span><span>{filing?.filing_description || "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Submitted</span><span>{filing?.submitted_at ? new Date(filing.submitted_at).toLocaleString() : "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Accepted</span><span>{filing?.accepted_at ? new Date(filing.accepted_at).toLocaleString() : "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Barcode</span><span>{filing?.ch_barcode || "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Transaction ID</span><span>{filing?.ch_transaction_id || "—"}</span></div>
          </CardContent>
        </Card>

        {filing?.rejected_reason && (
          <Card className="border-destructive">
            <CardHeader><CardTitle className="text-base text-destructive flex items-center gap-2"><AlertCircle className="w-4 h-4" /> Rejection</CardTitle></CardHeader>
            <CardContent><p className="text-sm">{filing.rejected_reason}</p></CardContent>
          </Card>
        )}
      </div>

      <Button variant="outline" onClick={() => navigate("/secretarial")}><ArrowLeft className="w-4 h-4 mr-2" /> Back</Button>
    </div>
  );
}
