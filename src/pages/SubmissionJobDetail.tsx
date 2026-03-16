import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/hooks/usePermissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Send, CheckCircle2, XCircle, Clock, FileText } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function SubmissionJobDetail() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { tenantId } = usePermissions();

  const { data: job, isLoading } = useQuery({
    queryKey: ["submission-job", jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("submission_jobs")
        .select("*, clients(legal_name)")
        .eq("id", jobId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!jobId,
  });

  const { data: attempts } = useQuery({
    queryKey: ["submission-attempts", jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("submission_attempts")
        .select("*")
        .eq("job_id", jobId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!jobId,
  });

  const statusIcon: Record<string, any> = {
    accepted: <CheckCircle2 className="h-4 w-4 text-green-600" />,
    rejected: <XCircle className="h-4 w-4 text-destructive" />,
    pending: <Clock className="h-4 w-4 text-yellow-600" />,
    submitted: <Send className="h-4 w-4 text-blue-600" />,
  };

  if (isLoading) return <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-24 w-full" />)}</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/submissions")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Submission Job</h1>
          <p className="text-muted-foreground">{(job as any)?.clients?.legal_name || "Unknown client"} · {(job as any)?.submission_type}</p>
        </div>
        <Badge variant={(job as any)?.status === "accepted" ? "default" : (job as any)?.status === "rejected" ? "destructive" : "secondary"}>
          {(job as any)?.status}
        </Badge>
      </div>

      {/* Job details */}
      <Card>
        <CardHeader><CardTitle>Job Details</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div><span className="text-muted-foreground">Provider</span><p className="font-medium">{(job as any)?.provider}</p></div>
            <div><span className="text-muted-foreground">Type</span><p className="font-medium">{(job as any)?.submission_type}</p></div>
            <div><span className="text-muted-foreground">Created</span><p className="font-medium">{new Date((job as any)?.created_at).toLocaleDateString("en-GB")}</p></div>
            <div><span className="text-muted-foreground">Attempts</span><p className="font-medium">{attempts?.length || 0}</p></div>
          </div>
        </CardContent>
      </Card>

      {/* Attempt timeline */}
      <Card>
        <CardHeader><CardTitle>Attempt History</CardTitle></CardHeader>
        <CardContent>
          {!attempts?.length ? (
            <p className="text-sm text-muted-foreground py-4">No attempts recorded yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>HTTP</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attempts.map((a: any, i: number) => (
                  <TableRow key={a.id}>
                    <TableCell>{attempts.length - i}</TableCell>
                    <TableCell className="flex items-center gap-1">
                      {statusIcon[a.status] || <FileText className="h-4 w-4" />}
                      {a.status}
                    </TableCell>
                    <TableCell>{a.http_status || "—"}</TableCell>
                    <TableCell>{a.duration_ms ? `${a.duration_ms}ms` : "—"}</TableCell>
                    <TableCell>{new Date(a.created_at).toLocaleString("en-GB")}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-xs">{a.error_message || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
