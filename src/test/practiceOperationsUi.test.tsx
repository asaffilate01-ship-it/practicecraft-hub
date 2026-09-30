import { fireEvent, render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import PracticeOperations from '@/pages/PracticeOperations';
const state = vi.hoisted(() => ({ client: null as string | null, allowed: ['payroll'], errors: [] as string[] }));
vi.mock('@/hooks/usePermissions', () => ({ usePermissions: () => ({ can: (module: string) => state.allowed.includes(module) }) }));
vi.mock('@/contexts/ClientContext', () => ({ useClientContext: () => ({ selectedClientId: state.client, selectedClientName: null }) }));
vi.mock('@/hooks/usePracticeOperations', () => ({ usePracticeOperations: () => ({ isLoading: false, isFetching: false, refetch: vi.fn(), data: { errors: state.errors, rows: [
  {id:'a',source:'Payroll',title:'Acme payroll',clientId:'a',status:'rejected',dueDate:null,href:'/payroll/runs/a'},
  {id:'b',source:'Documents',title:'Bank statements',clientId:'b',status:'open',dueDate:null,href:'/documents/requests'},
] } }) }));
afterEach(() => { cleanup(); state.client = null; state.errors = []; });
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
  it('shows incomplete-data failures instead of a success message', () => {
    state.errors = ['payroll'];
    render(<MemoryRouter><PracticeOperations /></MemoryRouter>);
    expect(screen.getByRole('alert')).toHaveTextContent('Counts are incomplete');
  });
});
