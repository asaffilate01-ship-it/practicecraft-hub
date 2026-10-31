import { fireEvent, render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import PracticeOperations from '@/pages/PracticeOperations';
import { getWorkQueuePreferenceKey } from '@/lib/workQueuePreferences';
const state = vi.hoisted(() => ({ client: null as string | null, allowed: ['payroll'], errors: [] as string[], features: { payroll: true, accounts: true, bookkeeping: true, practice_mgmt: true, billing: true, secretarial: true } }));
vi.mock('@/hooks/usePermissions', () => ({ usePermissions: () => ({ can: (module: string) => state.allowed.includes(module), tenantId: 'practice-a', role: 'firm_owner' }) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'alice' } }) }));
vi.mock('@/practice/features/PracticeFeaturesProvider', () => ({ usePracticeFeatures: () => state.features }));
vi.mock('@/contexts/ClientContext', () => ({ useClientContext: () => ({ selectedClientId: state.client, selectedClientName: null }) }));
vi.mock('@/hooks/usePracticeOperations', () => ({ usePracticeOperations: () => ({ isLoading: false, isFetching: false, refetch: vi.fn(), data: { errors: state.errors, rows: [
  {id:'a',source:'Payroll',title:'Acme payroll',clientId:'a',status:'rejected',dueDate:null,href:'/payroll/runs/a'},
  {id:'b',source:'Documents',title:'Bank statements',clientId:'b',status:'open',dueDate:null,href:'/documents/requests'},
] } }) }));
afterEach(() => { cleanup(); state.client = null; state.errors = []; state.allowed = ['payroll']; state.features = { payroll: true, accounts: true, bookkeeping: true, practice_mgmt: true, billing: true, secretarial: true }; window.localStorage.clear(); });
describe('practice operations journeys', () => {
  it('filters and explains an exception with its source action', () => {
    render(<MemoryRouter><PracticeOperations /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText('Search work queue'), {target:{value:'Acme'}});
    expect(screen.queryByText('Bank statements')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button',{name:'Acme payroll'}));
    expect(screen.getByText('Recommended next step')).toBeInTheDocument();
    expect(screen.getByRole('link',{name:/Open payroll workspace/})).toHaveAttribute('href','/payroll/runs/a');
    expect(screen.queryByRole('link',{name:/Tax & compliance/})).not.toBeInTheDocument();
  });
  it('respects selected client and supports board view', () => {
    state.client = 'a';
    render(<MemoryRouter><PracticeOperations /></MemoryRouter>);
    fireEvent.click(screen.getByLabelText('Board view'));
    expect(screen.getByText('Acme payroll')).toBeInTheDocument();
    expect(screen.queryByText('Bank statements')).not.toBeInTheDocument();
  });
  it('restores view settings for this practice and staff member without saving searched client text', () => {
    const key = getWorkQueuePreferenceKey('practice-a', 'alice')!;
    window.localStorage.setItem(key, JSON.stringify({ health: 'red', source: 'all', showClosed: false, view: 'board' }));
    render(<MemoryRouter><PracticeOperations /></MemoryRouter>);
    expect(screen.getByLabelText('Board view')).toHaveAttribute('aria-pressed', 'true');
    fireEvent.change(screen.getByLabelText('Search work queue'), { target: { value: 'Acme' } });
    fireEvent.click(screen.getByLabelText('List view'));
    const saved = window.localStorage.getItem(key)!;
    expect(JSON.parse(saved)).toMatchObject({ health: 'red', view: 'list' });
    expect(saved).not.toContain('Acme');
  });
  it('hides workspaces outside tenant feature entitlements even for permitted staff', () => {
    state.allowed = ['payroll', 'accounts'];
    state.features = { ...state.features, payroll: false };
    render(<MemoryRouter><PracticeOperations /></MemoryRouter>);
    expect(screen.queryByRole('link', { name: /Payroll & people/ })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Accounts & review/ })).toBeInTheDocument();
  });
  it('shows incomplete-data failures instead of a success message', () => {
    state.errors = ['payroll'];
    render(<MemoryRouter><PracticeOperations /></MemoryRouter>);
    expect(screen.getByRole('alert')).toHaveTextContent('Counts are incomplete');
  });
});
