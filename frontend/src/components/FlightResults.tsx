import React, { useState } from 'react';
import type { FlightSearchResult, FlightSearchResultByCombination } from '../types/flight-search-result';
import { ChevronDown, Plane } from 'lucide-react';

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


const FlightCard = ({ flight, date, isSubResult, expandBtn }: {
  flight: FlightSearchResult,
  date: string,
  isSubResult?: boolean,
  expandBtn?: React.ReactNode
}) => {
  const first = flight.segments[0];
  const last = flight.segments[flight.segments.length - 1];
  const stopCount = flight.segments.length - 1;

  const [imgError, setImgError] = useState(false);
  const airlineLogoUrl = `https://storage.googleapis.com/multiflights-airline-logos/${flight.airline.toUpperCase()}.png`;

  return (
    <div className={`
      flex items-center p-4 border border-gray-200 rounded-xl shadow-sm transition-all
      ${isSubResult ? 'bg-white/90 scale-[0.98] origin-left' : 'bg-white'}
    `}>
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
          <div className="flex items-center gap-2 text-slate-400">
            <Plane size={20} />
            <span className="font-bold text-slate-800">{flight.airline}</span>
          </div>
        )}
      </div>

      {/* Date Info */}
      <div className="flex-none w-[100px] text-center text-gray-500 text-sm border-l border-gray-100">
        {new Date(date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
      </div>

      {/* Route Path */}
      <div className="flex-[3] flex items-center justify-center gap-4 px-5">
        <div className="flex flex-col items-center min-w-[60px]">
          <span className="text-xl font-extrabold text-gray-900">{first.origin}</span>
          <span className="text-sm font-semibold text-gray-500">
            {new Date(first.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
          </span>
        </div>

        <div className="flex-grow flex flex-col items-center relative min-w-[150px]">
          <span className="text-xs text-gray-500 font-medium">
          {fmtDuration(flight.duration_minutes)}

          </span>

          <div className="w-full h-[2px] bg-gray-300 relative my-2
            after:content-[''] after:absolute after:right-[-2px] after:top-[-4px]
            after:w-2.5 after:h-2.5 after:border-t-2 after:border-r-2
            after:border-gray-300 after:rotate-45">
          </div>

          <span className={`text-xs font-bold ${stopCount > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
            {stopCount === 0 ? "Direct" : `${stopCount} stop${stopCount > 1 ? 's' : ''}`}
          </span>
        </div>

        <div className="flex flex-col items-center min-w-[60px]">
          <span className="text-xl font-extrabold text-gray-900">{last.destination}</span>
          <span className="text-sm font-semibold text-gray-500">
            {new Date(last.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
          </span>
        </div>
      </div>

      {/* Price & Action */}
      <div className="flex-none w-[140px] flex flex-col items-end">
        <span className="text-2xl font-black text-[#0770e3]">${flight.price.toFixed(0)}</span>
        <button className="mt-1 bg-[#0770e3] text-white px-6 py-2.5 rounded-md font-bold hover:bg-[#065ebf] transition-colors">
          Select
        </button>
      </div>

      {/* Expand Info */}
      <div className="flex-none w-[50px] flex items-center justify-center ml-4">
        {expandBtn}
      </div>
    </div>
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
              className={`transition-transform duration-300 text-gray-900 ${expanded ? 'rotate-180' : ''}`}
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