import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Shield, Key, Lock, Clock, Users } from "lucide-react";
import { toast } from "sonner";

export default function SecuritySettings() {
  const { user, signOut } = useAuth();
  const { role } = usePermissions();
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [changing, setChanging] = useState(false);

  const changePassword = async () => {
    if (newPw !== confirmPw) { toast.error("Passwords don't match"); return; }
    if (newPw.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    setChanging(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPw });
      if (error) throw error;
      toast.success("Password updated successfully");
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setChanging(false);
    }
  };

  const signOutAll = async () => {
    try {
      await supabase.auth.signOut({ scope: "global" });
      toast.success("Signed out of all sessions");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Security</h1>
        <p className="text-muted-foreground">Manage password, sessions, and authentication settings.</p>
      </div>

      {/* Current session */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Current Session</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{user?.email}</p>
              <p className="text-xs text-muted-foreground">Role: <Badge variant="outline">{role || "Unknown"}</Badge></p>
            </div>
            <Button variant="outline" size="sm" onClick={signOutAll}>Sign Out All Devices</Button>
          </div>
        </CardContent>
      </Card>

      {/* Change password */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Key className="h-5 w-5" /> Change Password</CardTitle>
          <CardDescription>Update your account password. Minimum 8 characters.</CardDescription>
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

      {/* Security info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" /> Security Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { label: "TLS 1.3 Encryption", desc: "All data encrypted in transit", on: true },
              { label: "AES-256 at Rest", desc: "Database and file storage encrypted", on: true },
              { label: "Row-Level Security", desc: "Tenant data isolation enforced", on: true },
              { label: "Session Auto-Refresh", desc: "JWT tokens refresh automatically", on: true },
              { label: "MFA / 2FA", desc: "Coming soon — TOTP-based second factor", on: false },
            ].map((feat) => (
              <div key={feat.label} className="flex items-center justify-between py-2 border-b last:border-0">
                <div>
                  <p className="text-sm font-medium">{feat.label}</p>
                  <p className="text-xs text-muted-foreground">{feat.desc}</p>
                </div>
                <Badge variant={feat.on ? "default" : "secondary"}>{feat.on ? "Active" : "Coming Soon"}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
