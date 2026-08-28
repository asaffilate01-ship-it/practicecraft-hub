import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { HmrcConnectButton } from "@/components/HmrcConnectButton";
import { collectHmrcFraudContext } from "@/lib/hmrcFraudHeaders";

interface Obligation {
  periodKey: string;
  start: string;
  end: string;
  due: string;
  status: string;
  received?: string;
}

interface Props {
  clientId: string;
  vrn: string;
}

export function HmrcObligations({ clientId, vrn }: Props) {
  const [obligations, setObligations] = useState<Obligation[]>([]);
  const queryClient = useQueryClient();

  const { data: connection } = useQuery({
    queryKey: ["hmrc-vat-status", clientId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("hmrc", { body: { action: "vat/status", clientId } });
      if (error) throw error;
      return data as { connected: boolean; mode: "sandbox" | "production" };
    },
    enabled: !!clientId,
  });

  const pullMut = useMutation({
    mutationFn: async () => {
      const from = new Date();
      from.setFullYear(from.getFullYear() - 1);

      const { data, error } = await supabase.functions.invoke("hmrc", {
        body: {
          action: "vat/sync-obligations",
          clientId,
          from: from.toISOString().slice(0, 10),
          to: new Date().toISOString().slice(0, 10),
          fraudContext: collectHmrcFraudContext(),
        },
      });

      if (error) throw error;
      if (data?.obligations) {
        return data.obligations as Obligation[];
      }
      throw new Error(data?.error || "Failed to pull obligations");
    },
    onSuccess: (obs) => {
      setObligations(obs);
      queryClient.invalidateQueries({ queryKey: ["vat_returns"] });
      toast.success(`Pulled ${obs.length} VAT obligations from HMRC`);
    },
    onError: (error: unknown) => toast.error(error instanceof Error ? error.message : "Failed to sync HMRC obligations"),
  });

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <div><CardTitle className="text-base font-semibold">HMRC VAT Obligations</CardTitle>{connection?.mode && <p className="text-xs text-muted-foreground mt-1">{connection.mode === "production" ? "HMRC production" : "HMRC sandbox"}</p>}</div>
        <div className="flex gap-2">
        {clientId && !connection?.connected && <HmrcConnectButton clientId={clientId} scopes="read:vat write:vat" label="Connect HMRC" />}
        <Button
          variant="outline"
          size="sm"
          onClick={() => pullMut.mutate()}
          disabled={!clientId || !connection?.connected || pullMut.isPending}
          className="gap-1.5"
        >
          {pullMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          Sync obligations
        </Button>
        </div>
      </CardHeader>
      <CardContent>
        {obligations.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            {!clientId ? "Select a VAT-registered client to manage its HMRC obligations." : !connection?.connected ? "Connect this client to HMRC before syncing obligations." : `Sync HMRC obligations for VRN ${vrn}.`}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Period</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Received</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {obligations.map((o) => (
                <TableRow key={o.periodKey}>
                  <TableCell className="text-sm">
                    {new Date(o.start).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    {" → "}
                    {new Date(o.end).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" })}
                  </TableCell>
                  <TableCell className="text-sm">
                    {new Date(o.due).toLocaleDateString("en-GB")}
                  </TableCell>
                  <TableCell>
                    <Badge variant={o.status === "F" ? "default" : "secondary"} className="text-xs">
                      {o.status === "F" ? "Fulfilled" : "Open"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {o.received ? new Date(o.received).toLocaleDateString("en-GB") : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
