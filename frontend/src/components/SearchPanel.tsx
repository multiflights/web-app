import { AirportInput } from './AirportInput';
import { DateRangePicker } from './DateRangePicker';
import { StatusMessage } from './StatusMessage';
import { FieldContainer, MutedMetadata, PanelContainer, PrimaryActionButton } from './ui/surface';
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
    <PanelContainer className="overflow-visible relative z-10">
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
            {loading ? 'Searching...' : 'Search ✈️'}
          </PrimaryActionButton>
        </div>
      </div>

      <StatusMessage message={status} />
    </PanelContainer>
  );
}
