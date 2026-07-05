import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  convertFromUsd,
  currencyForTimeZone,
  detectDefaultCurrency,
  fetchRates,
  formatPrice,
  isFresh,
  loadCachedRates,
  saveCurrencyPref,
  type FxRates,
} from '../currency';

const FX_KEY = 'flight-search:fx-rates';
const PREF_KEY = 'flight-search:currency';
const HOUR_MS = 60 * 60 * 1000;

const sampleRates: FxRates = {
  date: '2026-07-03',
  rates: { EUR: 0.9, JPY: 161.15 },
  fetchedAt: Date.now(),
};

const seedRates = (rates: FxRates) => {
  window.localStorage.setItem(FX_KEY, JSON.stringify(rates));
};

describe('currency', () => {
  afterEach(() => {
    window.localStorage.clear();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('convertFromUsd', () => {
    it('returns the input unchanged for USD', () => {
      expect(convertFromUsd(245.33, 'USD', null)).toBe(245.33);
    });

    it('multiplies by the rate for other currencies', () => {
      expect(convertFromUsd(100, 'EUR', sampleRates.rates)).toBeCloseTo(90);
    });

    it('returns null when the rate table lacks the currency', () => {
      expect(convertFromUsd(100, 'GBP', sampleRates.rates)).toBeNull();
      expect(convertFromUsd(100, 'EUR', null)).toBeNull();
    });
  });

  describe('formatPrice', () => {
    it('formats USD without conversion', () => {
      expect(formatPrice(245.33, 'USD', null)).toBe('$245');
    });

    it('formats a converted price in the display currency without decimals', () => {
      expect(formatPrice(100, 'EUR', sampleRates.rates)).toBe('€90');
    });

    it('falls back to USD formatting when the rate is missing', () => {
      expect(formatPrice(100, 'GBP', sampleRates.rates)).toBe('$100');
    });
  });

  describe('detectDefaultCurrency', () => {
    const stubTimeZone = (timeZone: string) => {
      vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockReturnValue({
        timeZone,
      } as Intl.ResolvedDateTimeFormatOptions);
    };

    it('derives the currency from the device time zone, not the browser language', () => {
      stubTimeZone('Europe/Berlin');
      vi.stubGlobal('navigator', { language: 'es-ES' });
      expect(detectDefaultCurrency()).toBe('EUR');
    });

    it('falls back to the language region for unknown time zones', () => {
      stubTimeZone('Etc/UTC');
      vi.stubGlobal('navigator', { language: 'de-DE' });
      expect(detectDefaultCurrency()).toBe('EUR');
    });

    it('infers the region from a region-less language tag', () => {
      stubTimeZone('Etc/UTC');
      vi.stubGlobal('navigator', { language: 'ja' });
      expect(detectDefaultCurrency()).toBe('JPY');
    });

    it('falls back to USD when neither time zone nor language map', () => {
      stubTimeZone('Etc/UTC');
      vi.stubGlobal('navigator', { language: 'zz-ZZ' });
      expect(detectDefaultCurrency()).toBe('USD');
    });

    it('prefers an explicitly saved currency over detection', () => {
      stubTimeZone('Europe/Berlin');
      vi.stubGlobal('navigator', { language: 'de-DE' });
      saveCurrencyPref('JPY');
      expect(detectDefaultCurrency()).toBe('JPY');
    });

    it('ignores a saved value that is not a known currency', () => {
      stubTimeZone('Europe/Berlin');
      vi.stubGlobal('navigator', { language: 'en-US' });
      window.localStorage.setItem(PREF_KEY, 'ZZZ');
      expect(detectDefaultCurrency()).toBe('EUR');
    });
  });

  describe('currencyForTimeZone', () => {
    it('maps zones for multi-zone countries and prefixed zone families', () => {
      expect(currencyForTimeZone('America/Mexico_City')).toBe('MXN');
      expect(currencyForTimeZone('America/Los_Angeles')).toBe('USD');
      expect(currencyForTimeZone('Australia/Sydney')).toBe('AUD');
      expect(currencyForTimeZone('America/Indiana/Indianapolis')).toBe('USD');
      expect(currencyForTimeZone('Atlantis/Nowhere')).toBeNull();
    });
  });

  describe('rates cache', () => {
    it('returns null when nothing is stored', () => {
      expect(loadCachedRates()).toBeNull();
    });

    it('round-trips a stored rate table', () => {
      seedRates(sampleRates);
      expect(loadCachedRates()).toEqual(sampleRates);
    });

    it('returns null for malformed or empty stored values', () => {
      window.localStorage.setItem(FX_KEY, '{not json');
      expect(loadCachedRates()).toBeNull();

      seedRates({ ...sampleRates, rates: {} });
      expect(loadCachedRates()).toBeNull();
    });

    it('drops non-numeric rate entries instead of rejecting the whole table', () => {
      window.localStorage.setItem(
        FX_KEY,
        JSON.stringify({ ...sampleRates, rates: { EUR: 0.9, BAD: 'nope', NEG: -1 } })
      );
      expect(loadCachedRates()?.rates).toEqual({ EUR: 0.9 });
    });

    it('treats tables younger than the TTL as fresh and older ones as stale', () => {
      expect(isFresh({ ...sampleRates, fetchedAt: Date.now() - 11 * HOUR_MS })).toBe(true);
      expect(isFresh({ ...sampleRates, fetchedAt: Date.now() - 13 * HOUR_MS })).toBe(false);
    });
  });

  describe('fetchRates', () => {
    it('fetches, normalizes and caches the rate table', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn(() =>
          Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ amount: 1, base: 'USD', date: '2026-07-03', rates: { EUR: 0.9 } }),
          } as Response)
        )
      );

      const rates = await fetchRates();
      expect(rates.date).toBe('2026-07-03');
      expect(rates.rates).toEqual({ EUR: 0.9 });
      expect(loadCachedRates()).toEqual(rates);
    });

    it('rejects on an HTTP error response', async () => {
      vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: false, status: 503 } as Response)));
      await expect(fetchRates()).rejects.toThrow('503');
    });

    it('rejects when the response shape is unusable', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ rates: {} }) } as Response))
      );
      await expect(fetchRates()).rejects.toThrow('unexpected shape');
    });

    it('still returns the rates when caching them fails', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn(() =>
          Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ date: '2026-07-03', rates: { EUR: 0.9 } }),
          } as Response)
        )
      );
      vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
        throw new DOMException('QuotaExceededError');
      });

      await expect(fetchRates()).resolves.toMatchObject({ rates: { EUR: 0.9 } });
    });
  });
});
