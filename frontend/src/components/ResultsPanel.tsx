import { FlightGroup } from './FlightResults';
import { FieldContainer, MutedMetadata, PanelContainer } from './base/surface';
import type { FlightSearchResult } from '../types/flight-search-result';

interface ResultsPanelProps {
  results: FlightSearchResult[];
}

export function ResultsPanel({ results }: ResultsPanelProps) {
  return (
    <PanelContainer className="mt-3.5 relative z-1">
      <div className="flex justify-between items-baseline mb-2.5">
        <h2 className="m-0 text-base font-bold text-copy-strong">Results</h2>
      </div>

      <div className="flex flex-col gap-2.5">
        {results.length > 0 ? (
          results.map((combo, i) => (
            <FlightGroup key={`${combo.origin}-${combo.destination}-${i}`} combo={combo} />
          ))
        ) : (
          <FieldContainer className="p-3 border-dashed rounded-2xl">
            <MutedMetadata>
              No results yet.
            </MutedMetadata>
          </FieldContainer>
        )}
      </div>
    </PanelContainer>
  );
}
