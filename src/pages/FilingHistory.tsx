import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/hooks/usePermissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, CheckCircle2, XCircle, Clock } from "lucide-react";

export default function FilingHistory() {
  const { tenantId } = usePermissions();

  const { data: filings, isLoading } = useQuery({
    queryKey: ["ch-filings", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ch_filings")
        .select("*, clients(legal_name)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  const statusBadge = (s: string) => {
    const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      accepted: { label: "Accepted", variant: "default" },
      test_accepted: { label: "Test accepted", variant: "secondary" },
      rejected: { label: "Rejected", variant: "destructive" },
      pending: { label: "Pending", variant: "secondary" },
      draft: { label: "Draft", variant: "outline" },
      submitted: { label: "Submitted", variant: "secondary" },
    };
    const m = map[s] || { label: s, variant: "outline" as const };
    return <Badge variant={m.variant}>{m.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Filing History</h1>
        <p className="text-muted-foreground">Companies House filing submissions and responses.</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> All Filings</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : !filings?.length ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No filings recorded yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Environment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>CH Ref</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filings.map((f: any) => (
                  <TableRow key={f.id}>
                    <TableCell className="font-medium">{f.clients?.legal_name || "—"}</TableCell>
                    <TableCell>{f.filing_type}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{f.filing_description || "—"}</TableCell>
                    <TableCell><Badge variant="outline" className="capitalize">{f.environment || "test"}</Badge></TableCell>
                    <TableCell>{statusBadge(f.status === "accepted" && f.environment !== "production" ? "test_accepted" : f.status)}</TableCell>
                    <TableCell>{f.submitted_at ? new Date(f.submitted_at).toLocaleDateString("en-GB") : "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{f.ch_transaction_id || f.ch_barcode || "—"}</TableCell>
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
