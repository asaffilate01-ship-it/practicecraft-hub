import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import RolesManagement from '@/pages/RolesManagement';

const state = vi.hoisted(() => ({ role: 'firm_owner' }));
vi.mock('@/hooks/usePermissions', () => ({ usePermissions: () => ({ role: state.role, tenantId: 'practice-1', loading: false }) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'user-1' } }) }));
vi.mock('@/integrations/supabase/client', () => {
  const q: any = { select: () => q, eq: () => q,
    order: async () => ({ error: null, data: [{ id: 'role-1', tenant_id: 'practice-1', name: 'Staff Accountant',
      permissions_json: { payroll: { run: true, approve: false } }, is_system_role: true }] }) };
  return { supabase: { from: () => q } };
});
beforeEach(() => { cleanup(); state.role = 'firm_owner'; });
function mount() { return render(<QueryClientProvider client={new QueryClient()}><RolesManagement /></QueryClientProvider>); }
describe('Role editor contract', () => {
  it('renders and toggles boolean permissions using the canonical payroll actions', async () => {
    mount(); fireEvent.click(await screen.findByRole('button', { name: 'Edit Staff Accountant' }));
    const run = screen.getByRole('checkbox', { name: 'Run' });
    expect(run).toBeChecked(); fireEvent.click(run); expect(run).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Submit RTI' })).toBeInTheDocument();
  });
  it('shows role definitions as read-only for staff', async () => {
    state.role = 'staff'; mount();
    expect(await screen.findByRole('button', { name: 'Edit Staff Accountant' })).toBeDisabled();
  });
});
