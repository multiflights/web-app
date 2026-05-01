import React, { useState } from 'react';
import type { FlightSearchResult, FlightSearchResultByCombination } from '../types/flight-search-result';
import { ChevronDown, Plane } from 'lucide-react';
import { MutedMetadata, PrimaryActionButton, ResultCard } from './ui/surface';
import { cn } from '@/lib/utils';

/**
 * Helper to calculate the duration between two ISO strings
 */
// const getDuration = (start: string, end: string): string => {
//   const diff = new Date(end).getTime() - new Date(start).getTime(); // This is where issue is!
//   const hours = Math.floor(diff / (1000 * 60 * 60));
//   const mins = Math.floor((diff / (1000 * 60)) % 60);
//   return `${hours}h ${mins}m`;
// };
const fmtDuration = (min: number): string =>
  `${Math.floor(min / 60)}h ${min % 60}m`;

/**
 * Helper function to get the number of days between two datetime strings (assuming both are in their local time zones)
 */
const getDayDiff = (s: string, e: string) =>
  Math.round((new Date(e.slice(0, 10)).getTime() - new Date(s.slice(0, 10)).getTime()) / 864e5);


const FlightCard = ({ flight, date, isSubResult, expandBtn }: {
  flight: FlightSearchResult,
  date: string,
  isSubResult?: boolean,
  expandBtn?: React.ReactNode
}) => {
  const first = flight.segments[0];
  const last = flight.segments[flight.segments.length - 1];
  const stopCount = flight.segments.length - 1;
  const dayDiff = getDayDiff(first.start_time, last.end_time);

  const [imgError, setImgError] = useState(false);
  const airlineLogoUrl = `https://storage.googleapis.com/multiflights-airline-logos/${flight.airline.toUpperCase()}.png`;

  return (
    <ResultCard
      className={cn(
        'flex items-center p-4',
        isSubResult && 'scale-[0.98] origin-left'
      )}
    >
      {/* Airline Info */}
      <div className="flex-none w-[120px] flex flex-col items-start justify-center gap-1">
        {!imgError ? (
          <img
            src={airlineLogoUrl}
            alt={`${flight.airline} logo`}
            className="h-8 w-auto max-w-[100px] object-contain"
            onError={() => setImgError(true)}
          />
        ) : (
          <MutedMetadata className="flex items-center gap-2">
            <Plane size={20} />
            <span className="font-bold text-copy-strong">{flight.airline}</span>
          </MutedMetadata>
        )}
      </div>

      {/* Date Info */}
      <MutedMetadata className="flex-none w-[100px] text-center text-sm border-l border-surface-border">
        {new Date(date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
      </MutedMetadata>

      {/* Route Path */}
      <div className="flex-[3] flex items-center justify-center gap-4 px-5">
        <div className="flex flex-col items-left min-w-[60px]">
          <span className="text-xl font-extrabold text-copy-strong">{first.origin}</span>
          <MutedMetadata className="text-sm font-semibold">
            {new Date(first.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
          </MutedMetadata>
        </div>

        <div className="flex-grow flex flex-col items-center relative min-w-[150px]">
          <MutedMetadata className="font-medium">
            {fmtDuration(flight.duration_minutes)}
          </MutedMetadata>

          <div className="w-full h-[2px] bg-surface-border relative my-2
            after:content-[''] after:absolute after:right-[-2px] after:top-[-4px]
            after:w-2.5 after:h-2.5 after:border-t-2 after:border-r-2
            after:border-surface-border after:rotate-45">
          </div>

          <span className={`text-xs font-bold ${stopCount > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
            {stopCount === 0 ? "Direct" : `${stopCount} stop${stopCount > 1 ? 's' : ''}`}
          </span>
        </div>

        <div className="flex flex-col items-left min-w-[60px]">
          <span className="text-xl font-extrabold text-copy-strong">{last.destination}</span>
          <MutedMetadata className="text-sm font-semibold flex items-start">
            {new Date(last.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}

            {dayDiff > 0 && (
              <span className="ml-0.5 text-[10px] font-bold text-copy-muted -translate-y-[2px]">
                +{dayDiff}
              </span>
            )}
          </MutedMetadata>
        </div>
      </div>

      {/* Price & Action */}
      <div className="flex-none w-[140px] flex flex-col items-end">
        <span className="text-2xl font-black text-brand">${flight.price.toFixed(0)}</span>
        <PrimaryActionButton className="mt-1 px-6 py-2.5 rounded-md">
          Select
        </PrimaryActionButton>
      </div>

      {/* Expand Info */}
      <div className="flex-none w-[50px] flex items-center justify-center ml-4">
        {expandBtn}
      </div>
    </ResultCard>
  );
};

export const FlightGroup = ({ combo }: { combo: FlightSearchResultByCombination }) => {
  const [expanded, setExpanded] = useState(false);
  const others = combo.flights.slice(1, 5);

  return (
    <div className="flex flex-col gap-2.5 overflow-visible">
      <FlightCard
        flight={combo.flights[0]}
        date={combo.date}
        expandBtn={others.length > 0 && (
          <button
            className="group relative p-2 rounded-full hover:bg-black/5 transition-colors cursor-pointer"
            onClick={() => setExpanded(!expanded)}
          >
          <span className="absolute top-[115%] left-1/2 -translate-x-1/2 bg-gray-900 text-white px-2.5 py-1 rounded text-[11px] font-semibold whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50
            after:content-[''] after:absolute after:bottom-full after:left-1/2 after:-ml-1 after:border-4 after:border-transparent after:border-b-gray-900">
            {expanded ? 'Hide options' : 'Show more options'}
          </span>

            <ChevronDown
              className={`transition-transform duration-300 text-copy-strong ${expanded ? 'rotate-180' : ''}`}
              size={28}
            />
          </button>
        )}
      />

      {expanded && (
        <div className="flex flex-col gap-2.5 pl-10">
          {others.map((f, i) => (
            <FlightCard key={i} flight={f} date={combo.date} isSubResult />
          ))}
        </div>
      )}
    </div>
  );
};
