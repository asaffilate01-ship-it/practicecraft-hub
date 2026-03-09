import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/hooks/usePermissions";
import { useClientContext } from "@/contexts/ClientContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DueDatePill } from "@/components/ui/due-date-pill";
import { FileText, Send, Calculator, CheckCircle2, Clock, AlertTriangle } from "lucide-react";

const SA_FORMS = [
  { code: "SA100", label: "Individual", entityTypes: ["sole_trader"] },
  { code: "SA800", label: "Partnership", entityTypes: ["partnership"] },
  { code: "SA900", label: "Trust & Estate", entityTypes: ["trust"] },
];

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive"; icon: typeof Clock }> = {
  not_started: { label: "Not Started", variant: "outline", icon: Clock },
  in_progress: { label: "In Progress", variant: "secondary", icon: Calculator },
  review: { label: "Under Review", variant: "default", icon: FileText },
  approved: { label: "Approved", variant: "default", icon: CheckCircle2 },
  submitted: { label: "Submitted", variant: "default", icon: Send },
  overdue: { label: "Overdue", variant: "destructive", icon: AlertTriangle },
};

export default function SelfAssessment() {
  const { tenantId } = usePermissions();
  const { selectedClientId } = useClientContext();
  const [filterForm, setFilterForm] = useState("all");

  const { data: periods = [], isLoading } = useQuery({
    queryKey: ["sa-periods", tenantId, selectedClientId],
    queryFn: async () => {
      let q = supabase
        .from("accounts_periods")
        .select("*, clients(legal_name, entity_type)")
        .eq("tenant_id", tenantId!)
        .in("period_type", ["sa100", "sa800", "sa900"])
        .order("filing_deadline", { ascending: true });

      if (selectedClientId) q = q.eq("client_id", selectedClientId);

      const { data, error } = await q.limit(200);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!tenantId,
  });

  const filtered = filterForm === "all"
    ? periods
    : periods.filter((p: any) => p.period_type === filterForm.toLowerCase());

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Self Assessment</h1>
          <p className="text-muted-foreground">SA100, SA800 & SA900 returns</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={filterForm} onValueChange={setFilterForm}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Forms</SelectItem>
              {SA_FORMS.map((f) => (
                <SelectItem key={f.code} value={f.code}>{f.code} — {f.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="submitted">Submitted</TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Active Returns</CardTitle>
              <CardDescription>Returns awaiting preparation or submission</CardDescription>
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
                      <TableHead>Client</TableHead>
                      <TableHead>Form</TableHead>
                      <TableHead>Tax Year</TableHead>
                      <TableHead>Filing Deadline</TableHead>
                      <TableHead>SA Status</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.filter((p: any) => p.sa_status !== "submitted").map((p: any) => {
                      const client = p.clients as any;
                      const sc = statusConfig[p.sa_status] || statusConfig.not_started;
                      const Icon = sc.icon;
                      return (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">{client?.legal_name ?? "—"}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{p.period_type?.toUpperCase()}</Badge>
                          </TableCell>
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
                    {filtered.filter((p: any) => p.sa_status !== "submitted").length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                          {selectedClientId ? "No active SA returns for this client." : "No active SA returns. Create an accounts period with SA type to get started."}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="submitted">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Submitted Returns</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Form</TableHead>
                    <TableHead>Tax Year</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.filter((p: any) => p.sa_status === "submitted").map((p: any) => {
                    const client = p.clients as any;
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{client?.legal_name ?? "—"}</TableCell>
                        <TableCell><Badge variant="outline">{p.period_type?.toUpperCase()}</Badge></TableCell>
                        <TableCell>{p.period_start} — {p.period_end}</TableCell>
                        <TableCell>{p.updated_at?.slice(0, 10)}</TableCell>
                        <TableCell>
                          <Badge variant="default" className="gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Submitted
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filtered.filter((p: any) => p.sa_status === "submitted").length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                        No submitted SA returns yet.
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
