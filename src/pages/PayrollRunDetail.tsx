import { PreparationReview } from "@/components/payroll/PreparationReview";
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuth } from '@/contexts/AuthContext';
import { payrollTotals, payrollReconciliation } from '@/lib/practiceOperations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
const money = (pence: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(pence / 100);
export default function PayrollRunDetail() {
  const { runId } = useParams();
  const { tenantId, can } = usePermissions();
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ['payroll-run-review', tenantId, user?.id, runId],
    enabled: !!tenantId && !!runId && can('payroll', 'view'),
    queryFn: async () => {
      const [run, slips] = await Promise.all([
        supabase.from('pay_runs').select('*, payroll_employers(employer_name,paye_reference,accounts_office_ref)').eq('tenant_id', tenantId!).eq('id', runId!).single(),
        supabase.from('payslips').select('id,employee_name,gross_pence,net_pence,tax_pence,ni_employee_pence,ni_employer_pence,pension_employee_pence,pension_employer_pence,student_loan_pence').eq('tenant_id', tenantId!).eq('pay_run_id', runId!).order('employee_name'),
      ]);
      if (run.error) throw run.error;
      if (slips.error) throw slips.error;
      return { run: run.data, slips: slips.data };
    },
  });
  if (query.isLoading) return <p role="status">Loading payroll review…</p>;
  if (query.isError) return <div role="alert">Unable to load this payroll run. <Button onClick={() => query.refetch()}>Retry</Button></div>;
  if (!query.data) return <p>Payroll run unavailable.</p>;
  const { run, slips } = query.data;
  const totals = payrollTotals(slips);
  const mismatches = payrollReconciliation(totals, run);
  const issues = [
    ...(!slips.length ? ['No payslips have been generated.'] : []),
    ...(!run.payroll_employers?.paye_reference ? ['Employer PAYE reference is missing.'] : []),
    ...(!run.payroll_employers?.accounts_office_ref ? ['Accounts Office reference is missing.'] : []),
    ...mismatches.map(field => `Run total does not reconcile: ${field}.`),
    ...(slips.some(s => s.net_pence < 0) ? ['One or more employees have negative net pay.'] : []),
  ];
  return <div className="space-y-6">
    <Button asChild variant="outline"><Link to="/payroll">← Payroll workbench</Link></Button>
    <div><h1 className="text-2xl font-bold">{run.payroll_employers?.employer_name || 'Payroll'} · run review</h1><p className="text-muted-foreground">Pay date {run.pay_date} · {run.pay_frequency} · {run.tax_year}, period {run.tax_period}</p><Badge variant="secondary">{run.status}</Badge></div>
    <div role="note" className="rounded-lg border border-amber-300 bg-amber-50 text-amber-900 p-4">Calculation validation outstanding. The existing calculator uses hard-coded rates. Reconciliation checks do not confirm tax accuracy, HMRC acceptance or payment. Independently validate this run before use.</div>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[['Gross pay', totals.gross_pence], ['Net pay', totals.net_pence], ['Employer NI', totals.ni_employer_pence], ['Total employer cost', totals.gross_pence + totals.ni_employer_pence + totals.pension_employer_pence]].map(([label, value]) => <Card key={label}><CardHeader><CardTitle className="text-sm">{label}</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{money(Number(value))}</CardContent></Card>)}</div>
    <Card><CardHeader><CardTitle>Preparation checks</CardTitle></CardHeader><CardContent>{issues.length ? <ul className="list-disc pl-5 space-y-2">{issues.map(issue => <li key={issue}>{issue}</li>)}</ul> : <p>Stored payslips reconcile to the run totals and employer references are present.</p>}</CardContent></Card>
    <Card><CardHeader><CardTitle>Employee breakdown ({slips.length})</CardTitle></CardHeader><CardContent className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left">{['Employee','Gross','PAYE','Employee NI','Pension','Student loan','Net'].map(h => <th className="p-3" key={h}>{h}</th>)}</tr></thead><tbody>{slips.map(s => <tr className="border-b" key={s.id}><td className="p-3">{s.employee_name}</td>{[s.gross_pence,s.tax_pence,s.ni_employee_pence,s.pension_employee_pence,s.student_loan_pence,s.net_pence].map((value,index) => <td className="p-3" key={index}>{money(value)}</td>)}</tr>)}</tbody></table></CardContent></Card>
    <PreparationReview runId={run.id} />
    <div className="flex gap-3 flex-wrap">{can('payroll','submit_rti') && <Button asChild variant="outline"><Link to={`/payroll/rti/fps/${run.id}`}>Open FPS preparation</Link></Button>}{run.fps_submission_job_id && can('submissions','view') && <Button asChild variant="outline"><Link to={`/submissions/jobs/${run.fps_submission_job_id}`}>View FPS acknowledgement</Link></Button>}</div>
  </div>;
}
