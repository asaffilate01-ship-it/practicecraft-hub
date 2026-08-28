import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, RefreshCw, Plus, CalendarClock } from "lucide-react";
import { toast } from "sonner";

type TaskSuggestion = {
  title: string;
  description?: string;
  priority: "low" | "medium" | "high" | "urgent";
  client_id?: string | null;
  client_name?: string | null;
  service?: string | null;
  suggested_due_date?: string | null;
  reason: string;
};

type TaskSuggestionsResponse = {
  suggestions: TaskSuggestion[];
  human_review_required?: boolean;
};

export function TaskSuggestionsPanel() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data, isLoading, refetch } = useQuery<TaskSuggestionsResponse>({
    queryKey: ["ai-task-suggestions"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("ai-intelligence", {
        body: { action: "suggest_tasks" },
      });
      if (error) throw error;
      return data as TaskSuggestionsResponse;
    },
    staleTime: 10 * 60_000,
  });

  const createTask = useMutation({
    mutationFn: async (suggestion: TaskSuggestion) => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("id", user!.id)
        .single();
      if (!profile) throw new Error("No profile");

      const { error } = await supabase.from("tasks").insert({
        tenant_id: profile.tenant_id,
        title: suggestion.title,
        description: suggestion.description || suggestion.reason,
        priority: suggestion.priority || "medium",
        status: "todo",
        client_id: suggestion.client_id || null,
        due_date: suggestion.suggested_due_date || null,
        assigned_to_user_id: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Task created from suggestion");
      qc.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const suggestions = data?.suggestions || [];

  const priorityVariant = (p: string): "default" | "secondary" | "destructive" | "outline" => {
    if (p === "urgent") return "destructive";
    if (p === "high") return "default";
    if (p === "medium") return "secondary";
    return "outline";
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            AI Task Suggestions
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isLoading} className="gap-1 text-xs">
            {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <p className="mb-3 text-xs text-muted-foreground">Suggestions require staff review and are not created until you approve them.</p>
        {isLoading ? (
          <div className="flex flex-col items-center py-8 gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Generating suggestions…</p>
          </div>
        ) : suggestions.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No suggestions right now — you're on top of things!</p>
        ) : (
          <div className="space-y-2">
            {suggestions.map((s, i) => (
              <div key={i} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{s.title}</p>
                    {s.client_name && <p className="text-xs text-muted-foreground">{s.client_name}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={priorityVariant(s.priority)} className="text-xs capitalize">{s.priority}</Badge>
                    {s.service && <Badge variant="outline" className="text-xs">{s.service}</Badge>}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{s.reason}</p>
                <div className="flex items-center justify-between">
                  {s.suggested_due_date && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <CalendarClock className="w-3 h-3" /> Due: {new Date(s.suggested_due_date).toLocaleDateString("en-GB")}
                    </span>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1 ml-auto"
                    onClick={() => createTask.mutate(s)}
                    disabled={createTask.isPending}
                  >
                    <Plus className="w-3 h-3" /> Create Task
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
