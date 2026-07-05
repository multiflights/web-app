import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  detectDefaultCurrency,
  fetchRates,
  formatPrice,
  isFresh,
  loadCachedRates,
  saveCurrencyPref,
  type FxRates,
} from '../lib/currency';

interface CurrencyContextValue {
  /** ISO 4217 code of the currency prices are displayed in. */
  currency: string;
  setCurrency: (code: string) => void;
  /** Null while unavailable (first load, offline) — the app then displays USD. */
  rates: FxRates | null;
  /** Codes offered by the selector: USD plus whatever the rate table covers. */
  availableCurrencies: string[];
  /** Formats a USD price in the selected display currency. */
  format: (priceUsd: number) => string;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState(detectDefaultCurrency);
  const [rates, setRates] = useState<FxRates | null>(loadCachedRates);

  useEffect(() => {
    const cached = loadCachedRates();
    if (cached && isFresh(cached)) return;

    let cancelled = false;
    fetchRates()
      .then(fresh => {
        if (!cancelled) setRates(fresh);
      })
      .catch(err => {
        // Keep whatever we have: a stale table still beats no conversion, and
        // with no table at all the UI simply stays in USD.
        console.error('Exchange rate fetch failed', err);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setCurrency = useCallback((code: string) => {
    setCurrencyState(code);
    saveCurrencyPref(code);
  }, []);

  const value = useMemo<CurrencyContextValue>(() => ({
    currency,
    setCurrency,
    rates,
    availableCurrencies: rates
      ? [...new Set(['USD', ...Object.keys(rates.rates)])].sort()
      : ['USD'],
    format: priceUsd => formatPrice(priceUsd, currency, rates?.rates ?? null),
  }), [currency, setCurrency, rates]);

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency(): CurrencyContextValue {
  const context = useContext(CurrencyContext);
  if (!context) throw new Error('useCurrency must be used within a CurrencyProvider');
  return context;
}
