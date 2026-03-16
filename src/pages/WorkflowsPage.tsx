import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/hooks/usePermissions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Zap, Plus, Pencil, Trash2 } from "lucide-react";
import { AutomationBuilder } from "@/components/workflows/AutomationBuilder";
import { WorkflowExecutionLog } from "@/components/workflows/WorkflowExecutionLog";
import { toast } from "sonner";

export default function WorkflowsPage() {
  const { tenantId } = usePermissions();
  const queryClient = useQueryClient();
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editRule, setEditRule] = useState<any>(null);

  const { data: rules, isLoading } = useQuery({
    queryKey: ["automation-rules", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("automation_rules")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  const toggleMut = useMutation({
    mutationFn: async ({ id, is_enabled }: { id: string; is_enabled: boolean }) => {
      const { error } = await supabase.from("automation_rules").update({ is_enabled }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automation-rules"] });
      toast.success("Rule updated");
    },
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("automation_rules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automation-rules"] });
      toast.success("Rule deleted");
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Workflows & Automations</h1>
          <p className="text-muted-foreground">Event-driven rules, scheduled tasks, and deadline escalation.</p>
        </div>
        <Button onClick={() => { setEditRule(null); setBuilderOpen(true); }} className="gap-1.5">
          <Plus className="w-4 h-4" /> New Rule
        </Button>
      </div>

      <Tabs defaultValue="rules">
        <TabsList>
          <TabsTrigger value="rules">Rules</TabsTrigger>
          <TabsTrigger value="log">Execution Log</TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Zap className="h-5 w-5" /> Automation Rules</CardTitle>
              <CardDescription>{rules?.length || 0} rules configured</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
              ) : !rules?.length ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No automation rules configured.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Trigger</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Enabled</TableHead>
                      <TableHead className="w-20"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rules.map((r: any) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{r.trigger_type.replace(/_/g, " ")}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{r.action_type.replace(/_/g, " ")}</Badge>
                        </TableCell>
                        <TableCell>
                          <Switch checked={r.is_enabled} onCheckedChange={(v) => toggleMut.mutate({ id: r.id, is_enabled: v })} />
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditRule(r); setBuilderOpen(true); }}>
                              <Pencil className="w-3 h-3" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteMut.mutate(r.id)}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="log" className="mt-4">
          <WorkflowExecutionLog />
        </TabsContent>
      </Tabs>

      {tenantId && (
        <AutomationBuilder
          open={builderOpen}
          onOpenChange={setBuilderOpen}
          tenantId={tenantId}
          editRule={editRule}
        />
      )}
    </div>
  );
}
