import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const TRIGGERS = [
  { value: "client_created", label: "Client Created" },
  { value: "vat_obligation_detected", label: "VAT Obligation Detected" },
  { value: "payroll_schedule", label: "Payroll Schedule" },
  { value: "accounts_year_end", label: "Year-End Trigger" },
  { value: "invoice_overdue", label: "Invoice Overdue" },
  { value: "task_completed", label: "Task Completed" },
  { value: "document_uploaded", label: "Document Uploaded" },
];

const ACTIONS = [
  { value: "create_task", label: "Create Task" },
  { value: "send_email", label: "Send Email" },
];

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  editRule?: any;
};

export function AutomationBuilder({ open, onOpenChange, tenantId, editRule }: Props) {
  const queryClient = useQueryClient();
  const isEdit = !!editRule;

  const [name, setName] = useState(editRule?.name || "");
  const [triggerType, setTriggerType] = useState(editRule?.trigger_type || "");
  const [actionType, setActionType] = useState(editRule?.action_type || "");
  const [isEnabled, setIsEnabled] = useState(editRule?.is_enabled ?? true);

  // Task action fields
  const [taskTitle, setTaskTitle] = useState(
    editRule?.action_payload_json?.fallback_title || editRule?.action_payload_json?.task_template_name || ""
  );
  const [taskPriority, setTaskPriority] = useState(
    editRule?.action_payload_json?.priority || "medium"
  );
  const [taskDaysBefore, setTaskDaysBefore] = useState(
    String(editRule?.action_payload_json?.days_before_due ?? "0")
  );

  // Email action fields
  const [emailTemplateKey, setEmailTemplateKey] = useState(
    editRule?.action_payload_json?.template_key || ""
  );
  const [emailTo, setEmailTo] = useState(
    editRule?.action_payload_json?.to || "client.primary_email"
  );

  // Trigger filter
  const [triggerServices, setTriggerServices] = useState(
    (editRule?.trigger_filter_json?.services || []).join(", ")
  );

  const saveMutation = useMutation({
    mutationFn: async () => {
      const triggerFilter: any = {};
      if (triggerServices.trim()) {
        triggerFilter.services = triggerServices.split(",").map(s => s.trim()).filter(Boolean);
      }

      const actionPayload: any = {};
      if (actionType === "create_task") {
        actionPayload.fallback_title = taskTitle;
        actionPayload.priority = taskPriority;
        actionPayload.days_before_due = parseInt(taskDaysBefore) || 0;
        actionPayload.assign_to = "assigned_manager";
      } else if (actionType === "send_email") {
        actionPayload.template_key = emailTemplateKey;
        actionPayload.to = emailTo;
      }

      const row = {
        tenant_id: tenantId,
        name,
        trigger_type: triggerType,
        trigger_filter_json: triggerFilter,
        action_type: actionType,
        action_payload_json: actionPayload,
        is_enabled: isEnabled,
      };

      if (isEdit) {
        const { error } = await supabase.from("automation_rules").update(row).eq("id", editRule.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("automation_rules").insert(row);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automation-rules"] });
      onOpenChange(false);
      toast.success(isEdit ? "Rule updated" : "Rule created");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const canSave = name.trim() && triggerType && actionType;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Automation Rule" : "New Automation Rule"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Rule Name *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Auto-create VAT prep task" />
          </div>

          <div className="flex items-center gap-3">
            <Switch checked={isEnabled} onCheckedChange={setIsEnabled} />
            <Label className="text-sm">{isEnabled ? "Enabled" : "Disabled"}</Label>
          </div>

          <div className="space-y-2">
            <Label>When this happens… (Trigger) *</Label>
            <Select value={triggerType} onValueChange={setTriggerType}>
              <SelectTrigger><SelectValue placeholder="Select trigger" /></SelectTrigger>
              <SelectContent>
                {TRIGGERS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Filter by services (optional, comma-separated)</Label>
            <Input value={triggerServices} onChange={e => setTriggerServices(e.target.value)} placeholder="e.g. VAT (MTD), Payroll (RTI)" />
          </div>

          <div className="space-y-2">
            <Label>Do this… (Action) *</Label>
            <Select value={actionType} onValueChange={setActionType}>
              <SelectTrigger><SelectValue placeholder="Select action" /></SelectTrigger>
              <SelectContent>
                {ACTIONS.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {actionType === "create_task" && (
            <div className="space-y-3 rounded-lg border p-4 bg-muted/30">
              <h4 className="text-sm font-semibold">Task Settings</h4>
              <div className="space-y-2">
                <Label>Task Title *</Label>
                <Input value={taskTitle} onChange={e => setTaskTitle(e.target.value)} placeholder="e.g. Prepare VAT return" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select value={taskPriority} onValueChange={setTaskPriority}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Days Before Due</Label>
                  <Input type="number" value={taskDaysBefore} onChange={e => setTaskDaysBefore(e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {actionType === "send_email" && (
            <div className="space-y-3 rounded-lg border p-4 bg-muted/30">
              <h4 className="text-sm font-semibold">Email Settings</h4>
              <div className="space-y-2">
                <Label>Template Key *</Label>
                <Input value={emailTemplateKey} onChange={e => setEmailTemplateKey(e.target.value)} placeholder="e.g. vat_due_reminder_14d" />
              </div>
              <div className="space-y-2">
                <Label>Send To</Label>
                <Input value={emailTo} onChange={e => setEmailTo(e.target.value)} placeholder="client.primary_email" />
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => saveMutation.mutate()} disabled={!canSave || saveMutation.isPending}>
            {saveMutation.isPending ? "Saving…" : isEdit ? "Update Rule" : "Create Rule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
