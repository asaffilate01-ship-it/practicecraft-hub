import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Building2, Palette, LayoutGrid, Plug, FileStack, Users, CheckCircle2, ChevronRight, ChevronLeft, Plus, Trash2,
} from "lucide-react";
import {
  onboardingDrafts,
  templateCatalog,
  practiceTenants,
  practiceBranding,
  practiceFeaturesByTenant,
  type PracticeTenantBranding,
} from "@/practice/fixtures";

type StepKey = "basics" | "branding" | "modules" | "integrations" | "templates" | "users" | "review";

const STEPS: { key: StepKey; label: string; icon: typeof Building2 }[] = [
  { key: "basics", label: "Basics", icon: Building2 },
  { key: "branding", label: "Branding", icon: Palette },
  { key: "modules", label: "Modules", icon: LayoutGrid },
  { key: "integrations", label: "Integrations", icon: Plug },
  { key: "templates", label: "Templates", icon: FileStack },
  { key: "users", label: "Users", icon: Users },
  { key: "review", label: "Review", icon: CheckCircle2 },
];

/* ── Mock API helpers (operate on in-memory fixtures) ─────── */

function startOnboarding(body: any): string {
  const tenantId = `t-${Math.floor(Math.random() * 900 + 100)}`;
  const practiceName = body.practiceName ?? "New Practice";

  practiceTenants.push({ id: tenantId, name: practiceName, plan: body.plan ?? "Starter", region: body.region ?? "UK", status: "onboarding" });

  practiceBranding.tenants[tenantId] = {
    tenantId,
    practiceName,
    logoUrl: "https://dummyimage.com/160x40/111/fff&text=New+Practice",
    primaryColor: "#111111",
    accentColor: "#111111",
    supportEmail: body.contactEmail ?? "support@example.com",
  };

  practiceFeaturesByTenant[tenantId] = {
    clients: true, secretarial: true, incorporations: true, vat: true, payroll: true,
    submissions: true, documents: true, tasks: true, practice_mgmt: true, billing: true, kyc_aml: true,
  };

  onboardingDrafts[tenantId] = {
    tenantId,
    status: "in_progress",
    step: "basics",
    basics: { practiceName, region: body.region ?? "UK", plan: body.plan ?? "Starter", contactEmail: body.contactEmail ?? "", contactPhone: body.contactPhone ?? "" },
    branding: { logoUrl: practiceBranding.tenants[tenantId].logoUrl, primaryColor: "#111111", accentColor: "#111111" },
    modules: { ...practiceFeaturesByTenant[tenantId] },
    integrations: {
      companiesHouse: { enabled: false, apiKey: "", presenterId: "", email: "" },
      hmrc: { enabled: false, clientId: "", clientSecret: "", environment: "sandbox" },
      gocardless: { enabled: false, accessToken: "", environment: "sandbox" },
      stripe: { enabled: false, publishableKey: "", secretKey: "" },
      accessPaysuite: { enabled: false, merchantId: "", apiKey: "" },
      openBanking: { enabled: false, provider: "truelayer" },
    },
    templates: { coaPack: "uk_sme_default", taskPack: "practice_default_120", lettersPack: "engagement_letters_v1", invoicePack: "invoice_default_v1" },
    users: [{ email: body.ownerEmail ?? "owner@example.com", name: "Owner", role: "owner" }],
  };

  return tenantId;
}

function saveDraft(tenantId: string, patch: any) {
  const draft = onboardingDrafts[tenantId];
  if (!draft) return;
  Object.assign(draft, patch, { updatedAt: new Date().toISOString() });
  if (patch.branding) Object.assign(practiceBranding.tenants[tenantId] ?? {}, patch.branding);
  if (patch.modules) Object.assign(practiceFeaturesByTenant[tenantId] ?? {}, patch.modules);
  if (patch.basics?.practiceName) {
    const t = practiceTenants.find((x) => x.id === tenantId);
    if (t) t.name = patch.basics.practiceName;
    if (practiceBranding.tenants[tenantId]) practiceBranding.tenants[tenantId].practiceName = patch.basics.practiceName;
  }
}

function finishOnboarding(tenantId: string) {
  const draft = onboardingDrafts[tenantId];
  if (draft) { draft.status = "completed"; draft.step = "done"; }
  const t = practiceTenants.find((x) => x.id === tenantId);
  if (t) t.status = "active";
}

/* ── Main Component ──────────────────────────────────────── */

export default function TenantOnboarding() {
  const [tenantId, setTenantId] = useState(() => localStorage.getItem("onboarding_tenant_id") ?? "");
  const [step, setStep] = useState<StepKey>("basics");

  const draft = tenantId ? onboardingDrafts[tenantId] : null;

  useEffect(() => {
    if (draft?.step && draft.step !== "done") setStep(draft.step as StepKey);
  }, [draft?.step]);

  const currentIdx = STEPS.findIndex((s) => s.key === step);

  function goto(next: StepKey) {
    setStep(next);
    if (tenantId) saveDraft(tenantId, { step: next });
  }

  function goNext() {
    if (currentIdx < STEPS.length - 1) goto(STEPS[currentIdx + 1].key);
  }

  function goBack() {
    if (currentIdx > 0) goto(STEPS[currentIdx - 1].key);
  }

  /* ── Step: Basics ──────────────────────────────────────── */
  function BasicsStep() {
    const [form, setForm] = useState({
      practiceName: draft?.basics?.practiceName ?? "",
      region: draft?.basics?.region ?? "UK",
      plan: draft?.basics?.plan ?? "Starter",
      contactEmail: draft?.basics?.contactEmail ?? "",
      contactPhone: draft?.basics?.contactPhone ?? "",
      ownerEmail: draft?.users?.[0]?.email ?? "",
    });

    const handleCreate = () => {
      if (!form.practiceName) { toast.error("Practice name is required"); return; }
      const id = startOnboarding(form);
      setTenantId(id);
      localStorage.setItem("onboarding_tenant_id", id);
      toast.success(`Tenant ${id} created`);
      goto("branding");
    };

    const handleSave = () => {
      saveDraft(tenantId, { basics: form });
      toast.success("Basics saved");
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
                <SelectContent><SelectItem value="Starter">Starter</SelectItem><SelectItem value="Pro">Pro</SelectItem><SelectItem value="Enterprise">Enterprise</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Owner Email</Label><Input value={form.ownerEmail} onChange={(e) => setForm({ ...form, ownerEmail: e.target.value })} /></div>
            <div className="space-y-2"><Label>Support Email</Label><Input value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} /></div>
            <div className="space-y-2"><Label>Support Phone</Label><Input value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} /></div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            {tenantId ? (
              <>
                <Button variant="outline" onClick={handleSave}>Save</Button>
                <Button onClick={() => { handleSave(); goNext(); }}>Continue <ChevronRight className="w-4 h-4 ml-1" /></Button>
              </>
            ) : (
              <Button onClick={handleCreate}>Create & Continue <ChevronRight className="w-4 h-4 ml-1" /></Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  /* ── Step: Branding ────────────────────────────────────── */
  function BrandingStep() {
    const [form, setForm] = useState({
      logoUrl: draft?.branding?.logoUrl ?? "",
      primaryColor: draft?.branding?.primaryColor ?? "#111111",
      accentColor: draft?.branding?.accentColor ?? "#111111",
    });

    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2"><Palette className="w-5 h-5" /> Branding</CardTitle>
          <CardDescription>Set logo and brand colours for this tenant</CardDescription>
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

          {/* Preview */}
          <div className="rounded-xl border p-4 space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Preview</p>
            <div className="flex items-center gap-4">
              {form.logoUrl ? <img src={form.logoUrl} alt="" className="h-10 object-contain" /> : <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-xs font-bold">Logo</div>}
              <div className="flex gap-2">
                <div className="w-8 h-8 rounded" style={{ backgroundColor: form.primaryColor }} />
                <div className="w-8 h-8 rounded" style={{ backgroundColor: form.accentColor }} />
              </div>
              <Button size="sm" style={{ backgroundColor: form.primaryColor, color: "#fff" }}>Primary</Button>
            </div>
          </div>

          <NavButtons onSave={() => { saveDraft(tenantId, { branding: form }); toast.success("Branding saved"); }} />
        </CardContent>
      </Card>
    );
  }

  /* ── Step: Modules ─────────────────────────────────────── */
  function ModulesStep() {
    const [mods, setMods] = useState<Record<string, boolean>>(draft?.modules ?? {});
    useEffect(() => setMods(draft?.modules ?? {}), [draft?.modules]);

    const keys = Object.keys(mods).sort();

    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2"><LayoutGrid className="w-5 h-5" /> Modules</CardTitle>
          <CardDescription>Enable or disable modules for this tenant's plan</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {keys.map((k) => (
              <label key={k} className="flex items-center gap-2 rounded-lg border p-3 cursor-pointer hover:bg-muted/50 transition-colors">
                <Switch checked={mods[k] ?? false} onCheckedChange={(v) => setMods((m) => ({ ...m, [k]: v }))} />
                <span className="text-sm capitalize">{k.replace(/_/g, " ")}</span>
              </label>
            ))}
          </div>
          <NavButtons onSave={() => { saveDraft(tenantId, { modules: mods }); toast.success("Modules saved"); }} />
        </CardContent>
      </Card>
    );
  }

  /* ── Step: Integrations ────────────────────────────────── */
  function IntegrationsStep() {
    const [v, setV] = useState<any>(draft?.integrations ?? {});
    useEffect(() => setV(draft?.integrations ?? {}), [draft?.integrations]);

    function toggle(key: string, enabled: boolean) {
      setV((p: any) => ({ ...p, [key]: { ...p[key], enabled } }));
    }
    function setField(key: string, field: string, value: string) {
      setV((p: any) => ({ ...p, [key]: { ...p[key], [field]: value } }));
    }

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
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2"><Plug className="w-5 h-5" /> Integrations</CardTitle>
          <CardDescription>Configure Companies House, HMRC, payments, and banking</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <IntSection title="Companies House" keyName="companiesHouse" fields={[
            { name: "apiKey", label: "API Key" },
            { name: "presenterId", label: "Presenter ID" },
            { name: "email", label: "Presenter Email" },
          ]} />
          <IntSection title="HMRC (VAT / RTI / SA / CT)" keyName="hmrc" fields={[
            { name: "clientId", label: "Client ID" },
            { name: "clientSecret", label: "Client Secret" },
            { name: "environment", label: "Environment", type: "select" },
          ]} />
          <IntSection title="GoCardless" keyName="gocardless" fields={[
            { name: "accessToken", label: "Access Token" },
            { name: "environment", label: "Environment", type: "select" },
          ]} />
          <IntSection title="Stripe" keyName="stripe" fields={[
            { name: "publishableKey", label: "Publishable Key" },
            { name: "secretKey", label: "Secret Key" },
          ]} />
          <IntSection title="Access PaySuite" keyName="accessPaysuite" fields={[
            { name: "merchantId", label: "Merchant ID" },
            { name: "apiKey", label: "API Key" },
          ]} />
          <NavButtons onSave={() => { saveDraft(tenantId, { integrations: v }); toast.success("Integrations saved"); }} />
        </CardContent>
      </Card>
    );
  }

  /* ── Step: Templates ───────────────────────────────────── */
  function TemplatesStep() {
    const [t, setT] = useState(draft?.templates ?? {});
    useEffect(() => setT(draft?.templates ?? {}), [draft?.templates]);

    const catalog = templateCatalog;

    const TemplatePicker = ({ label, items, value, field }: { label: string; items: any[]; value: string; field: string }) => (
      <div className="space-y-2">
        <Label>{label}</Label>
        <Select value={value} onValueChange={(v) => setT((p: any) => ({ ...p, [field]: v }))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {items.map((i: any) => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    );

    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2"><FileStack className="w-5 h-5" /> Templates</CardTitle>
          <CardDescription>Choose default packs to bootstrap the tenant</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TemplatePicker label="Chart of Accounts" items={catalog.coaPacks} value={t.coaPack ?? ""} field="coaPack" />
            <TemplatePicker label="Task Templates" items={catalog.taskPacks} value={t.taskPack ?? ""} field="taskPack" />
            <TemplatePicker label="Letters Pack" items={catalog.lettersPacks} value={t.lettersPack ?? ""} field="lettersPack" />
            <TemplatePicker label="Invoice Templates" items={catalog.invoicePacks} value={t.invoicePack ?? ""} field="invoicePack" />
          </div>
          <NavButtons onSave={() => { saveDraft(tenantId, { templates: t }); toast.success("Templates saved"); }} />
        </CardContent>
      </Card>
    );
  }

  /* ── Step: Users ────────────────────────────────────────── */
  function UsersStep() {
    const [users, setUsers] = useState<any[]>(draft?.users ?? []);
    useEffect(() => setUsers(draft?.users ?? []), [draft?.users]);

    function update(i: number, patch: any) { setUsers((u) => u.map((x, idx) => (idx === i ? { ...x, ...patch } : x))); }
    function add() { setUsers((u) => [...u, { email: "", name: "", role: "viewer" }]); }
    function remove(i: number) { setUsers((u) => u.filter((_, idx) => idx !== i)); }

    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2"><Users className="w-5 h-5" /> Users & Roles</CardTitle>
              <CardDescription>Create initial staff accounts for the tenant</CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={add}><Plus className="w-4 h-4 mr-1" /> Add User</Button>
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
                  <SelectContent>
                    {["owner", "admin", "manager", "bookkeeper", "payroll", "viewer"].map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button size="icon" variant="ghost" className="shrink-0" onClick={() => remove(i)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
            </div>
          ))}
          {users.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">No users yet. Click "Add User" above.</p>}
          <NavButtons onSave={() => { saveDraft(tenantId, { users }); toast.success("Users saved"); }} />
        </CardContent>
      </Card>
    );
  }

  /* ── Step: Review ──────────────────────────────────────── */
  function ReviewStep() {
    const handleFinish = () => {
      finishOnboarding(tenantId);
      localStorage.removeItem("onboarding_tenant_id");
      toast.success("Tenant onboarding completed ✅");
    };

    const Section = ({ title, data }: { title: string; data: any }) => (
      <div className="space-y-1">
        <h4 className="text-sm font-semibold">{title}</h4>
        <pre className="bg-muted rounded-lg p-3 text-xs overflow-x-auto whitespace-pre-wrap">{JSON.stringify(data, null, 2)}</pre>
      </div>
    );

    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2"><CheckCircle2 className="w-5 h-5" /> Review & Finish</CardTitle>
          <CardDescription>Verify the configuration then finish onboarding</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Section title="Basics" data={draft?.basics} />
          <Section title="Branding" data={draft?.branding} />
          <Section title="Modules" data={draft?.modules} />
          <Section title="Integrations" data={draft?.integrations} />
          <Section title="Templates" data={draft?.templates} />
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

  /* ── Shared Nav Buttons ────────────────────────────────── */
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

  /* ── Page Layout ───────────────────────────────────────── */
  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tenant Onboarding</h1>
          <p className="text-sm text-muted-foreground">Create a new accounting firm tenant and configure modules, integrations and templates.</p>
          {tenantId && <Badge variant="secondary" className="mt-1">Tenant ID: {tenantId}</Badge>}
        </div>
        {tenantId && (
          <Button variant="outline" size="sm" onClick={() => { localStorage.removeItem("onboarding_tenant_id"); setTenantId(""); setStep("basics"); }}>
            Start New
          </Button>
        )}
      </div>

      {/* Step indicators */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {STEPS.map((s, i) => {
          const isActive = step === s.key;
          const isPast = currentIdx > i;
          return (
            <button
              key={s.key}
              onClick={() => tenantId ? goto(s.key) : undefined}
              disabled={!tenantId && s.key !== "basics"}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                isActive ? "bg-primary text-primary-foreground" : isPast ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
              } disabled:opacity-40`}
            >
              <s.icon className="w-3.5 h-3.5" />
              {s.label}
            </button>
          );
        })}
      </div>

      {/* Step content */}
      {step === "basics" && <BasicsStep />}
      {step === "branding" && tenantId && <BrandingStep />}
      {step === "modules" && tenantId && <ModulesStep />}
      {step === "integrations" && tenantId && <IntegrationsStep />}
      {step === "templates" && tenantId && <TemplatesStep />}
      {step === "users" && tenantId && <UsersStep />}
      {step === "review" && tenantId && <ReviewStep />}
    </div>
  );
}
