import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useClient } from "@/contexts/ClientContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, Search, Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export function AnomalyDetectionPanel() {
  const { selectedClientId } = useClient();
  const [scanning, setScanning] = useState(false);

  const { data, refetch, isLoading } = useQuery({
    queryKey: ["anomaly-detection", selectedClientId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("ai-intelligence", {
        body: { action: "detect_anomalies", context: { client_id: selectedClientId } },
      });
      if (error) throw error;
      return data;
    },
    enabled: false,
  });

  const runScan = async () => {
    if (!selectedClientId) {
      toast.error("Select a client first");
      return;
    }
    setScanning(true);
    try {
      await refetch();
    } catch (e: any) {
      toast.error(e.message || "Scan failed");
    } finally {
      setScanning(false);
    }
  };

  const anomalies = data?.anomalies || [];
  const summary = data?.summary;

  const severityVariant = (s: string): "default" | "secondary" | "destructive" => {
    if (s === "high") return "destructive";
    if (s === "medium") return "secondary";
    return "default";
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Search className="w-4 h-4 text-primary" />
            AI Anomaly Detection
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={runScan}
            disabled={scanning || isLoading || !selectedClientId}
            className="gap-1"
          >
            {scanning || isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            Scan Transactions
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!data && !scanning && (
          <div className="text-center py-8 space-y-2">
            <ShieldCheck className="w-8 h-8 mx-auto text-muted-foreground opacity-40" />
            <p className="text-sm text-muted-foreground">
              {selectedClientId
                ? "Click 'Scan Transactions' to analyse for anomalies"
                : "Select a client to run anomaly detection"}
            </p>
          </div>
        )}

        {(scanning || isLoading) && (
          <div className="flex flex-col items-center py-8 gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Analysing transactions with AI…</p>
          </div>
        )}

        {data && !scanning && (
          <div className="space-y-4">
            {summary && (
              <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">{summary}</p>
            )}

            {anomalies.length === 0 ? (
              <div className="text-center py-4">
                <ShieldCheck className="w-6 h-6 mx-auto mb-2 text-[hsl(var(--success))]" />
                <p className="text-sm text-muted-foreground">No anomalies detected — transactions look clean.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Explanation</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {anomalies.map((a: any, i: number) => (
                    <TableRow key={i}>
                      <TableCell className="text-sm font-medium">{a.description}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs capitalize">
                          {a.anomaly_type?.replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={severityVariant(a.severity)} className="text-xs capitalize">
                          {a.severity}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[300px]">
                        {a.explanation}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
