import { afterEach, describe, expect, it, vi } from 'vitest';

import { loadStoredResults, saveStoredResults } from '../resultsStorage';
import type { FlightSearchResult } from '../../types/flight-search-result';

const sampleResults: FlightSearchResult[] = [
  {
    date: '2026-06-01',
    origin: 'JFK',
    destination: 'LAX',
    flights: [],
  },
];

describe('resultsStorage', () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it('returns an empty array when nothing is stored', () => {
    expect(loadStoredResults()).toEqual([]);
  });

  it('round-trips results through save and load', () => {
    saveStoredResults(sampleResults);
    expect(loadStoredResults()).toEqual(sampleResults);
  });

  it('returns an empty array when the stored value is malformed', () => {
    window.localStorage.setItem('flight-search:results', '{not json');
    expect(loadStoredResults()).toEqual([]);
  });

  it('returns an empty array when the stored value is not an array', () => {
    window.localStorage.setItem('flight-search:results', JSON.stringify({ foo: 'bar' }));
    expect(loadStoredResults()).toEqual([]);
  });

  it('swallows write failures (e.g. quota exceeded or storage disabled)', () => {
    const setItemSpy = vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError');
    });

    expect(() => saveStoredResults(sampleResults)).not.toThrow();

    setItemSpy.mockRestore();
  });
});
