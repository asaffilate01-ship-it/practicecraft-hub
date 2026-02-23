import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Eye, EyeOff, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function PortalSignup() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get("token");

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Invite validation
  const [invite, setInvite] = useState<any>(null);
  const [inviteLoading, setInviteLoading] = useState(!!inviteToken);
  const [inviteError, setInviteError] = useState<string | null>(null);

  // Self-registration mode (no invite)
  const [firmCode, setFirmCode] = useState("");
  const isInviteMode = !!inviteToken;

  useEffect(() => {
    if (!inviteToken) return;
    (async () => {
      setInviteLoading(true);
      const { data, error } = await supabase
        .from("portal_invitations")
        .select("*, tenants(firm_name), clients(legal_name)")
        .eq("token", inviteToken)
        .eq("status", "pending")
        .gt("expires_at", new Date().toISOString())
        .single();

      setInviteLoading(false);
      if (error || !data) {
        setInviteError("This invitation is invalid or has expired.");
        return;
      }
      setInvite(data);
      setEmail(data.email);
    })();
  }, [inviteToken]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim() || !email.trim() || !password.trim()) {
      toast.error("Please fill in all fields");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    // Sign up the user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: displayName.trim(),
          user_type: "portal",
        },
        emailRedirectTo: window.location.origin + "/login",
      },
    });

    if (authError) {
      setLoading(false);
      toast.error(authError.message);
      return;
    }

    // If invite mode, accept the invite via edge function
    if (isInviteMode && invite && authData.user) {
      const { error: acceptError } = await supabase.functions.invoke("portal", {
        body: {
          action: "accept-invite",
          token: inviteToken,
          userId: authData.user.id,
          displayName: displayName.trim(),
        },
      });

      if (acceptError) {
        console.error("Accept invite error:", acceptError);
        // Non-fatal — user is created, can be linked later
      }
    }

    setLoading(false);
    toast.success("Check your email to confirm your account, then sign in.");
    navigate("/login");
  };

  if (inviteLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-xl bg-primary flex items-center justify-center mb-2">
            <Users className="w-6 h-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl" style={{ fontFamily: 'var(--font-heading)' }}>
            {isInviteMode ? "Accept Invitation" : "Client Portal Signup"}
          </CardTitle>
          <CardDescription>
            {isInviteMode
              ? "Create your portal account to access your accountant's services"
              : "Request access to your accountant's client portal"}
          </CardDescription>
        </CardHeader>

        {inviteError ? (
          <CardContent className="text-center space-y-4">
            <div className="flex flex-col items-center gap-2 text-destructive">
              <AlertCircle className="w-10 h-10" />
              <p className="text-sm">{inviteError}</p>
            </div>
            <Button variant="outline" onClick={() => navigate("/login")}>
              Back to Login
            </Button>
          </CardContent>
        ) : (
          <form onSubmit={handleSignup}>
            <CardContent className="space-y-4">
              {invite && (
                <div className="rounded-lg border bg-muted/50 p-3 space-y-1">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">Valid Invitation</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    From: <strong>{(invite.tenants as any)?.firm_name || "Your Accountant"}</strong>
                  </p>
                  {(invite.clients as any)?.legal_name && (
                    <p className="text-xs text-muted-foreground">
                      Client: <strong>{(invite.clients as any).legal_name}</strong>
                    </p>
                  )}
                  <Badge variant="outline" className="text-xs mt-1 capitalize">
                    {invite.portal_role?.replace("_", " ")}
                  </Badge>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="displayName">Your Name</Label>
                <Input
                  id="displayName"
                  placeholder="John Smith"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.co.uk"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isInviteMode}
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Min. 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {!isInviteMode && (
                <div className="space-y-2">
                  <Label htmlFor="firmCode">Practice Code (optional)</Label>
                  <Input
                    id="firmCode"
                    placeholder="Your accountant's practice code"
                    value={firmCode}
                    onChange={(e) => setFirmCode(e.target.value)}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    If you have a practice code, enter it to link your account. Otherwise your request will need approval.
                  </p>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Creating account..." : isInviteMode ? "Accept & Create Account" : "Request Access"}
              </Button>
              <p className="text-sm text-muted-foreground text-center">
                Already have an account?{" "}
                <Link to="/login" className="text-primary hover:underline font-medium">
                  Sign in
                </Link>
              </p>
            </CardFooter>
          </form>
        )}
      </Card>
    </div>
  );
}
