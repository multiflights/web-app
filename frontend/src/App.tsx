import { useEffect, useRef, useState } from 'react';
import { useAirports } from './hooks/useAirports';
import { PageShell } from './components/PageShell';
import { SearchPanel } from './components/SearchPanel';
import { ResultsPanel } from './components/ResultsPanel';
import type { SearchStatus } from './components/StatusMessage';
import type {FlightSearchResult} from './types/flight-search-result';
import type {FlightSearchQuery} from './types/flight-search-query';
import { config } from './config';
import {
  buildSearchParams,
  hasAnySearchParam,
  isCompleteSearch,
  parseSearchParams,
  sanitizeDates,
  type SearchInputState,
} from './lib/urlSearchState';
import { loadDraftInputs, saveDraftInputs } from './lib/draftStorage';
import { CurrencyProvider } from './hooks/useCurrency';
import './styles/globals.css';

/**
 * Resolves the input field values to show on load.
 *
 * The URL query string records the *last committed search* — it is written only
 * when a search is triggered, never on plain input edits. So on load:
 *  - If the URL carries any search params, those win and any locally saved draft
 *    is ignored, so a refresh always resets the fields to the last search.
 *  - If the URL is empty, no search has ever been committed, so we restore the
 *    draft the user was typing before the refresh.
 *
 * Either way we sanitize the dates up front so a hand-edited, unparseable date in
 * the URL can never reach (and crash) the date picker. Airport codes can only be
 * validated once the airport list has loaded, which happens in a later effect.
 */
function getInitialInputs(): SearchInputState {
  const fromUrl = parseSearchParams(window.location.search);
  const inputs = hasAnySearchParam(fromUrl) ? fromUrl : loadDraftInputs();
  return { ...inputs, dates: sanitizeDates(inputs.dates) };
}

export default function App() {
  const { allAirports, loading: airportsLoading } = useAirports();
  const [origins, setOrigins] = useState<string[]>(() => getInitialInputs().origins);
  const [destinations, setDestinations] = useState<string[]>(() => getInitialInputs().destinations);
  const [dates, setDates] = useState(() => getInitialInputs().dates);
  // Whether this page load started from a committed search in the URL. Captured
  // once up front because validation may later strip the URL back to empty.
  const startedFromUrl = useRef(hasAnySearchParam(parseSearchParams(window.location.search)));
  const [results, setResults] = useState<FlightSearchResult[]>([]);
  const [status, setStatus] = useState<SearchStatus>({
    variant: 'neutral',
    message: 'Enter a route to search.',
  });
  const [loading, setLoading] = useState(false);

  /**
   * Helper to generate an array of YYYY-MM-DD strings between two dates
   */
  const getDatesInRange = (startDateStr: string, endDateStr: string): string[] => {
    const datesArr: string[] = [];
    let curr = new Date(startDateStr);
    // An empty end date means a single-day search: fall back to the start date.
    const end = new Date(endDateStr || startDateStr);

    if (isNaN(curr.getTime()) || isNaN(end.getTime()) || curr > end) return [];

    while (curr <= end) {
      datesArr.push(curr.toISOString().split('T')[0]);
      curr.setDate(curr.getDate() + 1);
    }
    return datesArr;
  };

  /**
   * Execution logic for the flight search. Operates on an explicit set of inputs
   * so it can be driven both by the Search button (current fields) and by the
   * on-load auto-refetch (the validated URL params).
   */
  const runSearch = async ({ origins, destinations, dates }: SearchInputState) => {
    const departureDates = getDatesInRange(dates.start, dates.end);


    const MAX_CALLS = 50;
    const estimatedCalls = origins.length * destinations.length * departureDates.length;
    if (estimatedCalls > MAX_CALLS) {
      const what = origins.length * destinations.length > 1
        ? `${origins.length} origins × ${destinations.length} destinations × ${departureDates.length} days`
        : `${departureDates.length}-day date range`;
      setStatus({
        variant: 'error',
        message: `Too many routes (${estimatedCalls}). Limit is ${MAX_CALLS}. Try a shorter date range or fewer airports. (${what})`,
      });
      return;
    }
    if (origins.length === 0 || destinations.length === 0) {
      setStatus({
        variant: 'error',
        message: 'Please add at least one departure and arrival airport.',
      });
      return;
    }
    if (departureDates.length === 0) {
      setStatus({
        variant: 'error',
        message: 'Please select both a start and end date.',
      });
      return;
    }

    // The search is valid, so commit it to the URL now. This is the only place
    // the URL is written, so a refresh replays exactly this search and discards
    // any input edits made afterwards.
    window.history.replaceState(
      null,
      '',
      buildSearchParams({ origins, destinations, dates }) || window.location.pathname
    );

    setLoading(true);
    setStatus({
      variant: 'loading',
      message: 'Searching flights…',
    });

    const searchQuery: FlightSearchQuery = {
      origins,
      destinations,
      departure_dates: departureDates
    };

    try {
      const response = await fetch(`${config.apiUrl}/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(searchQuery)
      });

      if (!response.ok) throw new Error('Search failed');

      const data: FlightSearchResult[] = await response.json();
      setResults(data);
      setStatus({
        variant: data.length > 0 ? 'success' : 'neutral',
        message: data.length > 0
          ? `${data.length} route option${data.length === 1 ? '' : 's'} found`
          : 'No flights found for this search.',
      });
    } catch (err) {
      console.error("Search failed", err);
      setStatus({
        variant: 'error',
        message: 'Search failed. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => runSearch({ origins, destinations, dates });

  /**
   * Swap the departure and arrival airport lists.
   */
  const handleSwap = () => {
    setOrigins(destinations);
    setDestinations(origins);
  };

  // Persist the in-progress inputs so a refresh before the first-ever search
  // keeps whatever the user has typed. Once a search is committed the URL takes
  // over on reload, so this draft only matters while the URL is still empty.
  useEffect(() => {
    saveDraftInputs({ origins, destinations, dates });
  }, [origins, destinations, dates]);

  // Once the airport list is available we can validate the airport codes that
  // came from the URL, dropping any that aren't real airports (leaving the field
  // empty) — mirroring how invalid dates are already dropped at init. Only then
  // do we know whether a committed search is still complete enough to replay.
  const hasValidatedInputs = useRef(false);
  useEffect(() => {
    if (airportsLoading || hasValidatedInputs.current) return;
    hasValidatedInputs.current = true;

    // Only the URL is an untrusted source. Draft inputs come from in-app airport
    // selections, so there is nothing to validate (and re-applying them here
    // could clobber edits the user made while the airport list was still loading).
    if (!startedFromUrl.current) return;

    const validCodes = new Set(allAirports.map(airport => airport.iata));
    const cleaned: SearchInputState = {
      origins: origins.filter(code => validCodes.has(code)),
      destinations: destinations.filter(code => validCodes.has(code)),
      dates, // already sanitized at init
    };

    setOrigins(cleaned.origins);
    setDestinations(cleaned.destinations);

    // Drop any invalid params from the URL too, so it matches the cleaned inputs.
    window.history.replaceState(
      null,
      '',
      buildSearchParams(cleaned) || window.location.pathname
    );

    // Replay the committed search only if what survived validation is still a
    // complete, runnable search. Otherwise the pre-search view (no results) stays.
    if (isCompleteSearch(cleaned)) {
      runSearch(cleaned);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [airportsLoading, allAirports]);

  return (
    <CurrencyProvider>
      <PageShell>
        <SearchPanel
          allAirports={allAirports}
          origins={origins}
          destinations={destinations}
          dates={dates}
          loading={loading}
          status={status}
          onOriginsChange={setOrigins}
          onDestinationsChange={setDestinations}
          onSwap={handleSwap}
          onDatesChange={setDates}
          onSearch={handleSearch}
        />
        <ResultsPanel results={results} />
      </PageShell>
    </CurrencyProvider>
  );
}
