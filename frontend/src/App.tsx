import { useState } from 'react';
import { useAirports } from './hooks/useAirports';
import { PageShell } from './components/PageShell';
import { SearchPanel } from './components/SearchPanel';
import { ResultsPanel } from './components/ResultsPanel';
import type { SearchStatus } from './components/StatusMessage';
import type {FlightSearchResultByCombination} from './types/flight-search-result';
import type {FlightSearchQuery} from './types/flight-search-query';
import { config } from './config';
import './styles/globals.css';

export default function App() {
  const { allAirports } = useAirports();
  const [origins, setOrigins] = useState<string[]>([]);
  const [destinations, setDestinations] = useState<string[]>([]);
  const [dates, setDates] = useState({ start: '', end: '' });
  const [results, setResults] = useState<FlightSearchResultByCombination[]>([]);
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
    const end = new Date(endDateStr);

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

      const data: FlightSearchResultByCombination[] = await response.json();
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
        onDatesChange={setDates}
        onSearch={handleSearch}
      />
      <ResultsPanel results={results} />
    </PageShell>
  );
}
