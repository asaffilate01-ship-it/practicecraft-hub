import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Users, DollarSign, FileText } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function PayrollEmployerDetail() {
  const { employerId } = useParams();
  const navigate = useNavigate();

  const { data: employer, isLoading } = useQuery({
    queryKey: ["payroll-employer", employerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payroll_employers")
        .select("*, clients(legal_name)")
        .eq("id", employerId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!employerId,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["payroll-employees", employerId],
    queryFn: async () => {
      const { data } = await supabase
        .from("payroll_employees")
        .select("*")
        .eq("employer_id", employerId!)
        .eq("status", "active");
      return data || [];
    },
    enabled: !!employerId,
  });

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/payroll")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{(employer as any)?.clients?.legal_name || "Employer"}</h1>
          <p className="text-sm text-muted-foreground">PAYE Ref: {employer?.paye_office_number}/{employer?.paye_reference} · Tax District: {employer?.hmrc_tax_district}</p>
        </div>
        <Badge className="ml-auto">{employer?.status || "active"}</Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Active Employees</p><p className="text-2xl font-bold">{employees.length}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Payment Frequency</p><p className="text-2xl font-bold capitalize">{employer?.pay_frequency || "monthly"}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Tax Year Start</p><p className="text-2xl font-bold">{employer?.tax_year_start || "6 Apr"}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Users className="w-4 h-4" /> Employees</CardTitle></CardHeader>
        <CardContent>
          {employees.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No active employees found.</p>
          ) : (
            <div className="space-y-2">
              {employees.map((emp: any) => (
                <div key={emp.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium">{emp.first_name} {emp.last_name}</p>
                    <p className="text-xs text-muted-foreground">NI: {emp.ni_number || "—"} · Tax Code: {emp.tax_code || "—"}</p>
                  </div>
                  <Badge variant="secondary">{emp.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
