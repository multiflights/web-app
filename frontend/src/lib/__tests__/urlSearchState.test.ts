import { describe, expect, it } from 'vitest';

import {
  buildSearchParams,
  isValidDateParam,
  parseSearchParams,
  sanitizeDates,
  sanitizeSearchDates,
} from '../urlSearchState';

describe('urlSearchState', () => {
  it('parses origins, destinations, and dates from a query string', () => {
    const result = parseSearchParams(
      '?origins=JFK,LAX&destinations=ORD&start=2026-06-01&end=2026-06-02&returnStart=2026-06-10&returnEnd=2026-06-12'
    );

    expect(result).toEqual({
      origins: ['JFK', 'LAX'],
      destinations: ['ORD'],
      dates: { start: '2026-06-01', end: '2026-06-02' },
      returnDates: { start: '2026-06-10', end: '2026-06-12' },
    });
  });

  it('trims whitespace and uppercases airport codes', () => {
    const result = parseSearchParams('?origins= jfk , lax &destinations=ord');

    expect(result.origins).toEqual(['JFK', 'LAX']);
    expect(result.destinations).toEqual(['ORD']);
  });

  it('falls back to empty defaults when params are missing', () => {
    const result = parseSearchParams('');

    expect(result).toEqual({
      origins: [],
      destinations: [],
      dates: { start: '', end: '' },
      returnDates: { start: '', end: '' },
    });
  });

  it('drops empty entries produced by stray commas', () => {
    const result = parseSearchParams('?origins=JFK,,LAX,');

    expect(result.origins).toEqual(['JFK', 'LAX']);
  });

  it('builds a query string from search state', () => {
    const query = buildSearchParams({
      origins: ['JFK', 'LAX'],
      destinations: ['ORD'],
      dates: { start: '2026-06-01', end: '2026-06-02' },
      returnDates: { start: '2026-06-10', end: '2026-06-12' },
    });

    expect(query).toBe(
      '?origins=JFK%2CLAX&destinations=ORD&start=2026-06-01&end=2026-06-02&returnStart=2026-06-10&returnEnd=2026-06-12'
    );
  });

  it('returns an empty string when all fields are empty', () => {
    const query = buildSearchParams({
      origins: [],
      destinations: [],
      dates: { start: '', end: '' },
      returnDates: { start: '', end: '' },
    });

    expect(query).toBe('');
  });

  it('accepts real calendar dates and rejects empty or unparseable ones', () => {
    expect(isValidDateParam('2026-06-01')).toBe(true);
    expect(isValidDateParam('')).toBe(false);
    expect(isValidDateParam('not-a-date')).toBe(false);
    expect(isValidDateParam('june first')).toBe(false);
  });

  it('sanitizes a date range by dropping only the invalid endpoints', () => {
    expect(sanitizeDates({ start: '2026-06-01', end: 'garbage' })).toEqual({
      start: '2026-06-01',
      end: '',
    });
    expect(sanitizeDates({ start: 'garbage', end: '2026-06-05' })).toEqual({
      start: '',
      end: '2026-06-05',
    });
  });

  it('drops a return range that starts before the departure range', () => {
    expect(
      sanitizeSearchDates(
        { start: '2026-06-10', end: '2026-06-12' },
        { start: '2026-06-09', end: '2026-06-15' }
      )
    ).toEqual({
      dates: { start: '2026-06-10', end: '2026-06-12' },
      returnDates: { start: '', end: '' },
    });
  });

  it('round-trips through parse and build', () => {
    const original = {
      origins: ['JFK', 'LAX'],
      destinations: ['ORD', 'SFO'],
      dates: { start: '2026-06-01', end: '2026-06-05' },
      returnDates: { start: '2026-06-10', end: '2026-06-12' },
    };

    const roundTripped = parseSearchParams(buildSearchParams(original));

    expect(roundTripped).toEqual(original);
  });
});
