import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Save, Send, CheckCircle2, LockKeyhole } from "lucide-react";
import { TrialBalanceStep, type TBEntry } from "./TrialBalanceStep";
import { FinancialStatementsStep } from "./FinancialStatementsStep";
import { TaxComputationStep, defaultTaxCompData, type TaxCompData } from "./TaxComputationStep";
import { TaxFormStep } from "./TaxFormStep";
import { DisclosureChecklistStep } from "./DisclosureChecklistStep";
import { FixedAssetScheduleStep, defaultFixedAssetScheduleData, type FixedAssetScheduleData } from "./FixedAssetScheduleStep";
import { NotesToAccountsStep, defaultNotesData, type NotesData } from "./NotesToAccountsStep";
import { DirectorsReportStep, defaultDirectorsReportData, type DirectorsReportData } from "./DirectorsReportStep";
import { EvidenceControlStep } from "./EvidenceControlStep";
import { AccountsComplianceStep } from "./AccountsComplianceStep";
import {
  defaultComplianceProfile,
  type AccountsComplianceProfile,
} from "@/lib/accountsCompliance";
import type { Json, Tables } from "@/integrations/supabase/types";

type AccountsPeriod = Tables<"accounts_periods"> & {
  clients: Pick<Tables<"clients">, "legal_name" | "entity_type" | "company_number" | "utr"> | null;
};

type SavedFormData = {
  formData?: Record<string, string>;
  checks?: Record<string, boolean>;
  checkNotes?: Record<string, string>;
};

type SavedComputedValues = {
  compData?: Partial<TaxCompData>;
  assetData?: Partial<FixedAssetScheduleData>;
  notesData?: Partial<NotesData>;
  directorsData?: Partial<DirectorsReportData>;
};

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unable to save the accounts workpaper.";
}

type Props = {
  period: AccountsPeriod;
  onClose: () => void;
};

export function AccountsProductionWizard({ period, onClose }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [tbEntries, setTbEntries] = useState<TBEntry[]>([]);
  const [compData, setCompData] = useState<TaxCompData>(defaultTaxCompData);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [checkNotes, setCheckNotes] = useState<Record<string, string>>({});
  const [assetData, setAssetData] = useState<FixedAssetScheduleData>(defaultFixedAssetScheduleData);
  const [notesData, setNotesData] = useState<NotesData>(defaultNotesData);
  const [directorsData, setDirectorsData] = useState<DirectorsReportData>(defaultDirectorsReportData);
  const [saving, setSaving] = useState(false);

  const entityType = period?.clients?.entity_type || "ltd";
  const clientName = period?.clients?.legal_name || "Client";
  const companyNumber = period?.clients?.company_number;
  const utr = period?.clients?.utr;
  const isLtd = entityType === "ltd" || entityType === "llp";

  // Build steps dynamically based on entity type
  const STEPS = [
    { key: "compliance", label: "Compliance" },
    { key: "evidence", label: "Evidence" },
    { key: "tb", label: "Trial Balance" },
    { key: "adj", label: "Adjustments" },
    { key: "fixed_assets", label: "Fixed Assets" },
    { key: "fs", label: "Financial Statements" },
    { key: "notes", label: "Notes" },
    ...(isLtd ? [{ key: "directors_report", label: "Directors' Report" }] : []),
    { key: "tax_comp", label: "Tax Computation" },
    { key: "tax_form", label: "Tax Return Form" },
    { key: "checklist", label: "Review Checklist" },
  ];

  const monthsInPeriod = (() => {
    const start = new Date(period.period_start);
    const end = new Date(period.period_end);
    return (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;
  })();

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("tenant_id").eq("id", user!.id).single();
      return data;
    },
    enabled: !!user,
  });

  const { data: roles = [] } = useQuery({
    queryKey: ["accounts-review-roles", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", user!.id);
      if (error) throw error;
      return data.map((item) => item.role);
    },
    enabled: !!user,
  });

  const { data: existingCompliance, isLoading: complianceLoading, refetch: refetchCompliance } = useQuery({
    queryKey: ["accounts-compliance", period?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accounts_compliance_profiles")
        .select("*")
        .eq("period_id", period.id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        ...data,
        framework: data.framework as AccountsComplianceProfile["framework"],
        entity_size: data.entity_size as AccountsComplianceProfile["entity_size"],
        rounding_basis: data.rounding_basis as AccountsComplianceProfile["rounding_basis"],
        status: data.status as AccountsComplianceProfile["status"],
        policy_data: (data.policy_data ?? {}) as Record<string, string>,
        disclosure_checks: (data.disclosure_checks ?? {}) as Record<string, boolean>,
      } satisfies AccountsComplianceProfile;
    },
    enabled: !!period?.id,
  });

  const complianceProfile = existingCompliance
    ?? defaultComplianceProfile(profile?.tenant_id ?? "", period.id, period.accounts_standard);
  const isLocked = existingCompliance?.status === "locked";
  const canReview = roles.some((role) => ["super_admin", "firm_owner", "manager"].includes(role));

  // Load existing TB entries
  const { data: existingTB } = useQuery({
    queryKey: ["tb-entries", period?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trial_balance_entries")
        .select("*")
        .eq("period_id", period.id)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
    enabled: !!period?.id,
  });

  // Load existing tax computation
  const { data: existingComp } = useQuery({
    queryKey: ["tax-comp", period?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("tax_computations")
        .select("*")
        .eq("period_id", period.id)
        .maybeSingle();
      return data;
    },
    enabled: !!period?.id,
  });

  useEffect(() => {
    if (existingTB && existingTB.length > 0) {
      setTbEntries(existingTB.map((e) => ({
        id: e.id,
        account_code: e.account_code,
        account_name: e.account_name,
        account_type: e.account_type,
        debit_pence: e.debit_pence,
        credit_pence: e.credit_pence,
        adjustment_debit_pence: e.adjustment_debit_pence,
        adjustment_credit_pence: e.adjustment_credit_pence,
        adjustment_notes: e.adjustment_notes || "",
        sort_order: e.sort_order,
        comparative_debit_pence: e.comparative_debit_pence || 0,
        comparative_credit_pence: e.comparative_credit_pence || 0,
      })));
    }
  }, [existingTB]);

  useEffect(() => {
    if (existingComp) {
      const fd = existingComp.form_data as SavedFormData;
      const cv = existingComp.computed_values as SavedComputedValues;
      if (cv?.compData) setCompData({ ...defaultTaxCompData, ...cv.compData });
      if (cv?.assetData) setAssetData({ ...defaultFixedAssetScheduleData, ...cv.assetData });
      if (cv?.notesData) setNotesData({ ...defaultNotesData, ...cv.notesData });
      if (cv?.directorsData) setDirectorsData({ ...defaultDirectorsReportData, ...cv.directorsData });
      if (fd?.formData) setFormData(fd.formData);
      if (fd?.checks) setChecks(fd.checks);
      if (fd?.checkNotes) setCheckNotes(fd.checkNotes);
    }
  }, [existingComp]);

  const saveTB = async () => {
    if (isLocked) {
      toast.error("Final accounts are locked. A manager must reopen them before editing.");
      return;
    }
    if (!profile?.tenant_id || !period?.id) return;
    setSaving(true);
    try {
      await supabase.from("trial_balance_entries").delete().eq("period_id", period.id);
      if (tbEntries.length > 0) {
        const rows = tbEntries.map((e, i) => ({
          tenant_id: profile.tenant_id,
          period_id: period.id,
          account_code: e.account_code,
          account_name: e.account_name,
          account_type: e.account_type,
          debit_pence: e.debit_pence,
          credit_pence: e.credit_pence,
          adjustment_debit_pence: e.adjustment_debit_pence,
          adjustment_credit_pence: e.adjustment_credit_pence,
          adjustment_notes: e.adjustment_notes,
          sort_order: (i + 1) * 10,
          comparative_debit_pence: e.comparative_debit_pence || 0,
          comparative_credit_pence: e.comparative_credit_pence || 0,
        }));
        const { error } = await supabase.from("trial_balance_entries").insert(rows);
        if (error) throw error;
      }
      toast.success("Trial balance saved");
    } catch (error: unknown) {
      toast.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const saveTaxComp = async () => {
    if (isLocked) {
      toast.error("Final accounts are locked. A manager must reopen them before editing.");
      return;
    }
    if (!profile?.tenant_id || !period?.id) return;
    setSaving(true);
    try {
      const compType = (entityType === "ltd" || entityType === "llp") ? "ct600" : entityType === "partnership" ? "sa800" : "sa100";
      const payload = {
        tenant_id: profile.tenant_id,
        period_id: period.id,
        computation_type: compType,
        form_data: { formData, checks, checkNotes } as Json,
        computed_values: { compData, assetData, notesData, directorsData } as unknown as Json,
        status: "draft",
      };

      if (existingComp) {
        const { error } = await supabase.from("tax_computations").update({
          form_data: payload.form_data,
          computed_values: payload.computed_values,
        }).eq("id", existingComp.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("tax_computations").insert(payload);
        if (error) throw error;
      }
      queryClient.invalidateQueries({ queryKey: ["tax-comp", period.id] });
      toast.success("All data saved");
    } catch (error: unknown) {
      toast.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const saveAll = async () => {
    await saveTB();
    await saveTaxComp();
  };

  const markReady = async () => {
    if (isLocked) return;
    setSaving(true);
    try {
      await saveAll();
      const { error } = await supabase.rpc("mark_accounts_prepared", { p_period_id: period.id });
      if (error) throw error;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["accounts-periods"] }),
        queryClient.invalidateQueries({ queryKey: ["accounts-compliance", period.id] }),
      ]);
      toast.success("Accounts marked prepared and sent to independent review");
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Accounts preparation checks failed");
    } finally {
      setSaving(false);
    }
  };

  const currentStep = STEPS[step];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Back to List
            </Button>
          </div>
          <h2 className="text-xl font-bold mt-1">{clientName}</h2>
          <p className="text-sm text-muted-foreground">
            {new Date(period.period_start).toLocaleDateString("en-GB")} — {new Date(period.period_end).toLocaleDateString("en-GB")}
            <Badge variant="outline" className="ml-2 text-xs capitalize">{entityType.replace("_", " ")}</Badge>
            <Badge variant="outline" className="ml-1 text-xs">{complianceProfile.framework === "frs105" ? "FRS 105" : "FRS 102 Section 1A"}</Badge>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isLocked && <Badge className="gap-1"><LockKeyhole className="h-3 w-3" /> Reviewer locked</Badge>}
          <Button variant="outline" size="sm" onClick={saveAll} disabled={saving || isLocked || complianceLoading}>
            <Save className="w-3.5 h-3.5 mr-1" /> {saving ? "Saving…" : "Save All"}
          </Button>
          <Button size="sm" onClick={markReady} disabled={saving || isLocked || complianceLoading}>
            <Send className="w-3.5 h-3.5 mr-1" /> Mark Ready for Review
          </Button>
        </div>
      </div>

      {/* Step indicator */}
      <Card>
        <CardContent className="py-3">
          <div className="flex items-center gap-1 overflow-x-auto">
            {STEPS.map((s, i) => (
              <div key={s.key} className="flex items-center flex-shrink-0">
                <button
                  onClick={() => setStep(i)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[11px] font-medium transition-colors whitespace-nowrap ${
                    i === step
                      ? "bg-primary text-primary-foreground"
                      : i < step
                        ? "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {i < step && <CheckCircle2 className="w-3 h-3" />}
                  <span>{i + 1}. {s.label}</span>
                </button>
                {i < STEPS.length - 1 && <div className="w-3 h-px bg-border mx-0.5" />}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Step content */}
      {currentStep.key === "compliance" && !complianceLoading && (
        <AccountsComplianceStep
          periodId={period.id}
          entityType={entityType}
          entries={tbEntries}
          value={complianceProfile}
          canReview={canReview}
          currentUserId={user?.id ?? ""}
          onChanged={async () => { await refetchCompliance(); }}
        />
      )}
      <div className={(isLocked || complianceLoading) && currentStep.key !== "compliance" ? "pointer-events-none opacity-60" : undefined}>
      {currentStep.key === "evidence" && (
        <EvidenceControlStep
          clientId={period.client_id}
          periodId={period.id}
          periodStart={period.period_start}
          periodEnd={period.period_end}
        />
      )}
      {currentStep.key === "tb" && (
        <TrialBalanceStep entries={tbEntries} onChange={setTbEntries} entityType={entityType} clientId={period.client_id} periodId={period.id} showComparatives />
      )}
      {currentStep.key === "adj" && (
        <TrialBalanceStep entries={tbEntries} onChange={setTbEntries} entityType={entityType} clientId={period.client_id} periodId={period.id} showAdjustments showComparatives />
      )}
      {currentStep.key === "fixed_assets" && (
        <FixedAssetScheduleStep
          data={assetData} onChange={setAssetData}
          periodStart={period.period_start} periodEnd={period.period_end}
          entityType={entityType}
        />
      )}
      {currentStep.key === "fs" && (
        <FinancialStatementsStep
          entries={tbEntries} entityType={entityType}
          standard={complianceProfile.framework === "frs105" ? "FRS 105" : "FRS 102 Section 1A"} periodStart={period.period_start}
          periodEnd={period.period_end} clientName={clientName}
          roundingBasis={complianceProfile.rounding_basis}
          comparativesRequired={complianceProfile.comparatives_required}
        />
      )}
      {currentStep.key === "notes" && (
        <NotesToAccountsStep
          notes={notesData} onChange={setNotesData}
          entries={tbEntries} assets={assetData.assets}
          entityType={entityType} periodEnd={period.period_end}
          clientName={clientName} standard={complianceProfile.framework === "frs105" ? "FRS 105" : "FRS 102 Section 1A"}
          monthsInPeriod={monthsInPeriod}
        />
      )}
      {currentStep.key === "directors_report" && (
        <DirectorsReportStep
          data={directorsData} onChange={setDirectorsData}
          clientName={clientName} periodStart={period.period_start}
          periodEnd={period.period_end} companyNumber={companyNumber}
        />
      )}
      {currentStep.key === "tax_comp" && (
        <TaxComputationStep entries={tbEntries} entityType={entityType} compData={compData} onChange={setCompData} />
      )}
      {currentStep.key === "tax_form" && (
        <TaxFormStep
          entries={tbEntries} entityType={entityType} compData={compData}
          formData={formData} onFormChange={setFormData}
          periodStart={period.period_start} periodEnd={period.period_end}
          clientName={clientName} companyNumber={companyNumber} utr={utr}
        />
      )}
      {currentStep.key === "checklist" && (
        <DisclosureChecklistStep entityType={entityType} checks={checks} notes={checkNotes}
          onCheckChange={setChecks} onNotesChange={setCheckNotes}
        />
      )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2">
        <Button variant="outline" disabled={step === 0} onClick={() => setStep(step - 1)}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Previous
        </Button>
        <span className="text-xs text-muted-foreground">Step {step + 1} of {STEPS.length}</span>
        {step < STEPS.length - 1 ? (
          <Button disabled={complianceLoading || (isLocked && currentStep.key !== "compliance")} onClick={() => {
            if (["tb", "adj"].includes(currentStep.key)) saveTB();
            if (["tax_comp", "tax_form", "checklist"].includes(currentStep.key)) saveTaxComp();
            setStep(step + 1);
          }}>
            Next <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        ) : (
          <Button onClick={markReady} disabled={saving || isLocked || complianceLoading}>
            <Send className="w-4 h-4 mr-1" /> Complete & Submit for Review
          </Button>
        )}
      </div>
    </div>
  );
}
