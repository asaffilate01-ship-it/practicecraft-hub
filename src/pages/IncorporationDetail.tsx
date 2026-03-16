import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Building2, Users, FileText } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function IncorporationDetail() {
  const { applicationId } = useParams();
  const navigate = useNavigate();

  const { data: app, isLoading } = useQuery({
    queryKey: ["incorporation", applicationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("incorporation_applications")
        .select("*")
        .eq("id", applicationId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!applicationId,
  });

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  }

  const details = (app?.application_json as Record<string, any>) || {};

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/incorporations")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{app?.proposed_name || "Incorporation"}</h1>
          <p className="text-sm text-muted-foreground">Application #{applicationId?.slice(0, 8)}</p>
        </div>
        <Badge className="ml-auto">{app?.status || "draft"}</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Building2 className="w-4 h-4" /> Company Details</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Proposed Name</span><span>{app?.proposed_name}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Company Type</span><span>{app?.company_type || "ltd"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">SIC Codes</span><span>{details.sicCodes?.join(", ") || "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Created</span><span>{app?.created_at ? new Date(app.created_at).toLocaleDateString() : "—"}</span></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><FileText className="w-4 h-4" /> Status</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Current Step</span><span className="capitalize">{app?.current_step || "details"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">KYC Complete</span><span>{details.kycComplete ? "Yes" : "No"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Payment</span><span>{details.paymentComplete ? "Paid" : "Pending"}</span></div>
            {app?.ch_submission_id && <div className="flex justify-between"><span className="text-muted-foreground">CH Reference</span><span>{app.ch_submission_id}</span></div>}
          </CardContent>
        </Card>
      </div>

      <Button variant="outline" onClick={() => navigate("/incorporations")}><ArrowLeft className="w-4 h-4 mr-2" /> Back</Button>
    </div>
  );
}
