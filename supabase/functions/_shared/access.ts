// This client must carry the caller's JWT: RLS remains active for every query.
// Structural typing keeps these guards testable without a Deno runtime.
export class AccessError extends Error {
  constructor(message: string, public status = 403) { super(message); }
}
export const roleNames: Record<string, string> = {
  super_admin: 'Firm Owner', firm_owner: 'Firm Owner', manager: 'Manager',
  staff: 'Staff Accountant', payroll_officer: 'Payroll Officer',
};
export async function requireStaff(db: any, token: string) {
  const { data, error } = await db.auth.getUser(token);
  if (error || !data?.user) throw new AccessError('Authentication required', 401);
  const type = await db.rpc('get_user_type', { _user_id: data.user.id });
  const identity = type.data;
  if (type.error || !identity?.is_staff || !identity.staff_tenant_id)
    throw new AccessError('Staff access required');
  // The legacy identity RPC selects the first role across tenants. Never use
  // that role to grant owner access in a different practice.
  const membership = await db.from('user_roles').select('role')
    .eq('user_id', data.user.id).eq('tenant_id', identity.staff_tenant_id).maybeSingle();
  if (membership.error || !membership.data || !roleNames[membership.data.role]) throw new AccessError('Staff membership unavailable');
  return { userId: data.user.id as string, tenantId: identity.staff_tenant_id as string, role: membership.data.role as string };
}
export async function requirePermissions(db: any, actor: { tenantId: string; role: string }, permissions: string[]) {
  if (['super_admin', 'firm_owner'].includes(actor.role)) return;
  const { data, error } = await db.from('roles').select('permissions_json')
    .eq('tenant_id', actor.tenantId).eq('name', roleNames[actor.role]).single();
  if (error || !data || permissions.some(key => {
    const [module, action] = key.split('.');
    return data.permissions_json?.[module]?.[action] !== true;
  })) throw new AccessError('Required module permission missing');
}
export async function requireClient(db: any, tenantId: string, clientId: unknown) {
  if (typeof clientId !== 'string' || !uuid.test(clientId)) throw new AccessError('Valid client ID required', 400);
  const { data, error } = await db.from('clients').select('id').eq('tenant_id', tenantId).eq('id', clientId).maybeSingle();
  if (error || !data) throw new AccessError('Client unavailable', 404);
  return clientId;
}
export const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const intelligencePermissions: Record<string, string[]> = {
  suggest_tasks: ['tasks.view', 'clients.view', 'accounts.view', 'vat.view'],
  detect_anomalies: ['ledger.view', 'clients.view'],
  churn_risk: ['reports.view', 'clients.view', 'tasks.view', 'billing.view'],
  revenue_insights: ['reports.view', 'billing.view'],
  staff_utilisation: ['reports.view'],
};

export function validateSuggestions(value: unknown, transactions: Array<{ id: string }>, accounts: Array<{ code: string }>) {
  if (!Array.isArray(value) || value.length > transactions.length) throw new AccessError('Invalid AI suggestions', 502);
  const ids = new Set(transactions.map(t => t.id)), codes = new Set(accounts.map(a => a.code)), seen = new Set();
  for (const item of value) {
    if (!item || !ids.has(item.transaction_id) || !codes.has(item.account_code) || seen.has(item.transaction_id)
      || !['high', 'medium', 'low'].includes(item.confidence)) throw new AccessError('AI returned an invalid transaction or account', 502);
    seen.add(item.transaction_id);
  }
  return value as Array<{ transaction_id: string; account_code: string; confidence: string; reason?: string }>;
}

export function validateIntelligence(value: any, action: string) {
  const text = (x: unknown) => typeof x === 'string' && x.length <= 5000;
  let valid = false;
  if (action === 'suggest_tasks') valid = Array.isArray(value?.suggestions) && value.suggestions.length <= 10
    && value.suggestions.every((s: any) => text(s.title) && s.title.trim().length > 0 && text(s.reason)
      && ['low', 'medium', 'high', 'urgent'].includes(s.priority)
      && [s.description, s.client_name, s.service].every(x => x == null || text(x))
      && (s.suggested_due_date == null || /^\d{4}-\d{2}-\d{2}$/.test(s.suggested_due_date)));
  if (action === 'detect_anomalies') valid = Array.isArray(value?.anomalies) && value.anomalies.length <= 100 && text(value.summary)
    && value.anomalies.every((a: any) => text(a.description) && text(a.explanation)
      && ['low', 'medium', 'high'].includes(a.severity)
      && ['duplicate', 'unusual_amount', 'personal_expense', 'uncategorised_high_value', 'pattern_break', 'round_number'].includes(a.anomaly_type));
  if (action === 'churn_risk') valid = Array.isArray(value?.risks) && value.risks.length <= 50
    && value.risks.every((r: any) => text(r.clientName) && ['low', 'medium', 'high'].includes(r.riskLevel)
      && Number.isFinite(r.riskScore) && r.riskScore >= 0 && r.riskScore <= 100
      && Array.isArray(r.signals) && r.signals.every(text));
  if (!valid) throw new AccessError('AI returned an invalid analysis; no conclusion is available', 502);
  return value;
}

export function validateReceipt(value: any) {
  if (!value || typeof value.supplier_name !== 'string' || !value.supplier_name.trim()
    || !['high', 'medium', 'low'].includes(value.confidence)
    || !Number.isSafeInteger(value.total_pence) || value.total_pence < 0
    || (value.vat_pence != null && (!Number.isSafeInteger(value.vat_pence) || value.vat_pence < 0 || value.vat_pence > value.total_pence))
    || (value.subtotal_pence != null && (!Number.isSafeInteger(value.subtotal_pence) || value.subtotal_pence < 0
      || value.subtotal_pence + (value.vat_pence ?? 0) !== value.total_pence))
    || (value.currency != null && value.currency !== 'GBP'))
    throw new AccessError('Receipt amounts require manual review; automatic extraction was not saved', 502);
  return value;
}
