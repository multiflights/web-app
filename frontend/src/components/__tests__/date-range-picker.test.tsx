import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DateRangePicker } from '../DateRangePicker';

const originalMatchMedia = window.matchMedia;

function mockViewport({ isDesktop }: { isDesktop: boolean }) {
  window.matchMedia = (query: string): MediaQueryList => ({
    matches: query.includes('min-width: 768px') && isDesktop,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}

afterEach(() => {
  window.matchMedia = originalMatchMedia;
});

describe('DateRangePicker', () => {
  it('shows a two-month calendar on desktop viewports', async () => {
    mockViewport({ isDesktop: true });
    render(<DateRangePicker value={{ start: '', end: '' }} onChange={vi.fn()} />);

    fireEvent.click(screen.getByText('Pick a date range'));

    expect(await screen.findAllByRole('grid')).toHaveLength(2);
  });

  it('shows a single-month calendar on mobile viewports', async () => {
    mockViewport({ isDesktop: false });
    render(<DateRangePicker value={{ start: '', end: '' }} onChange={vi.fn()} />);

    fireEvent.click(screen.getByText('Pick a date range'));

    expect(await screen.findAllByRole('grid')).toHaveLength(1);
  });
});
