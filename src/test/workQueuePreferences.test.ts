import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_WORK_QUEUE_PREFERENCES, getWorkQueuePreferenceKey, parseWorkQueueSource, readWorkQueuePreferences, saveWorkQueuePreferences } from '@/lib/workQueuePreferences';

function storage() {
  const records = new Map<string, string>();
  return {
    getItem: vi.fn((key: string) => records.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => { records.set(key, value); }),
  };
}
describe('TaxLounge personal work queue preferences', () => {
  it('does not persist preferences without both verified identities', () => {
    const s = storage();
    expect(getWorkQueuePreferenceKey(null, 'user-a')).toBeNull();
    expect(getWorkQueuePreferenceKey('practice-a', null)).toBeNull();
    expect(saveWorkQueuePreferences(null, DEFAULT_WORK_QUEUE_PREFERENCES, s)).toBe(false);
    expect(s.setItem).not.toHaveBeenCalled();
  });
  it('scopes data to the current practice and staff identity', () => {
    const s = storage();
    const alice = getWorkQueuePreferenceKey('practice-a', 'alice')!;
    const bob = getWorkQueuePreferenceKey('practice-a', 'bob')!;
    const other = getWorkQueuePreferenceKey('practice-b', 'alice')!;
    expect(saveWorkQueuePreferences(alice, { health: 'red', source: 'Payroll', view: 'board', showClosed: true }, s)).toBe(true);
    expect(readWorkQueuePreferences(alice, s)).toEqual({ health: 'red', source: 'Payroll', view: 'board', showClosed: true });
    expect(readWorkQueuePreferences(bob, s)).toEqual(DEFAULT_WORK_QUEUE_PREFERENCES);
    expect(readWorkQueuePreferences(other, s)).toEqual(DEFAULT_WORK_QUEUE_PREFERENCES);
  });
  it('rejects malformed or unexpected stored values and does not save search terms', () => {
    const s = storage();
    const key = getWorkQueuePreferenceKey('practice-a', 'alice')!;
    s.setItem(key, '{"health":"paid","source":"../../private","view":"unsafe","showClosed":"yes","search":"customer data"}');
    expect(readWorkQueuePreferences(key, s)).toEqual(DEFAULT_WORK_QUEUE_PREFERENCES);
    expect(parseWorkQueueSource('../other')).toBe('all');
    saveWorkQueuePreferences(key, { health: 'amber', source: 'Tasks', view: 'list', showClosed: false }, s);
    expect(JSON.parse(s.getItem(key)!)).toEqual({ health: 'amber', source: 'Tasks', view: 'list', showClosed: false });
  });
  it('recovers from unavailable browser storage', () => {
    const key = getWorkQueuePreferenceKey('practice', 'user')!;
    const denied = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };
    expect(readWorkQueuePreferences(key, denied)).toEqual(DEFAULT_WORK_QUEUE_PREFERENCES);
    expect(saveWorkQueuePreferences(key, DEFAULT_WORK_QUEUE_PREFERENCES, denied)).toBe(false);
  });
});
