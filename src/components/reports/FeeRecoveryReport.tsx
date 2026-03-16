import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/hooks/usePermissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { KPICard } from "@/components/dashboard/KPICard";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { PoundSterling, TrendingUp, BarChart3, Target } from "lucide-react";

export function FeeRecoveryReport() {
  const { tenantId } = usePermissions();

  const { data, isLoading } = useQuery({
    queryKey: ["fee-recovery", tenantId],
    queryFn: async () => {
      const [timeRes, invoicesRes] = await Promise.all([
        supabase.from("time_entries").select("client_id, duration_minutes, rate_pence, is_billable, date"),
        supabase.from("invoices").select("client_id, total, status, issue_date"),
      ]);

      // WIP value by month
      const wipByMonth: Record<string, number> = {};
      const billedByMonth: Record<string, number> = {};

      for (const t of timeRes.data || []) {
        if (!t.is_billable) continue;
        const m = t.date?.slice(0, 7);
        if (!m) continue;
        const value = (t.duration_minutes / 60) * ((t.rate_pence || 15000) / 100);
        wipByMonth[m] = (wipByMonth[m] || 0) + value;
      }

      for (const inv of invoicesRes.data || []) {
        if (inv.status !== "paid") continue;
        const m = (inv as any).issue_date?.slice(0, 7);
        if (!m) continue;
        billedByMonth[m] = (billedByMonth[m] || 0) + Number((inv as any).total || 0);
      }

      const allMonths = [...new Set([...Object.keys(wipByMonth), ...Object.keys(billedByMonth)])].sort().slice(-12);
      const chartData = allMonths.map(m => ({
        month: m,
        wip: wipByMonth[m] || 0,
        billed: billedByMonth[m] || 0,
        recovery: (wipByMonth[m] || 0) > 0
          ? Math.round(((billedByMonth[m] || 0) / (wipByMonth[m] || 1)) * 100)
          : 0,
      }));

      const totalWip = Object.values(wipByMonth).reduce((a, b) => a + b, 0);
      const totalBilled = Object.values(billedByMonth).reduce((a, b) => a + b, 0);
      const overallRecovery = totalWip > 0 ? Math.round((totalBilled / totalWip) * 100) : 0;

      return { chartData, totalWip, totalBilled, overallRecovery };
    },
    enabled: !!tenantId,
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <KPICard title="Recovery Rate" value={`${data?.overallRecovery ?? 0}%`} icon={Target}
          changeType={(data?.overallRecovery ?? 0) >= 90 ? "positive" : "negative"}
          iconColor="bg-primary/10" />
        <KPICard title="Total WIP Value" value={`£${(data?.totalWip ?? 0).toFixed(0)}`} icon={PoundSterling} iconColor="bg-accent" />
        <KPICard title="Total Billed" value={`£${(data?.totalBilled ?? 0).toFixed(0)}`} icon={TrendingUp} iconColor="bg-[hsl(var(--success))]/10" />
        <KPICard title="Write-off" value={`£${Math.max(0, (data?.totalWip ?? 0) - (data?.totalBilled ?? 0)).toFixed(0)}`}
          icon={BarChart3} iconColor="bg-destructive/10" />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">WIP vs Billed by Month</CardTitle>
        </CardHeader>
        <CardContent>
          {(data?.chartData?.length ?? 0) > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data!.chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `£${v.toFixed(0)}`} />
                <Tooltip formatter={(v: number) => [`£${v.toFixed(2)}`, ""]} />
                <Bar dataKey="wip" fill="hsl(199, 89%, 48%)" radius={[3, 3, 0, 0]} name="WIP Value" />
                <Bar dataKey="billed" fill="hsl(142, 71%, 45%)" radius={[3, 3, 0, 0]} name="Billed" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">No data yet</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
