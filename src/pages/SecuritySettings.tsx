import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Shield, Key, Lock, Clock, Users, Smartphone, AlertTriangle, Activity, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function SecuritySettings() {
  const { user, signOut } = useAuth();
  const { role, tenantId } = usePermissions();
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [changing, setChanging] = useState(false);
  const [mfaOpen, setMfaOpen] = useState(false);
  const [mfaQr, setMfaQr] = useState("");
  const [mfaSecret, setMfaSecret] = useState("");
  const [mfaFactorId, setMfaFactorId] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [enrolling, setEnrolling] = useState(false);

  // Fetch MFA factors
  const { data: mfaFactors, refetch: refetchMfa } = useQuery({
    queryKey: ["mfa-factors"],
    queryFn: async () => {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      return data;
    },
  });

  // Audit log
  const { data: auditLogs = [] } = useQuery({
    queryKey: ["audit-log-recent", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  const hasTotpActive = mfaFactors?.totp?.some((f) => f.status === "verified") ?? false;

  const changePassword = async () => {
    if (newPw !== confirmPw) { toast.error("Passwords don't match"); return; }
    if (newPw.length < 8) { toast.error("Minimum 8 characters"); return; }
    setChanging(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPw });
      if (error) throw error;
      toast.success("Password updated");
      setNewPw(""); setConfirmPw("");
    } catch (err: any) { toast.error(err.message); }
    finally { setChanging(false); }
  };

  const signOutAll = async () => {
    await supabase.auth.signOut({ scope: "global" });
    toast.success("Signed out of all sessions");
  };

  const startMfaEnroll = async () => {
    try {
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "Authenticator App" });
      if (error) throw error;
      setMfaQr(data.totp.qr_code);
      setMfaSecret(data.totp.secret);
      setMfaFactorId(data.id);
      setMfaOpen(true);
    } catch (err: any) { toast.error(err.message); }
  };

  const verifyMfaEnroll = async () => {
    if (totpCode.length !== 6) { toast.error("Enter 6-digit code"); return; }
    setEnrolling(true);
    try {
      const challenge = await supabase.auth.mfa.challenge({ factorId: mfaFactorId });
      if (challenge.error) throw challenge.error;

      const verify = await supabase.auth.mfa.verify({
        factorId: mfaFactorId,
        challengeId: challenge.data.id,
        code: totpCode,
      });
      if (verify.error) throw verify.error;

      toast.success("2FA enabled successfully");
      setMfaOpen(false);
      setTotpCode("");
      refetchMfa();
    } catch (err: any) { toast.error(err.message); }
    finally { setEnrolling(false); }
  };

  const unenrollMfa = async (factorId: string) => {
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) throw error;
      toast.success("2FA removed");
      refetchMfa();
    } catch (err: any) { toast.error(err.message); }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Security</h1>
        <p className="text-muted-foreground">Password, MFA, sessions, and audit trail.</p>
      </div>

      <Tabs defaultValue="auth">
        <TabsList>
          <TabsTrigger value="auth">Authentication</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
          <TabsTrigger value="features">Features</TabsTrigger>
        </TabsList>

        <TabsContent value="auth" className="space-y-6 mt-4">
          {/* Session */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Current Session</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{user?.email}</p>
                  <p className="text-xs text-muted-foreground">Role: <Badge variant="outline">{role || "Unknown"}</Badge></p>
                </div>
                <Button variant="outline" size="sm" onClick={signOutAll}>Sign Out All Devices</Button>
              </div>
            </CardContent>
          </Card>

          {/* 2FA / TOTP */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Smartphone className="h-5 w-5" /> Two-Factor Authentication (2FA)</CardTitle>
              <CardDescription>Add a TOTP authenticator app for an extra layer of security.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {hasTotpActive ? (
                <div className="space-y-3">
                  <Alert>
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertDescription>2FA is enabled via authenticator app.</AlertDescription>
                  </Alert>
                  {mfaFactors?.totp?.filter((f) => f.status === "verified").map((f) => (
                    <div key={f.id} className="flex items-center justify-between py-2 border rounded-lg px-3">
                      <div>
                        <p className="text-sm font-medium">{f.friendly_name || "Authenticator"}</p>
                        <p className="text-xs text-muted-foreground">Added {new Date(f.created_at).toLocaleDateString("en-GB")}</p>
                      </div>
                      <Button variant="destructive" size="sm" onClick={() => unenrollMfa(f.id)}>Remove</Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Protect your account with a time-based one-time password (TOTP) from apps like Google Authenticator or Authy.
                  </p>
                  <Button onClick={startMfaEnroll} className="gap-2">
                    <Smartphone className="w-4 h-4" /> Enable 2FA
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Password */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Key className="h-5 w-5" /> Change Password</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>New Password</Label>
                <Input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="Min 8 characters" />
              </div>
              <div className="space-y-2">
                <Label>Confirm New Password</Label>
                <Input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} />
              </div>
              <Button onClick={changePassword} disabled={changing || !newPw || !confirmPw}>
                {changing ? "Updating…" : "Update Password"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5" /> Recent Activity</CardTitle>
              <CardDescription>Last 20 audit events for your practice.</CardDescription>
            </CardHeader>
            <CardContent>
              {auditLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">No activity recorded yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Entity</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditLogs.map((log: any) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(log.created_at).toLocaleString("en-GB")}
                        </TableCell>
                        <TableCell className="text-sm">{log.entity_name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{log.action}</Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                          {log.entity_id || "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="features" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" /> Platform Security</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { label: "TLS 1.3 Encryption", desc: "All data encrypted in transit", on: true },
                  { label: "AES-256 at Rest", desc: "Database and file storage encrypted", on: true },
                  { label: "Row-Level Security", desc: "Tenant data isolation enforced", on: true },
                  { label: "Session Auto-Refresh", desc: "JWT tokens refresh automatically", on: true },
                  { label: "TOTP 2FA", desc: "Time-based one-time passwords", on: hasTotpActive },
                  { label: "Audit Logging", desc: "All CRUD operations logged", on: true },
                ].map((feat) => (
                  <div key={feat.label} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="text-sm font-medium">{feat.label}</p>
                      <p className="text-xs text-muted-foreground">{feat.desc}</p>
                    </div>
                    <Badge variant={feat.on ? "default" : "secondary"}>{feat.on ? "Active" : "Inactive"}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* MFA Enrollment Dialog */}
      <Dialog open={mfaOpen} onOpenChange={setMfaOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Set Up 2FA</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.):
            </p>
            {mfaQr && (
              <div className="flex justify-center p-4 bg-card border rounded-lg">
                <img src={mfaQr} alt="TOTP QR Code" className="w-48 h-48" />
              </div>
            )}
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Or enter this key manually:</p>
              <code className="text-xs bg-muted px-2 py-1 rounded font-mono select-all">{mfaSecret}</code>
            </div>
            <div className="space-y-2">
              <Label>Verification Code</Label>
              <Input
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                className="font-mono text-center text-lg tracking-widest"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMfaOpen(false)}>Cancel</Button>
            <Button onClick={verifyMfaEnroll} disabled={enrolling || totpCode.length !== 6}>
              {enrolling ? "Verifying…" : "Verify & Enable"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
