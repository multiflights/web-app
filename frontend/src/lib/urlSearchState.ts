export interface SearchInputState {
  origins: string[];
  destinations: string[];
  dates: { start: string; end: string };
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
  };
}

export function buildSearchParams({ origins, destinations, dates }: SearchInputState): string {
  const params = new URLSearchParams();
  if (origins.length > 0) params.set('origins', origins.join(','));
  if (destinations.length > 0) params.set('destinations', destinations.join(','));
  if (dates.start) params.set('start', dates.start);
  if (dates.end) params.set('end', dates.end);

  const query = params.toString();
  return query ? `?${query}` : '';
}
