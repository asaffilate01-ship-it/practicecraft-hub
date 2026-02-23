import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/hooks/usePermissions";
import { useSubscription, useTenantUsage } from "@/hooks/useSubscription";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Users, CreditCard, Shield, UserPlus, Trash2, Crown, CheckCircle2 } from "lucide-react";
import { KPICard } from "@/components/dashboard/KPICard";

export default function TenantAdmin() {
  const { tenantId, role } = usePermissions();
  const qc = useQueryClient();
  const { data: sub, isLoading: subLoading } = useSubscription();
  const { data: usage, isLoading: usageLoading } = useTenantUsage();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("staff");

  // Staff users
  const staffQ = useQuery({
    queryKey: ["tenant-staff", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, created_at")
        .order("created_at");
      if (error) throw error;

      // Get roles for each user
      const userIds = data.map((u: any) => u.id);
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", userIds);

      const roleMap: Record<string, string> = {};
      for (const r of roles || []) {
        roleMap[(r as any).user_id] = (r as any).role;
      }

      return data.map((u: any) => ({
        ...u,
        role: roleMap[u.id] || "staff",
      }));
    },
    enabled: !!tenantId,
  });

  // Available plans
  const plansQ = useQuery({
    queryKey: ["subscription-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const updateRoleMut = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: string }) => {
      const { error } = await supabase
        .from("user_roles")
        .update({ role: newRole as any })
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Role updated");
      qc.invalidateQueries({ queryKey: ["tenant-staff"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const staff = staffQ.data || [];
  const plans = plansQ.data || [];
  const clientsPct = usage ? Math.min((usage.clients_count / usage.max_clients) * 100, 100) : 0;
  const usersPct = usage ? Math.min((usage.users_count / usage.max_users) * 100, 100) : 0;

  const roleLabels: Record<string, string> = {
    firm_owner: "Firm Owner",
    super_admin: "Super Admin",
    manager: "Manager",
    staff: "Staff",
    payroll_officer: "Payroll Officer",
    compliance_officer: "Compliance Officer",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "var(--font-heading)" }}>
          Tenant Administration
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage your subscription, users, and access controls.
        </p>
      </div>

      {/* Subscription KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Current Plan"
          value={sub?.plan.name ?? "—"}
          change={sub?.status === "trial" ? "Trial period" : sub?.status ?? ""}
          changeType={sub?.status === "trial" ? "neutral" : "positive"}
          icon={Crown}
          iconColor="bg-primary/10"
        />
        <KPICard
          title="Active Clients"
          value={`${usage?.clients_count ?? 0} / ${usage?.max_clients ?? 0}`}
          change={clientsPct >= 90 ? "Near limit!" : `${Math.round(clientsPct)}% used`}
          changeType={clientsPct >= 90 ? "negative" : "neutral"}
          icon={Users}
          iconColor="bg-accent"
        />
        <KPICard
          title="User Seats"
          value={`${usage?.users_count ?? 0} / ${usage?.max_users ?? 0}`}
          change={usersPct >= 90 ? "Near limit!" : `${Math.round(usersPct)}% used`}
          changeType={usersPct >= 90 ? "negative" : "neutral"}
          icon={UserPlus}
          iconColor="bg-secondary"
        />
        <KPICard
          title="Billing Cycle"
          value={sub?.billing_cycle === "annual" ? "Annual" : "Monthly"}
          change={sub?.current_period_end ? `Renews ${new Date(sub.current_period_end).toLocaleDateString("en-GB")}` : ""}
          changeType="neutral"
          icon={CreditCard}
          iconColor="bg-[hsl(var(--success))]/10"
        />
      </div>

      {/* Usage bars */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Client Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={clientsPct} className="h-3" />
            <p className="text-xs text-muted-foreground mt-2">
              {usage?.clients_count ?? 0} of {usage?.max_clients ?? 0} clients used
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">User Seats</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={usersPct} className="h-3" />
            <p className="text-xs text-muted-foreground mt-2">
              {usage?.users_count ?? 0} of {usage?.max_users ?? 0} seats used
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Plans comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Subscription Plans</CardTitle>
          <CardDescription>Upgrade or downgrade your plan to adjust limits and available modules.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {plans.map((p: any) => {
              const isCurrent = sub?.plan.code === p.code;
              return (
                <Card key={p.id} className={`relative ${isCurrent ? "border-primary ring-1 ring-primary" : ""}`}>
                  {isCurrent && (
                    <Badge className="absolute top-3 right-3 text-xs">Current</Badge>
                  )}
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">{p.name}</CardTitle>
                    <CardDescription>{p.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-2xl font-bold" style={{ fontFamily: "var(--font-heading)" }}>
                      £{(p.price_monthly_pence / 100).toFixed(0)}
                      <span className="text-sm font-normal text-muted-foreground">/mo</span>
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[hsl(var(--success))]" />
                        {p.max_clients >= 999999 ? "Unlimited" : p.max_clients} clients
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[hsl(var(--success))]" />
                        {p.max_users >= 999999 ? "Unlimited" : p.max_users} users
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[hsl(var(--success))]" />
                        {(p.allowed_modules as string[]).length} modules
                      </div>
                    </div>
                    {!isCurrent && (
                      <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => toast.info("Plan upgrade flow coming soon — contact support.")}>
                        {p.sort_order > (plans.find((x: any) => x.code === sub?.plan.code)?.sort_order ?? 0) ? "Upgrade" : "Downgrade"}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* User management */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Shield className="w-4 h-4" /> User Management
            </CardTitle>
            <CardDescription>Manage staff access and roles within your practice.</CardDescription>
          </div>
          <Button size="sm" onClick={() => setInviteOpen(true)} disabled={usersPct >= 100}>
            <UserPlus className="w-4 h-4 mr-1" /> Invite User
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staff.map((u: any) => (
                <TableRow key={u.id}>
                  <TableCell className="text-sm font-medium">{u.full_name || "—"}</TableCell>
                  <TableCell className="text-sm">{u.email}</TableCell>
                  <TableCell>
                    <Select
                      value={u.role}
                      onValueChange={(v) => updateRoleMut.mutate({ userId: u.id, newRole: v })}
                    >
                      <SelectTrigger className="h-7 w-[140px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(roleLabels).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(u.created_at).toLocaleDateString("en-GB")}
                  </TableCell>
                  <TableCell>
                    {u.role !== "firm_owner" && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => toast.info("Remove user flow coming soon")}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Allowed modules */}
      {sub && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Enabled Modules</CardTitle>
            <CardDescription>Modules available on the {sub.plan.name} plan. Upgrade to unlock more.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {[
                "clients", "tasks", "bookkeeping", "vat", "payroll", "accounts",
                "secretarial", "incorporations", "submissions", "documents",
                "billing", "kyc_aml", "reports", "practice_mgmt",
              ].map((mod) => {
                const enabled = sub.plan.allowed_modules.includes(mod);
                return (
                  <Badge key={mod} variant={enabled ? "default" : "outline"} className={`text-xs capitalize ${!enabled ? "opacity-40" : ""}`}>
                    {mod.replace(/_/g, " ")}
                  </Badge>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invite dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Email</label>
              <Input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="colleague@practice.co.uk" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Role</label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(roleLabels).filter(([k]) => k !== "firm_owner" && k !== "super_admin").map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={() => {
              toast.info("Invite flow will use edge function + email — coming soon");
              setInviteOpen(false);
            }}>
              Send Invite
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
