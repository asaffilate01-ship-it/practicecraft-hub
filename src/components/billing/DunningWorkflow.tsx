import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/hooks/usePermissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Send, Clock, Ban } from "lucide-react";
import { toast } from "sonner";
import { differenceInDays } from "date-fns";

export function DunningWorkflow() {
  const { tenantId } = usePermissions();
  const queryClient = useQueryClient();

  const { data: overdueInvoices = [], isLoading } = useQuery({
    queryKey: ["dunning-invoices", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("*, clients(legal_name)")
        .in("status", ["sent", "overdue"])
        .not("due_date", "is", null)
        .lt("due_date", new Date().toISOString().slice(0, 10))
        .order("due_date");
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  const sendReminderMut = useMutation({
    mutationFn: async (invoiceId: string) => {
      const { data: inv } = await supabase.from("invoices").select("dunning_count").eq("id", invoiceId).single();
      const { error } = await supabase.from("invoices").update({
        status: "overdue",
        dunning_count: (inv?.dunning_count || 0) + 1,
        last_dunning_at: new Date().toISOString(),
      }).eq("id", invoiceId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dunning-invoices"] });
      toast.success("Dunning reminder logged");
    },
  });

  const getDunningLevel = (daysOverdue: number) => {
    if (daysOverdue <= 7) return { label: "Gentle Reminder", variant: "secondary" as const, color: "text-amber-600" };
    if (daysOverdue <= 14) return { label: "Second Notice", variant: "outline" as const, color: "text-orange-600" };
    if (daysOverdue <= 30) return { label: "Final Warning", variant: "destructive" as const, color: "text-destructive" };
    return { label: "Escalated", variant: "destructive" as const, color: "text-destructive" };
  };

  const totalOverdue = overdueInvoices.reduce((s: number, i: any) => s + (parseFloat(i.total) - parseFloat(i.amount_paid || 0)), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-destructive" /> Dunning & Collections
          </h3>
          <p className="text-xs text-muted-foreground">
            {overdueInvoices.length} overdue invoices · £{totalOverdue.toFixed(2)} outstanding
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-4">
          {isLoading ? (
            <p className="text-center text-muted-foreground py-8">Loading…</p>
          ) : overdueInvoices.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-8">🎉 No overdue invoices!</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead>
                  <TableHead>Days Overdue</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Reminders</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overdueInvoices.map((inv: any) => {
                  const daysOverdue = differenceInDays(new Date(), new Date(inv.due_date));
                  const level = getDunningLevel(daysOverdue);
                  const outstanding = parseFloat(inv.total) - parseFloat(inv.amount_paid || 0);
                  return (
                    <TableRow key={inv.id}>
                      <TableCell className="font-mono text-sm">{inv.invoice_number}</TableCell>
                      <TableCell className="font-medium text-sm">{inv.clients?.legal_name}</TableCell>
                      <TableCell className="text-right font-mono text-sm">£{outstanding.toFixed(2)}</TableCell>
                      <TableCell>
                        <span className={`text-sm font-medium ${level.color}`}>{daysOverdue}d</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={level.variant} className="text-xs">{level.label}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{inv.dunning_count || 0}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => sendReminderMut.mutate(inv.id)}>
                          <Send className="w-3 h-3" /> Chase
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
