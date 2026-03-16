import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/hooks/usePermissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { differenceInDays } from "date-fns";

export function AgedDebtReport() {
  const { tenantId } = usePermissions();

  const { data, isLoading } = useQuery({
    queryKey: ["aged-debt", tenantId],
    queryFn: async () => {
      const { data: invoices, error } = await supabase
        .from("invoices")
        .select("*, clients(legal_name)")
        .in("status", ["sent", "overdue"])
        .not("due_date", "is", null)
        .order("due_date");
      if (error) throw error;

      const buckets = { current: 0, "1-30": 0, "31-60": 0, "61-90": 0, "90+": 0 };
      const byClient: Record<string, { name: string; current: number; d30: number; d60: number; d90: number; d90plus: number; total: number }> = {};

      const today = new Date();
      for (const inv of invoices || []) {
        const outstanding = parseFloat(inv.total) - parseFloat(inv.amount_paid || 0);
        if (outstanding <= 0) continue;
        const days = differenceInDays(today, new Date(inv.due_date));
        const clientName = (inv as any).clients?.legal_name || "Unknown";
        const cid = inv.client_id || "none";

        if (!byClient[cid]) byClient[cid] = { name: clientName, current: 0, d30: 0, d60: 0, d90: 0, d90plus: 0, total: 0 };
        byClient[cid].total += outstanding;

        if (days <= 0) { buckets.current += outstanding; byClient[cid].current += outstanding; }
        else if (days <= 30) { buckets["1-30"] += outstanding; byClient[cid].d30 += outstanding; }
        else if (days <= 60) { buckets["31-60"] += outstanding; byClient[cid].d60 += outstanding; }
        else if (days <= 90) { buckets["61-90"] += outstanding; byClient[cid].d90 += outstanding; }
        else { buckets["90+"] += outstanding; byClient[cid].d90plus += outstanding; }
      }

      const chartData = [
        { bucket: "Current", amount: buckets.current },
        { bucket: "1-30 days", amount: buckets["1-30"] },
        { bucket: "31-60 days", amount: buckets["31-60"] },
        { bucket: "61-90 days", amount: buckets["61-90"] },
        { bucket: "90+ days", amount: buckets["90+"] },
      ];

      const clients = Object.values(byClient).sort((a, b) => b.total - a.total);
      const totalDebt = clients.reduce((s, c) => s + c.total, 0);

      return { chartData, clients, totalDebt };
    },
    enabled: !!tenantId,
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Aged Debt Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          {(data?.chartData?.length ?? 0) > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data!.chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="bucket" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `£${v.toFixed(0)}`} />
                <Tooltip formatter={(v: number) => [`£${v.toFixed(2)}`, "Amount"]} />
                <Bar dataKey="amount" fill="hsl(var(--destructive))" radius={[3, 3, 0, 0]} opacity={0.8} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">No outstanding debt 🎉</div>
          )}
        </CardContent>
      </Card>

      {(data?.clients?.length ?? 0) > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">
              Debt by Client · Total: £{(data?.totalDebt ?? 0).toFixed(2)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead className="text-right">Current</TableHead>
                  <TableHead className="text-right">1-30d</TableHead>
                  <TableHead className="text-right">31-60d</TableHead>
                  <TableHead className="text-right">61-90d</TableHead>
                  <TableHead className="text-right">90+d</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data!.clients.map((c) => (
                  <TableRow key={c.name}>
                    <TableCell className="font-medium text-sm">{c.name}</TableCell>
                    <TableCell className="text-right font-mono text-xs">£{c.current.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-mono text-xs">£{c.d30.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-mono text-xs">£{c.d60.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-mono text-xs">£{c.d90.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-mono text-xs text-destructive">£{c.d90plus.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-mono text-sm font-bold">£{c.total.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
