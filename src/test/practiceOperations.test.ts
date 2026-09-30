import { describe, it, expect } from 'vitest';
import { londonToday, operationHealth, payrollTotals, payrollReconciliation } from '@/lib/practiceOperations';
describe('operational priority', () => {
  it('keeps submitted and finalised obligations open after their due date', () => {
    for (const status of ['submitted','finalised']) expect(operationHealth({ status, dueDate:'2026-09-29' },'2026-09-30')).toBe('red');
  });
  it('handles completed, failed, missing and boundary dates', () => {
    expect(operationHealth({status:'accepted',dueDate:'2026-01-01'},'2026-09-30')).toBe('green');
    expect(operationHealth({status:'rejected',dueDate:null},'2026-09-30')).toBe('red');
    expect(operationHealth({status:'draft',dueDate:null},'2026-09-30')).toBe('amber');
    for (const dueDate of ['2026-09-30','2026-10-07','invalid']) expect(operationHealth({status:'draft',dueDate},'2026-09-30')).toBe('amber');
    expect(operationHealth({status:'draft',dueDate:'2026-10-08'},'2026-09-30')).toBe('green');
  });
  it('uses London calendar dates around midnight', () => expect(londonToday(new Date('2026-09-30T23:30:00Z'))).toBe('2026-10-01'));
});
describe('payroll reconciliation', () => {
  it('sums integer pence and flags mismatched or absent totals', () => {
    const slip = {gross_pence:10001,net_pence:8000,tax_pence:1000,ni_employee_pence:501,ni_employer_pence:900,pension_employee_pence:500,pension_employer_pence:300,student_loan_pence:0};
    const totals = payrollTotals([slip,slip]);
    expect(totals.gross_pence).toBe(20002);
    const run = Object.fromEntries(Object.entries(totals).map(([key,value]) => [`total_${key}`,value]));
    expect(payrollReconciliation(totals,run)).toEqual([]);
    run.total_net_pence = 1;
    expect(payrollReconciliation(totals,run)).toEqual(['net pence']);
    delete run.total_tax_pence;
    expect(payrollReconciliation(totals,run)).toContain('tax pence');
  });
});
