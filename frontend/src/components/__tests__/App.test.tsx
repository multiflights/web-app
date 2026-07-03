import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import App from '../../App';
import type { FlightSearchResult } from '../../types/flight-search-result';

const flightResults: FlightSearchResult[] = [
  {
    date: '2026-06-01',
    origin: 'JFK',
    destination: 'LAX',
    flights: [
      {
        airline: 'AA',
        airline_logo_url: null,
        booking_url: 'https://partner.example/direct-booking',
        price: 245.33,
        duration_minutes: 375,
        segments: [
          {
            origin: 'JFK',
            destination: 'LAX',
            start_time: '2026-06-01T08:00:00',
            end_time: '2026-06-01T11:15:00',
          },
        ],
      },
    ],
  },
];

const setUrl = (search: string) => {
  window.history.pushState({}, '', search || '/');
};

const seedStoredResults = (results: FlightSearchResult[]) => {
  window.localStorage.setItem('flight-search:results', JSON.stringify(results));
};

describe('App URL-synced search state', () => {
  beforeEach(() => {
    setUrl('/');
    window.localStorage.clear();
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
        const url = typeof input === 'string' ? input : input.toString();
        if (url.includes('/airports.json')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve([]) } as Response);
        }
        if (url.includes('/search')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve(flightResults) } as Response);
        }
        return Promise.reject(new Error(`unexpected fetch: ${url}`));
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    setUrl('/');
    window.localStorage.clear();
  });

  it('starts empty and does not auto-search when the URL has no query params', async () => {
    render(<App />);

    expect(screen.getByText('Enter a route to search.')).toBeInTheDocument();

    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    await waitFor(() => {
      expect(fetchMock.mock.calls.some(([input]) => String(input).includes('/search'))).toBe(false);
    });
  });

  it('does not auto-search when inputs are populated but no prior results are stored', async () => {
    setUrl('/?origins=JFK&destinations=LAX&start=2026-06-01&end=2026-06-01');

    render(<App />);

    expect(screen.getByText('Enter a route to search.')).toBeInTheDocument();

    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    await waitFor(() => {
      expect(fetchMock.mock.calls.some(([input]) => String(input).includes('/search'))).toBe(false);
    });
  });

  it('hydrates inputs and auto-refetches results when prior results were stored', async () => {
    setUrl('/?origins=JFK&destinations=LAX&start=2026-06-01&end=2026-06-01');
    seedStoredResults(flightResults);

    render(<App />);

    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    await waitFor(() => {
      expect(fetchMock.mock.calls.some(([input]) => String(input).includes('/search'))).toBe(true);
    });

    await screen.findByText('1 route option found');
  });

  it('persists freshly fetched results back to local storage after an auto-refetch', async () => {
    // A stale single-result set is stored from a previous session...
    seedStoredResults(flightResults);
    setUrl('/?origins=JFK&destinations=LAX&start=2026-06-01&end=2026-06-01');

    // ...but the search endpoint now returns a different, cheaper flight.
    const refreshedResults: FlightSearchResult[] = [
      {
        date: '2026-06-01',
        origin: 'JFK',
        destination: 'LAX',
        flights: [
          {
            airline: 'DL',
            airline_logo_url: null,
            booking_url: 'https://partner.example/refreshed-booking',
            price: 199.0,
            duration_minutes: 360,
            segments: [
              {
                origin: 'JFK',
                destination: 'LAX',
                start_time: '2026-06-01T09:00:00',
                end_time: '2026-06-01T12:00:00',
              },
            ],
          },
        ],
      },
    ];
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
        const url = typeof input === 'string' ? input : input.toString();
        if (url.includes('/airports.json')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve([]) } as Response);
        }
        if (url.includes('/search')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve(refreshedResults) } as Response);
        }
        return Promise.reject(new Error(`unexpected fetch: ${url}`));
      })
    );

    render(<App />);

    await waitFor(() => {
      const stored = JSON.parse(window.localStorage.getItem('flight-search:results') ?? '[]');
      expect(stored).toEqual(refreshedResults);
    });
  });

  it('keeps the URL in sync as the results status updates after a search', async () => {
    setUrl('/?origins=JFK&destinations=LAX&start=2026-06-01&end=2026-06-01');
    seedStoredResults(flightResults);

    render(<App />);

    await screen.findByText('1 route option found');

    expect(window.location.search).toContain('origins=JFK');
    expect(window.location.search).toContain('destinations=LAX');
    expect(window.location.search).toContain('start=2026-06-01');
    expect(window.location.search).toContain('end=2026-06-01');
  });
});
