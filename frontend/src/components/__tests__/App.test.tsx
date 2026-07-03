import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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

const seedDraft = (draft: {
  origins: string[];
  destinations: string[];
  dates: { start: string; end: string };
}) => {
  window.localStorage.setItem('flight-search:draft', JSON.stringify(draft));
};

const searchCalls = () =>
  (global.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.filter(([input]) =>
    String(input).includes('/search')
  );

const airports = [
  { iata: 'JFK', name: 'John F Kennedy' },
  { iata: 'LAX', name: 'Los Angeles' },
  { iata: 'ORD', name: "Chicago O'Hare" },
  { iata: 'SFO', name: 'San Francisco' },
];

describe('App URL-synced search state', () => {
  beforeEach(() => {
    setUrl('/');
    window.localStorage.clear();
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
        const url = typeof input === 'string' ? input : input.toString();
        if (url.includes('/airports.json')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve(airports) } as Response);
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

    await waitFor(() => {
      expect(searchCalls()).toHaveLength(0);
    });
  });

  it('restores draft inputs (but never searches) when the URL has no params', async () => {
    // The user typed a full route but never pressed Search, so nothing was
    // committed to the URL. A refresh must keep those inputs without fetching.
    seedDraft({ origins: ['JFK'], destinations: ['LAX'], dates: { start: '2026-06-01', end: '2026-06-01' } });

    render(<App />);

    expect(await screen.findByText('JFK')).toBeInTheDocument();
    expect(screen.getByText('LAX')).toBeInTheDocument();
    expect(screen.getByText('Enter a route to search.')).toBeInTheDocument();

    await waitFor(() => {
      expect(searchCalls()).toHaveLength(0);
    });
  });

  it('hydrates inputs and auto-refetches when the URL carries a complete search', async () => {
    setUrl('/?origins=JFK&destinations=LAX&start=2026-06-01&end=2026-06-01');

    render(<App />);

    await waitFor(() => {
      expect(searchCalls()).not.toHaveLength(0);
    });

    await screen.findByText('1 route option found');
  });

  it('hydrates and auto-refetches a single-day search (start only, no end)', async () => {
    setUrl('/?origins=JFK&destinations=LAX&start=2026-06-01');

    render(<App />);

    await waitFor(() => {
      expect(searchCalls()).not.toHaveLength(0);
    });

    await screen.findByText('1 route option found');
  });

  it('does not auto-search when the URL params are incomplete', async () => {
    // Only origins present (e.g. a hand-edited URL): the pre-search view stays.
    setUrl('/?origins=JFK');

    render(<App />);

    expect(screen.getByText('Enter a route to search.')).toBeInTheDocument();

    await waitFor(() => {
      expect(searchCalls()).toHaveLength(0);
    });
  });

  it('writes the URL params only once a search is actually triggered', async () => {
    // Complete draft, but no committed search yet: URL stays clean on load.
    seedDraft({ origins: ['JFK'], destinations: ['LAX'], dates: { start: '2026-06-01', end: '2026-06-01' } });

    render(<App />);

    await screen.findByText('JFK');
    expect(window.location.search).toBe('');

    fireEvent.click(screen.getByRole('button', { name: /^search$/i }));

    await waitFor(() => {
      expect(window.location.search).toContain('origins=JFK');
      expect(window.location.search).toContain('destinations=LAX');
      expect(window.location.search).toContain('start=2026-06-01');
    });
    await screen.findByText('1 route option found');
  });

  it('does not touch the URL when swap is clicked before searching', async () => {
    seedDraft({ origins: ['JFK'], destinations: ['LAX'], dates: { start: '2026-06-01', end: '2026-06-01' } });

    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: /swap departures and arrivals/i }));

    // Swap is an input edit, not a search, so the URL must remain empty...
    expect(window.location.search).toBe('');
    expect(searchCalls()).toHaveLength(0);

    // ...but a subsequent search commits the swapped route to the URL.
    fireEvent.click(screen.getByRole('button', { name: /^search$/i }));

    await waitFor(() => {
      expect(window.location.search).toContain('origins=LAX');
      expect(window.location.search).toContain('destinations=JFK');
    });
  });

  it('drops an unknown airport code from the URL but keeps the valid ones', async () => {
    setUrl('/?origins=JFK,ZZZ&destinations=LAX&start=2026-06-01&end=2026-06-01');

    render(<App />);

    // The surviving route (JFK only) is still complete, so it is searched...
    await screen.findByText('1 route option found');

    const lastSearch = searchCalls().at(-1)!;
    const body = JSON.parse((lastSearch[1] as RequestInit).body as string);
    expect(body.origins).toEqual(['JFK']);

    // ...and the invalid code has been scrubbed from the URL.
    expect(window.location.search).toContain('origins=JFK');
    expect(window.location.search).not.toContain('ZZZ');
  });

  it('clears the search when the only origin is an invalid airport code', async () => {
    setUrl('/?origins=ZZZ&destinations=LAX&start=2026-06-01&end=2026-06-01');

    render(<App />);

    // Origins becomes empty, so the search is no longer runnable: no fetch, no
    // results, and the invalid origin is dropped from the URL entirely.
    await waitFor(() => {
      expect(window.location.search).not.toContain('origins');
    });
    expect(screen.getByText('Enter a route to search.')).toBeInTheDocument();
    expect(searchCalls()).toHaveLength(0);
  });

  it('drops an unparseable date and does not search or crash', async () => {
    setUrl('/?origins=JFK&destinations=LAX&start=not-a-date');

    render(<App />);

    // The corrupt date is dropped, leaving an incomplete search: the page renders
    // normally (no crash), shows the empty date picker, and never fetches.
    expect(await screen.findByText('Pick a date range')).toBeInTheDocument();
    expect(screen.getByText('Enter a route to search.')).toBeInTheDocument();
    await waitFor(() => {
      expect(searchCalls()).toHaveLength(0);
    });
    expect(window.location.search).not.toContain('start');
  });
});
