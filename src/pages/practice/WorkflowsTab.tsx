import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Zap, Mail, ClipboardList, Bell, Plus, Pencil, Trash2 } from "lucide-react";
import { AutomationBuilder } from "@/components/workflows/AutomationBuilder";
import { toast } from "sonner";

export function WorkflowsTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showBuilder, setShowBuilder] = useState(false);
  const [editRule, setEditRule] = useState<any>(null);

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("tenant_id").eq("id", user!.id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const tenantId = profile?.tenant_id;

  const { data: automations = [], isLoading: autoLoading } = useQuery({
    queryKey: ["automation-rules", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("automation_rules")
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  const { data: notifications = [], isLoading: notifLoading } = useQuery({
    queryKey: ["notification-rules", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notification_rules")
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  const { data: taskTemplates = [] } = useQuery({
    queryKey: ["task-templates-count", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("task_templates")
        .select("id, name, default_priority")
        .eq("tenant_id", tenantId!)
        .order("name")
        .limit(20);
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  const getActionIcon = (type: string) => {
    if (type === "send_email") return <Mail className="w-3.5 h-3.5" />;
    if (type === "create_task") return <ClipboardList className="w-3.5 h-3.5" />;
    return <Zap className="w-3.5 h-3.5" />;
  };

  const getTriggerLabel = (trigger: string) => {
    const map: Record<string, string> = {
      client_created: "Client Created",
      vat_obligation_detected: "VAT Obligation",
      payroll_schedule: "Payroll Schedule",
      accounts_year_end: "Year-end Trigger",
      invoice_overdue: "Invoice Overdue",
    };
    return map[trigger] || trigger.replace(/_/g, " ");
  };

  const isLoading = autoLoading || notifLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const toggleRule = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { error } = await supabase.from("automation_rules").update({ is_enabled: enabled }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["automation-rules"] }),
  });

  const deleteRule = useMutation({
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
      {/* Automation Rules */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="w-4 h-4" /> Automation Rules
            </CardTitle>
            <CardDescription>Event-driven automations that create tasks or send emails</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{automations.length} rule{automations.length !== 1 ? "s" : ""}</Badge>
            <Button size="sm" className="gap-1" onClick={() => { setEditRule(null); setShowBuilder(true); }}>
              <Plus className="w-3.5 h-3.5" /> New Rule
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Trigger</TableHead>
                <TableHead>Action</TableHead>
                <TableHead className="text-center">Enabled</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {automations.map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell className="font-medium">{rule.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="gap-1 font-normal">
                      {getTriggerLabel(rule.trigger_type)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      {getActionIcon(rule.action_type)}
                      <span className="text-sm text-muted-foreground">
                        {rule.action_type === "create_task" ? "Create Task" : "Send Email"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch checked={rule.is_enabled ?? true} disabled />
                  </TableCell>
                </TableRow>
              ))}
              {automations.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    No automation rules configured
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Notification Rules */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="w-4 h-4" /> Notification Rules
            </CardTitle>
            <CardDescription>Scheduled notifications and reminder rules</CardDescription>
          </div>
          <Badge variant="secondary">{notifications.length} rule{notifications.length !== 1 ? "s" : ""}</Badge>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Template</TableHead>
                <TableHead>Days Before Due</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {notifications.map((n) => (
                <TableRow key={n.id}>
                  <TableCell className="font-medium">{n.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{n.channel}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground font-mono text-xs">{n.template_key}</TableCell>
                  <TableCell>{n.days_before_due ?? "—"}</TableCell>
                </TableRow>
              ))}
              {notifications.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    No notification rules configured
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Task Templates summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardList className="w-4 h-4" /> Task Templates
          </CardTitle>
          <CardDescription>
            {taskTemplates.length}+ task templates configured for your practice
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {taskTemplates.slice(0, 12).map((t) => (
              <Badge key={t.id} variant="outline" className="text-xs">
                {t.name}
              </Badge>
            ))}
            {taskTemplates.length > 12 && (
              <Badge variant="secondary" className="text-xs">
                +{taskTemplates.length - 12} more
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
