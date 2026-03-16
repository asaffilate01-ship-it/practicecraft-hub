import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { qk } from "@/lib/queryKeys";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Plus, Save, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { RtiFpsDraft, RtiFpsLine } from "@/types/rti";

const num = (v: string) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const emptyLine: RtiFpsLine = {
  employeeId: "", employeeName: "", niNumber: "", taxCode: "1257L",
  grossPay: 0, tax: 0, ni: 0, ytdGross: 0, ytdTax: 0,
};

export default function FpsBuilderPage() {
  const { payrunId = "" } = useParams();
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("tenant_id").eq("id", user!.id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Load pay run
  const { data: payRun, isLoading: prLoading } = useQuery({
    queryKey: qk.payroll.run(payrunId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pay_runs")
        .select("*, payroll_employers(employer_name, paye_reference, accounts_office_ref)")
        .eq("id", payrunId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!payrunId,
  });

  // Load payslips for this run to pre-populate lines
  const { data: payslips = [] } = useQuery({
    queryKey: ["payslips", payrunId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payslips")
        .select("*")
        .eq("pay_run_id", payrunId)
        .order("employee_name");
      if (error) throw error;
      return data;
    },
    enabled: !!payrunId,
  });

  const [draft, setDraft] = useState<RtiFpsDraft | null>(null);

  // Build draft from payslips
  useEffect(() => {
    if (!payRun || draft) return;
    const lines: RtiFpsLine[] = payslips.map((s: any) => ({
      employeeId: s.employee_id || "",
      employeeName: s.employee_name || "",
      niNumber: s.ni_number || "",
      taxCode: s.tax_code || "1257L",
      grossPay: (s.gross_pence || 0) / 100,
      tax: (s.tax_pence || 0) / 100,
      ni: (s.ni_employee_pence || 0) / 100,
      ytdGross: 0,
      ytdTax: 0,
    }));
    setDraft({
      employerId: payRun.employer_id,
      payrunId,
      period: String(payRun.tax_period || ""),
      paymentDate: payRun.pay_date || "",
      lines,
      status: "draft",
    });
  }, [payRun, payslips, payrunId, draft]);

  const addLine = () => setDraft(d => d ? { ...d, lines: [...d.lines, { ...emptyLine }] } : d);
  const removeLine = (i: number) => setDraft(d => d ? { ...d, lines: d.lines.filter((_, idx) => idx !== i) } : d);
  const updateLine = (i: number, patch: Partial<RtiFpsLine>) =>
    setDraft(d => d ? { ...d, lines: d.lines.map((l, idx) => idx === i ? { ...l, ...patch } : l) } : d);

  const [submitting, setSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<any>(null);

  // Queue FPS submission job
  const queueFps = useMutation({
    mutationFn: async () => {
      if (!draft || !profile) throw new Error("Missing data");
      const { data: emp } = await supabase.from("payroll_employers").select("client_id").eq("id", draft.employerId).single();
      const clientId = emp?.client_id || "";
      const { error } = await supabase.from("submission_jobs").insert({
        tenant_id: profile.tenant_id,
        client_id: clientId,
        provider: "hmrc" as const,
        submission_type: "FPS",
        status: "queued" as const,
        request_json: draft as any,
        idempotency_key: `fps-${payrunId}-${Date.now()}`,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setDraft(d => d ? { ...d, status: "queued" } : d);
      toast.success("FPS queued for submission");
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Direct HMRC submission via edge function
  const submitToHmrc = async () => {
    if (!draft || !profile) return;
    setSubmitting(true);
    try {
      const { data: emp } = await supabase.from("payroll_employers").select("client_id").eq("id", draft.employerId).single();
      const { data, error } = await supabase.functions.invoke("rti-processor", {
        body: {
          action: "submit_fps",
          tenant_id: profile.tenant_id,
          client_id: emp?.client_id,
          employer_id: draft.employerId,
          payrun_id: payrunId,
          fps_data: draft,
        },
      });
      if (error) throw error;
      setSubmissionResult(data);
      setDraft(d => d ? { ...d, status: data?.accepted ? "submitted" : "error" } : d);
      if (data?.accepted) {
        toast.success("FPS submitted to HMRC successfully");
        // Update pay run status
        await supabase.from("pay_runs").update({ rti_status: "submitted" }).eq("id", payrunId);
        qc.invalidateQueries({ queryKey: qk.payroll.run(payrunId) });
      } else {
        toast.error(data?.message || "HMRC rejected the FPS");
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (prLoading) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  if (!payRun || !draft) return <div className="p-6 text-sm text-muted-foreground">Pay run not found.</div>;

  const employer = (payRun as any).payroll_employers;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <Link to="/payroll" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2">
            <ArrowLeft className="h-4 w-4" /> Back to Payroll
          </Link>
          <h1 className="text-2xl font-semibold">RTI FPS Builder</h1>
          <p className="text-sm text-muted-foreground">
            {employer?.employer_name} • PAYE {employer?.paye_reference} • Period {draft.period} • Payment date {draft.paymentDate}
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant={draft.status === "queued" ? "default" : "secondary"}>
            {draft.status.toUpperCase()}
          </Badge>
        </div>
      </div>

      {/* Meta */}
      <Card>
        <CardHeader><CardTitle className="text-base">Submission Details</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">Tax Period</Label>
              <Input value={draft.period} onChange={e => setDraft(d => d ? { ...d, period: e.target.value } : d)} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Payment Date</Label>
              <Input type="date" value={draft.paymentDate} onChange={e => setDraft(d => d ? { ...d, paymentDate: e.target.value } : d)} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Employees</Label>
              <p className="text-lg font-semibold mt-1">{draft.lines.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Employee Lines */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Employee Payment Lines</CardTitle>
            <Button size="sm" variant="outline" onClick={addLine}>
              <Plus className="h-4 w-4 mr-1" /> Add Line
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>NI Number</TableHead>
                  <TableHead>Tax Code</TableHead>
                  <TableHead className="text-right">Gross £</TableHead>
                  <TableHead className="text-right">Tax £</TableHead>
                  <TableHead className="text-right">NI £</TableHead>
                  <TableHead className="text-right">YTD Gross £</TableHead>
                  <TableHead className="text-right">YTD Tax £</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {draft.lines.map((l, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Input className="h-8 text-sm" value={l.employeeName} onChange={e => updateLine(i, { employeeName: e.target.value })} />
                    </TableCell>
                    <TableCell>
                      <Input className="h-8 text-sm w-32" value={l.niNumber} onChange={e => updateLine(i, { niNumber: e.target.value })} />
                    </TableCell>
                    <TableCell>
                      <Input className="h-8 text-sm w-20" value={l.taxCode} onChange={e => updateLine(i, { taxCode: e.target.value })} />
                    </TableCell>
                    <TableCell>
                      <Input className="h-8 text-sm w-24 text-right" value={String(l.grossPay)} onChange={e => updateLine(i, { grossPay: num(e.target.value) })} />
                    </TableCell>
                    <TableCell>
                      <Input className="h-8 text-sm w-20 text-right" value={String(l.tax)} onChange={e => updateLine(i, { tax: num(e.target.value) })} />
                    </TableCell>
                    <TableCell>
                      <Input className="h-8 text-sm w-20 text-right" value={String(l.ni)} onChange={e => updateLine(i, { ni: num(e.target.value) })} />
                    </TableCell>
                    <TableCell>
                      <Input className="h-8 text-sm w-24 text-right" value={String(l.ytdGross)} onChange={e => updateLine(i, { ytdGross: num(e.target.value) })} />
                    </TableCell>
                    <TableCell>
                      <Input className="h-8 text-sm w-24 text-right" value={String(l.ytdTax)} onChange={e => updateLine(i, { ytdTax: num(e.target.value) })} />
                    </TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => removeLine(i)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {draft.lines.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                      No employee lines. Click "Add Line" or create a pay run with employees first.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Submission Result */}
      {submissionResult && (
        <Card className={submissionResult.accepted ? "border-success" : "border-destructive"}>
          <CardContent className="pt-6 space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant={submissionResult.accepted ? "default" : "destructive"}>
                {submissionResult.accepted ? "ACCEPTED" : "REJECTED"}
              </Badge>
              {submissionResult.externalRef && (
                <span className="text-xs font-mono text-muted-foreground">Ref: {submissionResult.externalRef}</span>
              )}
            </div>
            {submissionResult.message && <p className="text-sm">{submissionResult.message}</p>}
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" disabled={draft.status === "submitted"} onClick={() => toast.success("Draft saved locally")}>
          <Save className="h-4 w-4 mr-1" /> Save Draft
        </Button>
        <Button
          variant="outline"
          disabled={queueFps.isPending || draft.lines.length === 0 || draft.status === "submitted"}
          onClick={() => queueFps.mutate()}
        >
          Queue for Later
        </Button>
        <Button
          disabled={submitting || draft.lines.length === 0 || draft.status === "submitted"}
          onClick={submitToHmrc}
        >
          <Send className="h-4 w-4 mr-1" /> {submitting ? "Submitting…" : "Submit FPS to HMRC"}
        </Button>
      </div>
    </div>
  );
}
