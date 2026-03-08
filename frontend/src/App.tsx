import React, { useState } from 'react';
import { useAirports } from './hooks/useAirports';
import { AirportInput } from './components/AirportInput';
import { DateRangePicker } from './components/DateRangePicker';
import { FlightGroup } from './components/FlightResults';
import type {FlightSearchResultByCombination} from './types/flight-search-result';
import type {FlightSearchQuery} from './types/flight-search-query';
import { config } from './config';
import { Button } from './components/ui/button';
import './styles/globals.css';

export default function App() {
  const { allAirports } = useAirports();
  const [origins, setOrigins] = useState<string[]>([]);
  const [destinations, setDestinations] = useState<string[]>([]);
  const [dates, setDates] = useState({ start: '', end: '' });
  const [results, setResults] = useState<FlightSearchResultByCombination[]>([]);
  const [status, setStatus] = useState('Enter your search, then press Search.');
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
      setStatus(`❌ Too many routes (${estimatedCalls}). Limit is ${MAX_CALLS}. Try a shorter date range or fewer airports. (${what})`);
      return;
    }
    if (origins.length === 0 || destinations.length === 0) {
      setStatus("❌ Please add at least one departure and arrival airport.");
      return;
    }
    if (departureDates.length === 0) {
      setStatus("❌ Please select both a start and end date.");
      return;
    }

    setLoading(true);
    setStatus("Searching...");

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
      setStatus(data.length > 0 ? `Results found!` : 'No flights found for this search.');
    } catch (err) {
      console.error("Search failed", err);
      setStatus("❌ Search failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative z-1 max-w-[1100px] mx-auto px-4 py-7 pb-12">
      <h1 className="m-0 mb-3.5 text-[26px] tracking-tight font-bold text-[#0d2b3f]">
        Flight Tracker
      </h1>

      {/* Search Panel */}
      <section className="bg-(--card) border border-(--b) rounded-[18px] shadow-[0_18px_50px_rgba(22,90,130,0.1)] backdrop-blur-[10px] p-3.5 overflow-visible relative z-10">
        <div className="flex flex-col md:flex-row gap-2.5 items-stretch">

          <AirportInput
            label="Departures"
            allAirports={allAirports}
            selectedCodes={origins}
            onAdd={c => setOrigins([...origins, c])}
            onRemove={c => setOrigins(origins.filter(x => x !== c))}
            placeholder="From..."
          />

          <AirportInput
            label="Arrivals"
            allAirports={allAirports}
            selectedCodes={destinations}
            onAdd={c => setDestinations([...destinations, c])}
            onRemove={c => setDestinations(destinations.filter(x => x !== c))}
            placeholder="To..."
          />

          {/* Date Range Selection */}
          <div className="flex-none w-full md:w-[280px] bg-white/55 border border-(--b) rounded-[14px] p-2.5">
            <div className="flex justify-between gap-2.5 mb-1.5 text-(--m) font-bold text-xs">
              <span>Date range</span>
            </div>
            <DateRangePicker value={dates} onChange={setDates} />
          </div>

          {/* Search Button */}
          <div className="flex-none w-full md:w-[170px] flex">
            <Button
              className="w-full min-h-[50px] md:min-h-0 rounded-[14px] font-black text-white bg-linear-to-br from-(--a) to-[#73c6ff] shadow-[0_16px_35px_rgba(74,168,223,0.22)] transition-all active:scale-[0.98]"
              onClick={handleSearch}
              disabled={loading}
            >
              {loading ? 'Searching...' : 'Search ✈️'}
            </Button>
          </div>
        </div>

        <div className="mt-2.5 text-(--m) text-xs flex justify-between flex-wrap gap-2.5">
          <div>{status}</div>
        </div>
      </section>

      {/* Results Panel */}
      <section className="mt-3.5 bg-(--card) border border-(--b) rounded-[18px] shadow-[0_18px_50px_rgba(22,90,130,0.1)] backdrop-blur-[10px] p-3.5 relative z-1">
        <div className="flex justify-between items-baseline mb-2.5">
          <h2 className="m-0 text-base font-bold text-[#0d2b3f]">Results</h2>
        </div>

        <div className="flex flex-col gap-2.5">
          {results.length > 0 ? (
            results.map((combo, i) => (
              <FlightGroup key={`${combo.origin}-${combo.destination}-${i}`} combo={combo} />
            ))
          ) : (
            <div className="p-3 border border-dashed border-[#5aa0d2]/28 rounded-2xl bg-white/50 text-(--m) text-xs">
              No results yet.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}