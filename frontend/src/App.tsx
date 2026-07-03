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
  type SearchInputState,
} from './lib/urlSearchState';
import { loadDraftInputs, saveDraftInputs } from './lib/draftStorage';
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
 */
function getInitialInputs(): SearchInputState {
  const fromUrl = parseSearchParams(window.location.search);
  return hasAnySearchParam(fromUrl) ? fromUrl : loadDraftInputs();
}

export default function App() {
  const { allAirports } = useAirports();
  const [origins, setOrigins] = useState<string[]>(() => getInitialInputs().origins);
  const [destinations, setDestinations] = useState<string[]>(() => getInitialInputs().destinations);
  const [dates, setDates] = useState(() => getInitialInputs().dates);
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
   * Execution logic for the flight search
   */
  const handleSearch = async () => {
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

  const hasAutoSearched = useRef(false);
  useEffect(() => {
    if (hasAutoSearched.current) return;
    hasAutoSearched.current = true;
    // A complete set of URL params means a real search was committed before the
    // reload, so replay it. Incomplete or absent params leave the initial,
    // pre-search view untouched and never trigger a fetch.
    if (isCompleteSearch(parseSearchParams(window.location.search))) {
      handleSearch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
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
  );
}
