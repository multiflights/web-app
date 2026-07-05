import type { ReactElement } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PageShell } from '../PageShell';
import { ResultsPanel } from '../ResultsPanel';
import { SearchPanel } from '../SearchPanel';
import { StatusMessage } from '../StatusMessage';
import { CurrencyProvider } from '../../hooks/useCurrency';
import type { Airport } from '../../types/airport';
import type { FlightSearchResult } from '../../types/flight-search-result';

// PageShell and ResultsPanel consume the currency context. Seeding a fresh
// cached rate table keeps the provider from fetching live rates in tests, and
// pinning the currency preference to USD keeps price assertions independent of
// the machine's time zone (which otherwise drives the default currency).
const seedFxRates = () => {
  window.localStorage.setItem(
    'flight-search:fx-rates',
    JSON.stringify({ date: '2026-07-03', rates: { EUR: 0.9 }, fetchedAt: Date.now() })
  );
  window.localStorage.setItem('flight-search:currency', 'USD');
};

const renderWithCurrency = (ui: ReactElement) =>
  render(<CurrencyProvider>{ui}</CurrencyProvider>);

const airports: Airport[] = [
  { iata: 'JFK', label: 'JFK - New York', text: 'jfk new york john f kennedy' },
  { iata: 'LAX', label: 'LAX - Los Angeles', text: 'lax los angeles' },
];

const flightResults: FlightSearchResult[] = [
  {
    date: '2026-06-12',
    origin: 'JFK',
    destination: 'LAX',
    flights: [
      {
        airline: 'AA',
        airline_logo_url: 'https://cdn.example.com/aa.png',
        booking_url: 'https://partner.example/direct-booking',
        price: 245.33,
        duration_minutes: 375,
        segments: [
          {
            origin: 'JFK',
            destination: 'LAX',
            start_time: '2026-06-12T08:00:00',
            end_time: '2026-06-12T11:15:00',
          },
        ],
      },
    ],
  },
];

describe('layout components', () => {
  beforeEach(() => {
    seedFxRates();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it('renders the page shell title and children', () => {
    renderWithCurrency(<PageShell><p>Search content</p></PageShell>);

    expect(screen.getByRole('heading', { name: 'Flight Tracker' })).toBeInTheDocument();
    expect(screen.getByText('Search content')).toBeInTheDocument();
  });

  it('renders status text using muted metadata styling', () => {
    render(<StatusMessage status={{ variant: 'neutral', message: 'Ready to search.' }} />);

    expect(screen.getByText('Ready to search.')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveClass('text-copy-muted');
  });

  it('renders error status as an alert', () => {
    render(<StatusMessage status={{ variant: 'error', message: 'Search failed.' }} />);

    expect(screen.getByRole('alert')).toHaveTextContent('Search failed.');
    expect(screen.getByRole('alert')).toHaveClass('text-red-700');
  });

  it('renders search fields and calls search handler', () => {
    const handleSearch = vi.fn();

    render(
      <SearchPanel
        allAirports={airports}
        origins={[]}
        destinations={[]}
        dates={{ start: '', end: '' }}
        loading={false}
        status={{ variant: 'neutral', message: 'Enter your search.' }}
        onOriginsChange={vi.fn()}
        onDestinationsChange={vi.fn()}
        onSwap={vi.fn()}
        onDatesChange={vi.fn()}
        onSearch={handleSearch}
      />
    );

    expect(screen.getByText('Departures')).toBeInTheDocument();
    expect(screen.getByText('Arrivals')).toBeInTheDocument();
    expect(screen.getByText('Date range')).toBeInTheDocument();
    expect(screen.getByText('Enter your search.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Search' }));
    expect(handleSearch).toHaveBeenCalledTimes(1);
  });

  it('calls the swap handler when the swap button is clicked', () => {
    const handleSwap = vi.fn();

    render(
      <SearchPanel
        allAirports={airports}
        origins={['JFK']}
        destinations={['LAX']}
        dates={{ start: '', end: '' }}
        loading={false}
        status={{ variant: 'neutral', message: 'Enter your search.' }}
        onOriginsChange={vi.fn()}
        onDestinationsChange={vi.fn()}
        onSwap={handleSwap}
        onDatesChange={vi.fn()}
        onSearch={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /swap departures and arrivals/i }));
    expect(handleSwap).toHaveBeenCalledTimes(1);
  });

  it('shows an empty results state', () => {
    renderWithCurrency(<ResultsPanel results={[]} />);

    expect(screen.getByRole('heading', { name: 'Results' })).toBeInTheDocument();
    expect(screen.getByText('No results yet.')).toBeInTheDocument();
  });

  it('renders flight result details', () => {
    renderWithCurrency(<ResultsPanel results={flightResults} />);

    expect(screen.getByText('JFK → LAX · Jun 12')).toBeInTheDocument();
    expect(screen.getAllByText('Best price').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Fastest').length).toBeGreaterThan(0);
    expect(screen.getAllByText('JFK').length).toBeGreaterThan(0);
    expect(screen.getAllByText('LAX').length).toBeGreaterThan(0);
    expect(screen.getAllByText('$245').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Direct').length).toBeGreaterThan(0);
    expect(screen.getAllByText('6h 15m').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: 'Select' })).toSatisfy((links: HTMLElement[]) =>
      links.every(link => link.getAttribute('href') === 'https://partner.example/direct-booking')
    );
  });

  it('renders airline and price exactly once in each card layout variant', () => {
    renderWithCurrency(<ResultsPanel results={flightResults} />);

    // Each card renders one mobile and one desktop layout; neither may
    // duplicate the airline mark or the price within itself.
    expect(screen.getAllByAltText('AA logo')).toHaveLength(2);
    expect(screen.getAllByText('$245')).toHaveLength(2);
    expect(screen.getAllByRole('link', { name: 'Select' })).toHaveLength(2);
  });
});
