import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { UserPlus, Mail, Shield, MoreHorizontal, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

type StaffMember = {
  id: string;
  full_name: string;
  email: string;
  tenant_id: string;
  role?: string;
  role_name?: string;
};

export function StaffUsersTab() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("");
  const [inviteName, setInviteName] = useState("");

  // Get current user's tenant
  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user!.id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const tenantId = profile?.tenant_id;

  // Staff members (profiles in this tenant)
  const { data: staff = [], isLoading } = useQuery({
    queryKey: ["staff-members", tenantId],
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, tenant_id")
        .eq("tenant_id", tenantId!);
      if (error) throw error;

      // Get roles for each user
      const userIds = profiles.map((p) => p.id);
      const { data: userRoles } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", userIds);

      // Get tenant roles for display names
      const { data: rolesList } = await supabase
        .from("roles")
        .select("name")
        .eq("tenant_id", tenantId!);

      return profiles.map((p) => {
        const ur = userRoles?.find((r) => r.user_id === p.id);
        return {
          ...p,
          role: ur?.role || "staff_accountant",
          role_name: ur?.role?.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()) || "Staff",
        };
      }) as StaffMember[];
    },
    enabled: !!tenantId,
  });

  // Available roles
  const { data: roles = [] } = useQuery({
    queryKey: ["tenant-roles", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("roles")
        .select("id, name, is_system_role")
        .eq("tenant_id", tenantId!)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  // Portal users (client-side users)
  const { data: portalUsers = [] } = useQuery({
    queryKey: ["portal-users", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("portal_users")
        .select("id, user_id, client_id, portal_role, status, display_name, created_at")
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  const inviteMut = useMutation({
    mutationFn: async () => {
      // Create a portal invitation for now (staff invite would need custom auth flow)
      const { error } = await supabase.from("portal_invitations").insert({
        tenant_id: tenantId!,
        email: inviteEmail,
        portal_role: inviteRole || "client_admin",
        invited_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(`Invitation sent to ${inviteEmail}`);
      setInviteOpen(false);
      setInviteEmail("");
      setInviteName("");
      setInviteRole("");
      qc.invalidateQueries({ queryKey: ["portal-users", tenantId] });
    },
    onError: (e) => toast.error(e.message),
  });

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleBadgeVariant = (role: string) => {
    if (role === "firm_owner") return "default" as const;
    if (role === "manager") return "secondary" as const;
    return "outline" as const;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Staff Members */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Staff Members</CardTitle>
            <CardDescription>Practice team members with access to the staff dashboard</CardDescription>
          </div>
          <Badge variant="secondary">{staff.length} member{staff.length !== 1 ? "s" : ""}</Badge>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="w-[60px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {staff.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                          {getInitials(s.full_name || "?")}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{s.full_name || "—"}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{s.email}</TableCell>
                  <TableCell>
                    <Badge variant={getRoleBadgeVariant(s.role || "")}>
                      {s.role_name}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem className="text-destructive gap-2" disabled>
                          <Trash2 className="w-3.5 h-3.5" /> Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {staff.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    No staff members found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Portal / Client Users */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Portal Users</CardTitle>
            <CardDescription>Client portal users with access to the client-facing portal</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{portalUsers.length} user{portalUsers.length !== 1 ? "s" : ""}</Badge>
            <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1.5">
                  <UserPlus className="w-3.5 h-3.5" /> Invite
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invite Portal User</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="client@company.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input
                      value={inviteName}
                      onChange={(e) => setInviteName(e.target.value)}
                      placeholder="John Smith"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Portal Role</Label>
                    <Select value={inviteRole} onValueChange={setInviteRole}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select role…" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="client_admin">Client Admin</SelectItem>
                        <SelectItem value="client_user">Client User</SelectItem>
                        <SelectItem value="employee">Employee</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                  </DialogClose>
                  <Button
                    onClick={() => inviteMut.mutate()}
                    disabled={!inviteEmail || inviteMut.isPending}
                    className="gap-1.5"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    {inviteMut.isPending ? "Sending…" : "Send Invite"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {portalUsers.map((pu) => (
                <TableRow key={pu.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="text-xs bg-accent text-accent-foreground">
                          {getInitials(pu.display_name || "?")}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{pu.display_name || "—"}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{pu.user_id?.slice(0, 8) || "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {pu.portal_role?.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={pu.status === "active" ? "default" : "secondary"}>
                      {pu.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {portalUsers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    No portal users yet. Invite clients to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
