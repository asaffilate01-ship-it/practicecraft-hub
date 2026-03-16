import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CalendarClock } from "lucide-react";

export default function PortalDeadlinesPage() {
  const { user } = useAuth();

  const { data: portalUser } = useQuery({
    queryKey: ["portal-user", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("portal_users")
        .select("client_id, tenant_id")
        .eq("user_id", user!.id)
        .eq("status", "active")
        .limit(1)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: deadlines = [], isLoading } = useQuery({
    queryKey: ["portal-deadlines", portalUser?.client_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("id, title, due_date, status, service")
        .eq("client_id", portalUser!.client_id!)
        .not("due_date", "is", null)
        .in("status", ["todo", "in_progress", "awaiting_client", "awaiting_hmrc"])
        .order("due_date", { ascending: true })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!portalUser?.client_id,
  });

  const statusVariant = (s: string): "default" | "secondary" | "destructive" | "outline" => {
    if (s === "awaiting_client") return "outline";
    if (s === "in_progress") return "secondary";
    return "default";
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Deadlines</h1>
        <p className="text-sm text-muted-foreground">Upcoming filing and task deadlines.</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="grid grid-cols-12 bg-muted/50 text-xs font-medium text-muted-foreground px-4 py-2">
            <div className="col-span-5">Task</div>
            <div className="col-span-2">Module</div>
            <div className="col-span-3">Due Date</div>
            <div className="col-span-2">Status</div>
          </div>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : deadlines.length === 0 ? (
            <div className="flex flex-col items-center py-12 gap-2">
              <CalendarClock className="w-8 h-8 text-muted-foreground opacity-40" />
              <p className="text-sm text-muted-foreground">No upcoming deadlines.</p>
            </div>
          ) : (
            deadlines.map((d: any) => (
              <div key={d.id} className="grid grid-cols-12 px-4 py-3 border-t text-sm items-center">
                <div className="col-span-5 font-medium">{d.title}</div>
                <div className="col-span-2 text-muted-foreground text-xs">{d.service || "—"}</div>
                <div className="col-span-3 text-muted-foreground">{new Date(d.due_date).toLocaleDateString()}</div>
                <div className="col-span-2">
                  <Badge variant={statusVariant(d.status)}>{d.status.replace(/_/g, " ")}</Badge>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
