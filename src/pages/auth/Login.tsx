import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CloudCog, Eye, EyeOff, Building2, Users } from "lucide-react";
import { toast } from "sonner";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loginType, setLoginType] = useState<"staff" | "client">("staff");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error("Please enter both email and password");
      return;
    }
    setLoading(true);

    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    
    if (error) {
      setLoading(false);
      toast.error(error.message);
      return;
    }

    // Detect user type and redirect
    try {
      const { data: userType, error: rpcError } = await supabase.rpc("get_user_type", {
        _user_id: authData.user.id,
      });

      setLoading(false);

      if (rpcError) {
        console.warn("Could not detect user type, using default redirect", rpcError);
        navigate("/");
        return;
      }

      const info = userType as any;

      if (info.is_staff && info.is_portal) {
        // User has both — respect the login tab they chose
        navigate(loginType === "staff" ? "/" : "/portal");
      } else if (info.is_staff) {
        navigate("/");
      } else if (info.is_portal) {
        navigate("/portal");
      } else {
        // No profile found — could be new signup still being processed
        navigate("/");
      }
    } catch {
      setLoading(false);
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-xl bg-primary flex items-center justify-center mb-2">
            <CloudCog className="w-6 h-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl" style={{ fontFamily: 'var(--font-heading)' }}>
            IQ Practice Cloud
          </CardTitle>
          <CardDescription>Sign in to your account</CardDescription>
        </CardHeader>

        <Tabs value={loginType} onValueChange={(v) => setLoginType(v as any)} className="px-6">
          <TabsList className="w-full">
            <TabsTrigger value="staff" className="flex-1 gap-1.5">
              <Building2 className="w-3.5 h-3.5" /> Practice Staff
            </TabsTrigger>
            <TabsTrigger value="client" className="flex-1 gap-1.5">
              <Users className="w-3.5 h-3.5" /> Client Portal
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder={loginType === "staff" ? "you@yourfirm.co.uk" : "you@company.co.uk"}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link to="/forgot-password" className="text-xs text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
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
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </Button>
            <p className="text-sm text-muted-foreground text-center">
              {loginType === "staff" ? (
                <>
                  Don't have an account?{" "}
                  <Link to="/signup" className="text-primary hover:underline font-medium">
                    Sign up
                  </Link>
                </>
              ) : (
                <>
                  Have an invitation?{" "}
                  <Link to="/portal/signup" className="text-primary hover:underline font-medium">
                    Accept invite
                  </Link>
                </>
              )}
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
