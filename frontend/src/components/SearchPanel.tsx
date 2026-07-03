import { ArrowRightLeft } from 'lucide-react';
import { AirportInput } from './AirportInput';
import { DateRangePicker } from './DateRangePicker';
import { StatusMessage, type SearchStatus } from './StatusMessage';
import { FieldContainer, MutedMetadata, PanelContainer, PrimaryActionButton } from './base/surface';
import type { Airport } from '../types/airport';

interface SearchPanelProps {
  allAirports: Airport[];
  origins: string[];
  destinations: string[];
  dates: { start: string; end: string };
  loading: boolean;
  status: SearchStatus;
  onOriginsChange: (origins: string[]) => void;
  onDestinationsChange: (destinations: string[]) => void;
  onSwap: () => void;
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
  onSwap,
  onDatesChange,
  onSearch,
}: SearchPanelProps) {
  return (
    <PanelContainer className="overflow-visible relative z-10">
      <div className="flex flex-col md:flex-row gap-2.5 items-stretch">
        <div className="relative flex flex-col md:flex-row gap-2.5 md:gap-12 flex-1">
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

          <button
            type="button"
            onClick={onSwap}
            aria-label="Swap departures and arrivals"
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20
                       grid place-items-center size-11 md:size-9 rounded-full
                       bg-surface-panel border border-surface-border shadow-[var(--shadow-panel)]
                       text-copy-muted hover:text-foreground transition-all active:scale-95
                       focus-visible:ring-3 focus-visible:ring-ring/50 outline-none"
          >
            <ArrowRightLeft className="size-4 rotate-90 md:rotate-0" />
          </button>
        </div>

        <FieldContainer className="flex-none w-full md:w-[280px]">
          <MutedMetadata className="flex justify-between gap-2.5 mb-1.5 font-bold">
            <span>Date range</span>
          </MutedMetadata>
          <DateRangePicker value={dates} onChange={onDatesChange} />
        </FieldContainer>

        <div className="flex-none w-full md:w-[170px] flex">
          <PrimaryActionButton
            className="w-full min-h-[50px] md:min-h-0"
            onClick={onSearch}
            disabled={loading}
          >
            {loading ? 'Searching...' : 'Search'}
          </PrimaryActionButton>
        </div>
      </div>

      <StatusMessage status={status} />
    </PanelContainer>
  );
}
