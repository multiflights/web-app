import { useState, type ReactNode } from 'react';
import type { Flight, FlightSearchResult } from '../types/flight-search-result';
import { ChevronDown, Plane } from 'lucide-react';
import { MutedMetadata, PrimaryActionButton, ResultCard } from './base/surface';
import { buttonVariants } from './base/button';
import { cn } from '@/lib/utils';
import { config } from '../config';

const fmtDuration = (min: number): string =>
  `${Math.floor(min / 60)}h ${min % 60}m`;

const parseDisplayDate = (value: string): Date =>
  new Date(value.length === 10 ? `${value}T12:00:00` : value);

const formatDate = (value: string): string =>
  parseDisplayDate(value).toLocaleDateString([], { month: 'short', day: 'numeric' });

const formatTime = (value: string): string =>
  new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

const getDayDiff = (s: string, e: string) =>
  Math.round((new Date(e.slice(0, 10)).getTime() - new Date(s.slice(0, 10)).getTime()) / 864e5);

function AirlineMark({ airline, airlineLogoUrl }: { airline: string; airlineLogoUrl?: string | null }) {
  const [imgError, setImgError] = useState(false);
  const fallbackAirlineLogoUrl = `https://storage.googleapis.com/multiflights-airline-logos/${airline.toUpperCase()}.png`;
  const logoSrc = airlineLogoUrl || fallbackAirlineLogoUrl;

  if (imgError) {
    return (
      <MutedMetadata className="flex items-center gap-2">
        <Plane size={20} />
        <span className="font-bold text-copy-strong">{airline}</span>
      </MutedMetadata>
    );
  }

  return (
    <img
      src={logoSrc}
      alt={`${airline} logo`}
      className="h-8 w-auto max-w-[100px] object-contain"
      onError={() => setImgError(true)}
    />
  );
}

function SelectAction({ flight }: { flight: Flight }) {
  console.log('Flight booking details:', { flight });
  if (!flight.booking_url && !flight.booking_request) {
    return (
      <PrimaryActionButton
        className="rounded-md px-5 py-2"
        disabled
      >
        Select
      </PrimaryActionButton>
    );
  }

  if (flight.booking_request?.method === 'POST') {
    return (
      <form
        action={`${config.apiUrl}/booking/redirect`}
        method="post"
        target="_blank"
        className="inline-flex"
      >
        <input type="hidden" name="method" value={flight.booking_request.method} />
        <input type="hidden" name="url" value={flight.booking_request.url} />
        <input type="hidden" name="post_data" value={flight.booking_request.post_data ?? ''} />
        <PrimaryActionButton className="rounded-md px-5 py-2" type="submit">
          Select
        </PrimaryActionButton>
      </form>
    );
  }

  return (
    <a
      href={flight.booking_url ?? flight.booking_request?.url}
      target="_blank"
      rel="noreferrer"
      className={cn(
        buttonVariants({
          className:
            'rounded-[14px] rounded-md bg-linear-to-br from-brand to-brand-bright px-5 py-2 font-black text-white shadow-[var(--shadow-action)] transition-all active:scale-[0.98]',
        }),
        'inline-flex'
      )}
    >
      Select
    </a>
  );
}

function ResultChip({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'success' | 'brand' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-bold',
        tone === 'neutral' && 'border-surface-border bg-surface-field text-copy-muted',
        tone === 'success' && 'border-emerald-200 bg-emerald-50 text-emerald-700',
        tone === 'brand' && 'border-brand/20 bg-brand-soft text-copy-strong'
      )}
    >
      {children}
    </span>
  );
}

function RouteTimeline({ flight }: { flight: Flight }) {
  const first = flight.segments[0];
  const last = flight.segments[flight.segments.length - 1];
  const dayDiff = getDayDiff(first.start_time, last.end_time);

  return (
    <div className="grid grid-cols-[auto_minmax(96px,1fr)_auto] items-center gap-3 md:px-2">
      <div className="min-w-[56px]">
        <span className="block text-xl font-extrabold text-copy-strong">{first.origin}</span>
        <MutedMetadata className="text-sm font-semibold">
          {formatTime(first.start_time)}
        </MutedMetadata>
      </div>

      <div className="flex min-w-0 flex-col items-center">
        <div className="relative my-2 h-[2px] w-full bg-surface-border after:absolute after:right-[-2px] after:top-[-4px] after:h-2.5 after:w-2.5 after:rotate-45 after:border-r-2 after:border-t-2 after:border-surface-border after:content-['']" />
      </div>

      <div className="min-w-[56px] text-right">
        <span className="block text-xl font-extrabold text-copy-strong">{last.destination}</span>
        <MutedMetadata className="flex justify-end text-sm font-semibold">
          {formatTime(last.end_time)}
          {dayDiff > 0 && (
            <span className="ml-0.5 text-[10px] font-bold text-copy-muted -translate-y-[2px]">
              +{dayDiff}
            </span>
          )}
        </MutedMetadata>
      </div>
    </div>
  );
}

function FlightMeta({ flight, badges }: { flight: Flight; badges: string[] }) {
  const stopCount = flight.segments.length - 1;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <ResultChip tone="brand">{fmtDuration(flight.duration_minutes)}</ResultChip>
      <ResultChip tone={stopCount === 0 ? 'success' : 'neutral'}>
        {stopCount === 0 ? 'Direct' : `${stopCount} stop${stopCount > 1 ? 's' : ''}`}
      </ResultChip>
      {badges.map(badge => (
        <ResultChip key={badge} tone="brand">{badge}</ResultChip>
      ))}
    </div>
  );
}

const FlightCard = ({ flight, date, isSubResult, expandBtn, badges = [] }: {
  flight: Flight,
  date: string,
  isSubResult?: boolean,
  expandBtn?: ReactNode,
  badges?: string[],
}) => {
  return (
    <ResultCard
      className={cn(
        'grid gap-4 p-4 md:grid-cols-[minmax(112px,0.9fr)_minmax(76px,0.55fr)_minmax(260px,2.1fr)_minmax(132px,0.85fr)] md:items-center',
        isSubResult && 'bg-surface-field shadow-none'
      )}
    >
      <div className="flex items-center justify-between gap-4 md:hidden">
        <AirlineMark airline={flight.airline} />
        <div className="flex items-center gap-3 text-right">
          <span className="text-2xl font-black text-brand">${flight.price.toFixed(0)}</span>
          {expandBtn}
        </div>
      </div>

      <div className="hidden md:flex md:items-center">
        <AirlineMark airline={flight.airline} airlineLogoUrl={flight.airline_logo_url} />
      </div>

      <MutedMetadata className="hidden text-sm font-semibold md:block">
        {formatDate(date)}
      </MutedMetadata>

      <div className="space-y-3">
        <RouteTimeline flight={flight} />
        <div className="md:hidden">
          <FlightMeta flight={flight} badges={badges} />
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 md:hidden">
        <AirlineMark airline={flight.airline} airlineLogoUrl={flight.airline_logo_url} />
        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-2xl font-black text-brand">${flight.price.toFixed(0)}</span>
          </div>
          <SelectAction flight={flight} />
          {expandBtn}
        </div>
      </div>

      <div className="hidden md:flex md:flex-col md:items-end md:gap-2">
        <span className="text-2xl font-black text-brand">${flight.price.toFixed(0)}</span>
        <div className="flex items-center gap-2">
          <SelectAction flight={flight} />
          {expandBtn}
        </div>
      </div>

      <div className="hidden md:col-start-3 md:block">
        <FlightMeta flight={flight} badges={badges} />
      </div>
    </ResultCard>
  );
};

export const FlightGroup = ({ combo }: { combo: FlightSearchResult }) => {
  const [expanded, setExpanded] = useState(false);
  const others = combo.flights.slice(1, 5);
  const bestPrice = Math.min(...combo.flights.map(flight => flight.price));
  const fastestDuration = Math.min(...combo.flights.map(flight => flight.duration_minutes));

  const getBadges = (flight: Flight) => [
    flight.price === bestPrice ? 'Best price' : null,
    flight.duration_minutes === fastestDuration ? 'Fastest' : null,
  ].filter((badge): badge is string => Boolean(badge));

  return (
    <div className="flex flex-col gap-2.5 overflow-visible">
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div>
          <h3 className="m-0 text-sm font-black tracking-tight text-copy-strong">
            {combo.origin} → {combo.destination} · {formatDate(combo.date)}
          </h3>
          <MutedMetadata>
            {combo.flights.length} option{combo.flights.length === 1 ? '' : 's'} ranked by price
          </MutedMetadata>
        </div>
        <ResultChip tone="brand">From ${bestPrice.toFixed(0)}</ResultChip>
      </div>

      <FlightCard
        flight={combo.flights[0]}
        date={combo.date}
        badges={getBadges(combo.flights[0])}
        expandBtn={others.length > 0 && (
          <button
            className="group inline-flex items-center gap-1.5 rounded-full border border-surface-border bg-surface-field px-2.5 py-1 text-xs font-bold text-copy-strong transition-colors hover:bg-brand-soft"
            onClick={() => setExpanded(!expanded)}
            aria-expanded={expanded}
          >
            <span className="hidden sm:inline">{expanded ? 'Hide' : `${others.length} more`}</span>
            <ChevronDown
              className={`size-4 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}
              aria-hidden="true"
            />
          </button>
        )}
      />

      {expanded && (
        <div className="flex flex-col gap-2.5 border-l-2 border-surface-border pl-3 md:ml-6 md:pl-4">
          {others.map((flight, i) => (
            <FlightCard
              key={`${flight.airline}-${flight.price}-${i}`}
              flight={flight}
              date={combo.date}
              isSubResult
              badges={getBadges(flight)}
            />
          ))}
        </div>
      )}
    </div>
  );
};
