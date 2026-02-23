import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface PayrollTabProps {
  clientId: string;
}

const fmt = (pence: number) => `£${(pence / 100).toFixed(2)}`;

export function PayrollTab({ clientId }: PayrollTabProps) {
  const { data: employers = [], isLoading: loadingEmployers } = useQuery({
    queryKey: ["client-payroll-employers", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payroll_employers")
        .select("*")
        .eq("client_id", clientId);
      if (error) throw error;
      return data;
    },
  });

  const employerIds = employers.map((e: any) => e.id);

  const { data: payRuns = [], isLoading: loadingRuns } = useQuery({
    queryKey: ["client-pay-runs", employerIds],
    queryFn: async () => {
      if (employerIds.length === 0) return [];
      const { data, error } = await supabase
        .from("pay_runs")
        .select("*, payroll_employers(employer_name)")
        .in("employer_id", employerIds)
        .order("pay_date", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
    enabled: employerIds.length > 0,
  });

  if (loadingEmployers) {
    return <Card className="py-12 text-center"><p className="text-sm text-muted-foreground">Loading payroll…</p></Card>;
  }

  if (employers.length === 0) {
    return (
      <Card className="py-12 text-center space-y-2">
        <p className="text-sm font-medium text-muted-foreground">No payroll employers set up for this client.</p>
        <p className="text-xs text-muted-foreground">Add an employer in the Payroll module to get started.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Employers summary */}
      <Card>
        <CardHeader><CardTitle className="text-base">Employers</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {employers.map((e: any) => (
              <div key={e.id} className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <p className="text-sm font-medium">{e.employer_name}</p>
                  <p className="text-xs text-muted-foreground">
                    PAYE: {e.paye_reference || "—"} · {e.pay_frequency} · {e.tax_year}
                  </p>
                </div>
                <Badge variant={e.is_active ? "default" : "secondary"} className="text-xs">
                  {e.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent pay runs */}
      <Card>
        <CardHeader><CardTitle className="text-base">Recent Pay Runs</CardTitle></CardHeader>
        <CardContent>
          {payRuns.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No pay runs yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead>Pay Date</TableHead>
                  <TableHead className="text-right">Gross</TableHead>
                  <TableHead className="text-right">Net</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payRuns.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-sm">P{r.tax_period} · {r.tax_year}</TableCell>
                    <TableCell className="text-sm">{new Date(r.pay_date).toLocaleDateString("en-GB")}</TableCell>
                    <TableCell className="text-sm text-right font-mono">{fmt(r.total_gross_pence)}</TableCell>
                    <TableCell className="text-sm text-right font-mono">{fmt(r.total_net_pence)}</TableCell>
                    <TableCell><Badge variant="secondary" className="text-xs capitalize">{r.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
