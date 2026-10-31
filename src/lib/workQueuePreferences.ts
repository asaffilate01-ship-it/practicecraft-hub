/** Minimal, non-sensitive display preferences; NEVER store client names, searches, records or amounts. */
export type WorkQueueHealth = 'all' | 'red' | 'amber' | 'green';
export type WorkQueueSource = 'all' | 'Tasks' | 'Documents' | 'Accounts' | 'Payroll' | 'Submissions';
export type WorkQueuePreferences = {
  health: WorkQueueHealth;
  source: WorkQueueSource;
  showClosed: boolean;
  view: 'list' | 'board';
};
export const DEFAULT_WORK_QUEUE_PREFERENCES: WorkQueuePreferences = {
  health: 'all',
  source: 'all',
  showClosed: false,
  view: 'list',
};
const sources: readonly WorkQueueSource[] = ['all', 'Tasks', 'Documents', 'Accounts', 'Payroll', 'Submissions'];
const healths: readonly WorkQueueHealth[] = ['all', 'red', 'amber', 'green'];

export function parseWorkQueueSource(value: string): WorkQueueSource {
  return sources.includes(value as WorkQueueSource) ? value as WorkQueueSource : 'all';
}

/** Browser UI preferences are separately keyed for each authenticated staff user and practice. */
export function getWorkQueuePreferenceKey(tenantId?: string | null, userId?: string | null): string | null {
  if (!tenantId || !userId) return null;
  return `taxlounge:queue:v1:${encodeURIComponent(tenantId)}:${encodeURIComponent(userId)}`;
}
function localStore(): Storage | null {
  try { return typeof window !== 'undefined' ? window.localStorage : null; } catch { return null; }
}
export function readWorkQueuePreferences(key: string | null, storage: Pick<Storage, 'getItem'> | null = localStore()): WorkQueuePreferences {
  if (!key || !storage) return { ...DEFAULT_WORK_QUEUE_PREFERENCES };
  try {
    const raw = storage.getItem(key);
    if (!raw) return { ...DEFAULT_WORK_QUEUE_PREFERENCES };
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return { ...DEFAULT_WORK_QUEUE_PREFERENCES };
    const value = parsed as Record<string, unknown>;
    return {
      health: healths.includes(value.health as WorkQueueHealth) ? value.health as WorkQueueHealth : 'all',
      source: typeof value.source === 'string' ? parseWorkQueueSource(value.source) : 'all',
      showClosed: value.showClosed === true,
      view: value.view === 'board' ? 'board' : 'list',
    };
  } catch {
    return { ...DEFAULT_WORK_QUEUE_PREFERENCES };
  }
}
export function saveWorkQueuePreferences(key: string | null, preferences: WorkQueuePreferences, storage: Pick<Storage, 'setItem'> | null = localStore()): boolean {
  if (!key || !storage) return false;
  try {
    const safe: WorkQueuePreferences = {
      health: healths.includes(preferences.health) ? preferences.health : 'all',
      source: parseWorkQueueSource(preferences.source),
      showClosed: preferences.showClosed === true,
      view: preferences.view === 'board' ? 'board' : 'list',
    };
    storage.setItem(key, JSON.stringify(safe));
    return true;
  } catch {
    return false;
  }
}
