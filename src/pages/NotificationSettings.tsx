import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/hooks/usePermissions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Bell, Mail, Smartphone, Globe } from "lucide-react";
import { toast } from "sonner";

interface NotificationRule {
  id: string;
  name: string;
  channel: string;
  template_key: string;
  days_before_due: number;
  applies_to_json: any;
  is_enabled?: boolean | null;
}

export default function NotificationSettings() {
  const { tenantId } = usePermissions();
  const queryClient = useQueryClient();

  const { data: rules, isLoading } = useQuery({
    queryKey: ["notification-rules", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notification_rules")
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("name");
      if (error) throw error;
      return data as NotificationRule[];
    },
    enabled: !!tenantId,
  });

  const toggleRule = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("notification_rules").update({ is_enabled: is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-rules"] });
      toast.success("Rule updated");
    },
  });

  const channelIcons: Record<string, any> = {
    email: Mail,
    sms: Smartphone,
    webhook: Globe,
    in_app: Bell,
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Notification Settings</h1>
        <p className="text-muted-foreground">Configure which notifications are sent to clients and staff.</p>
      </div>

      {/* Channel overview */}
      <Card>
        <CardHeader>
          <CardTitle>Active Channels</CardTitle>
          <CardDescription>Channels available for sending notifications.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {[
              { channel: "email", label: "Email", enabled: true },
              { channel: "in_app", label: "In-App", enabled: true },
              { channel: "sms", label: "SMS", enabled: false },
              { channel: "webhook", label: "Webhooks", enabled: false },
            ].map((ch) => {
              const Icon = channelIcons[ch.channel] || Bell;
              return (
                <div key={ch.channel} className="flex items-center gap-2 p-3 border rounded-lg">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{ch.label}</span>
                  <Badge variant={ch.enabled ? "default" : "secondary"}>{ch.enabled ? "Active" : "Coming Soon"}</Badge>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Notification rules */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Rules</CardTitle>
          <CardDescription>Toggle individual notification rules on or off.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          {isLoading ? (
            <p className="text-sm text-muted-foreground py-4">Loading…</p>
          ) : !rules?.length ? (
            <p className="text-sm text-muted-foreground py-4">No notification rules configured.</p>
          ) : (
            rules.map((rule) => {
              const Icon = channelIcons[rule.channel] || Bell;
              return (
                <div key={rule.id} className="flex items-center justify-between py-3 border-b last:border-0">
                  <div className="flex items-center gap-3">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{rule.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {rule.channel} · {rule.days_before_due > 0 ? `${rule.days_before_due}d before due` : "On event"} · Template: {rule.template_key}
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={rule.is_active !== false}
                    onCheckedChange={(checked) => toggleRule.mutate({ id: rule.id, is_active: checked })}
                  />
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
