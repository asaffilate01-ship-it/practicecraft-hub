import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KPICard } from "@/components/dashboard/KPICard";
import {
  Building2, Clock, FileText, AlertTriangle, RefreshCw,
  ShieldCheck, CheckCircle2, Lock, Users, Share2, ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FilingDrawer } from "@/components/secretarial/FilingDrawer";
import { ChangeWizard } from "@/components/secretarial/ChangeWizard";
import { AuthCodeModal } from "@/components/secretarial/AuthCodeModal";

interface SecretarialTabProps {
  clientId: string;
  companyNumber?: string | null;
}

const dueBadge = (dueDate: string | null) => {
  if (!dueDate) return null;
  const days = Math.ceil((new Date(dueDate).getTime() - Date.now()) / 86400000);
  if (days < 0) return { label: `${Math.abs(days)}d overdue`, color: "destructive" as const };
  if (days <= 14) return { label: `${days}d left`, color: "destructive" as const };
  if (days <= 30) return { label: `${days}d left`, color: "secondary" as const };
  return { label: `${days}d`, color: "outline" as const };
};

export function SecretarialTab({ clientId, companyNumber }: SecretarialTabProps) {
  const [drawerChangeId, setDrawerChangeId] = useState<string | null>(null);
  const [showWizard, setShowWizard] = useState(false);
  const [showAuthCode, setShowAuthCode] = useState(false);
  // Company profile
  const { data: companyProfile } = useQuery({
    queryKey: ["company-profile", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_profiles")
        .select("*")
        .eq("client_id", clientId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Directors
  const { data: directors = [] } = useQuery({
    queryKey: ["directors", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_register_directors")
        .select("*")
        .eq("client_id", clientId)
        .order("is_active", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // PSC
  const { data: pscs = [] } = useQuery({
    queryKey: ["pscs", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_register_psc")
        .select("*")
        .eq("client_id", clientId)
        .order("is_active", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Members
  const { data: members = [] } = useQuery({
    queryKey: ["members", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_register_members")
        .select("*, share_classes(class_name, currency, nominal_value_pence)")
        .eq("client_id", clientId);
      if (error) throw error;
      return data;
    },
  });

  // CS Cycles
  const { data: csCycles = [] } = useQuery({
    queryKey: ["cs-cycles-client", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("confirmation_statement_cycles")
        .select("*")
        .eq("client_id", clientId)
        .order("due_date");
      if (error) throw error;
      return data;
    },
  });

  // Secretarial changes
  const { data: changes = [] } = useQuery({
    queryKey: ["secretarial-changes-client", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("secretarial_changes")
        .select("*")
        .eq("client_id", clientId)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // CH filings
  const { data: filings = [] } = useQuery({
    queryKey: ["ch-filings-client", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ch_filings")
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Auth code check
  const { data: authCode } = useQuery({
    queryKey: ["auth-code", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_credentials")
        .select("id, credential_type, updated_at")
        .eq("client_id", clientId)
        .eq("credential_type", "auth_code")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const nextCSDue = csCycles.find((c: any) => ["upcoming", "due", "in_progress"].includes(c.status));
  const openChanges = changes.filter((c: any) => ["draft", "awaiting_approval", "ready_to_file", "rejected"].includes(c.status)).length;
  const rejectedFilings = filings.filter((f: any) => f.status === "rejected").length;
  const activeDirectors = directors.filter((d: any) => d.is_active).length;

  return (
    <div className="space-y-6">
      {/* Compliance banners */}
      {!authCode && (
        <div className="flex items-center gap-2 rounded-lg border border-[hsl(var(--warning))]/30 bg-[hsl(var(--warning))]/5 p-3 text-sm">
          <AlertTriangle className="w-4 h-4 text-[hsl(var(--warning))] shrink-0" />
          <span className="text-[hsl(var(--warning))]"><strong>Auth code missing</strong> — Companies House filings cannot be submitted without a valid auth code.</span>
          <Button variant="outline" size="sm" className="ml-auto shrink-0 gap-1" onClick={() => setShowAuthCode(true)}><Lock className="w-3 h-3" /> Store Auth Code</Button>
        </div>
      )}
      {activeDirectors === 0 && directors.length >= 0 && companyProfile && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
          <ShieldAlert className="w-4 h-4 text-destructive shrink-0" />
          <span className="text-destructive"><strong>No active directors</strong> — At least one active director is required for compliance.</span>
        </div>
      )}
      {pscs.length === 0 && companyProfile && (
        <div className="flex items-center gap-2 rounded-lg border border-[hsl(var(--warning))]/30 bg-[hsl(var(--warning))]/5 p-3 text-sm">
          <ShieldAlert className="w-4 h-4 text-[hsl(var(--warning))] shrink-0" />
          <span className="text-[hsl(var(--warning))]"><strong>PSC register empty</strong> — Identity verification may be required for PSCs under 2026 rules.</span>
        </div>
      )}
      {/* Company Header */}
      <Card className="p-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
              <Building2 className="w-5 h-5 text-accent-foreground" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">{companyProfile?.company_name || "No Company Profile"}</span>
                {companyProfile?.company_number && (
                  <Badge variant="outline" className="text-xs font-mono">{companyProfile.company_number}</Badge>
                )}
                {companyProfile?.company_status && (
                  <Badge variant={companyProfile.company_status === "active" ? "default" : "secondary"} className="text-xs capitalize">{companyProfile.company_status}</Badge>
                )}
              </div>
              <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                {companyProfile?.last_synced_at && (
                  <span>Last synced: {new Date(companyProfile.last_synced_at).toLocaleDateString("en-GB")}</span>
                )}
                {authCode ? (
                  <span className="flex items-center gap-1 text-[hsl(var(--success))]"><Lock className="w-3 h-3" /> Auth code stored</span>
                ) : (
                  <span className="flex items-center gap-1 text-[hsl(var(--warning))]"><AlertTriangle className="w-3 h-3" /> Auth code missing</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-1.5">
              <RefreshCw className="w-3 h-3" /> Sync
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowAuthCode(true)}>
              <Lock className="w-3 h-3" /> {authCode ? "Update Auth Code" : "Store Auth Code"}
            </Button>
          </div>
        </div>
      </Card>

      {/* KPI tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Confirmation Statement"
          value={nextCSDue ? new Date(nextCSDue.due_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"}
          change={nextCSDue ? (dueBadge(nextCSDue.due_date)?.label || "") : "No cycle"}
          changeType={nextCSDue && dueBadge(nextCSDue.due_date)?.color === "destructive" ? "negative" : "neutral"}
          icon={Clock}
          iconColor="bg-warning/10"
        />
        <KPICard title="Active Directors" value={activeDirectors} change={`${directors.length} total`} changeType="neutral" icon={Users} iconColor="bg-accent" />
        <KPICard title="Open Changes" value={openChanges} change={openChanges ? "Pending" : "All clear"} changeType={openChanges ? "negative" : "positive"} icon={FileText} iconColor="bg-[hsl(var(--info))]/10" />
        <KPICard title="Filing Rejections" value={rejectedFilings} change={rejectedFilings ? "Review needed" : "None"} changeType={rejectedFilings ? "negative" : "positive"} icon={AlertTriangle} iconColor="bg-destructive/10" />
      </div>

      {/* Registers */}
      <Tabs defaultValue="directors">
        <TabsList>
          <TabsTrigger value="directors">Directors ({directors.length})</TabsTrigger>
          <TabsTrigger value="psc">PSC ({pscs.length})</TabsTrigger>
          <TabsTrigger value="members">Members ({members.length})</TabsTrigger>
          <TabsTrigger value="changes">Changes ({changes.length})</TabsTrigger>
          <TabsTrigger value="filings">Filings ({filings.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="directors" className="mt-4">
          <Card>
            <CardContent className="pt-4">
              {directors.length === 0 ? (
                <p className="text-center text-muted-foreground py-8 text-sm">No directors recorded.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Nationality</TableHead>
                      <TableHead>Appointed</TableHead>
                      <TableHead>Resigned</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {directors.map((d: any) => (
                      <TableRow key={d.id}>
                        <TableCell className="font-medium">{d.full_name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{d.nationality || "—"}</TableCell>
                        <TableCell className="text-sm">{d.appointed_on ? new Date(d.appointed_on).toLocaleDateString("en-GB") : "—"}</TableCell>
                        <TableCell className="text-sm">{d.resigned_on ? new Date(d.resigned_on).toLocaleDateString("en-GB") : "—"}</TableCell>
                        <TableCell>
                          <Badge variant={d.is_active ? "default" : "secondary"} className="text-xs">{d.is_active ? "Active" : "Resigned"}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="psc" className="mt-4">
          <Card>
            <CardContent className="pt-4">
              {pscs.length === 0 ? (
                <p className="text-center text-muted-foreground py-8 text-sm">No PSCs recorded.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Nationality</TableHead>
                      <TableHead>Natures of Control</TableHead>
                      <TableHead>Notified</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pscs.map((p: any) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.full_name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{p.nationality || "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{(p.natures_of_control || []).join(", ") || "—"}</TableCell>
                        <TableCell className="text-sm">{p.notified_on ? new Date(p.notified_on).toLocaleDateString("en-GB") : "—"}</TableCell>
                        <TableCell>
                          <Badge variant={p.is_active ? "default" : "secondary"} className="text-xs">{p.is_active ? "Active" : "Ceased"}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="members" className="mt-4">
          <Card>
            <CardContent className="pt-4">
              {members.length === 0 ? (
                <p className="text-center text-muted-foreground py-8 text-sm">No members recorded.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Share Class</TableHead>
                      <TableHead className="text-right">Shares Held</TableHead>
                      <TableHead>Since</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {members.map((m: any) => (
                      <TableRow key={m.id}>
                        <TableCell className="font-medium">{m.full_name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{(m as any).share_classes?.class_name || "—"}</TableCell>
                        <TableCell className="text-right font-mono">{m.shares_held?.toLocaleString() || 0}</TableCell>
                        <TableCell className="text-sm">{m.date_became_member ? new Date(m.date_became_member).toLocaleDateString("en-GB") : "—"}</TableCell>
                        <TableCell>
                          <Badge variant={m.is_active ? "default" : "secondary"} className="text-xs">{m.is_active ? "Active" : "Ceased"}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="changes" className="mt-4">
          <Card>
            <CardContent className="pt-4">
              {changes.length === 0 ? (
                <p className="text-center text-muted-foreground py-8 text-sm">No secretarial changes recorded.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Updated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {changes.map((c: any) => (
                      <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setDrawerChangeId(c.id)}>
                        <TableCell className="text-sm">{c.change_type}</TableCell>
                        <TableCell className="font-medium">{c.title}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs capitalize">{c.status.replace(/_/g, " ")}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{new Date(c.updated_at).toLocaleDateString("en-GB")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="filings" className="mt-4">
          <Card>
            <CardContent className="pt-4">
              {filings.length === 0 ? (
                <p className="text-center text-muted-foreground py-8 text-sm">No CH filings recorded.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Filing Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>CH Transaction</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filings.map((f: any) => (
                      <TableRow key={f.id}>
                        <TableCell className="text-sm">{f.filing_type}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{f.filing_description || "—"}</TableCell>
                        <TableCell>
                          <Badge variant={f.status === "accepted" ? "default" : f.status === "rejected" ? "destructive" : "secondary"} className="text-xs capitalize">{f.status}</Badge>
                        </TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">{f.ch_transaction_id || "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{new Date(f.created_at).toLocaleDateString("en-GB")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <FilingDrawer
        open={!!drawerChangeId}
        onOpenChange={(open) => { if (!open) setDrawerChangeId(null); }}
        changeId={drawerChangeId}
        clientId={clientId}
      />

      <ChangeWizard
        open={showWizard}
        onOpenChange={setShowWizard}
        clientId={clientId}
      />

      <AuthCodeModal
        open={showAuthCode}
        onOpenChange={setShowAuthCode}
        clientId={clientId}
        existingCredentialId={authCode?.id}
      />
    </div>
  );
}
