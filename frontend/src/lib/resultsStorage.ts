import type { FlightSearchResult } from '../types/flight-search-result';

const RESULTS_STORAGE_KEY = 'flight-search:results';

/**
 * Reads previously stored search results from local storage.
 * Returns an empty array when nothing is stored or the stored value is unusable.
 */
export function loadStoredResults(): FlightSearchResult[] {
  try {
    const raw = window.localStorage.getItem(RESULTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as FlightSearchResult[]) : [];
  } catch {
    return [];
  }
}

/**
 * Persists search results to local storage so they survive a page refresh.
 */
export function saveStoredResults(results: FlightSearchResult[]): void {
  try {
    window.localStorage.setItem(RESULTS_STORAGE_KEY, JSON.stringify(results));
  } catch {
    // Ignore write failures (e.g. storage disabled or quota exceeded).
  }
}
