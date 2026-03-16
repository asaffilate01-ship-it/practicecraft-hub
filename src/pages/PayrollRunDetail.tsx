import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FileText, Send } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function PayrollRunDetail() {
  const { runId } = useParams();
  const navigate = useNavigate();

  const { data: run, isLoading } = useQuery({
    queryKey: ["payroll-run", runId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payroll_runs")
        .select("*, payroll_employers(*, clients(legal_name))")
        .eq("id", runId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!runId,
  });

  const { data: payslips = [] } = useQuery({
    queryKey: ["payroll-payslips", runId],
    queryFn: async () => {
      const { data } = await supabase
        .from("payroll_payslips")
        .select("*, payroll_employees(first_name, last_name)")
        .eq("payroll_run_id", runId!);
      return data || [];
    },
    enabled: !!runId,
  });

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  }

  const employer = (run as any)?.payroll_employers;
  const clientName = employer?.clients?.legal_name || "—";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/payroll")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Payroll Run – {run?.tax_period}</h1>
          <p className="text-sm text-muted-foreground">{clientName} · Pay date: {run?.pay_date}</p>
        </div>
        <Badge className="ml-auto">{run?.status || "draft"}</Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Gross Pay</p><p className="text-lg font-bold">£{((run?.total_gross_pence || 0) / 100).toFixed(2)}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Tax</p><p className="text-lg font-bold">£{((run?.total_tax_pence || 0) / 100).toFixed(2)}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">NI (Employee)</p><p className="text-lg font-bold">£{((run?.total_employee_ni_pence || 0) / 100).toFixed(2)}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Net Pay</p><p className="text-lg font-bold">£{((run?.total_net_pence || 0) / 100).toFixed(2)}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><FileText className="w-4 h-4" /> Payslips ({payslips.length})</CardTitle></CardHeader>
        <CardContent>
          {payslips.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No payslips generated yet.</p>
          ) : (
            <div className="space-y-2">
              {payslips.map((ps: any) => (
                <div key={ps.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium">{ps.payroll_employees?.first_name} {ps.payroll_employees?.last_name}</p>
                    <p className="text-xs text-muted-foreground">Gross: £{((ps.gross_pay_pence || 0) / 100).toFixed(2)} · Net: £{((ps.net_pay_pence || 0) / 100).toFixed(2)}</p>
                  </div>
                  <Badge variant="secondary">{ps.status || "draft"}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button variant="outline" onClick={() => navigate("/payroll")}><ArrowLeft className="w-4 h-4 mr-2" /> Back</Button>
        {run?.status !== "submitted" && <Button><Send className="w-4 h-4 mr-2" /> Submit FPS</Button>}
      </div>
    </div>
  );
}
