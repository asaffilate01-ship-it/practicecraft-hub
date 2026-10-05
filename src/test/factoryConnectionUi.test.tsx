import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FactoryConnectionPanel } from '@/components/intelligence/FactoryConnectionPanel';

const mocks = vi.hoisted(() => ({ invoke: vi.fn(), allowed: true }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'user-1' } }) }));
vi.mock('@/hooks/usePermissions', () => ({ usePermissions: () => ({ tenantId: 'local-tenant', can: () => mocks.allowed }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { functions: { invoke: mocks.invoke } } }));
const status = { configured: false, authority: 'local', mode: 'shadow', legacyAiProvider: 'Lovable not configured', productKey: null, centralTenantId: null };
function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}><FactoryConnectionPanel /></QueryClientProvider>);
}
beforeEach(() => { cleanup(); mocks.allowed = true; mocks.invoke.mockReset(); });

describe('Factory connection experience', () => {
  it('does not start an AI run merely by opening the page', async () => {
    mocks.invoke.mockResolvedValue({ data: status, error: null }); mount();
    expect(await screen.findByText('Not configured for this practice.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Verify Factory connection' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Request aggregate practice brief' })).toBeDisabled();
    expect(mocks.invoke).toHaveBeenCalledTimes(1);
    expect(mocks.invoke).toHaveBeenCalledWith('omniqora-bridge', { body: { action: 'status' } });
  });
  it('shows a deployment failure as unknown, not connected or healthy', async () => {
    mocks.invoke.mockResolvedValue({ data: null, error: { context: { json: async () => ({ error: 'Bridge unavailable' }) } } }); mount();
    expect(await screen.findByRole('alert')).toHaveTextContent('Bridge unavailable');
    expect(screen.queryByText('Snapshot verified')).not.toBeInTheDocument();
  });
  it('only verifies the configured tenant through a manual action', async () => {
    mocks.invoke.mockImplementation(async (_name, { body }) => ({ error: null, data: body.action === 'status'
      ? { ...status, configured: true, productKey: 'accountancy' }
      : { checkedAt: '2026-10-05T06:00:00Z', generatedAt: '2026-10-05T06:00:00Z', active: true,
        productKey: 'accountancy', tenantId: '22222222-2222-4222-8222-222222222222', services: [] } })); mount();
    const verify = screen.getByRole('button', { name: 'Verify Factory connection' });
    await waitFor(() => expect(verify).toBeEnabled()); fireEvent.click(verify);
    expect(await screen.findByText('Snapshot verified')).toBeInTheDocument();
    expect(mocks.invoke).toHaveBeenLastCalledWith('omniqora-bridge', { body: { action: 'snapshot' } });
  });
  it('does not load configuration for users without integration access', () => {
    mocks.allowed = false; mount(); expect(mocks.invoke).not.toHaveBeenCalled();
  });
});
