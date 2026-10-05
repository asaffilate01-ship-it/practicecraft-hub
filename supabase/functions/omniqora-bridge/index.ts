import { createClient } from 'npm:@supabase/supabase-js@2.57.2';
import { AccessError, requireStaff, requirePermissions, uuid } from '../_shared/access.ts';
import { readBinding, fetchSnapshot, requireIntelligence, callFactory } from '../_shared/omniqora.ts';

const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { headers });
  try {
    if (req.method !== 'POST') throw new AccessError('POST required', 405);
    const auth = req.headers.get('Authorization');
    if (!auth?.startsWith('Bearer ')) throw new AccessError('Authentication required', 401);
    const db = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ?? '',
      { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
    const actor = await requireStaff(db, auth.slice(7));
    await requirePermissions(db, actor, ['integrations.view']);
    const text = await req.text();
    if (text.length > 4096) throw new AccessError('Request too large', 413);
    let input: any;
    try { input = JSON.parse(text); } catch { throw new AccessError('Invalid JSON', 400); }
    if (!input || !['status', 'snapshot', 'run.start', 'run.get'].includes(input.action)
      || Object.keys(input).some(key => !['action', 'runId'].includes(key))) throw new AccessError('Invalid bridge request', 400);
    const binding = readBinding(Deno.env.get('OMNIQORA_CONNECTIONS_JSON'), actor.tenantId);
    if (input.action === 'status') return reply({ configured: !!binding, authority: 'local', mode: 'shadow',
      legacyAiProvider: Deno.env.get('LOVABLE_API_KEY') ? 'Lovable configured; runtime unverified' : 'Lovable not configured',
      productKey: binding?.productKey ?? null, centralTenantId: binding?.tenantId ?? null });
    if (!binding) throw new AccessError('This practice has no server-side Omniqora binding', 503);
    const snapshot = await fetchSnapshot(binding, actor.tenantId);
    if (input.action === 'snapshot') return reply({ ...snapshot, authority: 'local', mode: 'shadow' });
    await requirePermissions(db, actor, ['reports.view', 'clients.view', 'tasks.view']);
    requireIntelligence(snapshot, input.action);
    if (input.action === 'run.get') {
      if (typeof input.runId !== 'string' || !uuid.test(input.runId)) throw new AccessError('Valid run ID required', 400);
      const result = await callFactory(binding, '/api/platform/intelligence', {
        operation: 'run.get', tenantId: binding.tenantId, productKey: binding.productKey, runId: input.runId,
      });
      if (result?.run?.id !== input.runId || typeof result.run.status !== 'string') throw new AccessError('Invalid intelligence response', 502);
      // No action.review or write execution is exposed to this product.
      return reply({ run: { id: result.run.id, status: result.run.status, result: result.run.result ?? null,
        completedAt: result.run.completed_at ?? null }, advisoryOnly: true });
    }
    // Fixed bounded brief: never send raw names, amounts, payroll, documents or browser-supplied prompts.
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/London' });
    const [clients, tasks] = await Promise.all([
      db.from('clients').select('id', { count: 'exact', head: true }).eq('tenant_id', actor.tenantId).eq('status', 'active'),
      db.from('tasks').select('id', { count: 'exact', head: true }).eq('tenant_id', actor.tenantId)
        .lt('due_date', today).not('status', 'in', '(done,cancelled)'),
    ]);
    if (clients.error || tasks.error) throw new AccessError('Practice summary unavailable', 503);
    const result = await callFactory(binding, '/api/platform/intelligence', {
      operation: 'run.start', tenantId: binding.tenantId, productKey: binding.productKey, profile: 'operations', maxSteps: 4,
      goal: 'Suggest up to three practice-management review questions using only the supplied aggregate counts. State evidence limitations. Do not infer client identities, give tax advice, post entries, file returns, or execute actions.',
      inputVersion: 'practicecraft-aggregate-brief-v1',
      context: { asOf: today, activeClientCount: clients.count, overdueTaskCount: tasks.count, advisoryOnly: true }, sourceRefs: [],
    });
    if (!uuid.test(result?.runId ?? '') || !uuid.test(result?.jobId ?? '') || result.status !== 'queued') throw new AccessError('Invalid intelligence receipt', 502);
    return reply({ runId: result.runId, jobId: result.jobId, status: 'queued', advisoryOnly: true }, 202);
  } catch (error) {
    return reply({ error: error instanceof AccessError ? error.message : 'Bridge request failed' }, error instanceof AccessError ? error.status : 500);
  }
});
