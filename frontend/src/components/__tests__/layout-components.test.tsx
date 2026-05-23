import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { PageShell } from '../PageShell';
import { ResultsPanel } from '../ResultsPanel';
import { SearchPanel } from '../SearchPanel';
import { StatusMessage } from '../StatusMessage';
import type { Airport } from '../../types/airport';
import type { FlightSearchResult } from '../../types/flight-search-result';

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
  it('renders the page shell title and children', () => {
    render(<PageShell><p>Search content</p></PageShell>);

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

  it('shows an empty results state', () => {
    render(<ResultsPanel results={[]} />);

    expect(screen.getByRole('heading', { name: 'Results' })).toBeInTheDocument();
    expect(screen.getByText('No results yet.')).toBeInTheDocument();
  });

  it('renders flight result details', () => {
    render(<ResultsPanel results={flightResults} />);

    expect(screen.getByText('JFK → LAX · Jun 12')).toBeInTheDocument();
    expect(screen.getAllByText('Best price').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Fastest').length).toBeGreaterThan(0);
    expect(screen.getByText('JFK')).toBeInTheDocument();
    expect(screen.getByText('LAX')).toBeInTheDocument();
    expect(screen.getAllByText('$245').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Direct').length).toBeGreaterThan(0);
    expect(screen.getAllByText('6h 15m').length).toBeGreaterThan(0);
  });
});
