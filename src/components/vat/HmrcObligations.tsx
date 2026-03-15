import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";

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
  tenantId: string;
}

export function HmrcObligations({ clientId, vrn, tenantId }: Props) {
  const [obligations, setObligations] = useState<Obligation[]>([]);

  const pullMut = useMutation({
    mutationFn: async () => {
      // Get stored access token for this client
      const { data: cred } = await supabase
        .from("client_credentials")
        .select("ciphertext")
        .eq("client_id", clientId)
        .eq("provider", "hmrc_vat")
        .single();

      if (!cred) throw new Error("No HMRC VAT credentials found. Connect HMRC first.");

      const tokens = JSON.parse(cred.ciphertext);
      const from = new Date();
      from.setFullYear(from.getFullYear() - 1);

      const { data, error } = await supabase.functions.invoke("hmrc", {
        body: {
          action: "vat/obligations",
          vrn,
          accessToken: tokens.access_token,
          from: from.toISOString().slice(0, 10),
          to: new Date().toISOString().slice(0, 10),
        },
      });

      if (error) throw error;
      if (data?.data?.obligations) {
        return data.data.obligations as Obligation[];
      }
      throw new Error(data?.data?.message || "Failed to pull obligations");
    },
    onSuccess: (obs) => {
      setObligations(obs);
      toast.success(`Pulled ${obs.length} VAT obligations from HMRC`);
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold">HMRC VAT Obligations</CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={() => pullMut.mutate()}
          disabled={pullMut.isPending}
          className="gap-1.5"
        >
          {pullMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          Pull from HMRC
        </Button>
      </CardHeader>
      <CardContent>
        {obligations.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Click "Pull from HMRC" to fetch live VAT obligations for VRN {vrn}.
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
