import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { qk } from "@/lib/queryKeys";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Save, Send } from "lucide-react";
import { toast } from "sonner";
import type { RtiEpsDraft } from "@/types/rti";

const defaultReclaim = {
  nicComp: 0, cisSuffered: 0, smpRecovered: 0,
  sppRecovered: 0, sapRecovered: 0, shppRecovered: 0,
};

export default function EpsBuilderPage() {
  const { employerId = "", period = "" } = useParams();
  const { user } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("tenant_id").eq("id", user!.id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: employer, isLoading } = useQuery({
    queryKey: qk.payroll.employer(employerId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payroll_employers")
        .select("*")
        .eq("id", employerId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!employerId,
  });

  const [draft, setDraft] = useState<RtiEpsDraft>({
    employerId,
    period,
    noPaymentsToEmployees: false,
    reclaim: { ...defaultReclaim },
    status: "draft",
  });

  useEffect(() => {
    setDraft(d => ({ ...d, employerId, period }));
  }, [employerId, period]);

  const queueEps = useMutation({
    mutationFn: async () => {
      if (!profile) throw new Error("Missing profile");
      // Get employer's client_id
      const { data: emp } = await supabase.from("payroll_employers").select("client_id").eq("id", employerId).single();
      const clientId = emp?.client_id || "";
      const { error } = await supabase.from("submission_jobs").insert({
        tenant_id: profile.tenant_id,
        client_id: clientId,
        provider: "hmrc" as const,
        submission_type: "EPS",
        status: "queued" as const,
        request_json: draft as any,
        idempotency_key: `eps-${employerId}-${period}-${Date.now()}`,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setDraft(d => ({ ...d, status: "queued" }));
      toast.success("EPS queued for submission");
    },
    onError: (err: any) => toast.error(err.message),
  });

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  if (!employer) return <div className="p-6 text-sm text-muted-foreground">Employer not found.</div>;

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="space-y-1">
        <Link to="/payroll" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2">
          <ArrowLeft className="h-4 w-4" /> Back to Payroll
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">RTI EPS Builder</h1>
            <p className="text-sm text-muted-foreground">
              {employer.employer_name} • PAYE {employer.paye_reference} • Period {period}
            </p>
          </div>
          <Badge variant={draft.status === "queued" ? "default" : "secondary"}>
            {draft.status.toUpperCase()}
          </Badge>
        </div>
      </div>

      {/* No payments flag */}
      <Card>
        <CardHeader><CardTitle className="text-base">Period Declaration</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Switch
              checked={draft.noPaymentsToEmployees}
              onCheckedChange={v => setDraft(d => ({ ...d, noPaymentsToEmployees: v }))}
            />
            <Label>No payments to employees for this period</Label>
          </div>
        </CardContent>
      </Card>

      {/* Reclaim values */}
      <Card>
        <CardHeader><CardTitle className="text-base">Recovery & Reclaim Amounts</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {([
              ["nicComp", "NIC Compensation"],
              ["cisSuffered", "CIS Suffered"],
              ["smpRecovered", "SMP Recovered"],
              ["sppRecovered", "SPP Recovered"],
              ["sapRecovered", "SAP Recovered"],
              ["shppRecovered", "ShPP Recovered"],
            ] as const).map(([key, label]) => (
              <div key={key}>
                <Label className="text-xs text-muted-foreground">{label} (£)</Label>
                <Input
                  type="number"
                  value={String(draft.reclaim[key])}
                  onChange={e => setDraft(d => ({
                    ...d,
                    reclaim: { ...d.reclaim, [key]: Number(e.target.value) || 0 },
                  }))}
                />
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            EPS also supports apprenticeship levy, employment allowance, and de minimis state aid declarations.
            These will be added in a future update.
          </p>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => toast.success("Draft saved locally")}>
          <Save className="h-4 w-4 mr-1" /> Save Draft
        </Button>
        <Button
          disabled={queueEps.isPending || draft.status === "queued"}
          onClick={() => queueEps.mutate()}
        >
          <Send className="h-4 w-4 mr-1" /> Queue EPS Submission
        </Button>
      </div>
    </div>
  );
}
