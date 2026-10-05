// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { requireStaff, requirePermissions, requireClient, validateSuggestions, validateIntelligence, validateReceipt } from '../../supabase/functions/_shared/access';
import { readBinding, validateSnapshot, requireIntelligence, callFactory, fetchSnapshot } from '../../supabase/functions/_shared/omniqora';

const local = '11111111-1111-4111-8111-111111111111';
const central = '22222222-2222-4222-8222-222222222222';
const binding = { origin: 'https://factory.example.test', productKey: 'accountancy', tenantId: central, credential: `oqcp_${'a'.repeat(40)}` };
const now = Date.parse('2026-10-05T06:00:00Z');
function snapshot() { return { schemaVersion: 4, generatedAt: new Date(now).toISOString(), internalTenantId: central,
  externalTenantId: local, productKey: 'accountancy', tenant: { id: central, status: 'active' },
  product: { product_key: 'accountancy', status: 'active' }, capabilities: ['intelligence.run.start', 'intelligence.run.read'],
  entitlements: { 'omniqora.intelligence-runtime': { enabled: true, status: 'active', validFrom: null, validUntil: null } } }; }

describe('Factory shadow contract', () => {
  it('does not invent a connection for an unmapped practice', () => {
    expect(readBinding(undefined, local)).toBeNull();
    expect(readBinding(JSON.stringify({ [central]: binding }), local)).toBeNull();
  });
  it('requires server-bound HTTPS credentials', () => {
    expect(readBinding(JSON.stringify({ [local]: binding }), local)).toEqual(binding);
    for (const origin of ['http://factory.example.test', 'https://user:secret@factory.example.test', 'https://factory.example.test/path'])
      expect(() => readBinding(JSON.stringify({ [local]: { ...binding, origin } }), local)).toThrow('invalid');
    expect(() => readBinding('invalid-json', local)).toThrow('invalid');
  });
  it('accepts a fresh correctly bound snapshot', () => {
    const verified = validateSnapshot(snapshot(), binding, local, now);
    expect(verified.services[0].enabled).toBe(true);
    expect(() => requireIntelligence(verified, 'run.start')).not.toThrow();
  });
  it.each(['externalTenantId', 'internalTenantId', 'productKey'])('refuses mismatched %s', key => {
    expect(() => validateSnapshot({ ...snapshot(), [key]: 'wrong' }, binding, local, now)).toThrow('scope or freshness');
  });
  it.each([-300001, 60001])('rejects stale or future snapshots (%i milliseconds)', offset => {
    expect(() => validateSnapshot({ ...snapshot(), generatedAt: new Date(now + offset).toISOString() }, binding, local, now)).toThrow();
  });
  it('fails closed on future, expired and malformed entitlement dates', () => {
    for (const dates of [{ validFrom: new Date(now + 1).toISOString() }, { validUntil: new Date(now).toISOString() }, { validUntil: 'invalid' }]) {
      const raw = snapshot(); Object.assign(raw.entitlements['omniqora.intelligence-runtime'], dates);
      const verified = validateSnapshot(raw, binding, local, now);
      expect(verified.services[0].enabled).toBe(false);
      expect(() => requireIntelligence(verified, 'run.start')).toThrow('entitlement');
    }
  });
  it('refuses inactive products and missing operation capabilities', () => {
    const raw = snapshot(); raw.product.status = 'suspended';
    expect(() => requireIntelligence(validateSnapshot(raw, binding, local, now), 'run.get')).toThrow();
    raw.product.status = 'active'; raw.capabilities = ['intelligence.run.read'];
    expect(() => requireIntelligence(validateSnapshot(raw, binding, local, now), 'run.start')).toThrow();
  });
  it('matches the current central POST contract and never follows redirects', async () => {
    const raw = { ...snapshot(), generatedAt: new Date().toISOString() };
    const send = vi.fn().mockResolvedValue(new Response(JSON.stringify(raw)));
    const result = await fetchSnapshot(binding, local, send);
    expect(result.tenantId).toBe(central);
    expect(send).toHaveBeenCalledWith('https://factory.example.test/api/control-plane/tenant-snapshot', expect.objectContaining({
      method: 'POST', redirect: 'error', body: JSON.stringify({ productKey: 'accountancy', externalTenantId: local }),
    }));
  });
  it('never falls back after an upstream auth or transport failure', async () => {
    for (const send of [vi.fn().mockResolvedValue(new Response('secret provider detail', { status: 403 })), vi.fn().mockRejectedValue(new Error('secret'))]) {
      await expect(callFactory(binding, '/api/platform/intelligence', {}, send)).rejects.toThrow(/refused|could not be reached/);
      expect(send).toHaveBeenCalledTimes(1);
    }
  });
  it('refuses malformed response bodies', async () => {
    await expect(callFactory(binding, '/api/platform/intelligence', {}, vi.fn().mockResolvedValue(new Response('<html>error</html>')))).rejects.toThrow('invalid response');
  });
});

function queryDb(data: unknown, error: unknown = null) {
  const query: any = { select: vi.fn(), eq: vi.fn(), single: vi.fn(), maybeSingle: vi.fn() };
  query.select.mockReturnValue(query); query.eq.mockReturnValue(query);
  query.single.mockResolvedValue({ data, error }); query.maybeSingle.mockResolvedValue({ data, error });
  return { from: vi.fn().mockReturnValue(query), query };
}
describe('AI access boundaries', () => {
  it('rejects unauthenticated callers and portal identities', async () => {
    const db = { auth: { getUser: vi.fn().mockResolvedValue({ data: null, error: 'bad token' }) }, rpc: vi.fn() };
    await expect(requireStaff(db, 'bad')).rejects.toThrow('Authentication');
    expect(db.rpc).not.toHaveBeenCalled();
    db.auth.getUser.mockResolvedValue({ data: { user: { id: local } }, error: null });
    db.rpc.mockResolvedValue({ data: { is_staff: false, staff_role: 'client_user', staff_tenant_id: local } });
    await expect(requireStaff(db, 'valid')).rejects.toThrow('Staff access');
  });
  it('requires all requested module permissions, even within the same tenant', async () => {
    const db = queryDb({ permissions_json: { ledger: { view: true, edit: false } } });
    await expect(requirePermissions(db, { tenantId: local, role: 'staff' }, ['ledger.view', 'ledger.edit'])).rejects.toThrow('permission');
    expect(db.query.eq).toHaveBeenCalledWith('tenant_id', local);
  });
  it('does not inherit an owner role from another tenant in the identity RPC', async () => {
    const db = { ...queryDb({ role: 'staff' }),
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: central } }, error: null }) },
      rpc: vi.fn().mockResolvedValue({ data: { is_staff: true, staff_tenant_id: local, staff_role: 'firm_owner' }, error: null }) };
    expect(await requireStaff(db, 'valid')).toEqual({ userId: central, tenantId: local, role: 'staff' });
    expect(db.query.eq).toHaveBeenCalledWith('tenant_id', local);
    expect(db.query.eq).toHaveBeenCalledWith('user_id', central);
  });
  it('fails closed on role lookup errors', async () => {
    await expect(requirePermissions(queryDb(null, 'offline'), { tenantId: local, role: 'staff' }, ['ledger.view'])).rejects.toThrow();
  });
  it('checks both client identity and tenant before exposing data', async () => {
    const db = queryDb(null);
    await expect(requireClient(db, local, central)).rejects.toThrow('unavailable');
    expect(db.query.eq).toHaveBeenCalledWith('tenant_id', local);
    expect(db.query.eq).toHaveBeenCalledWith('id', central);
  });
  it('rejects model-injected transaction IDs, account codes and duplicates', () => {
    const valid = { transaction_id: local, account_code: '4000', confidence: 'high' };
    expect(validateSuggestions([valid], [{ id: local }], [{ code: '4000' }])).toEqual([valid]);
    for (const result of [[{ ...valid, transaction_id: central }], [{ ...valid, account_code: '9999' }], [valid, valid]])
      expect(() => validateSuggestions(result, [{ id: local }], [{ code: '4000' }])).toThrow();
  });
  it('does not interpret missing model output as a clean analysis', () => {
    for (const action of ['suggest_tasks', 'detect_anomalies', 'churn_risk']) expect(() => validateIntelligence({}, action)).toThrow();
    expect(validateIntelligence({ anomalies: [], summary: 'No flags in the sample' }, 'detect_anomalies').anomalies).toEqual([]);
  });
  it('rejects unbalanced or fractional receipt amounts and unsupported currencies', () => {
    const receipt = { supplier_name: 'Test', total_pence: 1200, vat_pence: 200, subtotal_pence: 1000, confidence: 'high', currency: 'GBP' };
    expect(validateReceipt(receipt)).toEqual(receipt);
    for (const changes of [{ subtotal_pence: 900 }, { total_pence: 1200.1 }, { currency: 'EUR' }, { vat_pence: 1300 }])
      expect(() => validateReceipt({ ...receipt, ...changes })).toThrow('manual review');
  });
});
