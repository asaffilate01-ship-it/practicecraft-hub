import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Send, FileText, CheckCircle2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function VatReturnDetail() {
  const { returnId } = useParams();
  const navigate = useNavigate();

  const { data: vatReturn, isLoading } = useQuery({
    queryKey: ["vat-return", returnId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vat_returns")
        .select("*, clients(legal_name)")
        .eq("id", returnId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!returnId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const boxes = (vatReturn?.boxes_json as Record<string, number>) || {};

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/vat")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">VAT Return</h1>
          <p className="text-sm text-muted-foreground">
            {vatReturn?.period_start} → {vatReturn?.period_end} · {(vatReturn as any)?.clients?.legal_name}
          </p>
        </div>
        <Badge variant={vatReturn?.status === "submitted" ? "default" : "secondary"} className="ml-auto">
          {vatReturn?.status || "draft"}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "Box 1 – VAT due on sales", value: boxes.box1 },
          { label: "Box 2 – VAT due on acquisitions", value: boxes.box2 },
          { label: "Box 3 – Total VAT due", value: boxes.box3 },
          { label: "Box 4 – VAT reclaimed", value: boxes.box4 },
          { label: "Box 5 – Net VAT", value: boxes.box5 },
          { label: "Box 6 – Total sales (excl VAT)", value: boxes.box6 },
          { label: "Box 7 – Total purchases (excl VAT)", value: boxes.box7 },
          { label: "Box 8 – Total EC supplies", value: boxes.box8 },
          { label: "Box 9 – Total EC acquisitions", value: boxes.box9 },
        ].map((box) => (
          <Card key={box.label}>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">{box.label}</p>
              <p className="text-lg font-semibold">£{((box.value || 0) / 100).toFixed(2)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-4 h-4" /> Submission Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">HMRC Receipt</span><span>{vatReturn?.hmrc_receipt_id || "—"}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Submitted At</span><span>{vatReturn?.submitted_at ? new Date(vatReturn.submitted_at).toLocaleString() : "—"}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Payment Due</span><span>{vatReturn?.payment_due_date || "—"}</span></div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button variant="outline" onClick={() => navigate("/vat")}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to VAT
        </Button>
        {vatReturn?.status !== "submitted" && (
          <Button>
            <Send className="w-4 h-4 mr-2" /> Submit to HMRC
          </Button>
        )}
      </div>
    </div>
  );
}
