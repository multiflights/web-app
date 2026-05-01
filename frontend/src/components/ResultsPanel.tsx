import { FlightGroup } from './FlightResults';
import type { FlightSearchResultByCombination } from '../types/flight-search-result';

interface ResultsPanelProps {
  results: FlightSearchResultByCombination[];
}

export function ResultsPanel({ results }: ResultsPanelProps) {
  return (
    <section className="mt-3.5 bg-surface-panel border border-surface-border rounded-[18px] shadow-[var(--shadow-panel)] backdrop-blur-[10px] p-3.5 relative z-1">
      <div className="flex justify-between items-baseline mb-2.5">
        <h2 className="m-0 text-base font-bold text-copy-strong">Results</h2>
      </div>

      <div className="flex flex-col gap-2.5">
        {results.length > 0 ? (
          results.map((combo, i) => (
            <FlightGroup key={`${combo.origin}-${combo.destination}-${i}`} combo={combo} />
          ))
        ) : (
          <div className="p-3 border border-dashed border-surface-border rounded-2xl bg-surface-field text-copy-muted text-xs">
            No results yet.
          </div>
        )}
      </div>
    </section>
  );
}
