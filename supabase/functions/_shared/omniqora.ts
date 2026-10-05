import { AccessError, uuid } from './access.ts';

export type Binding = { origin: string; productKey: string; tenantId: string; credential: string };
export function readBinding(raw: string | undefined, localTenantId: string): Binding | null {
  if (!raw) return null;
  let config: unknown;
  try { config = JSON.parse(raw); } catch { throw new AccessError('Factory configuration is invalid', 503); }
  const b = (config as Record<string, Binding>)?.[localTenantId];
  if (!b) return null;
  try {
    const url = new URL(b.origin);
    if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash
      || !uuid.test(b.tenantId) || !/^[a-z0-9][a-z0-9-]{1,79}$/.test(b.productKey)
      || !/^oqcp_[A-Za-z0-9_-]{35,250}$/.test(b.credential)) throw new Error();
    return { ...b, origin: url.origin };
  } catch { throw new AccessError('Factory configuration is invalid', 503); }
}

export async function callFactory(binding: Binding, path: string, body: unknown, send = fetch) {
  let response: Response;
  try {
    response = await send(`${binding.origin}${path}`, {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(15000),
      headers: { Authorization: `Bearer ${binding.credential}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch { throw new AccessError('Omniqora could not be reached; no fallback was used', 503); }
  if (!response.ok) throw new AccessError(`Omniqora refused the request (${response.status})`, response.status === 401 || response.status === 403 ? 403 : 502);
  const text = await response.text();
  if (text.length > 524288) throw new AccessError('Omniqora response exceeded the size limit', 502);
  try { return JSON.parse(text); } catch { throw new AccessError('Omniqora returned an invalid response', 502); }
}

// Verify all bindings and expiry ourselves, including future validFrom dates.
// This is a shadow check only: it never replaces local subscription authority.
export function validateSnapshot(raw: any, binding: Binding, localTenantId: string, now = Date.now()) {
  const generated = Date.parse(raw?.generatedAt);
  if (raw?.schemaVersion !== 4 || raw.externalTenantId !== localTenantId || raw.internalTenantId !== binding.tenantId
    || raw.productKey !== binding.productKey || raw.tenant?.id !== binding.tenantId || raw.product?.product_key !== binding.productKey
    || !Number.isFinite(generated) || generated > now + 60000 || now - generated > 300000
    || !Array.isArray(raw.capabilities) || !raw.capabilities.every((c: unknown) => typeof c === 'string')
    || !raw.entitlements || typeof raw.entitlements !== 'object' || Array.isArray(raw.entitlements))
    throw new AccessError('Omniqora snapshot failed scope or freshness checks', 502);
  const active = raw.tenant.status === 'active' && ['active', 'trial'].includes(raw.product.status);
  const services = Object.entries(raw.entitlements).map(([key, item]: [string, any]) => ({
    key,
    enabled: active && item?.enabled === true && ['active', 'trial'].includes(item.status)
      && (!item.validFrom || Date.parse(item.validFrom) <= now)
      && (!item.validUntil || Date.parse(item.validUntil) > now),
  }));
  return { checkedAt: new Date(now).toISOString(), generatedAt: raw.generatedAt as string,
    tenantId: binding.tenantId, productKey: binding.productKey, active, services, capabilities: raw.capabilities as string[] };
}

export async function fetchSnapshot(binding: Binding, localTenantId: string, send = fetch) {
  const raw = await callFactory(binding, '/api/control-plane/tenant-snapshot', {
    productKey: binding.productKey, externalTenantId: localTenantId,
  }, send);
  return validateSnapshot(raw, binding, localTenantId);
}

export function requireIntelligence(snapshot: ReturnType<typeof validateSnapshot>, operation: 'run.start' | 'run.get') {
  const capability = operation === 'run.start' ? 'intelligence.run.start' : 'intelligence.run.read';
  if (!snapshot.active || !snapshot.capabilities.includes(capability)
    || !snapshot.services.some(s => s.key === 'omniqora.intelligence-runtime' && s.enabled))
    throw new AccessError('An active Omniqora Intelligence entitlement and scoped capability are required');
}
