export type Health = 'red' | 'amber' | 'green';
export interface Operation {
  id: string; source: string; title: string; clientId: string | null;
  status: string; dueDate: string | null; href: string;
}
const closed = new Set(['done', 'completed', 'complete', 'cancelled', 'accepted', 'filed']);
export function londonToday(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}
export function operationHealth(item: Pick<Operation, 'status' | 'dueDate'>, today = londonToday(), warningDays = 7): Health {
  if (closed.has(item.status)) return 'green';
  if (['rejected', 'failed', 'blocked'].includes(item.status)) return 'red';
  if (!item.dueDate) return 'amber';
  const due = Date.parse(item.dueDate.slice(0, 10));
  const current = Date.parse(today);
  if (!Number.isFinite(due) || !Number.isFinite(current)) return 'amber';
  if (due < current) return 'red';
  return due <= current + warningDays * 86400000 ? 'amber' : 'green';
}
export const isOpenOperation = (item: Operation) => !closed.has(item.status);
export interface PayrollTotals {
  gross_pence: number; net_pence: number; tax_pence: number; ni_employee_pence: number;
  ni_employer_pence: number; pension_employee_pence: number; pension_employer_pence: number; student_loan_pence: number;
}
export function payrollTotals(slips: PayrollTotals[]): PayrollTotals {
  const totals: PayrollTotals = { gross_pence: 0, net_pence: 0, tax_pence: 0, ni_employee_pence: 0, ni_employer_pence: 0, pension_employee_pence: 0, pension_employer_pence: 0, student_loan_pence: 0 };
  for (const slip of slips) for (const key of Object.keys(totals) as (keyof PayrollTotals)[]) totals[key] += slip[key] ?? 0;
  return totals;
}
export function payrollReconciliation(totals: PayrollTotals, run: Record<string, unknown>): string[] {
  return (Object.keys(totals) as (keyof PayrollTotals)[])
    .filter(key => typeof run[`total_${key}`] !== 'number' || run[`total_${key}`] !== totals[key])
    .map(key => key.replace(/_/g, ' '));
}
