import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Building2, CheckSquare, Loader2, Search, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type SearchResult = {
  id: string;
  kind: "client" | "company" | "task";
  title: string;
  subtitle: string;
  href: string;
};

function usePracticeSearch(term: string) {
  const [debounced, setDebounced] = useState("");
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(term.trim()), 180);
    return () => window.clearTimeout(timer);
  }, [term]);

  return useQuery({
    queryKey: ["global-practice-search", debounced],
    queryFn: async () => {
      const safe = debounced.replace(/[^a-zA-Z0-9\s-]/g, " ").replace(/\s+/g, " ").trim();
      if (safe.length < 2) return [] as SearchResult[];
      const pattern = `%${safe}%`;
      const [clients, companies, tasks] = await Promise.all([
        supabase.from("clients").select("id,legal_name,trading_name,entity_type,company_number,status").ilike("legal_name", pattern).limit(6),
        supabase.from("company_profiles").select("client_id,company_name,company_number,company_status").or(`company_name.ilike.${pattern},company_number.ilike.${pattern}`).limit(6),
        supabase.from("tasks").select("id,title,status,due_date,client_id").ilike("title", pattern).limit(6),
      ]);
      const error = clients.error || companies.error || tasks.error;
      if (error) throw error;
      const results: SearchResult[] = [
        ...(clients.data ?? []).map((client) => ({ id: `client-${client.id}`, kind: "client" as const, title: client.legal_name, subtitle: `${client.entity_type.replace(/_/g, " ")} · ${client.company_number || client.status}`, href: `/clients/${client.id}` })),
        ...(companies.data ?? []).map((company) => ({ id: `company-${company.client_id}`, kind: "company" as const, title: company.company_name, subtitle: `Company ${company.company_number} · ${company.company_status}`, href: `/secretarial/companies/${company.client_id}` })),
        ...(tasks.data ?? []).map((task) => ({ id: `task-${task.id}`, kind: "task" as const, title: task.title, subtitle: `${task.status.replace(/_/g, " ")}${task.due_date ? ` · due ${new Date(task.due_date).toLocaleDateString("en-GB")}` : ""}`, href: "/tasks" })),
      ];
      return results.filter((result, index) => results.findIndex((candidate) => candidate.href === result.href && candidate.title === result.title) === index).slice(0, 12);
    },
    enabled: debounced.length >= 2,
    staleTime: 30_000,
  });
}

function ResultList({ term, onSelect }: { term: string; onSelect: (result: SearchResult) => void }) {
  const { data = [], isFetching } = usePracticeSearch(term);
  const groups = useMemo(() => [
    { kind: "client" as const, label: "Clients", icon: Users },
    { kind: "company" as const, label: "Company records", icon: Building2 },
    { kind: "task" as const, label: "Tasks", icon: CheckSquare },
  ].map((group) => ({ ...group, results: data.filter((result) => result.kind === group.kind) })).filter((group) => group.results.length), [data]);

  if (term.trim().length < 2) return <p className="p-5 text-center text-sm text-muted-foreground">Enter at least two characters.</p>;
  if (isFetching) return <div className="flex items-center justify-center gap-2 p-6 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Searching the practice…</div>;
  if (!groups.length) return <p className="p-6 text-center text-sm text-muted-foreground">No matching clients, company records or tasks.</p>;

  return (
    <div className="max-h-[min(65vh,520px)] overflow-y-auto p-2">
      {groups.map(({ kind, label, icon: Icon, results }) => (
        <section key={kind} className="mb-2 last:mb-0">
          <div className="flex items-center gap-2 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground"><Icon className="h-3.5 w-3.5" /> {label}</div>
          {results.map((result) => (
            <button key={result.id} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => onSelect(result)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-muted active:bg-muted">
              <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{result.title}</span><span className="mt-0.5 block truncate text-xs capitalize text-muted-foreground">{result.subtitle}</span></span>
            </button>
          ))}
        </section>
      ))}
    </div>
  );
}

export function GlobalPracticeSearch() {
  const navigate = useNavigate();
  const [term, setTerm] = useState("");
  const [focused, setFocused] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const select = (result: SearchResult) => {
    navigate(result.href);
    setFocused(false);
    setMobileOpen(false);
    setTerm("");
  };

  return (
    <>
      <div className="relative hidden w-48 sm:block md:w-80">
        <Search className="absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input aria-label="Search the practice" value={term} onChange={(event) => setTerm(event.target.value)} onFocus={() => setFocused(true)} onBlur={() => window.setTimeout(() => setFocused(false), 120)} onKeyDown={(event) => { if (event.key === "Escape") setFocused(false); }} placeholder="Search clients, companies, tasks…" className="h-9 border-0 bg-muted/50 pl-9 focus-visible:ring-1" />
        {focused && term.trim().length >= 2 && <div className="absolute left-0 top-11 z-50 w-[min(92vw,430px)] overflow-hidden rounded-2xl border bg-popover shadow-2xl"><ResultList term={term} onSelect={select} /></div>}
      </div>

      <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
        <DialogTrigger asChild><Button variant="ghost" size="icon" className="rounded-xl sm:hidden" aria-label="Search the practice"><Search className="h-4 w-4" /></Button></DialogTrigger>
        <DialogContent className="top-[8%] translate-y-0 p-0 sm:max-w-lg">
          <DialogHeader className="border-b p-4 pb-3"><DialogTitle>Search the practice</DialogTitle><div className="relative mt-2"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input autoFocus value={term} onChange={(event) => setTerm(event.target.value)} placeholder="Client, company number or task" className="pl-9" /></div></DialogHeader>
          <ResultList term={term} onSelect={select} />
        </DialogContent>
      </Dialog>
    </>
  );
}
