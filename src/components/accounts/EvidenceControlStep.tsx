import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, ArrowRight, Banknote, CheckCircle2, FileSearch, Files, ListChecks } from "lucide-react";

type Props = {
  clientId: string;
  periodId: string;
  periodStart: string;
  periodEnd: string;
};

const countQuery = async (
  table: "documents" | "bank_transactions" | "evidence_matches" | "duplicate_candidates" | "year_end_checks",
  filters: Array<[string, string]>,
) => {
  let query = (supabase.from(table) as any).select("id", { count: "exact", head: true });
  for (const [column, value] of filters) query = query.eq(column, value);
  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
};

export function EvidenceControlStep({ clientId, periodId, periodStart, periodEnd }: Props) {
  const navigate = useNavigate();

  const { data } = useQuery({
    queryKey: ["accounts-wizard-evidence", clientId, periodId],
    queryFn: async () => {
      const [documents, transactions, confirmedMatches, suggestedMatches, duplicates, checks, completedChecks] = await Promise.all([
        countQuery("documents", [["client_id", clientId]]),
        (async () => {
          const { count, error } = await supabase
            .from("bank_transactions")
            .select("id", { count: "exact", head: true })
            .eq("client_id", clientId)
            .gte("transaction_date", periodStart)
            .lte("transaction_date", periodEnd);
          if (error) throw error;
          return count ?? 0;
        })(),
        countQuery("evidence_matches", [["period_id", periodId], ["status", "confirmed"]]),
        countQuery("evidence_matches", [["period_id", periodId], ["status", "suggested"]]),
        countQuery("duplicate_candidates", [["period_id", periodId], ["status", "open"]]),
        countQuery("year_end_checks", [["period_id", periodId]]),
        countQuery("year_end_checks", [["period_id", periodId], ["status", "complete"]]),
      ]);
      return { documents, transactions, confirmedMatches, suggestedMatches, duplicates, checks, completedChecks };
    },
  });

  const checklistProgress = data?.checks ? Math.round((data.completedChecks / data.checks) * 100) : 0;
  const isReady = !!data && data.suggestedMatches === 0 && data.duplicates === 0 && data.checks > 0 && checklistProgress === 100;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <CardTitle>Evidence and close controls</CardTitle>
              <Badge variant={isReady ? "default" : "secondary"}>{isReady ? "Ready" : "Review required"}</Badge>
            </div>
            <CardDescription>Complete the bank-document review and year-end controls before relying on the trial balance and generated statements.</CardDescription>
          </div>
          <Button onClick={() => navigate(`/accounts-intelligence?client=${clientId}&period=${periodId}`)}>
            Open Accounts Intelligence <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {[
              { label: "Documents", value: data?.documents ?? 0, icon: Files },
              { label: "Bank items", value: data?.transactions ?? 0, icon: Banknote },
              { label: "Confirmed matches", value: data?.confirmedMatches ?? 0, icon: FileSearch },
              { label: "Matches to review", value: data?.suggestedMatches ?? 0, icon: AlertTriangle },
              { label: "Possible duplicates", value: data?.duplicates ?? 0, icon: AlertTriangle },
            ].map((item) => (
              <div key={item.label} className="rounded-lg border p-4">
                <item.icon className="mb-3 h-4 w-4 text-primary" />
                <div className="text-2xl font-bold">{item.value}</div>
                <div className="text-xs text-muted-foreground">{item.label}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ListChecks className="h-4 w-4" /> Year-end readiness</CardTitle>
          <CardDescription>The checklist covers evidence, balances, fixed assets, depreciation, accruals, prepayments, tax and disclosures.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-2 flex justify-between text-sm"><span>{data?.completedChecks ?? 0} of {data?.checks ?? 0} controls complete</span><span className="font-semibold">{checklistProgress}%</span></div>
          <Progress value={checklistProgress} />
          {isReady && <div className="mt-4 flex items-center gap-2 text-sm text-primary"><CheckCircle2 className="h-4 w-4" /> Evidence and year-end controls are ready for accounts preparation.</div>}
        </CardContent>
      </Card>
    </div>
  );
}
