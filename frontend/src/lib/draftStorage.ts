import type { SearchInputState } from './urlSearchState';

const DRAFT_STORAGE_KEY = 'flight-search:draft';

const emptyDraft = (): SearchInputState => ({
  origins: [],
  destinations: [],
  dates: { start: '', end: '' },
});

const asStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

/**
 * Coerces an arbitrary parsed value into a well-formed SearchInputState,
 * defaulting anything missing or malformed so callers always get a usable shape.
 */
function normalizeDraft(value: unknown): SearchInputState {
  if (!value || typeof value !== 'object') return emptyDraft();
  const { origins, destinations, dates } = value as Record<string, unknown>;
  const { start, end } = (dates ?? {}) as Record<string, unknown>;
  return {
    origins: asStringArray(origins),
    destinations: asStringArray(destinations),
    dates: {
      start: typeof start === 'string' ? start : '',
      end: typeof end === 'string' ? end : '',
    },
  };
}

/**
 * Reads the draft search inputs the user was editing before a refresh.
 * Returns empty defaults when nothing is stored or the stored value is unusable.
 *
 * This only matters before the first-ever search: once a search is committed the
 * URL query string becomes the source of truth on reload.
 */
export function loadDraftInputs(): SearchInputState {
  try {
    const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return emptyDraft();
    return normalizeDraft(JSON.parse(raw));
  } catch {
    return emptyDraft();
  }
}

/**
 * Persists the in-progress search inputs so they survive a page refresh.
 */
export function saveDraftInputs(inputs: SearchInputState): void {
  try {
    window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(inputs));
  } catch {
    // Ignore write failures (e.g. storage disabled or quota exceeded).
  }
}
