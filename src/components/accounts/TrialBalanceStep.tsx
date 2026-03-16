import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, Upload, Download, AlertTriangle, CheckCircle2, Database, RotateCcw } from "lucide-react";
import { toast } from "sonner";

export type TBEntry = {
  id?: string;
  account_code: string;
  account_name: string;
  account_type: string;
  debit_pence: number;
  credit_pence: number;
  adjustment_debit_pence: number;
  adjustment_credit_pence: number;
  adjustment_notes: string;
  sort_order: number;
  comparative_debit_pence: number;
  comparative_credit_pence: number;
};

const ACCOUNT_TYPES = [
  "asset", "liability", "equity", "income", "expense",
] as const;

const DEFAULT_LTD_TB: TBEntry[] = [
  { account_code: "1000", account_name: "Bank - Current Account", account_type: "asset", debit_pence: 0, credit_pence: 0, adjustment_debit_pence: 0, adjustment_credit_pence: 0, adjustment_notes: "", sort_order: 10, comparative_debit_pence: 0, comparative_credit_pence: 0 },
  { account_code: "1100", account_name: "Accounts Receivable (Debtors)", account_type: "asset", debit_pence: 0, credit_pence: 0, adjustment_debit_pence: 0, adjustment_credit_pence: 0, adjustment_notes: "", sort_order: 20, comparative_debit_pence: 0, comparative_credit_pence: 0 },
  { account_code: "1200", account_name: "Prepayments", account_type: "asset", debit_pence: 0, credit_pence: 0, adjustment_debit_pence: 0, adjustment_credit_pence: 0, adjustment_notes: "", sort_order: 30, comparative_debit_pence: 0, comparative_credit_pence: 0 },
  { account_code: "1400", account_name: "Fixed Assets - Cost", account_type: "asset", debit_pence: 0, credit_pence: 0, adjustment_debit_pence: 0, adjustment_credit_pence: 0, adjustment_notes: "", sort_order: 40, comparative_debit_pence: 0, comparative_credit_pence: 0 },
  { account_code: "1401", account_name: "Fixed Assets - Accum Depreciation", account_type: "asset", debit_pence: 0, credit_pence: 0, adjustment_debit_pence: 0, adjustment_credit_pence: 0, adjustment_notes: "", sort_order: 41, comparative_debit_pence: 0, comparative_credit_pence: 0 },
  { account_code: "2000", account_name: "Accounts Payable (Creditors)", account_type: "liability", debit_pence: 0, credit_pence: 0, adjustment_debit_pence: 0, adjustment_credit_pence: 0, adjustment_notes: "", sort_order: 100, comparative_debit_pence: 0, comparative_credit_pence: 0 },
  { account_code: "2100", account_name: "Accruals", account_type: "liability", debit_pence: 0, credit_pence: 0, adjustment_debit_pence: 0, adjustment_credit_pence: 0, adjustment_notes: "", sort_order: 110, comparative_debit_pence: 0, comparative_credit_pence: 0 },
  { account_code: "2200", account_name: "PAYE/NIC Control", account_type: "liability", debit_pence: 0, credit_pence: 0, adjustment_debit_pence: 0, adjustment_credit_pence: 0, adjustment_notes: "", sort_order: 120, comparative_debit_pence: 0, comparative_credit_pence: 0 },
  { account_code: "2300", account_name: "Corporation Tax Provision", account_type: "liability", debit_pence: 0, credit_pence: 0, adjustment_debit_pence: 0, adjustment_credit_pence: 0, adjustment_notes: "", sort_order: 130, comparative_debit_pence: 0, comparative_credit_pence: 0 },
  { account_code: "2400", account_name: "Director Loan Account", account_type: "liability", debit_pence: 0, credit_pence: 0, adjustment_debit_pence: 0, adjustment_credit_pence: 0, adjustment_notes: "", sort_order: 140, comparative_debit_pence: 0, comparative_credit_pence: 0 },
  { account_code: "3000", account_name: "Share Capital", account_type: "equity", debit_pence: 0, credit_pence: 0, adjustment_debit_pence: 0, adjustment_credit_pence: 0, adjustment_notes: "", sort_order: 200, comparative_debit_pence: 0, comparative_credit_pence: 0 },
  { account_code: "3100", account_name: "Retained Earnings", account_type: "equity", debit_pence: 0, credit_pence: 0, adjustment_debit_pence: 0, adjustment_credit_pence: 0, adjustment_notes: "", sort_order: 210, comparative_debit_pence: 0, comparative_credit_pence: 0 },
  { account_code: "4000", account_name: "Sales / Turnover", account_type: "income", debit_pence: 0, credit_pence: 0, adjustment_debit_pence: 0, adjustment_credit_pence: 0, adjustment_notes: "", sort_order: 300, comparative_debit_pence: 0, comparative_credit_pence: 0 },
  { account_code: "4100", account_name: "Other Income", account_type: "income", debit_pence: 0, credit_pence: 0, adjustment_debit_pence: 0, adjustment_credit_pence: 0, adjustment_notes: "", sort_order: 310, comparative_debit_pence: 0, comparative_credit_pence: 0 },
  { account_code: "5000", account_name: "Cost of Sales", account_type: "expense", debit_pence: 0, credit_pence: 0, adjustment_debit_pence: 0, adjustment_credit_pence: 0, adjustment_notes: "", sort_order: 400, comparative_debit_pence: 0, comparative_credit_pence: 0 },
  { account_code: "6000", account_name: "Staff Wages", account_type: "expense", debit_pence: 0, credit_pence: 0, adjustment_debit_pence: 0, adjustment_credit_pence: 0, adjustment_notes: "", sort_order: 500, comparative_debit_pence: 0, comparative_credit_pence: 0 },
  { account_code: "6001", account_name: "Employer NIC", account_type: "expense", debit_pence: 0, credit_pence: 0, adjustment_debit_pence: 0, adjustment_credit_pence: 0, adjustment_notes: "", sort_order: 501, comparative_debit_pence: 0, comparative_credit_pence: 0 },
  { account_code: "6100", account_name: "Rent", account_type: "expense", debit_pence: 0, credit_pence: 0, adjustment_debit_pence: 0, adjustment_credit_pence: 0, adjustment_notes: "", sort_order: 510, comparative_debit_pence: 0, comparative_credit_pence: 0 },
  { account_code: "6200", account_name: "Utilities", account_type: "expense", debit_pence: 0, credit_pence: 0, adjustment_debit_pence: 0, adjustment_credit_pence: 0, adjustment_notes: "", sort_order: 520, comparative_debit_pence: 0, comparative_credit_pence: 0 },
  { account_code: "6500", account_name: "Professional Fees", account_type: "expense", debit_pence: 0, credit_pence: 0, adjustment_debit_pence: 0, adjustment_credit_pence: 0, adjustment_notes: "", sort_order: 550, comparative_debit_pence: 0, comparative_credit_pence: 0 },
  { account_code: "6600", account_name: "Travel & Subsistence", account_type: "expense", debit_pence: 0, credit_pence: 0, adjustment_debit_pence: 0, adjustment_credit_pence: 0, adjustment_notes: "", sort_order: 560, comparative_debit_pence: 0, comparative_credit_pence: 0 },
  { account_code: "6900", account_name: "Depreciation", account_type: "expense", debit_pence: 0, credit_pence: 0, adjustment_debit_pence: 0, adjustment_credit_pence: 0, adjustment_notes: "", sort_order: 590, comparative_debit_pence: 0, comparative_credit_pence: 0 },
];

const DEFAULT_SOLE_TRADER_TB: TBEntry[] = [
  { account_code: "1000", account_name: "Bank", account_type: "asset", debit_pence: 0, credit_pence: 0, adjustment_debit_pence: 0, adjustment_credit_pence: 0, adjustment_notes: "", sort_order: 10, comparative_debit_pence: 0, comparative_credit_pence: 0 },
  { account_code: "1100", account_name: "Debtors", account_type: "asset", debit_pence: 0, credit_pence: 0, adjustment_debit_pence: 0, adjustment_credit_pence: 0, adjustment_notes: "", sort_order: 20, comparative_debit_pence: 0, comparative_credit_pence: 0 },
  { account_code: "2000", account_name: "Creditors", account_type: "liability", debit_pence: 0, credit_pence: 0, adjustment_debit_pence: 0, adjustment_credit_pence: 0, adjustment_notes: "", sort_order: 100, comparative_debit_pence: 0, comparative_credit_pence: 0 },
  { account_code: "3000", account_name: "Owner Capital / Drawings", account_type: "equity", debit_pence: 0, credit_pence: 0, adjustment_debit_pence: 0, adjustment_credit_pence: 0, adjustment_notes: "", sort_order: 200, comparative_debit_pence: 0, comparative_credit_pence: 0 },
  { account_code: "4000", account_name: "Sales / Turnover", account_type: "income", debit_pence: 0, credit_pence: 0, adjustment_debit_pence: 0, adjustment_credit_pence: 0, adjustment_notes: "", sort_order: 300, comparative_debit_pence: 0, comparative_credit_pence: 0 },
  { account_code: "5000", account_name: "Cost of Sales", account_type: "expense", debit_pence: 0, credit_pence: 0, adjustment_debit_pence: 0, adjustment_credit_pence: 0, adjustment_notes: "", sort_order: 400, comparative_debit_pence: 0, comparative_credit_pence: 0 },
  { account_code: "6000", account_name: "Motor / Travel", account_type: "expense", debit_pence: 0, credit_pence: 0, adjustment_debit_pence: 0, adjustment_credit_pence: 0, adjustment_notes: "", sort_order: 500, comparative_debit_pence: 0, comparative_credit_pence: 0 },
  { account_code: "6100", account_name: "Phone / Internet", account_type: "expense", debit_pence: 0, credit_pence: 0, adjustment_debit_pence: 0, adjustment_credit_pence: 0, adjustment_notes: "", sort_order: 510, comparative_debit_pence: 0, comparative_credit_pence: 0 },
  { account_code: "6200", account_name: "Rent / Use of Home", account_type: "expense", debit_pence: 0, credit_pence: 0, adjustment_debit_pence: 0, adjustment_credit_pence: 0, adjustment_notes: "", sort_order: 520, comparative_debit_pence: 0, comparative_credit_pence: 0 },
  { account_code: "6300", account_name: "Professional Fees", account_type: "expense", debit_pence: 0, credit_pence: 0, adjustment_debit_pence: 0, adjustment_credit_pence: 0, adjustment_notes: "", sort_order: 530, comparative_debit_pence: 0, comparative_credit_pence: 0 },
  { account_code: "6400", account_name: "Advertising", account_type: "expense", debit_pence: 0, credit_pence: 0, adjustment_debit_pence: 0, adjustment_credit_pence: 0, adjustment_notes: "", sort_order: 540, comparative_debit_pence: 0, comparative_credit_pence: 0 },
];

const penceToStr = (v: number) => (v / 100).toFixed(2);
const strToPence = (s: string) => Math.round(parseFloat(s || "0") * 100);

type Props = {
  entries: TBEntry[];
  onChange: (entries: TBEntry[]) => void;
  entityType: string;
  showAdjustments?: boolean;
  clientId?: string;
  periodId?: string;
  showComparatives?: boolean;
};

export function TrialBalanceStep({ entries, onChange, entityType, showAdjustments = false, clientId, periodId, showComparatives: initialShowComp = false }: Props) {
  const [showAdj, setShowAdj] = useState(showAdjustments);
  const [showComp, setShowComp] = useState(initialShowComp);
  const [showBfDialog, setShowBfDialog] = useState(false);
  const { user } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("tenant_id").eq("id", user!.id).single();
      return data;
    },
    enabled: !!user,
  });

  // Load prior periods for this client for bring-forward
  const { data: priorPeriods = [] } = useQuery({
    queryKey: ["prior-periods", clientId, periodId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accounts_periods")
        .select("id, period_start, period_end, status")
        .eq("client_id", clientId!)
        .neq("id", periodId!)
        .order("period_end", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: !!clientId && !!periodId,
  });

  const pullFromLedger = async () => {
    if (!profile?.tenant_id) { toast.error("No tenant"); return; }
    try {
      const { data: accounts, error: accErr } = await supabase
        .from("chart_of_accounts").select("id, code, name, account_type").eq("tenant_id", profile.tenant_id).order("code");
      if (accErr) throw accErr;

      let journalQuery = supabase.from("journal_entries").select("id, journal_lines(account_id, debit, credit)").eq("is_posted", true);
      if (clientId) journalQuery = journalQuery.eq("client_id", clientId);
      const { data: journals, error: jErr } = await journalQuery;
      if (jErr) throw jErr;

      const balances: Record<string, { debit: number; credit: number }> = {};
      (journals || []).forEach((j: any) => {
        (j.journal_lines || []).forEach((line: any) => {
          if (!balances[line.account_id]) balances[line.account_id] = { debit: 0, credit: 0 };
          balances[line.account_id].debit += parseFloat(line.debit) || 0;
          balances[line.account_id].credit += parseFloat(line.credit) || 0;
        });
      });

      const tbEntries: TBEntry[] = (accounts || [])
        .filter(a => balances[a.id])
        .map((a, i) => ({
          account_code: a.code,
          account_name: a.name,
          account_type: a.account_type,
          debit_pence: Math.round((balances[a.id]?.debit || 0) * 100),
          credit_pence: Math.round((balances[a.id]?.credit || 0) * 100),
          adjustment_debit_pence: 0,
          adjustment_credit_pence: 0,
          adjustment_notes: "",
          sort_order: (i + 1) * 10,
          comparative_debit_pence: 0,
          comparative_credit_pence: 0,
        }));

      if (tbEntries.length === 0) {
        toast.info("No posted journal entries found — trial balance is empty");
      } else {
        onChange(tbEntries);
        toast.success(`Pulled ${tbEntries.length} accounts from the ledger`);
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const bringForward = async (sourcePeriodId: string) => {
    try {
      const { data: priorTB, error } = await supabase
        .from("trial_balance_entries")
        .select("*")
        .eq("period_id", sourcePeriodId)
        .order("sort_order");
      if (error) throw error;
      if (!priorTB || priorTB.length === 0) {
        toast.error("No trial balance found for the selected prior period");
        return;
      }

      // Build new entries: prior year adjusted figures become comparatives
      // For balance sheet accounts (asset/liability/equity), adjusted figures become opening balances
      // For P&L accounts (income/expense), comparatives only — no b/f
      const newEntries: TBEntry[] = priorTB.map((e: any) => {
        const priorAdjDr = (e.debit_pence || 0) + (e.adjustment_debit_pence || 0);
        const priorAdjCr = (e.credit_pence || 0) + (e.adjustment_credit_pence || 0);
        const isBalanceSheet = ["asset", "liability", "equity"].includes(e.account_type);

        return {
          account_code: e.account_code,
          account_name: e.account_name,
          account_type: e.account_type,
          // B/S accounts carry forward adjusted balances as opening; P&L starts fresh
          debit_pence: isBalanceSheet ? priorAdjDr : 0,
          credit_pence: isBalanceSheet ? priorAdjCr : 0,
          adjustment_debit_pence: 0,
          adjustment_credit_pence: 0,
          adjustment_notes: "",
          sort_order: e.sort_order,
          // Prior year adjusted figures become the comparative column
          comparative_debit_pence: priorAdjDr,
          comparative_credit_pence: priorAdjCr,
        };
      });

      onChange(newEntries);
      setShowBfDialog(false);
      setShowComp(true);
      toast.success(`Brought forward ${newEntries.length} accounts from prior period. Balance sheet balances carried forward, P&L reset to zero.`);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const loadTemplate = () => {
    const template = entityType === "sole_trader" ? DEFAULT_SOLE_TRADER_TB : DEFAULT_LTD_TB;
    onChange(template);
    toast.success("Template loaded — enter your balances");
  };

  const handleCSVImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".csv";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result as string;
        const lines = text.split("\n").filter(Boolean);
        const parsed: TBEntry[] = [];
        lines.slice(1).forEach((line, i) => {
          const cols = line.split(",").map(c => c.trim().replace(/^"|"$/g, ""));
          if (cols.length >= 4) {
            parsed.push({
              account_code: cols[0],
              account_name: cols[1],
              account_type: cols[2] || "expense",
              debit_pence: strToPence(cols[3]),
              credit_pence: strToPence(cols[4] || "0"),
              adjustment_debit_pence: 0,
              adjustment_credit_pence: 0,
              adjustment_notes: "",
              sort_order: (i + 1) * 10,
              comparative_debit_pence: strToPence(cols[5] || "0"),
              comparative_credit_pence: strToPence(cols[6] || "0"),
            });
          }
        });
        if (parsed.length > 0) {
          onChange(parsed);
          toast.success(`Imported ${parsed.length} lines from CSV`);
        } else {
          toast.error("No valid rows found. Expected: Code, Name, Type, Debit, Credit [, CompDr, CompCr]");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const addRow = () => {
    onChange([...entries, {
      account_code: "", account_name: "", account_type: "expense",
      debit_pence: 0, credit_pence: 0,
      adjustment_debit_pence: 0, adjustment_credit_pence: 0,
      adjustment_notes: "", sort_order: (entries.length + 1) * 10,
      comparative_debit_pence: 0, comparative_credit_pence: 0,
    }]);
  };

  const removeRow = (idx: number) => onChange(entries.filter((_, i) => i !== idx));

  const updateEntry = (idx: number, field: keyof TBEntry, value: any) => {
    const next = [...entries];
    (next[idx] as any)[field] = value;
    onChange(next);
  };

  const totalDebit = entries.reduce((a, e) => a + e.debit_pence, 0);
  const totalCredit = entries.reduce((a, e) => a + e.credit_pence, 0);
  const adjTotalDebit = entries.reduce((a, e) => a + e.adjustment_debit_pence, 0);
  const adjTotalCredit = entries.reduce((a, e) => a + e.adjustment_credit_pence, 0);
  const compTotalDebit = entries.reduce((a, e) => a + (e.comparative_debit_pence || 0), 0);
  const compTotalCredit = entries.reduce((a, e) => a + (e.comparative_credit_pence || 0), 0);
  const balanced = totalDebit === totalCredit;
  const finalDebit = totalDebit + adjTotalDebit;
  const finalCredit = totalCredit + adjTotalCredit;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Trial Balance</CardTitle>
              <CardDescription>Import from bookkeeping, CSV, bring forward from prior year, or enter manually. All values in £.</CardDescription>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button variant="default" size="sm" onClick={pullFromLedger} className="gap-1">
                <Database className="w-3.5 h-3.5" /> Pull from Ledger
              </Button>
              {priorPeriods.length > 0 && (
                <Button variant="outline" size="sm" onClick={() => setShowBfDialog(true)} className="gap-1">
                  <RotateCcw className="w-3.5 h-3.5" /> Bring Forward
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={loadTemplate}>
                <Download className="w-3.5 h-3.5 mr-1" /> Load Template
              </Button>
              <Button variant="outline" size="sm" onClick={handleCSVImport}>
                <Upload className="w-3.5 h-3.5 mr-1" /> Import CSV
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowAdj(!showAdj)}>
                {showAdj ? "Hide Adjustments" : "Show Adjustments"}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowComp(!showComp)}>
                {showComp ? "Hide Comparative" : "Show Comparative"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-auto max-h-[600px]">
            <Table>
              <TableHeader className="sticky top-0 bg-muted z-10">
                <TableRow>
                  <TableHead className="w-20">Code</TableHead>
                  <TableHead className="min-w-[180px]">Account Name</TableHead>
                  <TableHead className="w-24">Type</TableHead>
                  <TableHead className="w-28 text-right">Debit £</TableHead>
                  <TableHead className="w-28 text-right">Credit £</TableHead>
                  {showAdj && <>
                    <TableHead className="w-28 text-right bg-accent/30">Adj Dr £</TableHead>
                    <TableHead className="w-28 text-right bg-accent/30">Adj Cr £</TableHead>
                    <TableHead className="w-28 text-right">Final Dr £</TableHead>
                    <TableHead className="w-28 text-right">Final Cr £</TableHead>
                  </>}
                  {showComp && <>
                    <TableHead className="w-28 text-right bg-accent/30">Comp Dr £</TableHead>
                    <TableHead className="w-28 text-right bg-accent/30">Comp Cr £</TableHead>
                  </>}
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry, idx) => (
                  <TableRow key={idx} className="text-sm">
                    <TableCell className="p-1">
                      <Input className="h-8 text-xs" value={entry.account_code}
                        onChange={(e) => updateEntry(idx, "account_code", e.target.value)} />
                    </TableCell>
                    <TableCell className="p-1">
                      <Input className="h-8 text-xs" value={entry.account_name}
                        onChange={(e) => updateEntry(idx, "account_name", e.target.value)} />
                    </TableCell>
                    <TableCell className="p-1">
                      <Select value={entry.account_type} onValueChange={(v) => updateEntry(idx, "account_type", v)}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {ACCOUNT_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize text-xs">{t}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="p-1">
                      <Input className="h-8 text-xs text-right" type="number" step="0.01"
                        value={penceToStr(entry.debit_pence)}
                        onChange={(e) => updateEntry(idx, "debit_pence", strToPence(e.target.value))} />
                    </TableCell>
                    <TableCell className="p-1">
                      <Input className="h-8 text-xs text-right" type="number" step="0.01"
                        value={penceToStr(entry.credit_pence)}
                        onChange={(e) => updateEntry(idx, "credit_pence", strToPence(e.target.value))} />
                    </TableCell>
                    {showAdj && <>
                      <TableCell className="p-1 bg-accent/10">
                        <Input className="h-8 text-xs text-right" type="number" step="0.01"
                          value={penceToStr(entry.adjustment_debit_pence)}
                          onChange={(e) => updateEntry(idx, "adjustment_debit_pence", strToPence(e.target.value))} />
                      </TableCell>
                      <TableCell className="p-1 bg-accent/10">
                        <Input className="h-8 text-xs text-right" type="number" step="0.01"
                          value={penceToStr(entry.adjustment_credit_pence)}
                          onChange={(e) => updateEntry(idx, "adjustment_credit_pence", strToPence(e.target.value))} />
                      </TableCell>
                      <TableCell className="p-1 text-right text-xs font-medium">
                        {penceToStr(entry.debit_pence + entry.adjustment_debit_pence)}
                      </TableCell>
                      <TableCell className="p-1 text-right text-xs font-medium">
                        {penceToStr(entry.credit_pence + entry.adjustment_credit_pence)}
                      </TableCell>
                    </>}
                    {showComp && <>
                      <TableCell className="p-1 bg-blue-50/50 dark:bg-blue-950/20">
                        <Input className="h-8 text-xs text-right" type="number" step="0.01"
                          value={penceToStr(entry.comparative_debit_pence || 0)}
                          onChange={(e) => updateEntry(idx, "comparative_debit_pence", strToPence(e.target.value))} />
                      </TableCell>
                      <TableCell className="p-1 bg-blue-50/50 dark:bg-blue-950/20">
                        <Input className="h-8 text-xs text-right" type="number" step="0.01"
                          value={penceToStr(entry.comparative_credit_pence || 0)}
                          onChange={(e) => updateEntry(idx, "comparative_credit_pence", strToPence(e.target.value))} />
                      </TableCell>
                    </>}
                    <TableCell className="p-1">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => removeRow(idx)}>
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between mt-3">
            <Button variant="outline" size="sm" onClick={addRow}>
              <Plus className="w-3.5 h-3.5 mr-1" /> Add Row
            </Button>
            <div className="flex items-center gap-4 text-sm flex-wrap">
              <div className="flex items-center gap-2">
                {balanced ? <CheckCircle2 className="w-4 h-4 text-[hsl(var(--success))]" /> : <AlertTriangle className="w-4 h-4 text-[hsl(var(--warning))]" />}
                <span className="font-medium">TB: Dr £{penceToStr(totalDebit)} / Cr £{penceToStr(totalCredit)}</span>
                <Badge variant={balanced ? "default" : "destructive"} className="text-xs">
                  {balanced ? "Balanced" : `Difference £${penceToStr(Math.abs(totalDebit - totalCredit))}`}
                </Badge>
              </div>
              {showAdj && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">|</span>
                  <span className="font-medium">Adjusted: Dr £{penceToStr(finalDebit)} / Cr £{penceToStr(finalCredit)}</span>
                  <Badge variant={finalDebit === finalCredit ? "default" : "destructive"} className="text-xs">
                    {finalDebit === finalCredit ? "Balanced" : "Unbalanced"}
                  </Badge>
                </div>
              )}
              {showComp && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">|</span>
                  <span className="font-medium text-blue-600 dark:text-blue-400">Comp: Dr £{penceToStr(compTotalDebit)} / Cr £{penceToStr(compTotalCredit)}</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bring Forward Dialog */}
      <Dialog open={showBfDialog} onOpenChange={setShowBfDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bring Forward from Prior Period</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Select a prior period to bring forward. Balance sheet accounts (assets, liabilities, equity) 
              will carry their adjusted balances as opening figures. P&L accounts will start at zero. 
              The prior year's adjusted figures become the comparative column.
            </p>
            {priorPeriods.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No prior periods found for this client.</p>
            ) : (
              <div className="space-y-2">
                {priorPeriods.map((pp: any) => (
                  <Button
                    key={pp.id}
                    variant="outline"
                    className="w-full justify-between"
                    onClick={() => bringForward(pp.id)}
                  >
                    <span>
                      {new Date(pp.period_start).toLocaleDateString("en-GB", { month: "short", year: "numeric" })} – {new Date(pp.period_end).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}
                    </span>
                    <Badge variant={pp.status === "filed" ? "default" : "secondary"} className="text-xs capitalize">
                      {pp.status}
                    </Badge>
                  </Button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
