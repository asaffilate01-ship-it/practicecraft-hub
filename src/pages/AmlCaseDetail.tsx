import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ShieldCheck, User } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function AmlCaseDetail() {
  const { caseId } = useParams();
  const navigate = useNavigate();

  const { data: kycCase, isLoading } = useQuery({
    queryKey: ["kyc-case", caseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("kyc_cases")
        .select("*, clients(legal_name, email)")
        .eq("id", caseId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!caseId,
  });

  const { data: checks = [] } = useQuery({
    queryKey: ["kyc-checks", caseId],
    queryFn: async () => {
      const { data } = await supabase
        .from("kyc_checks")
        .select("*")
        .eq("case_id", caseId!)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!caseId,
  });

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  }

  const riskColor = kycCase?.risk_level === "high" ? "destructive" : kycCase?.risk_level === "medium" ? "secondary" : "default";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/aml")}><ArrowLeft className="w-4 h-4" /></Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">AML Case</h1>
          <p className="text-sm text-muted-foreground">{(kycCase as any)?.clients?.legal_name}</p>
        </div>
        <Badge variant={riskColor} className="ml-auto">{kycCase?.risk_level || "—"} risk</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><User className="w-4 h-4" /> Case Info</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Status</span><Badge>{kycCase?.status}</Badge></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Risk Level</span><span className="capitalize">{kycCase?.risk_level || "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Next Review</span><span>{kycCase?.next_review_date || "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">PEP Check</span><span>{kycCase?.pep_check ? "Done" : "Pending"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Sanctions Check</span><span>{kycCase?.sanctions_check ? "Done" : "Pending"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Adverse Media</span><span>{kycCase?.adverse_media_check ? "Done" : "Pending"}</span></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Verification Checks ({checks.length})</CardTitle></CardHeader>
          <CardContent>
            {checks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No checks recorded.</p>
            ) : (
              <div className="space-y-2">
                {checks.map((c: any) => (
                  <div key={c.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="text-sm font-medium capitalize">{c.check_type}</p>
                      <p className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</p>
                    </div>
                    <Badge variant={c.result === "pass" ? "default" : c.result === "fail" ? "destructive" : "secondary"}>{c.result}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Button variant="outline" onClick={() => navigate("/aml")}><ArrowLeft className="w-4 h-4 mr-2" /> Back</Button>
    </div>
  );
}
