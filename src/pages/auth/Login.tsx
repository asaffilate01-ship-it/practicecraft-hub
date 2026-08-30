import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CloudCog, Eye, EyeOff, Building2, Users, ShieldCheck, Receipt, Wallet, FileText, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import heroDashboard from "@/assets/hero-dashboard.png";
import { resolveLoginDestination } from "@/lib/authRouting";

const features = [
  { icon: Receipt, label: "MTD VAT & RTI Payroll" },
  { icon: FileText, label: "Accounts Production" },
  { icon: ShieldCheck, label: "AML / KYC Compliance" },
  { icon: Wallet, label: "Billing & Payments" },
];

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

      navigate(resolveLoginDestination(info, loginType));
    } catch {
      setLoading(false);
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left - Hero panel (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] relative bg-gradient-to-br from-[hsl(215,28%,12%)] to-[hsl(215,25%,18%)] flex-col justify-between p-10 text-white overflow-hidden">
        {/* Decorative shapes */}
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-[hsl(199,89%,48%)]/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-[500px] h-[500px] rounded-full bg-[hsl(199,89%,48%)]/5 blur-3xl" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-[hsl(199,89%,48%)] flex items-center justify-center">
              <CloudCog className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>
              PracticeCraft
            </h1>
          </div>
          <p className="text-[hsl(210,20%,70%)] text-sm max-w-md mt-1">
            The all-in-one cloud platform for UK accounting practices
          </p>
        </div>

        <div className="relative z-10 flex-1 flex items-center justify-center py-8">
          <img
            src={heroDashboard}
            alt="PracticeCraft dashboard"
            className="w-full max-w-lg rounded-xl shadow-2xl border border-white/10"
          />
        </div>

        <div className="relative z-10 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {features.map((f) => (
              <div key={f.label} className="flex items-center gap-2.5 text-sm text-[hsl(210,20%,82%)]">
                <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                  <f.icon className="w-3.5 h-3.5 text-[hsl(199,89%,48%)]" />
                </div>
                <span>{f.label}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 text-xs text-[hsl(210,20%,55%)] pt-2 border-t border-white/10">
            <CheckCircle2 className="w-3.5 h-3.5 text-[hsl(142,71%,45%)]" />
            <span>HMRC sandbox integration · controlled filing audit trail</span>
          </div>
        </div>
      </div>

      {/* Right - Login form */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 justify-center mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <CloudCog className="w-5 h-5 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-bold" style={{ fontFamily: 'var(--font-heading)' }}>
              PracticeCraft
            </h1>
          </div>

          <Card className="shadow-lg border-border/50">
            <CardHeader className="text-center space-y-1 pb-4">
              <CardTitle className="text-2xl" style={{ fontFamily: 'var(--font-heading)' }}>
                Welcome back
              </CardTitle>
              <CardDescription>Sign in to your account to continue</CardDescription>
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

          <div className="mt-4 text-center text-xs text-muted-foreground space-x-3">
            <Link to="/privacy" className="hover:underline">Privacy Policy</Link>
            <span>·</span>
            <Link to="/terms" className="hover:underline">Terms of Service</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
