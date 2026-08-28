import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Loader2, FileText } from "lucide-react";

export default function PortalPayslipsPage() {
  const { user } = useAuth();
  const [selected, setSelected] = useState<any>(null);

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

  const { data: payslips = [], isLoading } = useQuery({
    queryKey: ["portal-payslips", portalUser?.client_id],
    queryFn: async () => {
      const { data: employers, error: employerError } = await supabase
        .from("payroll_employers")
        .select("id")
        .eq("client_id", portalUser!.client_id!);
      if (employerError) throw employerError;
      const employerIds = (employers || []).map((employer) => employer.id);
      if (!employerIds.length) return [];

      const { data: payRuns, error: payRunError } = await supabase
        .from("pay_runs")
        .select("id")
        .in("employer_id", employerIds);
      if (payRunError) throw payRunError;
      const payRunIds = (payRuns || []).map((payRun) => payRun.id);
      if (!payRunIds.length) return [];

      const { data, error } = await supabase
        .from("payslips")
        .select("id, employee_name, gross_pence, tax_pence, ni_employee_pence, net_pence, pension_employee_pence, created_at")
        .in("pay_run_id", payRunIds)
        .order("created_at", { ascending: false })
        .limit(24);
      if (error) throw error;
      return data;
    },
    enabled: !!portalUser?.client_id,
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Payslips</h1>
        <p className="text-sm text-muted-foreground">View your payslips.</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="grid grid-cols-12 bg-muted/50 text-xs font-medium text-muted-foreground px-4 py-2">
            <div className="col-span-4">Employee</div>
            <div className="col-span-3">Date</div>
            <div className="col-span-3 text-right">Net Pay</div>
            <div className="col-span-2 text-right">View</div>
          </div>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : payslips.length === 0 ? (
            <div className="flex flex-col items-center py-12 gap-2">
              <FileText className="w-8 h-8 text-muted-foreground opacity-40" />
              <p className="text-sm text-muted-foreground">No payslips available.</p>
            </div>
          ) : (
            payslips.map((p: any) => (
              <div key={p.id} className="grid grid-cols-12 px-4 py-3 border-t text-sm items-center">
                <div className="col-span-4 font-medium">{p.employee_name}</div>
                <div className="col-span-3 text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</div>
                <div className="col-span-3 text-right font-medium">£{(p.net_pence / 100).toFixed(2)}</div>
                <div className="col-span-2 text-right">
                  <Button size="sm" variant="outline" onClick={() => setSelected(p)}>View</Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Sheet open={!!selected} onOpenChange={() => setSelected(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Payslip</SheetTitle>
            <SheetDescription>{selected?.employee_name} — {selected ? new Date(selected.created_at).toLocaleDateString() : ""}</SheetDescription>
          </SheetHeader>
          {selected && (
            <div className="mt-6 space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Gross Pay</span><span className="font-medium">£{(selected.gross_pence / 100).toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Income Tax</span><span>−£{(selected.tax_pence / 100).toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Employee NI</span><span>−£{(selected.ni_employee_pence / 100).toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Pension</span><span>−£{((selected.pension_employee_pence || 0) / 100).toFixed(2)}</span></div>
              <div className="border-t pt-3 flex justify-between font-semibold"><span>Net Pay</span><span>£{(selected.net_pence / 100).toFixed(2)}</span></div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
