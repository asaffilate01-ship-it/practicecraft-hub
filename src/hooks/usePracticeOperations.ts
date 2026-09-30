import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuth } from '@/contexts/AuthContext';
import type { Operation } from '@/lib/practiceOperations';

export function usePracticeOperations() {
  const { tenantId, can, loading, userKind } = usePermissions();
  const { user } = useAuth();
  const allowed = ['tasks', 'documents', 'accounts', 'payroll', 'submissions'].filter(module => can(module, 'view'));
  return useQuery({
    queryKey: ['practice-operations', tenantId, user?.id, allowed.join(',')],
    enabled: !!tenantId && !loading && userKind === 'staff',
    queryFn: async () => {
      const rows: Operation[] = [];
      const errors: string[] = [];
      const load = async (module: string) => {
        // Explicit tenant scope supplements existing table RLS. Do not fetch
        // financial amounts or submission payloads for this aggregate view.
        if (module === 'tasks') {
          const { data, error } = await supabase.from('tasks').select('id,title,status,due_date,client_id').eq('tenant_id', tenantId!).order('due_date').limit(500);
          if (error) throw error;
          data.forEach(r => rows.push({ id: `task:${r.id}`, source: 'Tasks', title: r.title, status: r.status, dueDate: r.due_date, clientId: r.client_id, href: '/tasks' }));
        } else if (module === 'documents') {
          const { data, error } = await supabase.from('document_requests').select('id,title,status,due_date,client_id').eq('tenant_id', tenantId!).order('due_date').limit(500);
          if (error) throw error;
          data.forEach(r => rows.push({ id: `document:${r.id}`, source: 'Documents', title: r.title, status: r.status, dueDate: r.due_date, clientId: r.client_id, href: '/documents/requests' }));
        } else if (module === 'accounts') {
          const { data, error } = await supabase.from('accounts_periods').select('id,period_end,status,filing_deadline,client_id').eq('tenant_id', tenantId!).order('filing_deadline').limit(500);
          if (error) throw error;
          data.forEach(r => rows.push({ id: `accounts:${r.id}`, source: 'Accounts', title: `Accounts to ${r.period_end}`, status: r.status, dueDate: r.filing_deadline, clientId: r.client_id, href: `/review-centre?client=${r.client_id}&period=${r.id}` }));
        } else if (module === 'payroll') {
          const { data, error } = await supabase.from('pay_runs').select('id,status,pay_date,payroll_employers!inner(employer_name,client_id)').eq('tenant_id', tenantId!).order('pay_date', { ascending: false }).limit(500);
          if (error) throw error;
          data.forEach(r => rows.push({ id: `payroll:${r.id}`, source: 'Payroll', title: `${r.payroll_employers.employer_name} payroll`, status: r.status, dueDate: r.pay_date, clientId: r.payroll_employers.client_id, href: `/payroll/runs/${r.id}` }));
        } else {
          const { data, error } = await supabase.from('submission_jobs').select('id,submission_type,status,client_id').eq('tenant_id', tenantId!).order('created_at', { ascending: false }).limit(500);
          if (error) throw error;
          data.forEach(r => rows.push({ id: `submission:${r.id}`, source: 'Submissions', title: r.submission_type, status: r.status, dueDate: null, clientId: r.client_id, href: `/submissions/jobs/${r.id}` }));
        }
      };
      await Promise.all(allowed.map(async module => { try { await load(module); } catch { errors.push(module); } }));
      return { rows, errors };
    },
    staleTime: 30000,
  });
}
