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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Mail, Plus, Pencil, Copy, Code, Eye, Send, Search } from "lucide-react";

export default function EmailTemplates() {
  const { tenantId } = usePermissions();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editKey, setEditKey] = useState("");
  const [editName, setEditName] = useState("");
  const [editSubject, setEditSubject] = useState("");
  const [editBodyHtml, setEditBodyHtml] = useState("");
  const [editBodyText, setEditBodyText] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewSubject, setPreviewSubject] = useState("");

  const templatesQ = useQuery({
    queryKey: ["email-templates", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.from("email_templates").select("*").order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  const upsertMut = useMutation({
    mutationFn: async () => {
      if (editId) {
        const { error } = await supabase.from("email_templates")
          .update({ name: editName, subject: editSubject, body_html: editBodyHtml, body_text: editBodyText })
          .eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("email_templates").insert({
          tenant_id: tenantId!, key: editKey, name: editName,
          subject: editSubject, body_html: editBodyHtml, body_text: editBodyText, variables_json: [],
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

  const sendTestMut = useMutation({
    mutationFn: async (templateKey: string) => {
      const { error } = await supabase.functions.invoke("notifications", {
        body: JSON.stringify({
          channel: "email",
          templateKey,
          to: { email: "test@preview.local" },
          vars: {
            "tenant.firm_name": "Demo Practice",
            "client.legal_name": "ACME Ltd",
            "client.contact_name": "John Smith",
            "vat.period": "Q1 2025/26",
            "vat.due_date": "7 May 2026",
            "invoice.number": "INV-0042",
            "invoice.total_gbp": "£1,200.00",
          },
        }),
        headers: { "Content-Type": "application/json" },
      });
      if (error) throw error;
    },
    onSuccess: () => toast.success("Test notification queued"),
    onError: (e: any) => toast.error(e.message),
  });

  const resetForm = () => {
    setEditId(null); setEditKey(""); setEditName(""); setEditSubject(""); setEditBodyHtml(""); setEditBodyText("");
  };

  const openEdit = (t: any) => {
    setEditId(t.id); setEditKey(t.key); setEditName(t.name);
    setEditSubject(t.subject); setEditBodyHtml(t.body_html || ""); setEditBodyText(t.body_text || "");
    setDialogOpen(true);
  };

  const openPreview = (t: any) => {
    // Replace variables with sample data for preview
    const vars: Record<string, string> = {
      "{{tenant.firm_name}}": "Demo Practice",
      "{{client.legal_name}}": "ACME Ltd",
      "{{client.contact_name}}": "John Smith",
      "{{task.title}}": "VAT Return Q1",
      "{{task.due_date}}": "7 May 2026",
      "{{vat.period}}": "Q1 2025/26",
      "{{vat.due_date}}": "7 May 2026",
      "{{payroll.period}}": "March 2026",
      "{{invoice.number}}": "INV-0042",
      "{{invoice.total_gbp}}": "£1,200.00",
      "{{invoice.pay_url}}": "#",
      "{{hmrc.receipt_id}}": "HMRC-RCV-12345",
      "{{portal.login_url}}": "#",
    };
    let html = t.body_html || "";
    let subject = t.subject || "";
    Object.entries(vars).forEach(([k, v]) => {
      html = html.replaceAll(k, v);
      subject = subject.replaceAll(k, v);
    });
    setPreviewHtml(html);
    setPreviewSubject(subject);
    setPreviewOpen(true);
  };

  const templates = (templatesQ.data || []).filter((t: any) =>
    !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.key.toLowerCase().includes(search.toLowerCase())
  );

  const VARIABLES = [
    "tenant.firm_name", "tenant.support_email", "client.legal_name", "client.trading_name",
    "client.contact_name", "task.title", "task.due_date", "vat.period", "vat.due_date",
    "payroll.period", "invoice.number", "invoice.total_gbp", "invoice.pay_url",
    "hmrc.receipt_id", "portal.login_url",
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "var(--font-heading)" }}>
            Email Templates
          </h1>
          <p className="text-sm text-muted-foreground">Manage notification templates for VAT reminders, invoicing, onboarding, and more.</p>
        </div>
        <Button size="sm" onClick={() => { resetForm(); setDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-1" /> New Template
        </Button>
      </div>

      <Tabs defaultValue="templates">
        <TabsList>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="variables">Variables</TabsTrigger>
        </TabsList>

        <TabsContent value="variables" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Code className="w-4 h-4" /> Available Template Variables
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {VARIABLES.map((v) => (
                  <Badge key={v} variant="outline" className="text-xs font-mono cursor-pointer hover:bg-accent"
                    onClick={() => { navigator.clipboard.writeText(`{{${v}}}`); toast.success("Copied"); }}>
                    {"{{" + v + "}}"}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-3">Click a variable to copy it to your clipboard.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="mt-4 space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search templates…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>

          <Card>
            <CardContent className="pt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Key</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead className="w-[160px]">Actions</TableHead>
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
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openPreview(t)} title="Preview">
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(t)} title="Edit">
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                            resetForm(); setEditKey(t.key + "_copy"); setEditName(t.name + " (Copy)");
                            setEditSubject(t.subject); setEditBodyHtml(t.body_html || ""); setEditBodyText(t.body_text || "");
                            setDialogOpen(true);
                          }} title="Duplicate">
                            <Copy className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => sendTestMut.mutate(t.key)} title="Send Test">
                            <Send className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {templates.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        No email templates found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-4 h-4" /> {editId ? "Edit Template" : "New Template"}
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
              <Textarea rows={8} value={editBodyHtml} onChange={(e) => setEditBodyHtml(e.target.value)} className="font-mono text-xs" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Plain Text Body</label>
              <Textarea rows={4} value={editBodyText} onChange={(e) => setEditBodyText(e.target.value)} className="font-mono text-xs" />
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

      {/* Preview dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-4 h-4" /> Email Preview
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="border-b pb-2">
              <p className="text-xs text-muted-foreground">Subject:</p>
              <p className="text-sm font-medium">{previewSubject}</p>
            </div>
            <div className="border rounded-lg p-4 bg-card min-h-[200px]">
              <div dangerouslySetInnerHTML={{ __html: previewHtml }} className="prose prose-sm max-w-none text-sm" />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
