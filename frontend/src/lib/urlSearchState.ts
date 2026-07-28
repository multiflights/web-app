export interface SearchInputState {
  origins: string[];
  destinations: string[];
  dates: { start: string; end: string };
  returnDates: { start: string; end: string };
}

const parseAirportList = (value: string | null): string[] => {
  if (!value) return [];
  return value
    .split(',')
    .map(code => code.trim().toUpperCase())
    .filter(Boolean);
};

export function parseSearchParams(search: string): SearchInputState {
  const params = new URLSearchParams(search);
  return {
    origins: parseAirportList(params.get('origins')),
    destinations: parseAirportList(params.get('destinations')),
    dates: {
      start: params.get('start') ?? '',
      end: params.get('end') ?? '',
    },
    returnDates: {
      start: params.get('returnStart') ?? '',
      end: params.get('returnEnd') ?? '',
    },
  };
}

export function buildSearchParams({ origins, destinations, dates, returnDates }: SearchInputState): string {
  const params = new URLSearchParams();
  if (origins.length > 0) params.set('origins', origins.join(','));
  if (destinations.length > 0) params.set('destinations', destinations.join(','));
  if (dates.start) params.set('start', dates.start);
  if (dates.end) params.set('end', dates.end);
  if (returnDates.start) params.set('returnStart', returnDates.start);
  if (returnDates.end) params.set('returnEnd', returnDates.end);

  const query = params.toString();
  return query ? `?${query}` : '';
}

/**
 * True when a string is a real, parseable calendar date. Parsed the same way the
 * date picker parses stored values, so anything that would make the picker choke
 * (e.g. letters, or a partial value like "2026") is rejected here.
 */
export function isValidDateParam(value: string): boolean {
  return value !== '' && !Number.isNaN(new Date(`${value}T00:00:00`).getTime());
}

/**
 * Drops any date that is not a real calendar date, leaving that field empty.
 */
export function sanitizeDates(dates: SearchInputState['dates']): SearchInputState['dates'] {
  return {
    start: isValidDateParam(dates.start) ? dates.start : '',
    end: isValidDateParam(dates.end) ? dates.end : '',
  };
}

export function sanitizeSearchDates(
  dates: SearchInputState['dates'],
  returnDates: SearchInputState['returnDates']
): Pick<SearchInputState, 'dates' | 'returnDates'> {
  const sanitizedDates = sanitizeDates(dates);
  const sanitizedReturnDates = sanitizeDates(returnDates);

  if (
    sanitizedDates.start &&
    sanitizedReturnDates.start &&
    sanitizedReturnDates.start < sanitizedDates.start
  ) {
    return { dates: sanitizedDates, returnDates: { start: '', end: '' } };
  }

  return { dates: sanitizedDates, returnDates: sanitizedReturnDates };
}

/**
 * True when the URL carries any search-related parameter at all. Because the
 * URL is only written when a search is triggered, this doubles as "a search was
 * committed at some point" — even if the committed search was incomplete.
 */
export function hasAnySearchParam({ origins, destinations, dates, returnDates }: SearchInputState): boolean {
  return origins.length > 0 || destinations.length > 0 || Boolean(dates.start) || Boolean(dates.end)
    || Boolean(returnDates.start) || Boolean(returnDates.end);
}

/**
 * True when the params describe a runnable search: at least one origin, one
 * destination, and a start date (the end date is optional for single-day
 * searches). Only a complete search should be auto-replayed on load.
 */
export function isCompleteSearch({ origins, destinations, dates }: SearchInputState): boolean {
  return origins.length > 0 && destinations.length > 0 && Boolean(dates.start);
}
