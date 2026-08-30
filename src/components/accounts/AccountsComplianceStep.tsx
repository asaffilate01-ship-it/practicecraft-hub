import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, FileCheck2, LockKeyhole, RotateCcw, Save, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  disclosureFields,
  evaluateAccountsPreparation,
  FRAMEWORK_OPTIONS,
  POLICY_FIELDS,
  type AccountsComplianceProfile,
  type AccountsFramework,
  type AccountsRoundingBasis,
} from "@/lib/accountsCompliance";
import type { TBEntry } from "./TrialBalanceStep";

type Props = {
  periodId: string;
  entityType: string;
  entries: TBEntry[];
  value: AccountsComplianceProfile;
  canReview: boolean;
  currentUserId: string;
  onChanged: () => Promise<void> | void;
};

const STATUS_LABELS: Record<AccountsComplianceProfile["status"], string> = {
  drafting: "Drafting",
  prepared: "Prepared for review",
  locked: "Reviewer locked",
  reopened: "Reopened",
};

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "The accounts control action failed.";
}

export function AccountsComplianceStep({
  periodId,
  entityType,
  entries,
  value,
  canReview,
  currentUserId,
  onChanged,
}: Props) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(value);
  const [busy, setBusy] = useState(false);
  const [reviewStatement, setReviewStatement] = useState("");
  const [reopenReason, setReopenReason] = useState("");

  useEffect(() => setForm(value), [value]);

  const checks = useMemo(
    () => evaluateAccountsPreparation(form.id ? form : null, entries, entityType),
    [entityType, entries, form],
  );
  const passedCount = checks.filter((check) => check.passed).length;
  const isLocked = form.status === "locked";
  const isPreparer = form.prepared_by_user_id === currentUserId;

  const { data: events = [] } = useQuery({
    queryKey: ["accounts-compliance-events", periodId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accounts_compliance_events")
        .select("id, event_type, reason, created_at, actor_user_id")
        .eq("period_id", periodId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["accounts-compliance", periodId] }),
      queryClient.invalidateQueries({ queryKey: ["accounts-compliance-events", periodId] }),
      queryClient.invalidateQueries({ queryKey: ["accounts-periods"] }),
    ]);
    await onChanged();
  };

  const save = async () => {
    if (isLocked) return;
    setBusy(true);
    try {
      const payload = {
        tenant_id: form.tenant_id,
        period_id: form.period_id,
        framework: form.framework,
        entity_size: form.framework === "frs105" ? "micro" : "small",
        rounding_basis: form.rounding_basis,
        framework_eligibility_confirmed: form.framework_eligibility_confirmed,
        comparatives_required: form.comparatives_required,
        comparatives_complete: form.comparatives_complete,
        policy_data: form.policy_data as Json,
        disclosure_checks: form.disclosure_checks as Json,
        status: "drafting",
      };

      const result = form.id
        ? await supabase.from("accounts_compliance_profiles").update(payload).eq("id", form.id).select().single()
        : await supabase.from("accounts_compliance_profiles").insert(payload).select().single();
      if (result.error) throw result.error;
      const standardLabel = form.framework === "frs105" ? "FRS 105" : "FRS 102 Section 1A";
      const { error: periodError } = await supabase
        .from("accounts_periods")
        .update({ accounts_standard: standardLabel })
        .eq("id", periodId);
      if (periodError) throw periodError;
      toast.success("Accounts compliance controls saved");
      await refresh();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const markPrepared = async () => {
    setBusy(true);
    try {
      await save();
      const { error } = await supabase.rpc("mark_accounts_prepared", { p_period_id: periodId });
      if (error) throw error;
      toast.success("Accounts marked prepared and sent to review");
      await refresh();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const approve = async () => {
    setBusy(true);
    try {
      const { error } = await supabase.rpc("approve_accounts_period", {
        p_period_id: periodId,
        p_review_statement: reviewStatement,
      });
      if (error) throw error;
      setReviewStatement("");
      toast.success("Final accounts approved and source data locked");
      await refresh();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const reopen = async () => {
    setBusy(true);
    try {
      const { error } = await supabase.rpc("reopen_accounts_period", {
        p_period_id: periodId,
        p_reason: reopenReason,
      });
      if (error) throw error;
      setReopenReason("");
      toast.success("Accounts reopened with an audit event");
      await refresh();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const changeFramework = (framework: AccountsFramework) => {
    setForm((current) => ({
      ...current,
      framework,
      entity_size: framework === "frs105" ? "micro" : "small",
      framework_eligibility_confirmed: false,
      status: "drafting",
    }));
  };

  return (
    <div className="space-y-4">
      {isLocked && (
        <Alert className="border-emerald-500/40 bg-emerald-500/5">
          <LockKeyhole className="h-4 w-4 text-emerald-700" />
          <AlertTitle>Final accounts are locked</AlertTitle>
          <AlertDescription>
            Source trial balance and tax-computation data cannot be changed until a manager records a reopen reason.
            {form.reviewed_at ? ` Approved ${new Date(form.reviewed_at).toLocaleString("en-GB")}.` : ""}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(20rem,0.8fr)]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="h-4 w-4" /> Reporting framework</CardTitle>
                  <CardDescription>Choose the preparation basis and retain the eligibility judgement. Framework choice is never inferred silently.</CardDescription>
                </div>
                <Badge variant={isLocked ? "default" : "outline"}>{STATUS_LABELS[form.status]}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Accounting framework</Label>
                  <Select value={form.framework} onValueChange={(next) => changeFramework(next as AccountsFramework)} disabled={isLocked}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FRAMEWORK_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">{FRAMEWORK_OPTIONS.find((option) => option.value === form.framework)?.description}</p>
                </div>
                <div className="space-y-2">
                  <Label>Presentation rounding</Label>
                  <Select value={form.rounding_basis} onValueChange={(next) => setForm((current) => ({ ...current, rounding_basis: next as AccountsRoundingBasis }))} disabled={isLocked}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pounds">Whole pounds</SelectItem>
                      <SelectItem value="thousands">Nearest £000</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <label className="flex items-start gap-3 rounded-lg border p-3">
                <Checkbox
                  checked={form.framework_eligibility_confirmed}
                  onCheckedChange={(checked) => setForm((current) => ({ ...current, framework_eligibility_confirmed: Boolean(checked) }))}
                  disabled={isLocked}
                />
                <span>
                  <span className="block text-sm font-medium">Eligibility checked for this reporting period</span>
                  <span className="block text-xs text-muted-foreground">The preparer has checked current company law, entity exclusions and the applicable FRC standard.</span>
                </span>
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex items-center gap-3 rounded-lg border p-3">
                  <Checkbox checked={form.comparatives_required} onCheckedChange={(checked) => setForm((current) => ({ ...current, comparatives_required: Boolean(checked), comparatives_complete: checked ? current.comparatives_complete : false }))} disabled={isLocked} />
                  <span className="text-sm font-medium">Comparatives required</span>
                </label>
                <label className="flex items-center gap-3 rounded-lg border p-3">
                  <Checkbox checked={form.comparatives_complete} onCheckedChange={(checked) => setForm((current) => ({ ...current, comparatives_complete: Boolean(checked) }))} disabled={isLocked || !form.comparatives_required} />
                  <span className="text-sm font-medium">Comparatives reconciled</span>
                </label>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Accounting policies</CardTitle>
              <CardDescription>These are period-specific controlled narratives. They must be complete before preparation sign-off.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {POLICY_FIELDS[form.framework].map((field) => (
                <div key={field.key} className="space-y-2">
                  <Label htmlFor={`policy-${field.key}`}>{field.label}</Label>
                  <Textarea
                    id={`policy-${field.key}`}
                    value={form.policy_data[field.key] ?? ""}
                    onChange={(event) => setForm((current) => ({ ...current, policy_data: { ...current.policy_data, [field.key]: event.target.value } }))}
                    placeholder={field.hint}
                    disabled={isLocked}
                    rows={3}
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Disclosure controls</CardTitle>
              <CardDescription>Confirm the review was performed; record detailed conclusions in the notes and working papers.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              {disclosureFields(form.framework, entityType).map((field) => (
                <label key={field.key} className="flex items-start gap-3 rounded-lg border p-3">
                  <Checkbox
                    checked={form.disclosure_checks[field.key] ?? false}
                    onCheckedChange={(checked) => setForm((current) => ({ ...current, disclosure_checks: { ...current.disclosure_checks, [field.key]: Boolean(checked) } }))}
                    disabled={isLocked}
                  />
                  <span className="text-sm font-medium leading-5">{field.label}</span>
                </label>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="xl:sticky xl:top-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><FileCheck2 className="h-4 w-4" /> Preparation gate</CardTitle>
              <CardDescription>{passedCount} of {checks.length} blocking controls passed.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                {checks.map((check) => (
                  <div key={check.key} className="flex items-start gap-2 text-sm">
                    {check.passed
                      ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                      : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />}
                    <span className={check.passed ? "text-foreground" : "text-muted-foreground"}>{check.label}</span>
                  </div>
                ))}
              </div>

              {!isLocked && (
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                  <Button variant="outline" onClick={save} disabled={busy}><Save className="mr-2 h-4 w-4" /> Save controls</Button>
                  <Button onClick={markPrepared} disabled={busy || checks.some((check) => !check.passed)}><FileCheck2 className="mr-2 h-4 w-4" /> Mark prepared</Button>
                </div>
              )}

              {form.status === "prepared" && (
                <div className="space-y-2 border-t pt-4">
                  <Label htmlFor="review-statement">Reviewer approval statement</Label>
                  <Textarea id="review-statement" value={reviewStatement} onChange={(event) => setReviewStatement(event.target.value)} placeholder="I reviewed the final accounts, working papers and blocking controls…" rows={3} />
                  <Button className="w-full" onClick={approve} disabled={busy || !canReview || isPreparer || !reviewStatement.trim()}><LockKeyhole className="mr-2 h-4 w-4" /> Approve and lock</Button>
                  {!canReview && <p className="text-xs text-muted-foreground">A manager, firm owner or super admin must complete reviewer approval.</p>}
                  {isPreparer && <p className="text-xs text-muted-foreground">The reviewer must be a different user from the preparer.</p>}
                </div>
              )}

              {isLocked && canReview && (
                <div className="space-y-2 border-t pt-4">
                  <Label htmlFor="reopen-reason">Reason for reopening</Label>
                  <Textarea id="reopen-reason" value={reopenReason} onChange={(event) => setReopenReason(event.target.value)} placeholder="Describe the correction or new evidence requiring a change…" rows={3} />
                  <Button variant="outline" className="w-full" onClick={reopen} disabled={busy || !reopenReason.trim()}><RotateCcw className="mr-2 h-4 w-4" /> Reopen accounts</Button>
                </div>
              )}

              {events.length > 0 && (
                <div className="space-y-3 border-t pt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Approval history</p>
                  {events.map((event) => (
                    <div key={event.id} className="border-l-2 pl-3 text-xs">
                      <p className="font-medium capitalize">{event.event_type}</p>
                      <p className="text-muted-foreground">{new Date(event.created_at).toLocaleString("en-GB")}</p>
                      {event.reason && <p className="mt-1 text-muted-foreground">{event.reason}</p>}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
