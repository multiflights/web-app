import { AirportInput } from './AirportInput';
import { DateRangePicker } from './DateRangePicker';
import { StatusMessage } from './StatusMessage';
import { Button } from './ui/button';
import type { Airport } from '../types/airport';

interface SearchPanelProps {
  allAirports: Airport[];
  origins: string[];
  destinations: string[];
  dates: { start: string; end: string };
  loading: boolean;
  status: string;
  onOriginsChange: (origins: string[]) => void;
  onDestinationsChange: (destinations: string[]) => void;
  onDatesChange: (dates: { start: string; end: string }) => void;
  onSearch: () => void;
}

export function SearchPanel({
  allAirports,
  origins,
  destinations,
  dates,
  loading,
  status,
  onOriginsChange,
  onDestinationsChange,
  onDatesChange,
  onSearch,
}: SearchPanelProps) {
  return (
    <section className="bg-surface-panel border border-surface-border rounded-[18px] shadow-[var(--shadow-panel)] backdrop-blur-[10px] p-3.5 overflow-visible relative z-10">
      <div className="flex flex-col md:flex-row gap-2.5 items-stretch">
        <AirportInput
          label="Departures"
          allAirports={allAirports}
          selectedCodes={origins}
          onAdd={code => onOriginsChange([...origins, code])}
          onRemove={code => onOriginsChange(origins.filter(origin => origin !== code))}
          placeholder="From..."
        />

        <AirportInput
          label="Arrivals"
          allAirports={allAirports}
          selectedCodes={destinations}
          onAdd={code => onDestinationsChange([...destinations, code])}
          onRemove={code => onDestinationsChange(destinations.filter(destination => destination !== code))}
          placeholder="To..."
        />

        <div className="flex-none w-full md:w-[280px] bg-surface-field border border-surface-border rounded-[14px] p-2.5">
          <div className="flex justify-between gap-2.5 mb-1.5 text-copy-muted font-bold text-xs">
            <span>Date range</span>
          </div>
          <DateRangePicker value={dates} onChange={onDatesChange} />
        </div>

        <div className="flex-none w-full md:w-[170px] flex">
          <Button
            className="w-full min-h-[50px] md:min-h-0 rounded-[14px] font-black text-white bg-linear-to-br from-brand to-brand-bright shadow-[var(--shadow-action)] transition-all active:scale-[0.98]"
            onClick={onSearch}
            disabled={loading}
          >
            {loading ? 'Searching...' : 'Search ✈️'}
          </Button>
        </div>
      </div>

      <StatusMessage message={status} />
    </section>
  );
}
