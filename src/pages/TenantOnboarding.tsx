import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Building2, Palette, LayoutGrid, Plug, Users, CheckCircle2, ChevronRight, ChevronLeft, Plus, Trash2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type StepKey = "basics" | "branding" | "modules" | "integrations" | "users" | "review";

const STEPS: { key: StepKey; label: string; icon: typeof Building2 }[] = [
  { key: "basics", label: "Basics", icon: Building2 },
  { key: "branding", label: "Branding", icon: Palette },
  { key: "modules", label: "Modules", icon: LayoutGrid },
  { key: "integrations", label: "Integrations", icon: Plug },
  { key: "users", label: "Users", icon: Users },
  { key: "review", label: "Review", icon: CheckCircle2 },
];

const ALL_MODULES = [
  "clients", "tasks", "bookkeeping", "vat", "payroll", "accounts",
  "secretarial", "incorporations", "kyc_aml", "submissions",
  "documents", "billing", "reports", "practice_mgmt",
];

export default function TenantOnboarding() {
  const [tenantId, setTenantId] = useState("");
  const [step, setStep] = useState<StepKey>("basics");
  const [draft, setDraft] = useState<any>(null);

  const currentIdx = STEPS.findIndex((s) => s.key === step);
  function goto(next: StepKey) { setStep(next); }
  function goNext() { if (currentIdx < STEPS.length - 1) goto(STEPS[currentIdx + 1].key); }
  function goBack() { if (currentIdx > 0) goto(STEPS[currentIdx - 1].key); }

  function BasicsStep() {
    const [form, setForm] = useState({
      practiceName: draft?.basics?.practiceName ?? "",
      region: draft?.basics?.region ?? "UK",
      plan: draft?.basics?.plan ?? "starter",
      contactEmail: draft?.basics?.contactEmail ?? "",
    });

    const handleCreate = async () => {
      if (!form.practiceName) { toast.error("Practice name is required"); return; }

      const { data: tenant, error: tErr } = await supabase
        .from("tenants")
        .insert({
          firm_name: form.practiceName,
          support_email: form.contactEmail || null,
          plan_code: form.plan,
        })
        .select("id")
        .single();

      if (tErr || !tenant) { toast.error("Failed to create tenant: " + tErr?.message); return; }

      const { data: starterPlan } = await supabase
        .from("subscription_plans")
        .select("id")
        .eq("code", form.plan)
        .single();

      if (starterPlan) {
        await supabase.from("tenant_subscriptions").insert({
          tenant_id: tenant.id,
          plan_id: starterPlan.id,
          status: "trial",
          trial_ends_at: new Date(Date.now() + 14 * 86400000).toISOString(),
          current_period_end: new Date(Date.now() + 14 * 86400000).toISOString(),
        });
      }

      await supabase.rpc("seed_tenant", { p_tenant_id: tenant.id });
      await supabase.rpc("seed_templates_and_automations", { p_tenant_id: tenant.id });

      setTenantId(tenant.id);
      setDraft({ basics: form, modules: Object.fromEntries(ALL_MODULES.map((m) => [m, true])), integrations: {}, users: [] });
      toast.success("Tenant created successfully");
      goto("branding");
    };

    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2"><Building2 className="w-5 h-5" /> Practice Basics</CardTitle>
          <CardDescription>Enter the core details for the new tenant</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Practice Name</Label><Input value={form.practiceName} onChange={(e) => setForm({ ...form, practiceName: e.target.value })} /></div>
            <div className="space-y-2">
              <Label>Region</Label>
              <Select value={form.region} onValueChange={(v) => setForm({ ...form, region: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="UK">UK</SelectItem><SelectItem value="EU">EU</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Plan</Label>
              <Select value={form.plan} onValueChange={(v) => setForm({ ...form, plan: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="starter">Starter</SelectItem><SelectItem value="pro">Pro</SelectItem><SelectItem value="enterprise">Enterprise</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Support Email</Label><Input value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} /></div>
          </div>
          <div className="flex justify-end"><Button onClick={handleCreate}>Create & Continue <ChevronRight className="w-4 h-4 ml-1" /></Button></div>
        </CardContent>
      </Card>
    );
  }

  function BrandingStep() {
    const [form, setForm] = useState({ logoUrl: "", primaryColor: "#111111", accentColor: "#111111" });

    const handleSave = async () => {
      await supabase.from("tenants").update({
        logo_url: form.logoUrl || null,
        brand_primary_color: form.primaryColor,
        brand_secondary_color: form.accentColor,
      }).eq("id", tenantId);
      toast.success("Branding saved");
    };

    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2"><Palette className="w-5 h-5" /> Branding</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2 md:col-span-3"><Label>Logo URL</Label><Input value={form.logoUrl} onChange={(e) => setForm({ ...form, logoUrl: e.target.value })} /></div>
            <div className="space-y-2">
              <Label>Primary Colour</Label>
              <div className="flex items-center gap-2">
                <input type="color" value={form.primaryColor} onChange={(e) => setForm({ ...form, primaryColor: e.target.value })} className="w-10 h-10 rounded border cursor-pointer" />
                <Input value={form.primaryColor} onChange={(e) => setForm({ ...form, primaryColor: e.target.value })} className="font-mono text-sm" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Accent Colour</Label>
              <div className="flex items-center gap-2">
                <input type="color" value={form.accentColor} onChange={(e) => setForm({ ...form, accentColor: e.target.value })} className="w-10 h-10 rounded border cursor-pointer" />
                <Input value={form.accentColor} onChange={(e) => setForm({ ...form, accentColor: e.target.value })} className="font-mono text-sm" />
              </div>
            </div>
          </div>
          <NavButtons onSave={handleSave} />
        </CardContent>
      </Card>
    );
  }

  function ModulesStep() {
    const [mods, setMods] = useState<Record<string, boolean>>(draft?.modules ?? Object.fromEntries(ALL_MODULES.map((m) => [m, true])));
    const handleSave = () => { setDraft((d: any) => ({ ...d, modules: mods })); toast.success("Modules saved"); };
    return (
      <Card>
        <CardHeader><CardTitle className="text-lg flex items-center gap-2"><LayoutGrid className="w-5 h-5" /> Modules</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {ALL_MODULES.map((k) => (
              <label key={k} className="flex items-center gap-2 rounded-lg border p-3 cursor-pointer hover:bg-muted/50 transition-colors">
                <Switch checked={mods[k] ?? false} onCheckedChange={(v) => setMods((m) => ({ ...m, [k]: v }))} />
                <span className="text-sm capitalize">{k.replace(/_/g, " ")}</span>
              </label>
            ))}
          </div>
          <NavButtons onSave={handleSave} />
        </CardContent>
      </Card>
    );
  }

  function IntegrationsStep() {
    const [v, setV] = useState<any>(draft?.integrations ?? {});
    function toggle(key: string, enabled: boolean) { setV((p: any) => ({ ...p, [key]: { ...p[key], enabled } })); }
    function setField(key: string, field: string, value: string) { setV((p: any) => ({ ...p, [key]: { ...p[key], [field]: value } })); }
    const handleSave = () => { setDraft((d: any) => ({ ...d, integrations: v })); toast.success("Integrations noted"); };

    const IntSection = ({ title, keyName, fields }: { title: string; keyName: string; fields: { name: string; label: string; type?: string }[] }) => (
      <div className="rounded-lg border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-sm">{title}</h4>
          <Switch checked={v[keyName]?.enabled ?? false} onCheckedChange={(c) => toggle(keyName, c)} />
        </div>
        {v[keyName]?.enabled && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {fields.map((f) =>
              f.type === "select" ? (
                <div key={f.name} className="space-y-1">
                  <Label className="text-xs">{f.label}</Label>
                  <Select value={v[keyName]?.[f.name] ?? ""} onValueChange={(val) => setField(keyName, f.name, val)}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="sandbox">Sandbox</SelectItem><SelectItem value="production">Production</SelectItem></SelectContent>
                  </Select>
                </div>
              ) : (
                <div key={f.name} className="space-y-1">
                  <Label className="text-xs">{f.label}</Label>
                  <Input className="h-9" value={v[keyName]?.[f.name] ?? ""} onChange={(e) => setField(keyName, f.name, e.target.value)} />
                </div>
              )
            )}
          </div>
        )}
      </div>
    );

    return (
      <Card>
        <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Plug className="w-5 h-5" /> Integrations</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <IntSection title="Companies House" keyName="companiesHouse" fields={[{ name: "apiKey", label: "API Key" }, { name: "presenterId", label: "Presenter ID" }]} />
          <IntSection title="HMRC" keyName="hmrc" fields={[{ name: "clientId", label: "Client ID" }, { name: "clientSecret", label: "Client Secret" }, { name: "environment", label: "Environment", type: "select" }]} />
          <IntSection title="GoCardless" keyName="gocardless" fields={[{ name: "accessToken", label: "Access Token" }, { name: "environment", label: "Environment", type: "select" }]} />
          <NavButtons onSave={handleSave} />
        </CardContent>
      </Card>
    );
  }

  function UsersStep() {
    const [users, setUsers] = useState<any[]>(draft?.users ?? []);
    function update(i: number, patch: any) { setUsers((u) => u.map((x, idx) => (idx === i ? { ...x, ...patch } : x))); }
    function add() { setUsers((u) => [...u, { email: "", name: "", role: "viewer" }]); }
    function remove(i: number) { setUsers((u) => u.filter((_, idx) => idx !== i)); }
    const handleSave = () => { setDraft((d: any) => ({ ...d, users })); toast.success("Users saved"); };

    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2"><Users className="w-5 h-5" /> Users & Roles</CardTitle>
            <Button size="sm" variant="outline" onClick={add}><Plus className="w-4 h-4 mr-1" /> Add</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {users.map((u, i) => (
            <div key={i} className="flex items-end gap-3 rounded-lg border p-3">
              <div className="flex-1 space-y-1"><Label className="text-xs">Name</Label><Input className="h-9" value={u.name} onChange={(e) => update(i, { name: e.target.value })} /></div>
              <div className="flex-1 space-y-1"><Label className="text-xs">Email</Label><Input className="h-9" value={u.email} onChange={(e) => update(i, { email: e.target.value })} /></div>
              <div className="w-36 space-y-1">
                <Label className="text-xs">Role</Label>
                <Select value={u.role} onValueChange={(v) => update(i, { role: v })}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>{["owner", "admin", "manager", "bookkeeper", "payroll", "viewer"].map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Button size="icon" variant="ghost" className="shrink-0" onClick={() => remove(i)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
            </div>
          ))}
          {users.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">No users yet.</p>}
          <NavButtons onSave={handleSave} />
        </CardContent>
      </Card>
    );
  }

  function ReviewStep() {
    const handleFinish = async () => {
      toast.success("Tenant onboarding completed ✅");
      setTenantId("");
      setDraft(null);
      setStep("basics");
    };

    const Section = ({ title, data }: { title: string; data: any }) => (
      <div className="space-y-1">
        <h4 className="text-sm font-semibold">{title}</h4>
        <pre className="bg-muted rounded-lg p-3 text-xs overflow-x-auto whitespace-pre-wrap">{JSON.stringify(data, null, 2)}</pre>
      </div>
    );

    return (
      <Card>
        <CardHeader><CardTitle className="text-lg flex items-center gap-2"><CheckCircle2 className="w-5 h-5" /> Review & Finish</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Section title="Basics" data={draft?.basics} />
          <Section title="Modules" data={draft?.modules} />
          <Section title="Integrations" data={draft?.integrations} />
          <Section title="Users" data={draft?.users} />
          <Separator />
          <div className="flex justify-between">
            <Button variant="outline" onClick={goBack}><ChevronLeft className="w-4 h-4 mr-1" /> Back</Button>
            <Button onClick={handleFinish}>Finish Onboarding</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  function NavButtons({ onSave }: { onSave: () => void }) {
    return (
      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={goBack} disabled={currentIdx === 0}><ChevronLeft className="w-4 h-4 mr-1" /> Back</Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onSave}>Save</Button>
          <Button onClick={() => { onSave(); goNext(); }}>Continue <ChevronRight className="w-4 h-4 ml-1" /></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tenant Onboarding</h1>
          <p className="text-sm text-muted-foreground">Create a new accounting firm tenant and configure modules, integrations and users.</p>
          {tenantId && <Badge variant="secondary" className="mt-1">Tenant: {tenantId.slice(0, 8)}…</Badge>}
        </div>
        {tenantId && (
          <Button variant="outline" size="sm" onClick={() => { setTenantId(""); setDraft(null); setStep("basics"); }}>Start New</Button>
        )}
      </div>
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {STEPS.map((s, i) => {
          const isActive = step === s.key;
          const isPast = currentIdx > i;
          return (
            <button key={s.key} onClick={() => tenantId ? goto(s.key) : undefined} disabled={!tenantId && s.key !== "basics"}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${isActive ? "bg-primary text-primary-foreground" : isPast ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"} disabled:opacity-40`}>
              <s.icon className="w-3.5 h-3.5" />{s.label}
            </button>
          );
        })}
      </div>
      {step === "basics" && <BasicsStep />}
      {step === "branding" && tenantId && <BrandingStep />}
      {step === "modules" && tenantId && <ModulesStep />}
      {step === "integrations" && tenantId && <IntegrationsStep />}
      {step === "users" && tenantId && <UsersStep />}
      {step === "review" && tenantId && <ReviewStep />}
    </div>
  );
}
