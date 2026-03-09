import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/hooks/usePermissions";
import { useClientContext } from "@/contexts/ClientContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DueDatePill } from "@/components/ui/due-date-pill";
import { FileText, Send, Calculator, CheckCircle2, Clock, AlertTriangle, PoundSterling } from "lucide-react";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive"; icon: typeof Clock }> = {
  not_started: { label: "Not Started", variant: "outline", icon: Clock },
  in_progress: { label: "In Progress", variant: "secondary", icon: Calculator },
  review: { label: "Under Review", variant: "default", icon: FileText },
  approved: { label: "Approved", variant: "default", icon: CheckCircle2 },
  submitted: { label: "Filed", variant: "default", icon: Send },
  overdue: { label: "Overdue", variant: "destructive", icon: AlertTriangle },
};

export default function CorporationTax() {
  const { tenantId } = usePermissions();
  const { selectedClientId } = useClientContext();

  const { data: periods = [], isLoading } = useQuery({
    queryKey: ["ct-periods", tenantId, selectedClientId],
    queryFn: async () => {
      let q = supabase
        .from("accounts_periods")
        .select("*, clients(legal_name, company_number)")
        .eq("tenant_id", tenantId!)
        .eq("period_type", "ct600")
        .order("filing_deadline", { ascending: true });

      if (selectedClientId) q = q.eq("client_id", selectedClientId);

      const { data, error } = await q.limit(200);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!tenantId,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Corporation Tax</h1>
        <p className="text-muted-foreground">CT600 preparation, computation & filing</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Total Periods", value: periods.length, icon: FileText },
          { label: "In Progress", value: periods.filter((p: any) => p.ct600_status === "in_progress").length, icon: Calculator },
          { label: "Awaiting Filing", value: periods.filter((p: any) => p.ct600_status === "approved").length, icon: Send },
          { label: "Filed", value: periods.filter((p: any) => p.ct600_status === "submitted").length, icon: CheckCircle2 },
        ].map((card) => (
          <Card key={card.label}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{card.label}</p>
                  <p className="text-2xl font-bold">{card.value}</p>
                </div>
                <card.icon className="w-8 h-8 text-muted-foreground/40" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="filed">Filed</TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Active CT600 Periods</CardTitle>
              <CardDescription>Corporation tax returns in preparation</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Company</TableHead>
                      <TableHead>Co. Number</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Filing Deadline</TableHead>
                      <TableHead>CT600 Status</TableHead>
                      <TableHead>Accounts Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {periods.filter((p: any) => p.ct600_status !== "submitted").map((p: any) => {
                      const client = p.clients as any;
                      const sc = statusConfig[p.ct600_status] || statusConfig.not_started;
                      const Icon = sc.icon;
                      return (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">{client?.legal_name ?? "—"}</TableCell>
                          <TableCell className="text-muted-foreground font-mono text-xs">{client?.company_number ?? "—"}</TableCell>
                          <TableCell>{p.period_start} — {p.period_end}</TableCell>
                          <TableCell>
                            {p.filing_deadline ? <DueDatePill date={p.filing_deadline} /> : "—"}
                          </TableCell>
                          <TableCell>
                            <Badge variant={sc.variant} className="gap-1">
                              <Icon className="w-3 h-3" /> {sc.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={p.status === "completed" ? "default" : "secondary"}>
                              {p.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {periods.filter((p: any) => p.ct600_status !== "submitted").length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                          No active CT600 periods. Create an accounts period with CT600 type to begin.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="filed">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Filed CT600 Returns</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Filed Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {periods.filter((p: any) => p.ct600_status === "submitted").map((p: any) => {
                    const client = p.clients as any;
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{client?.legal_name ?? "—"}</TableCell>
                        <TableCell>{p.period_start} — {p.period_end}</TableCell>
                        <TableCell>{p.updated_at?.slice(0, 10)}</TableCell>
                        <TableCell>
                          <Badge variant="default" className="gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Filed
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {periods.filter((p: any) => p.ct600_status === "submitted").length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-12">
                        No CT600 returns filed yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
