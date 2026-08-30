import { useQuery } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import { Building2, ChevronRight, CircleAlert, FileText, ListTodo, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useClientContext } from "@/contexts/ClientContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const entityLabels: Record<string, string> = {
  ltd: "Ltd company",
  sole_trader: "Sole trader",
  partnership: "Partnership",
  llp: "LLP",
  charity: "Charity",
  trust: "Trust",
};

const entityRoutes: Record<string, Array<{ label: string; href: string }>> = {
  ltd: [
    { label: "Accounts", href: "/accounts" },
    { label: "Corporation tax", href: "/corporation-tax" },
    { label: "Secretarial", href: "/secretarial" },
  ],
  sole_trader: [
    { label: "Bookkeeping", href: "/bookkeeping" },
    { label: "Self Assessment", href: "/self-assessment" },
    { label: "MTD ITSA", href: "/itsa" },
  ],
  partnership: [
    { label: "Partnership return", href: "/partnerships" },
    { label: "Accounts", href: "/accounts" },
  ],
  llp: [
    { label: "LLP workspace", href: "/partnerships" },
    { label: "Accounts", href: "/accounts" },
    { label: "Secretarial", href: "/secretarial" },
  ],
  charity: [
    { label: "Charity workspace", href: "/charities" },
    { label: "Accounts", href: "/accounts" },
    { label: "Gift Aid", href: "/charities" },
  ],
  trust: [
    { label: "Accounts", href: "/accounts" },
    { label: "Self Assessment", href: "/self-assessment" },
  ],
};

export function ClientWorkspaceBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedClientId, selectedClientName, clearClient } = useClientContext();

  const { data } = useQuery({
    queryKey: ["client-workspace-bar", selectedClientId],
    queryFn: async () => {
      const [client, tasks, submissions] = await Promise.all([
        supabase.from("clients").select("id,legal_name,entity_type,status,company_number").eq("id", selectedClientId!).single(),
        supabase.from("tasks").select("id,status,due_date").eq("client_id", selectedClientId!).in("status", ["todo", "in_progress"]),
        supabase.from("submission_jobs").select("id,status").eq("client_id", selectedClientId!).eq("status", "queued"),
      ]);
      if (client.error) throw client.error;
      if (tasks.error) throw tasks.error;
      if (submissions.error) throw submissions.error;
      const today = new Date().toISOString().slice(0, 10);
      return {
        client: client.data,
        openTasks: tasks.data.length,
        overdueTasks: tasks.data.filter((task) => task.due_date && task.due_date < today).length,
        activeSubmissions: submissions.data.length,
      };
    },
    enabled: !!selectedClientId,
    staleTime: 30_000,
  });

  if (!selectedClientId) return null;

  const client = data?.client;
  const links = [
    { label: "Client record", href: `/clients/${selectedClientId}` },
    { label: "Tasks", href: "/tasks" },
    { label: "Documents", href: "/documents" },
    { label: "AI review", href: `/review-centre?client=${selectedClientId}` },
    ...(entityRoutes[client?.entity_type ?? ""] ?? []),
  ];

  return (
    <section className="border-b border-border/80 bg-card/95 px-3 py-2 shadow-[0_8px_24px_rgba(23,34,31,0.035)] backdrop-blur sm:px-4 md:px-7" aria-label="Selected client workspace">
      <div className="mx-auto flex w-full max-w-[1540px] items-center gap-3">
        <button type="button" onClick={() => navigate(`/clients/${selectedClientId}`)} className="flex min-w-0 shrink-0 items-center gap-2 rounded-xl text-left">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Building2 className="h-4 w-4" /></span>
          <span className="hidden min-w-0 sm:block">
            <span className="block max-w-44 truncate text-xs font-semibold">{client?.legal_name ?? selectedClientName}</span>
            <span className="block text-[10px] text-muted-foreground">{entityLabels[client?.entity_type ?? ""] ?? "Client workspace"}{client?.company_number ? ` · ${client.company_number}` : ""}</span>
          </span>
        </button>

        <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto py-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {links.map((link) => (
            <Button key={`${link.href}-${link.label}`} variant="ghost" size="sm" onClick={() => navigate(link.href)} className={cn("h-8 shrink-0 rounded-lg px-2.5 text-xs", location.pathname === link.href && "bg-accent text-accent-foreground")}>
              {link.label}<ChevronRight className="ml-1 h-3 w-3 opacity-40" />
            </Button>
          ))}
        </div>

        <div className="hidden shrink-0 items-center gap-1.5 xl:flex">
          <Badge variant="outline" className="gap-1 font-normal"><ListTodo className="h-3 w-3" /> {data?.openTasks ?? 0} open</Badge>
          {!!data?.overdueTasks && <Badge variant="destructive" className="gap-1"><CircleAlert className="h-3 w-3" /> {data.overdueTasks} overdue</Badge>}
          {!!data?.activeSubmissions && <Badge variant="secondary" className="gap-1"><FileText className="h-3 w-3" /> {data.activeSubmissions} submitting</Badge>}
        </div>

        <Button variant="ghost" size="icon" onClick={clearClient} className="h-8 w-8 shrink-0 rounded-lg" aria-label="Clear selected client"><X className="h-3.5 w-3.5" /></Button>
      </div>
    </section>
  );
}
