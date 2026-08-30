import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight, BadgeCheck, BookOpenCheck, CheckCircle2, CircleDashed, Code2, FileCheck2, FileSearch, History, LockKeyhole, Plus, Search, ShieldCheck, Tag } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { usePermissions } from "@/hooks/usePermissions";
import { canRequestIxbrlTestPackage, formatPence, ixbrlStageLabel, parseIxbrlFacts, parseIxbrlIssues } from "@/lib/ixbrlPreflight";
import { WorkspacePageHeader } from "@/components/layout/WorkspacePageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

type Taxonomy = Tables<"ixbrl_taxonomies">;
type Mapping = Tables<"ixbrl_tag_mappings"> & { ixbrl_taxonomies: Pick<Taxonomy, "name" | "version"> | null };
type Instance = Tables<"ixbrl_filing_instances"> & {
  clients: { legal_name: string } | null;
  ixbrl_taxonomies: Pick<Taxonomy, "name" | "version"> | null;
  accounts_periods: { period_start: string; period_end: string } | null;
};
type LockedPeriod = {
  period_id: string;
  accounts_periods: { id: string; period_start: string; period_end: string; clients: { legal_name: string } | null } | null;
};

const kindLabel: Record<string, string> = {
  companies_house_accounts: "Companies House accounts",
  hmrc_accounts: "HMRC accounts",
};

const stageTone: Record<string, string> = {
  "Action required": "border-destructive/20 bg-destructive/10 text-destructive",
  "Preflight passed": "border-sky-200 bg-sky-50 text-sky-800",
  "Facts review complete": "border-violet-200 bg-violet-50 text-violet-800",
  "Validator passed": "border-emerald-200 bg-emerald-50 text-emerald-800",
  "Validator failed": "border-destructive/20 bg-destructive/10 text-destructive",
  "Test ready": "border-amber-200 bg-amber-50 text-amber-800",
  "Test submitted": "border-sky-200 bg-sky-50 text-sky-800",
  "Test accepted": "border-emerald-200 bg-emerald-50 text-emerald-800",
  "Test rejected": "border-destructive/20 bg-destructive/10 text-destructive",
};

function dateLabel(value?: string | null) {
  return value ? new Date(`${value}T00:00:00`).toLocaleDateString("en-GB") : "Open-ended";
}

export default function IxbrlTagging() {
  const { tenantId, role } = usePermissions();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("workspace");
  const [periodId, setPeriodId] = useState("");
  const [taxonomyId, setTaxonomyId] = useState("");
  const [packageKind, setPackageKind] = useState("companies_house_accounts");
  const [search, setSearch] = useState("");
  const [preview, setPreview] = useState<Instance | null>(null);
  const [reviewTarget, setReviewTarget] = useState<Instance | null>(null);
  const [reviewStatement, setReviewStatement] = useState("");
  const [mappingOpen, setMappingOpen] = useState(false);
  const [mappingDraft, setMappingDraft] = useState({ account_code: "", tag_name: "", tag_namespace: "uk-gaap", context_ref: "CurrentPeriod", unit_ref: "GBP" });
  const canReview = ["super_admin", "firm_owner", "manager"].includes(role || "");

  const { data: taxonomies = [] } = useQuery({
    queryKey: ["ixbrl-taxonomies"],
    queryFn: async () => {
      const { data, error } = await supabase.from("ixbrl_taxonomies").select("*").eq("is_active", true).order("taxonomy_type").order("version", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: lockedPeriods = [] } = useQuery({
    queryKey: ["ixbrl-locked-periods", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.from("accounts_compliance_profiles").select("period_id,accounts_periods(id,period_start,period_end,clients(legal_name))").eq("tenant_id", tenantId!).eq("status", "locked").order("updated_at", { ascending: false });
      if (error) throw error;
      return data as unknown as LockedPeriod[];
    },
    enabled: Boolean(tenantId),
  });

  const { data: mappings = [] } = useQuery({
    queryKey: ["ixbrl-mappings", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.from("ixbrl_tag_mappings").select("*,ixbrl_taxonomies(name,version)").eq("tenant_id", tenantId!).order("account_code");
      if (error) throw error;
      return data as Mapping[];
    },
    enabled: Boolean(tenantId),
  });

  const { data: instances = [] } = useQuery({
    queryKey: ["ixbrl-instances", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.from("ixbrl_filing_instances").select("*,clients(legal_name),ixbrl_taxonomies(name,version),accounts_periods(period_start,period_end)").eq("tenant_id", tenantId!).order("created_at", { ascending: false });
      if (error) throw error;
      return data as Instance[];
    },
    enabled: Boolean(tenantId),
  });

  const { data: events = [] } = useQuery({
    queryKey: ["ixbrl-events", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.from("ixbrl_filing_events").select("*").eq("tenant_id", tenantId!).order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return data;
    },
    enabled: Boolean(tenantId),
  });

  const refresh = () => queryClient.invalidateQueries({ predicate: ({ queryKey }) => String(queryKey[0]).startsWith("ixbrl-") });

  const buildPreflight = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("build_ixbrl_preflight", { p_period_id: periodId, p_taxonomy_id: taxonomyId, p_package_kind: packageKind });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      refresh();
      const result = data && typeof data === "object" && !Array.isArray(data) ? data : {};
      if (result.preflight_status === "passed") toast.success("Internal preflight passed");
      else toast.warning("Package saved with blocking issues");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const addMapping = useMutation({
    mutationFn: async () => {
      if (!tenantId || !taxonomyId) throw new Error("Choose a taxonomy before adding a mapping.");
      const { error } = await supabase.from("ixbrl_tag_mappings").upsert({
        tenant_id: tenantId, taxonomy_id: taxonomyId, account_code: mappingDraft.account_code.trim(), tag_name: mappingDraft.tag_name.trim(), tag_namespace: mappingDraft.tag_namespace.trim(), context_ref: mappingDraft.context_ref.trim() || null, unit_ref: mappingDraft.unit_ref.trim() || null,
      }, { onConflict: "tenant_id,taxonomy_id,account_code" });
      if (error) throw error;
    },
    onSuccess: () => {
      refresh(); setMappingOpen(false);
      setMappingDraft({ account_code: "", tag_name: "", tag_namespace: "uk-gaap", context_ref: "CurrentPeriod", unit_ref: "GBP" });
      toast.success("Tag mapping saved");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const approveReview = useMutation({
    mutationFn: async () => {
      if (!reviewTarget) throw new Error("Choose a package to review.");
      const { error } = await supabase.rpc("approve_ixbrl_facts_review", { p_filing_instance_id: reviewTarget.id, p_review_statement: reviewStatement });
      if (error) throw error;
    },
    onSuccess: () => { refresh(); setReviewTarget(null); setReviewStatement(""); toast.success("Tagged-facts review recorded"); },
    onError: (error: Error) => toast.error(error.message),
  });

  const requestTestPackage = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("request_ixbrl_test_package", { p_filing_instance_id: id });
      if (error) throw error;
    },
    onSuccess: () => { refresh(); toast.success("Package marked ready for the Companies House test service"); },
    onError: (error: Error) => toast.error(error.message),
  });

  const filteredMappings = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return needle ? mappings.filter((mapping) => [mapping.account_code, mapping.tag_name, mapping.tag_namespace].some((value) => value.toLowerCase().includes(needle))) : mappings;
  }, [mappings, search]);

  const passedCount = instances.filter((item) => item.preflight_status === "passed").length;
  const actionCount = instances.filter((item) => item.preflight_status === "failed").length;
  const acceptedCount = instances.filter((item) => item.test_package_status === "accepted").length;

  return (
    <div className="space-y-6 pb-24 md:pb-8">
      <WorkspacePageHeader eyebrow="Accounts filing workspace" title="Digital Accounts & iXBRL" icon={Code2} description="Build a traceable tagged-facts package from locked accounts, resolve deterministic preflight issues and pass it through independent review before external validation." actions={<Badge variant="outline" className="gap-1.5 border-amber-200 bg-amber-50 px-3 py-1.5 text-amber-900"><LockKeyhole className="h-3.5 w-3.5" />Live accounts filing locked</Badge>} />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Packages", value: instances.length, detail: `${passedCount} passed preflight`, icon: FileSearch },
          { label: "Action required", value: actionCount, detail: "Blocking internal checks", icon: AlertTriangle },
          { label: "Latest coverage", value: `${Number(instances[0]?.mapping_coverage || 0).toFixed(0)}%`, detail: "Non-zero accounts mapped", icon: Tag },
          { label: "Test accepted", value: acceptedCount, detail: "Provider evidence recorded", icon: BadgeCheck },
        ].map((metric) => <Card key={metric.label} className="workspace-panel"><CardContent className="flex items-start justify-between p-4"><div><p className="workspace-eyebrow">{metric.label}</p><p className="mt-2 text-2xl font-semibold">{metric.value}</p><p className="mt-1 text-xs text-muted-foreground">{metric.detail}</p></div><div className="rounded-xl bg-primary/10 p-2.5 text-primary"><metric.icon className="h-5 w-5" /></div></CardContent></Card>)}
      </div>

      <Card className="border-primary/20 bg-gradient-to-br from-primary/[0.07] via-background to-background"><CardContent className="grid gap-3 p-4 md:grid-cols-4">{[
        ["1", "Locked accounts", "Reviewer-approved source"], ["2", "Internal preflight", "Mapping and identity checks"], ["3", "Facts and validation", "Independent review + validator"], ["4", "Test service", "Provider acceptance"],
      ].map(([number, title, detail]) => <div key={number} className="flex items-center gap-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">{number}</span><div><p className="text-sm font-semibold">{title}</p><p className="text-xs text-muted-foreground">{detail}</p></div></div>)}</CardContent></Card>

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList className="grid h-auto w-full grid-cols-4 p-1 md:inline-grid md:w-auto">
          <TabsTrigger value="workspace" className="gap-1.5 px-2"><FileCheck2 className="h-4 w-4" /><span className="hidden sm:inline">Workspace</span></TabsTrigger>
          <TabsTrigger value="mappings" className="gap-1.5 px-2"><Tag className="h-4 w-4" /><span className="hidden sm:inline">Mappings</span></TabsTrigger>
          <TabsTrigger value="releases" className="gap-1.5 px-2"><BookOpenCheck className="h-4 w-4" /><span className="hidden sm:inline">Releases</span></TabsTrigger>
          <TabsTrigger value="audit" className="gap-1.5 px-2"><History className="h-4 w-4" /><span className="hidden sm:inline">Audit</span></TabsTrigger>
        </TabsList>

        <TabsContent value="workspace" className="space-y-4">
          <Card className="workspace-panel"><CardHeader><CardTitle className="text-lg">Build a controlled package</CardTitle><CardDescription>Only final accounts with the two-person accounts lock are available.</CardDescription></CardHeader><CardContent className="grid gap-4 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end">
            <div className="space-y-2"><Label>Locked accounts period</Label><Select value={periodId} onValueChange={setPeriodId}><SelectTrigger><SelectValue placeholder="Choose client and period" /></SelectTrigger><SelectContent>{lockedPeriods.map((profile) => <SelectItem key={profile.period_id} value={profile.period_id}>{profile.accounts_periods?.clients?.legal_name || "Client"} · {dateLabel(profile.accounts_periods?.period_end)}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Package</Label><Select value={packageKind} onValueChange={(value) => { setPackageKind(value); setTaxonomyId(""); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(kindLabel).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Verified taxonomy</Label><Select value={taxonomyId} onValueChange={setTaxonomyId}><SelectTrigger><SelectValue placeholder="Choose release" /></SelectTrigger><SelectContent>{taxonomies.filter((taxonomy) => taxonomy.taxonomy_type !== "hmrc-ct").map((taxonomy) => <SelectItem key={taxonomy.id} value={taxonomy.id}>{taxonomy.name} · {taxonomy.version}</SelectItem>)}</SelectContent></Select></div>
            <Button className="w-full lg:w-auto" onClick={() => buildPreflight.mutate()} disabled={!periodId || !taxonomyId || buildPreflight.isPending}>{buildPreflight.isPending ? "Running…" : "Run preflight"}<ArrowRight className="ml-2 h-4 w-4" /></Button>
          </CardContent></Card>

          {instances.length === 0 ? <Card className="workspace-panel border-dashed"><CardContent className="grid place-items-center px-6 py-16 text-center"><div className="rounded-2xl bg-muted p-4"><FileSearch className="h-8 w-8 text-muted-foreground" /></div><h3 className="mt-4 font-semibold">No digital accounts packages yet</h3><p className="mt-1 max-w-md text-sm text-muted-foreground">Lock a completed accounts period, add taxonomy mappings, then run internal preflight.</p></CardContent></Card> : <div className="grid gap-4 xl:grid-cols-2">{instances.map((instance) => {
            const stage = ixbrlStageLabel(instance); const issues = parseIxbrlIssues(instance.validation_errors_json);
            return <Card key={instance.id} className="workspace-panel"><CardHeader className="space-y-3 pb-3"><div className="flex flex-wrap items-start justify-between gap-3"><div><CardTitle className="text-base">{instance.clients?.legal_name || "Client"}</CardTitle><CardDescription className="mt-1">{kindLabel[instance.package_kind] || instance.package_kind} · version {instance.package_version}</CardDescription></div><Badge variant="outline" className={stageTone[stage] || ""}>{stage}</Badge></div><div className="flex flex-wrap gap-x-4 text-xs text-muted-foreground"><span>{dateLabel(instance.accounts_periods?.period_start)} – {dateLabel(instance.accounts_periods?.period_end)}</span><span>{instance.ixbrl_taxonomies?.name} {instance.ixbrl_taxonomies?.version}</span></div></CardHeader><CardContent className="space-y-4">
              <div><div className="mb-1.5 flex justify-between text-xs"><span>Mapping coverage</span><span className="font-semibold">{Number(instance.mapping_coverage).toFixed(2)}%</span></div><Progress value={Number(instance.mapping_coverage)} className="h-2" /></div>
              <div className="grid grid-cols-3 gap-2 text-center"><div className="rounded-xl bg-muted/60 p-2"><p className="text-lg font-semibold">{parseIxbrlFacts(instance.facts_json).length}</p><p className="text-[11px] text-muted-foreground">Facts</p></div><div className="rounded-xl bg-destructive/5 p-2"><p className="text-lg font-semibold text-destructive">{instance.blocking_issue_count}</p><p className="text-[11px] text-muted-foreground">Blocking</p></div><div className="rounded-xl bg-amber-500/5 p-2"><p className="text-lg font-semibold text-amber-700">{instance.warning_issue_count}</p><p className="text-[11px] text-muted-foreground">Warnings</p></div></div>
              {issues[0] && <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /><span>{issues[0].message}{issues.length > 1 ? ` +${issues.length - 1} more` : ""}</span></div>}
              <div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => setPreview(instance)}><FileSearch className="mr-1.5 h-4 w-4" />Inspect facts</Button>{instance.preflight_status === "passed" && !instance.facts_reviewed_at && canReview && <Button size="sm" variant="outline" onClick={() => setReviewTarget(instance)}><ShieldCheck className="mr-1.5 h-4 w-4" />Review facts</Button>}{canRequestIxbrlTestPackage(instance) && <Button size="sm" onClick={() => requestTestPackage.mutate(instance.id)} disabled={requestTestPackage.isPending}><FileCheck2 className="mr-1.5 h-4 w-4" />Prepare test pack</Button>}</div>
            </CardContent></Card>;
          })}</div>}
        </TabsContent>

        <TabsContent value="mappings">
          <Card className="workspace-panel"><CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between"><div><CardTitle className="text-lg">Account-to-concept mappings</CardTitle><CardDescription className="mt-1">Mappings are tenant-specific and versioned by taxonomy release.</CardDescription></div><Dialog open={mappingOpen} onOpenChange={setMappingOpen}><DialogTrigger asChild><Button size="sm"><Plus className="mr-1.5 h-4 w-4" />Add mapping</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Add taxonomy mapping</DialogTitle></DialogHeader><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2 sm:col-span-2"><Label>Taxonomy</Label><Select value={taxonomyId} onValueChange={setTaxonomyId}><SelectTrigger><SelectValue placeholder="Choose release" /></SelectTrigger><SelectContent>{taxonomies.map((taxonomy) => <SelectItem value={taxonomy.id} key={taxonomy.id}>{taxonomy.name} · {taxonomy.version}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label>Account code</Label><Input value={mappingDraft.account_code} onChange={(event) => setMappingDraft((value) => ({ ...value, account_code: event.target.value }))} /></div><div className="space-y-2"><Label>Namespace</Label><Input value={mappingDraft.tag_namespace} onChange={(event) => setMappingDraft((value) => ({ ...value, tag_namespace: event.target.value }))} /></div><div className="space-y-2 sm:col-span-2"><Label>Concept name</Label><Input value={mappingDraft.tag_name} onChange={(event) => setMappingDraft((value) => ({ ...value, tag_name: event.target.value }))} placeholder="TurnoverRevenue" /></div><div className="space-y-2"><Label>Context</Label><Input value={mappingDraft.context_ref} onChange={(event) => setMappingDraft((value) => ({ ...value, context_ref: event.target.value }))} /></div><div className="space-y-2"><Label>Unit</Label><Input value={mappingDraft.unit_ref} onChange={(event) => setMappingDraft((value) => ({ ...value, unit_ref: event.target.value }))} /></div></div><DialogFooter><Button onClick={() => addMapping.mutate()} disabled={!taxonomyId || !mappingDraft.account_code.trim() || !mappingDraft.tag_name.trim() || addMapping.isPending}>Save mapping</Button></DialogFooter></DialogContent></Dialog></CardHeader><CardContent className="space-y-4"><div className="relative max-w-sm"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-9" placeholder="Search code or concept" value={search} onChange={(event) => setSearch(event.target.value)} /></div><div className="overflow-x-auto rounded-xl border"><Table><TableHeader><TableRow><TableHead>Account</TableHead><TableHead>Concept</TableHead><TableHead>Taxonomy</TableHead><TableHead>Context</TableHead><TableHead>Unit</TableHead></TableRow></TableHeader><TableBody>{filteredMappings.length === 0 ? <TableRow><TableCell colSpan={5} className="h-28 text-center text-muted-foreground">No mappings match this view.</TableCell></TableRow> : filteredMappings.map((mapping) => <TableRow key={mapping.id}><TableCell className="font-mono text-xs font-semibold">{mapping.account_code}</TableCell><TableCell className="font-mono text-xs">{mapping.tag_namespace}:{mapping.tag_name}</TableCell><TableCell className="text-sm">{mapping.ixbrl_taxonomies?.name} {mapping.ixbrl_taxonomies?.version}</TableCell><TableCell className="text-xs">{mapping.context_ref || "CurrentPeriod"}</TableCell><TableCell className="text-xs">{mapping.unit_ref || "GBP"}</TableCell></TableRow>)}</TableBody></Table></div></CardContent></Card>
        </TabsContent>

        <TabsContent value="releases" className="space-y-4"><div className="grid gap-4 lg:grid-cols-3">{taxonomies.map((taxonomy) => <Card key={taxonomy.id} className="workspace-panel"><CardHeader><div className="flex items-start justify-between gap-2"><div><CardTitle className="text-base">{taxonomy.name}</CardTitle><CardDescription className="mt-1">{taxonomy.version}</CardDescription></div><Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-800"><CheckCircle2 className="mr-1 h-3 w-3" />Verified</Badge></div></CardHeader><CardContent className="space-y-3 text-sm"><div className="flex justify-between"><span className="text-muted-foreground">Release</span><span>{dateLabel(taxonomy.release_date)}</span></div><div className="flex justify-between"><span className="text-muted-foreground">Accepted from</span><span>{dateLabel(taxonomy.accepted_period_start)}</span></div><div className="flex justify-between"><span className="text-muted-foreground">Accepted to</span><span>{dateLabel(taxonomy.accepted_period_end)}</span></div><div className="flex justify-between gap-3"><span className="text-muted-foreground">Profile</span><span className="text-right font-mono text-xs">{taxonomy.validation_profile || "—"}</span></div>{taxonomy.authority_url && <Button variant="outline" size="sm" className="w-full" asChild><a href={taxonomy.authority_url} target="_blank" rel="noreferrer">Open authority record</a></Button>}</CardContent></Card>)}</div><Card className="border-sky-200 bg-sky-50/60"><CardContent className="flex items-start gap-3 p-4 text-sm text-sky-950"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" /><p>Reference releases are service-controlled. Browser users cannot mark a taxonomy as verified or change acceptance dates.</p></CardContent></Card></TabsContent>

        <TabsContent value="audit"><Card className="workspace-panel"><CardHeader><CardTitle className="text-lg">Immutable filing evidence</CardTitle><CardDescription>Workflow events are appended by controlled server functions.</CardDescription></CardHeader><CardContent><div className="space-y-1">{events.length === 0 ? <div className="grid place-items-center py-12 text-sm text-muted-foreground"><CircleDashed className="mb-3 h-7 w-7" />No filing events recorded.</div> : events.map((event) => <div key={event.id} className="flex items-start gap-3 border-b py-3 last:border-0"><div className="mt-0.5 rounded-full bg-muted p-2"><History className="h-3.5 w-3.5" /></div><div className="min-w-0 flex-1"><p className="text-sm font-medium capitalize">{event.event_type.replaceAll("_", " ")}</p><p className="mt-0.5 text-xs text-muted-foreground">{new Date(event.created_at).toLocaleString("en-GB")}</p></div><Badge variant="outline" className="font-mono text-[10px]">{event.filing_instance_id.slice(0, 8)}</Badge></div>)}</div></CardContent></Card></TabsContent>
      </Tabs>

      <Dialog open={Boolean(preview)} onOpenChange={(open) => !open && setPreview(null)}><DialogContent className="max-h-[88vh] max-w-5xl overflow-y-auto"><DialogHeader><DialogTitle>Tagged facts · {preview?.clients?.legal_name}</DialogTitle></DialogHeader>{preview && <div className="space-y-5"><div className="grid gap-3 sm:grid-cols-3"><div className="rounded-xl border p-3"><p className="workspace-eyebrow">Coverage</p><p className="mt-1 text-xl font-semibold">{Number(preview.mapping_coverage).toFixed(2)}%</p></div><div className="rounded-xl border p-3"><p className="workspace-eyebrow">Blocking</p><p className="mt-1 text-xl font-semibold text-destructive">{preview.blocking_issue_count}</p></div><div className="rounded-xl border p-3"><p className="workspace-eyebrow">External validator</p><p className="mt-1 text-sm font-semibold capitalize">{preview.external_validation_status.replaceAll("_", " ")}</p></div></div>{parseIxbrlIssues(preview.validation_errors_json).map((issue) => <div key={issue.code} className="flex items-start gap-2 rounded-lg border p-3 text-sm"><AlertTriangle className={`mt-0.5 h-4 w-4 shrink-0 ${issue.severity === "blocking" ? "text-destructive" : "text-amber-600"}`} /><div><p className="font-mono text-xs font-semibold">{issue.code}</p><p className="mt-1 text-muted-foreground">{issue.message}</p></div></div>)}<div className="overflow-x-auto rounded-xl border"><Table><TableHeader><TableRow><TableHead>Account</TableHead><TableHead>Concept</TableHead><TableHead className="text-right">Current</TableHead><TableHead className="text-right">Comparative</TableHead></TableRow></TableHeader><TableBody>{parseIxbrlFacts(preview.facts_json).map((fact) => <TableRow key={`${fact.account_code}-${fact.concept}`}><TableCell><p className="font-mono text-xs font-semibold">{fact.account_code}</p><p className="text-xs text-muted-foreground">{fact.account_name}</p></TableCell><TableCell><p className="font-mono text-xs">{fact.namespace}:{fact.concept}</p><p className="text-[11px] text-muted-foreground">{fact.context_ref} · {fact.unit_ref}</p></TableCell><TableCell className="text-right font-mono text-xs">{formatPence(fact.current_value_pence)}</TableCell><TableCell className="text-right font-mono text-xs">{formatPence(fact.comparative_value_pence)}</TableCell></TableRow>)}</TableBody></Table></div><div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950"><LockKeyhole className="mt-0.5 h-4 w-4 shrink-0" /><span>This is a locked facts preview, not rendered iXBRL or regulator validation. Test readiness requires real external validator evidence.</span></div></div>}</DialogContent></Dialog>

      <Dialog open={Boolean(reviewTarget)} onOpenChange={(open) => !open && setReviewTarget(null)}><DialogContent><DialogHeader><DialogTitle>Independent tagged-facts review</DialogTitle></DialogHeader><div className="space-y-4"><div className="rounded-xl border bg-muted/40 p-3 text-sm"><p className="font-medium">{reviewTarget?.clients?.legal_name}</p><p className="mt-1 text-muted-foreground">Package version {reviewTarget?.package_version} · {reviewTarget && parseIxbrlFacts(reviewTarget.facts_json).length} tagged facts</p></div><div className="space-y-2"><Label>Reviewer statement</Label><Textarea rows={5} value={reviewStatement} onChange={(event) => setReviewStatement(event.target.value)} placeholder="I reviewed the tagged facts against the locked accounts and confirm that the mapping and values are complete and consistent…" /><p className="text-xs text-muted-foreground">The reviewer must be different from the package preparer. Rendered-document review follows in the renderer phase.</p></div></div><DialogFooter><Button onClick={() => approveReview.mutate()} disabled={reviewStatement.trim().length < 10 || approveReview.isPending}>{approveReview.isPending ? "Recording…" : "Record review"}</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
}
