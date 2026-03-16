import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Download, Trash2, Shield, FileText, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export default function GdprSettings() {
  const { user } = useAuth();
  const { tenantId } = usePermissions();
  const [exporting, setExporting] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const { data, error } = await supabase.functions.invoke("portal", {
        body: { action: "gdpr_export", user_id: user?.id, tenant_id: tenantId },
      });
      if (error) throw error;

      // Download as JSON
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
    if (confirmEmail !== user?.email) {
      toast.error("Email does not match");
      return;
    }
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
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Privacy & GDPR</h1>
        <p className="text-muted-foreground">Manage your data rights under UK GDPR / Data Protection Act 2018.</p>
      </div>

      {/* Data retention info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" /> Data Protection</CardTitle>
          <CardDescription>How we handle your data.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div className="p-3 border rounded-lg">
              <p className="font-medium">Lawful Basis</p>
              <p className="text-muted-foreground">Legitimate interest & contractual necessity</p>
            </div>
            <div className="p-3 border rounded-lg">
              <p className="font-medium">Data Retention</p>
              <p className="text-muted-foreground">6 years after last engagement (HMRC requirement)</p>
            </div>
            <div className="p-3 border rounded-lg">
              <p className="font-medium">Encryption</p>
              <p className="text-muted-foreground">AES-256 at rest, TLS 1.3 in transit</p>
            </div>
            <div className="p-3 border rounded-lg">
              <p className="font-medium">Data Location</p>
              <p className="text-muted-foreground">EU/UK data centres</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subject Access Request */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Download className="h-5 w-5" /> Subject Access Request (SAR)</CardTitle>
          <CardDescription>Download all personal data we hold about you (Article 15 UK GDPR).</CardDescription>
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
          <CardDescription>Request deletion of your personal data (Article 17 UK GDPR).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Data required for legal/regulatory compliance (e.g. tax records within 6-year retention) cannot be deleted until the retention period expires. A deletion request will remove all non-mandatory personal data.
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
                  Type your email address to confirm. Non-essential personal data will be erased within 30 days.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                <Label>Your email</Label>
                <Input value={confirmEmail} onChange={(e) => setConfirmEmail(e.target.value)} placeholder={user?.email || "your@email.com"} />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
                <Button variant="destructive" onClick={handleDeletion} disabled={confirmEmail !== user?.email}>Confirm Deletion</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      {/* Links */}
      <div className="flex gap-4 text-sm">
        <a href="/privacy" className="text-primary underline">Privacy Policy</a>
        <a href="/terms" className="text-primary underline">Terms of Service</a>
      </div>
    </div>
  );
}
