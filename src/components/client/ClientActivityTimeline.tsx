import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, FileText, History, Send, Upload } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";

type Activity = {
  id: string;
  title: string;
  detail: string;
  createdAt: string;
  kind: "event" | "task" | "document" | "submission";
};

const iconByKind = {
  event: History,
  task: CheckCircle2,
  document: Upload,
  submission: Send,
};

const humanise = (value: string) => value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

export function ClientActivityTimeline({ clientId }: { clientId: string }) {
  const { data = [], isLoading } = useQuery({
    queryKey: ["client-activity-timeline", clientId],
    queryFn: async () => {
      const [events, tasks, documents, submissions] = await Promise.all([
        supabase.from("event_logs").select("id,event_type,source,created_at").eq("client_id", clientId).order("created_at", { ascending: false }).limit(8),
        supabase.from("tasks").select("id,title,status,created_at,completed_at").eq("client_id", clientId).order("created_at", { ascending: false }).limit(6),
        supabase.from("documents").select("id,filename,document_type,status,created_at").eq("client_id", clientId).order("created_at", { ascending: false }).limit(6),
        supabase.from("submission_jobs").select("id,submission_type,status,created_at").eq("client_id", clientId).order("created_at", { ascending: false }).limit(6),
      ]);

      const activity: Activity[] = [
        ...(events.data ?? []).map((item) => ({ id: `event-${item.id}`, title: humanise(item.event_type), detail: item.source ? `Recorded by ${item.source}` : "Audit event", createdAt: item.created_at, kind: "event" as const })),
        ...(tasks.data ?? []).map((item) => ({ id: `task-${item.id}`, title: item.title, detail: `Task · ${humanise(item.status)}`, createdAt: item.completed_at ?? item.created_at, kind: "task" as const })),
        ...(documents.data ?? []).map((item) => ({ id: `document-${item.id}`, title: item.filename, detail: `${humanise(item.document_type)} · ${humanise(item.status)}`, createdAt: item.created_at, kind: "document" as const })),
        ...(submissions.data ?? []).map((item) => ({ id: `submission-${item.id}`, title: humanise(item.submission_type), detail: `Submission · ${humanise(item.status)}`, createdAt: item.created_at, kind: "submission" as const })),
      ];

      return activity.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 12);
    },
    enabled: !!clientId,
    staleTime: 30_000,
  });

  return (
    <Card className="workspace-panel">
      <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><History className="h-4 w-4" /> Client activity</CardTitle></CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-12 rounded-xl" />)}</div>
        ) : !data.length ? (
          <div className="flex min-h-44 flex-col items-center justify-center text-center"><FileText className="h-8 w-8 text-muted-foreground/35" /><p className="mt-3 text-sm font-semibold">No recorded activity yet</p><p className="mt-1 text-xs text-muted-foreground">Tasks, documents, submissions and audit events will appear here.</p></div>
        ) : (
          <ol className="space-y-1">
            {data.map((item, index) => {
              const Icon = iconByKind[item.kind];
              return (
                <li key={item.id} className="relative flex gap-3 rounded-xl p-2.5 hover:bg-muted/50">
                  {index < data.length - 1 && <span className="absolute left-[1.45rem] top-10 h-[calc(100%-1.5rem)] w-px bg-border" />}
                  <span className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border bg-card"><Icon className="h-3.5 w-3.5" /></span>
                  <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{item.title}</span><span className="mt-0.5 block text-xs text-muted-foreground">{item.detail}</span></span>
                  <time className="shrink-0 text-[11px] text-muted-foreground">{new Date(item.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</time>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
