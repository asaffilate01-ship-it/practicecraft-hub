import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, ArrowRight, Building2, CheckCircle2, KeyRound, Search, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

type Health = {
  active_directors: number | null;
  active_members: number | null;
  active_pscs: number | null;
  client_id: string | null;
  has_auth_code: boolean | null;
};

type Company = {
  client_id: string;
  company_name: string;
  company_number: string;
  company_status: string;
  last_synced_at: string | null;
  next_accounts_due: string | null;
  next_confirmation_statement_due: string | null;
  sync_error: string | null;
};

function daysUntil(value: string | null) {
  if (!value) return null;
  return Math.ceil((new Date(value).getTime() - Date.now()) / 86_400_000);
}

function formatDate(value: string | null) {
  if (!value) return "Not recorded";
  return new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function companyIssues(company: Company, health?: Health) {
  const issues: string[] = [];
  if (!health?.has_auth_code) issues.push("Authentication code missing");
  if (!health?.active_directors) issues.push("No active director");
  if (!health?.active_pscs) issues.push("PSC register incomplete");
  if (!health?.active_members) issues.push("Members register incomplete");
  if (company.sync_error) issues.push("Companies House sync failed");
  if ((daysUntil(company.next_confirmation_statement_due) ?? 999) < 0) issues.push("Confirmation statement overdue");
  if ((daysUntil(company.next_accounts_due) ?? 999) < 0) issues.push("Accounts overdue");
  return issues;
}

export function CompanyPortfolio() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");

  const { data, isLoading } = useQuery({
    queryKey: ["secretarial-company-portfolio"],
    queryFn: async () => {
      const [companies, health] = await Promise.all([
        supabase
          .from("company_profiles")
          .select("client_id,company_name,company_number,company_status,last_synced_at,next_accounts_due,next_confirmation_statement_due,sync_error")
          .order("company_name"),
        supabase.from("v_company_register_health").select("client_id,active_directors,active_pscs,active_members,has_auth_code"),
      ]);
      if (companies.error) throw companies.error;
      if (health.error) throw health.error;
      return { companies: companies.data as Company[], health: health.data as Health[] };
    },
    staleTime: 60_000,
  });

  const healthByClient = useMemo(
    () => new Map((data?.health ?? []).map((item) => [item.client_id, item])),
    [data?.health],
  );

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (data?.companies ?? []).filter((company) => {
      const issues = companyIssues(company, healthByClient.get(company.client_id));
      const matchesSearch = !term || company.company_name.toLowerCase().includes(term) || company.company_number.toLowerCase().includes(term);
      const matchesStatus = status === "all" || (status === "attention" ? issues.length > 0 : issues.length === 0);
      return matchesSearch && matchesStatus;
    });
  }, [data?.companies, healthByClient, search, status]);

  const totals = useMemo(() => {
    const companies = data?.companies ?? [];
    const attention = companies.filter((company) => companyIssues(company, healthByClient.get(company.client_id)).length > 0).length;
    const due30 = companies.filter((company) => {
      const days = daysUntil(company.next_confirmation_statement_due);
      return days !== null && days >= 0 && days <= 30;
    }).length;
    return { total: companies.length, attention, due30, healthy: companies.length - attention };
  }, [data?.companies, healthByClient]);

  const openCompany = (clientId: string) => navigate(`/secretarial/companies/${clientId}`);

  return (
    <div className="space-y-4">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Companies", value: totals.total, helper: "Active portfolio records", icon: Building2 },
          { label: "Healthy registers", value: totals.healthy, helper: "No control gaps detected", icon: CheckCircle2 },
          { label: "Needs attention", value: totals.attention, helper: "Missing records or overdue work", icon: AlertTriangle },
          { label: "CS due in 30 days", value: totals.due30, helper: "Confirmation statement deadline", icon: Users },
        ].map(({ label, value, helper, icon: Icon }) => (
          <Card key={label} className="workspace-panel">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div><p className="workspace-eyebrow">{label}</p><p className="mt-2 text-2xl font-semibold">{value}</p></div>
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted"><Icon className="h-4 w-4" /></span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{helper}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1 sm:max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search company name or number" className="pl-9" />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-full sm:w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All companies</SelectItem>
            <SelectItem value="attention">Needs attention</SelectItem>
            <SelectItem value="healthy">Healthy registers</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-20 rounded-2xl" />)}</div>
      ) : rows.length === 0 ? (
        <Card className="workspace-panel"><CardContent className="flex min-h-56 flex-col items-center justify-center p-6 text-center"><Building2 className="h-9 w-9 text-muted-foreground/40" /><p className="mt-3 font-semibold">No company records found</p><p className="mt-1 max-w-md text-sm text-muted-foreground">Sync a limited company from Companies House or change the portfolio filters.</p></CardContent></Card>
      ) : (
        <Card className="workspace-panel overflow-hidden">
          <CardContent className="p-0">
            <div className="divide-y divide-border/70 md:hidden">
              {rows.map((company) => {
                const health = healthByClient.get(company.client_id);
                const issues = companyIssues(company, health);
                return (
                  <button key={company.client_id} type="button" onClick={() => openCompany(company.client_id)} className="w-full p-4 text-left active:bg-muted/70">
                    <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate font-semibold">{company.company_name}</p><p className="mt-1 font-mono text-xs text-muted-foreground">{company.company_number}</p></div><Badge variant={issues.length ? "destructive" : "outline"}>{issues.length ? `${issues.length} issues` : "Healthy"}</Badge></div>
                    <div className="mt-3 grid grid-cols-2 gap-3 text-xs"><div><span className="text-muted-foreground">Next CS</span><p className="mt-0.5 font-medium">{formatDate(company.next_confirmation_statement_due)}</p></div><div><span className="text-muted-foreground">Officers / PSC</span><p className="mt-0.5 font-medium">{health?.active_directors ?? 0} / {health?.active_pscs ?? 0}</p></div></div>
                  </button>
                );
              })}
            </div>
            <div className="hidden md:block">
              <Table>
                <TableHeader><TableRow><TableHead>Company</TableHead><TableHead>Register health</TableHead><TableHead>Directors</TableHead><TableHead>PSC</TableHead><TableHead>Next confirmation statement</TableHead><TableHead>Next accounts</TableHead><TableHead className="w-12" /></TableRow></TableHeader>
                <TableBody>
                  {rows.map((company) => {
                    const health = healthByClient.get(company.client_id);
                    const issues = companyIssues(company, health);
                    return (
                      <TableRow key={company.client_id} className="cursor-pointer" onClick={() => openCompany(company.client_id)}>
                        <TableCell><p className="font-semibold">{company.company_name}</p><div className="mt-1 flex items-center gap-2"><span className="font-mono text-xs text-muted-foreground">{company.company_number}</span><Badge variant="outline" className="text-[10px] capitalize">{company.company_status}</Badge></div></TableCell>
                        <TableCell><Badge variant={issues.length ? "destructive" : "outline"} className={cn(!issues.length && "border-emerald-200 bg-emerald-50 text-emerald-700")}>{issues.length ? `${issues.length} issues` : "Healthy"}</Badge>{!health?.has_auth_code && <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground"><KeyRound className="h-3 w-3" /> Auth code missing</p>}</TableCell>
                        <TableCell>{health?.active_directors ?? 0}</TableCell>
                        <TableCell>{health?.active_pscs ?? 0}</TableCell>
                        <TableCell><p className="text-sm">{formatDate(company.next_confirmation_statement_due)}</p>{company.next_confirmation_statement_due && <p className={cn("mt-1 text-[11px]", (daysUntil(company.next_confirmation_statement_due) ?? 0) < 0 ? "text-destructive" : "text-muted-foreground")}>{(daysUntil(company.next_confirmation_statement_due) ?? 0) < 0 ? `${Math.abs(daysUntil(company.next_confirmation_statement_due) ?? 0)} days overdue` : `${daysUntil(company.next_confirmation_statement_due)} days`}</p>}</TableCell>
                        <TableCell className="text-sm">{formatDate(company.next_accounts_due)}</TableCell>
                        <TableCell><Button variant="ghost" size="icon" aria-label={`Open ${company.company_name}`}><ArrowRight className="h-4 w-4" /></Button></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
