import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/hooks/usePermissions";

export interface DashboardKPIs {
  active_clients: number;
  open_tasks: number;
  overdue_tasks: number;
  vat_due_14d: number;
  overdue_invoices: number;
}

export interface OverdueTask {
  task_id: string;
  title: string;
  status: string;
  priority: string;
  due_date: string;
  days_overdue: number;
  client_id: string | null;
  client_legal_name: string | null;
  assigned_user_name: string | null;
}

export interface UpcomingTask {
  task_id: string;
  title: string;
  status: string;
  priority: string;
  due_date: string;
  days_until_due: number;
  client_id: string | null;
  client_legal_name: string | null;
  assigned_user_name: string | null;
}

export interface BillingKPI {
  month: string;
  invoices_count: number;
  invoices_total: number;
  paid_total: number | null;
  overdue_count: number;
  overdue_total: number | null;
}

export interface SubmissionSuccess {
  provider: string;
  submission_type: string;
  total_30d: number;
  accepted_30d: number;
  rejected_30d: number;
  success_pct_30d: number;
}

export function useDashboardKPIs() {
  const { tenantId } = usePermissions();

  return useQuery({
    queryKey: ["dashboard-kpis", tenantId],
    queryFn: async () => {
      // Use raw queries against views via RPC or direct table queries
      const [clientsRes, openTasksRes, overdueTasksRes, vatRes, invoicesRes] = await Promise.all([
        supabase.from("clients").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("tasks").select("id", { count: "exact", head: true }).not("status", "in", '("done","cancelled")'),
        supabase.from("tasks").select("id", { count: "exact", head: true }).lt("due_date", new Date().toISOString().slice(0, 10)).not("status", "in", '("done","cancelled")'),
        supabase.from("vat_returns").select("id", { count: "exact", head: true }).eq("status", "draft"),
        supabase.from("invoices").select("id", { count: "exact", head: true }).eq("status", "overdue"),
      ]);

      return {
        active_clients: clientsRes.count || 0,
        open_tasks: openTasksRes.count || 0,
        overdue_tasks: overdueTasksRes.count || 0,
        vat_due_14d: vatRes.count || 0,
        overdue_invoices: invoicesRes.count || 0,
      } as DashboardKPIs;
    },
    enabled: !!tenantId,
    staleTime: 60_000,
  });
}

export function useOverdueTasks() {
  const { tenantId } = usePermissions();

  return useQuery({
    queryKey: ["overdue-tasks", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select(`
          id,
          title,
          status,
          priority,
          due_date,
          assigned_to_user_id,
          client_id,
          clients(legal_name)
        `)
        .lt("due_date", new Date().toISOString().slice(0, 10))
        .not("status", "in", '("done","cancelled")')
        .order("due_date", { ascending: true })
        .limit(20);

      if (error) throw error;

      return (data || []).map((t: any) => ({
        task_id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        due_date: t.due_date,
        days_overdue: Math.ceil((Date.now() - new Date(t.due_date).getTime()) / 86400000),
        client_id: t.client_id,
        client_legal_name: t.clients?.legal_name || null,
        assigned_user_name: null, // Would need profiles join
      })) as OverdueTask[];
    },
    enabled: !!tenantId,
    staleTime: 60_000,
  });
}

export function useUpcomingTasks() {
  const { tenantId } = usePermissions();
  const today = new Date().toISOString().slice(0, 10);
  const future = new Date();
  future.setDate(future.getDate() + 14);
  const futureStr = future.toISOString().slice(0, 10);

  return useQuery({
    queryKey: ["upcoming-tasks", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select(`
          id,
          title,
          status,
          priority,
          due_date,
          client_id,
          clients(legal_name)
        `)
        .gte("due_date", today)
        .lte("due_date", futureStr)
        .not("status", "in", '("done","cancelled")')
        .order("due_date", { ascending: true })
        .limit(20);

      if (error) throw error;

      return (data || []).map((t: any) => ({
        task_id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        due_date: t.due_date,
        days_until_due: Math.ceil((new Date(t.due_date).getTime() - Date.now()) / 86400000),
        client_id: t.client_id,
        client_legal_name: t.clients?.legal_name || null,
        assigned_user_name: null,
      })) as UpcomingTask[];
    },
    enabled: !!tenantId,
    staleTime: 60_000,
  });
}

export function useBillingKPIs() {
  const { tenantId } = usePermissions();

  return useQuery({
    queryKey: ["billing-kpis", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("issue_date, total, status")
        .order("issue_date", { ascending: true });

      if (error) throw error;

      // Group by month client-side
      const byMonth: Record<string, BillingKPI> = {};
      for (const inv of data || []) {
        const month = inv.issue_date.slice(0, 7); // YYYY-MM
        if (!byMonth[month]) {
          byMonth[month] = { month, invoices_count: 0, invoices_total: 0, paid_total: 0, overdue_count: 0, overdue_total: 0 };
        }
        byMonth[month].invoices_count++;
        byMonth[month].invoices_total += Number(inv.total);
        if (inv.status === "paid") byMonth[month].paid_total = (byMonth[month].paid_total || 0) + Number(inv.total);
        if (inv.status === "overdue") {
          byMonth[month].overdue_count++;
          byMonth[month].overdue_total = (byMonth[month].overdue_total || 0) + Number(inv.total);
        }
      }

      return Object.values(byMonth).slice(-6) as BillingKPI[];
    },
    enabled: !!tenantId,
    staleTime: 5 * 60_000,
  });
}
