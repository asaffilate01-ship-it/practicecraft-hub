import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/hooks/usePermissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Mail, Plus, Pencil, Copy, Code } from "lucide-react";

export default function EmailTemplates() {
  const { tenantId } = usePermissions();
  const qc = useQueryClient();

  const [editId, setEditId] = useState<string | null>(null);
  const [editKey, setEditKey] = useState("");
  const [editName, setEditName] = useState("");
  const [editSubject, setEditSubject] = useState("");
  const [editBodyHtml, setEditBodyHtml] = useState("");
  const [editBodyText, setEditBodyText] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const templatesQ = useQuery({
    queryKey: ["email-templates", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_templates")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  const upsertMut = useMutation({
    mutationFn: async () => {
      if (editId) {
        const { error } = await supabase
          .from("email_templates")
          .update({ name: editName, subject: editSubject, body_html: editBodyHtml, body_text: editBodyText })
          .eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("email_templates").insert({
          tenant_id: tenantId!,
          key: editKey,
          name: editName,
          subject: editSubject,
          body_html: editBodyHtml,
          body_text: editBodyText,
          variables_json: [],
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editId ? "Template updated" : "Template created");
      qc.invalidateQueries({ queryKey: ["email-templates"] });
      setDialogOpen(false);
      resetForm();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const resetForm = () => {
    setEditId(null);
    setEditKey("");
    setEditName("");
    setEditSubject("");
    setEditBodyHtml("");
    setEditBodyText("");
  };

  const openEdit = (t: any) => {
    setEditId(t.id);
    setEditKey(t.key);
    setEditName(t.name);
    setEditSubject(t.subject);
    setEditBodyHtml(t.body_html || "");
    setEditBodyText(t.body_text || "");
    setDialogOpen(true);
  };

  const openNew = () => {
    resetForm();
    setDialogOpen(true);
  };

  const duplicateTemplate = (t: any) => {
    resetForm();
    setEditKey(t.key + "_copy");
    setEditName(t.name + " (Copy)");
    setEditSubject(t.subject);
    setEditBodyHtml(t.body_html || "");
    setEditBodyText(t.body_text || "");
    setDialogOpen(true);
  };

  const templates = templatesQ.data || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "var(--font-heading)" }}>
            Email Templates
          </h1>
          <p className="text-sm text-muted-foreground">Manage notification templates for VAT reminders, invoicing, onboarding, and more.</p>
        </div>
        <Button size="sm" onClick={openNew}>
          <Plus className="w-4 h-4 mr-1" /> New Template
        </Button>
      </div>

      {/* Variable reference */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Code className="w-4 h-4" /> Available Variables
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {["tenant.firm_name", "client.legal_name", "client.contact_name", "task.title", "task.due_date",
              "vat.period", "vat.due_date", "payroll.period", "invoice.number", "invoice.total_gbp",
              "invoice.pay_url", "hmrc.receipt_id", "portal.login_url"
            ].map((v) => (
              <Badge key={v} variant="outline" className="text-xs font-mono">{"{{" + v + "}}"}</Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Templates list */}
      <Card>
        <CardContent className="pt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Key</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead className="w-[120px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((t: any) => (
                <TableRow key={t.id}>
                  <TableCell className="text-sm font-medium">{t.name}</TableCell>
                  <TableCell><Badge variant="secondary" className="text-xs font-mono">{t.key}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground truncate max-w-[300px]">{t.subject}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(t)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => duplicateTemplate(t)}>
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {templates.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    No email templates — they will be seeded when a practice is onboarded.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              {editId ? "Edit Template" : "New Template"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {!editId && (
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Key (unique identifier)</label>
                <Input value={editKey} onChange={(e) => setEditKey(e.target.value)} placeholder="vat_due_reminder_14d" />
              </div>
            )}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Name</label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="VAT reminder - 14 days" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Subject</label>
              <Input value={editSubject} onChange={(e) => setEditSubject(e.target.value)} placeholder="VAT return due soon for {{client.legal_name}}" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">HTML Body</label>
              <Textarea rows={8} value={editBodyHtml} onChange={(e) => setEditBodyHtml(e.target.value)} placeholder="<p>Hello {{client.contact_name}},</p>" className="font-mono text-xs" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Plain Text Body</label>
              <Textarea rows={4} value={editBodyText} onChange={(e) => setEditBodyText(e.target.value)} placeholder="Hello {{client.contact_name}}," className="font-mono text-xs" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={() => upsertMut.mutate()} disabled={upsertMut.isPending}>
                {editId ? "Update" : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
