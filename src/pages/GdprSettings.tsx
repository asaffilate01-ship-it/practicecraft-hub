import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Download, Trash2, Shield, FileText, AlertTriangle, Clock, CheckCircle2, Settings2 } from "lucide-react";
import { toast } from "sonner";

export default function GdprSettings() {
  const { user } = useAuth();
  const { tenantId } = usePermissions();
  const queryClient = useQueryClient();
  const [exporting, setExporting] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Data retention policies
  const retentionPolicies = [
    { category: "Client Records", period: "6 years", basis: "HMRC / Companies Act", configurable: false },
    { category: "Tax Returns & Submissions", period: "6 years", basis: "HMRC requirement", configurable: false },
    { category: "AML/KYC Records", period: "5 years after relationship ends", basis: "MLR 2017", configurable: false },
    { category: "Payroll Records", period: "6 years", basis: "HMRC / PAYE regulations", configurable: false },
    { category: "Invoices & Billing", period: "6 years", basis: "Companies Act 2006", configurable: false },
    { category: "Audit Logs", period: "3 years", basis: "Best practice", configurable: true },
    { category: "Messages & Communications", period: "2 years", basis: "Data minimisation", configurable: true },
    { category: "Session & Activity Data", period: "90 days", basis: "Data minimisation", configurable: true },
  ];

  const handleExport = async () => {
    setExporting(true);
    try {
      const { data, error } = await supabase.functions.invoke("portal", {
        body: { action: "gdpr_export", user_id: user?.id, tenant_id: tenantId },
      });
      if (error) throw error;

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `gdpr-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Data exported successfully");
    } catch (err: any) {
      toast.error(err.message || "Export failed");
    } finally {
      setExporting(false);
    }
  };

  const handleDeletion = async () => {
    if (confirmEmail !== user?.email) { toast.error("Email does not match"); return; }
    try {
      const { error } = await supabase.functions.invoke("portal", {
        body: { action: "gdpr_delete_request", user_id: user?.id, tenant_id: tenantId },
      });
      if (error) throw error;
      toast.success("Deletion request submitted. You will be contacted within 30 days.");
      setDeleteOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Request failed");
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Privacy & GDPR</h1>
        <p className="text-muted-foreground">Data rights, retention policies, and compliance under UK GDPR / DPA 2018.</p>
      </div>

      <Tabs defaultValue="rights">
        <TabsList>
          <TabsTrigger value="rights">Data Rights</TabsTrigger>
          <TabsTrigger value="retention">Retention Policies</TabsTrigger>
          <TabsTrigger value="consent">Consent & Legal</TabsTrigger>
        </TabsList>

        <TabsContent value="rights" className="space-y-6 mt-4">
          {/* Data protection overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" /> Data Protection</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="p-3 border rounded-lg">
                  <p className="font-medium">Lawful Basis</p>
                  <p className="text-muted-foreground">Legitimate interest & contractual necessity</p>
                </div>
                <div className="p-3 border rounded-lg">
                  <p className="font-medium">Encryption</p>
                  <p className="text-muted-foreground">AES-256 at rest, TLS 1.3 in transit</p>
                </div>
                <div className="p-3 border rounded-lg">
                  <p className="font-medium">Data Location</p>
                  <p className="text-muted-foreground">EU/UK data centres</p>
                </div>
                <div className="p-3 border rounded-lg">
                  <p className="font-medium">Data Processor</p>
                  <p className="text-muted-foreground">Sub-processors listed in privacy policy</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SAR */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Download className="h-5 w-5" /> Subject Access Request</CardTitle>
              <CardDescription>Download all personal data we hold (Article 15 UK GDPR).</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleExport} disabled={exporting} variant="outline">
                <FileText className="mr-2 h-4 w-4" />
                {exporting ? "Preparing export…" : "Export My Data"}
              </Button>
              <p className="text-xs text-muted-foreground mt-2">Generates a JSON file with your profile, tasks, documents, and activity data.</p>
            </CardContent>
          </Card>

          {/* Right to Erasure */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive"><Trash2 className="h-5 w-5" /> Right to Erasure</CardTitle>
              <CardDescription>Request deletion of personal data (Article 17 UK GDPR).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Data required for legal/regulatory compliance (e.g. tax records within 6-year retention) cannot be deleted until the retention period expires.
                </AlertDescription>
              </Alert>
              <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <DialogTrigger asChild>
                  <Button variant="destructive">Request Data Deletion</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Confirm Deletion Request</DialogTitle>
                    <DialogDescription>
                      Type your email to confirm. Non-essential data will be erased within 30 days.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-2">
                    <Label>Your email</Label>
                    <Input value={confirmEmail} onChange={(e) => setConfirmEmail(e.target.value)} placeholder={user?.email || ""} />
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
                    <Button variant="destructive" onClick={handleDeletion} disabled={confirmEmail !== user?.email}>Confirm Deletion</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="retention" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5" /> Data Retention Schedule</CardTitle>
              <CardDescription>
                Minimum retention periods based on UK regulatory requirements. Statutory periods cannot be shortened.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead>Retention Period</TableHead>
                    <TableHead>Legal Basis</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {retentionPolicies.map((p) => (
                    <TableRow key={p.category}>
                      <TableCell className="text-sm font-medium">{p.category}</TableCell>
                      <TableCell className="text-sm">{p.period}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{p.basis}</TableCell>
                      <TableCell>
                        <Badge variant={p.configurable ? "outline" : "secondary"} className="text-xs">
                          {p.configurable ? "Configurable" : "Statutory"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="consent" className="space-y-6 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5" /> Consent Records</CardTitle>
              <CardDescription>Track consent given for data processing activities.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { purpose: "Essential Service Operation", type: "Contractual necessity", granted: true, date: "On signup" },
                  { purpose: "Cookie Analytics", type: "Consent", granted: true, date: "Via cookie banner" },
                  { purpose: "Email Notifications", type: "Legitimate interest", granted: true, date: "On signup" },
                  { purpose: "Marketing Communications", type: "Consent", granted: false, date: "—" },
                ].map((c) => (
                  <div key={c.purpose} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="text-sm font-medium">{c.purpose}</p>
                      <p className="text-xs text-muted-foreground">{c.type} · {c.date}</p>
                    </div>
                    <Badge variant={c.granted ? "default" : "secondary"}>{c.granted ? "Granted" : "Not Given"}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-4 text-sm">
            <a href="/privacy" className="text-primary underline">Privacy Policy</a>
            <a href="/terms" className="text-primary underline">Terms of Service</a>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
