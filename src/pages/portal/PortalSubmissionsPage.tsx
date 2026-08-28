import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send } from "lucide-react";

export default function PortalSubmissionsPage() {
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

  const { data: submissions = [], isLoading } = useQuery({
    queryKey: ["portal-submissions", portalUser?.client_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("submission_jobs")
        .select("id, provider, submission_type, status, created_at, updated_at")
        .eq("client_id", portalUser!.client_id!)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!portalUser?.client_id,
  });

  const statusVariant = (s: string): "default" | "secondary" | "destructive" | "outline" => {
    if (s === "accepted") return "default";
    if (s === "rejected") return "destructive";
    if (s === "queued" || s === "pending") return "outline";
    return "secondary";
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Submissions</h1>
        <p className="text-sm text-muted-foreground">Status of filings submitted on your behalf.</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="grid grid-cols-12 bg-muted/50 text-xs font-medium text-muted-foreground px-4 py-2">
            <div className="col-span-3">Provider</div>
            <div className="col-span-4">Type</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-3">When</div>
          </div>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : submissions.length === 0 ? (
            <div className="flex flex-col items-center py-12 gap-2">
              <Send className="w-8 h-8 text-muted-foreground opacity-40" />
              <p className="text-sm text-muted-foreground">No submissions yet.</p>
            </div>
          ) : (
            submissions.map((r: any) => (
              <div key={r.id} className="grid grid-cols-12 px-4 py-3 border-t text-sm items-center">
                <div className="col-span-3 text-muted-foreground uppercase">{r.provider || "—"}</div>
                <div className="col-span-4 font-medium">{r.submission_type}</div>
                <div className="col-span-2">
                  <Badge variant={statusVariant(r.status)}>{r.status}</Badge>
                </div>
                <div className="col-span-3 text-xs text-muted-foreground">
                  {new Date(r.updated_at || r.created_at).toLocaleString()}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
