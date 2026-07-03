import { afterEach, describe, expect, it, vi } from 'vitest';

import { loadDraftInputs, saveDraftInputs } from '../draftStorage';
import type { SearchInputState } from '../urlSearchState';

const sampleDraft: SearchInputState = {
  origins: ['JFK', 'LAX'],
  destinations: ['ORD'],
  dates: { start: '2026-06-01', end: '2026-06-05' },
};

const emptyDraft: SearchInputState = {
  origins: [],
  destinations: [],
  dates: { start: '', end: '' },
};

describe('draftStorage', () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it('returns empty defaults when nothing is stored', () => {
    expect(loadDraftInputs()).toEqual(emptyDraft);
  });

  it('round-trips a draft through save and load', () => {
    saveDraftInputs(sampleDraft);
    expect(loadDraftInputs()).toEqual(sampleDraft);
  });

  it('returns empty defaults when the stored value is malformed', () => {
    window.localStorage.setItem('flight-search:draft', '{not json');
    expect(loadDraftInputs()).toEqual(emptyDraft);
  });

  it('coerces a partial or wrongly-typed stored value into a valid shape', () => {
    window.localStorage.setItem(
      'flight-search:draft',
      JSON.stringify({ origins: ['JFK', 7, null], destinations: 'nope', dates: { start: '2026-06-01' } })
    );

    expect(loadDraftInputs()).toEqual({
      origins: ['JFK'],
      destinations: [],
      dates: { start: '2026-06-01', end: '' },
    });
  });

  it('swallows write failures (e.g. quota exceeded or storage disabled)', () => {
    const setItemSpy = vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError');
    });

    expect(() => saveDraftInputs(sampleDraft)).not.toThrow();

    setItemSpy.mockRestore();
  });
});
