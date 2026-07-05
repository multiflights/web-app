const FX_API_URL = 'https://api.frankfurter.dev/v1/latest?base=USD';
const FX_STORAGE_KEY = 'flight-search:fx-rates';
const CURRENCY_PREF_KEY = 'flight-search:currency';

// The ECB publishes reference rates once per working day, so a 12h TTL keeps the
// cached table at most one publication behind without polling on every load.
const FX_TTL_MS = 12 * 60 * 60 * 1000;

/** Exchange rates relative to 1 USD, as served by Frankfurter (ECB reference rates). */
export interface FxRates {
  /** ECB reference date of the rates, e.g. "2026-07-03". */
  date: string;
  rates: Record<string, number>;
  /** Local timestamp of when we fetched the table, for TTL checks. */
  fetchedAt: number;
}

/**
 * IANA time zone → currency for the currencies Frankfurter serves. The zone
 * reflects where the device actually is, unlike the browser language (a Spanish
 * browser in Germany should still default to EUR), so it is the primary signal.
 */
const TZ_TO_CURRENCY: Record<string, string> = {
  // Eurozone (plus micro-states that use the euro)
  'Europe/Amsterdam': 'EUR', 'Europe/Andorra': 'EUR', 'Europe/Athens': 'EUR',
  'Europe/Berlin': 'EUR', 'Europe/Bratislava': 'EUR', 'Europe/Brussels': 'EUR',
  'Europe/Busingen': 'EUR', 'Europe/Dublin': 'EUR', 'Europe/Helsinki': 'EUR',
  'Europe/Lisbon': 'EUR', 'Europe/Ljubljana': 'EUR', 'Europe/Luxembourg': 'EUR',
  'Europe/Madrid': 'EUR', 'Europe/Malta': 'EUR', 'Europe/Monaco': 'EUR',
  'Europe/Nicosia': 'EUR', 'Asia/Nicosia': 'EUR', 'Asia/Famagusta': 'EUR',
  'Europe/Paris': 'EUR', 'Europe/Podgorica': 'EUR', 'Europe/Riga': 'EUR',
  'Europe/Rome': 'EUR', 'Europe/San_Marino': 'EUR', 'Europe/Tallinn': 'EUR',
  'Europe/Vatican': 'EUR', 'Europe/Vienna': 'EUR', 'Europe/Vilnius': 'EUR',
  'Europe/Zagreb': 'EUR', 'Atlantic/Azores': 'EUR', 'Atlantic/Canary': 'EUR',
  'Atlantic/Madeira': 'EUR', 'Africa/Ceuta': 'EUR',
  // Rest of Europe
  'Europe/London': 'GBP', 'Europe/Jersey': 'GBP', 'Europe/Guernsey': 'GBP',
  'Europe/Isle_of_Man': 'GBP', 'Europe/Zurich': 'CHF', 'Europe/Vaduz': 'CHF',
  'Europe/Sofia': 'BGN', 'Europe/Prague': 'CZK', 'Europe/Copenhagen': 'DKK',
  'Atlantic/Faroe': 'DKK', 'America/Nuuk': 'DKK', 'Europe/Budapest': 'HUF',
  'Atlantic/Reykjavik': 'ISK', 'Europe/Oslo': 'NOK', 'Europe/Warsaw': 'PLN',
  'Europe/Bucharest': 'RON', 'Europe/Stockholm': 'SEK', 'Europe/Istanbul': 'TRY',
  // Asia & Pacific
  'Asia/Jerusalem': 'ILS', 'Asia/Tel_Aviv': 'ILS', 'Asia/Kolkata': 'INR',
  'Asia/Calcutta': 'INR', 'Asia/Shanghai': 'CNY', 'Asia/Urumqi': 'CNY',
  'Asia/Chongqing': 'CNY', 'Asia/Harbin': 'CNY', 'Asia/Hong_Kong': 'HKD',
  'Asia/Tokyo': 'JPY', 'Asia/Seoul': 'KRW', 'Asia/Kuala_Lumpur': 'MYR',
  'Asia/Kuching': 'MYR', 'Asia/Manila': 'PHP', 'Asia/Singapore': 'SGD',
  'Asia/Bangkok': 'THB', 'Asia/Jakarta': 'IDR', 'Asia/Pontianak': 'IDR',
  'Asia/Makassar': 'IDR', 'Asia/Jayapura': 'IDR', 'Pacific/Auckland': 'NZD',
  'Pacific/Chatham': 'NZD',
  // Africa
  'Africa/Johannesburg': 'ZAR',
  // United States
  'America/New_York': 'USD', 'America/Detroit': 'USD', 'America/Chicago': 'USD',
  'America/Denver': 'USD', 'America/Phoenix': 'USD', 'America/Boise': 'USD',
  'America/Los_Angeles': 'USD', 'America/Anchorage': 'USD', 'America/Juneau': 'USD',
  'America/Sitka': 'USD', 'America/Metlakatla': 'USD', 'America/Yakutat': 'USD',
  'America/Nome': 'USD', 'America/Adak': 'USD', 'America/Menominee': 'USD',
  'Pacific/Honolulu': 'USD',
  // Canada
  'America/St_Johns': 'CAD', 'America/Halifax': 'CAD', 'America/Glace_Bay': 'CAD',
  'America/Moncton': 'CAD', 'America/Goose_Bay': 'CAD', 'America/Toronto': 'CAD',
  'America/Winnipeg': 'CAD', 'America/Regina': 'CAD', 'America/Swift_Current': 'CAD',
  'America/Edmonton': 'CAD', 'America/Vancouver': 'CAD', 'America/Whitehorse': 'CAD',
  'America/Dawson': 'CAD', 'America/Dawson_Creek': 'CAD', 'America/Fort_Nelson': 'CAD',
  'America/Creston': 'CAD', 'America/Yellowknife': 'CAD', 'America/Inuvik': 'CAD',
  'America/Cambridge_Bay': 'CAD', 'America/Resolute': 'CAD', 'America/Rankin_Inlet': 'CAD',
  'America/Iqaluit': 'CAD', 'America/Thunder_Bay': 'CAD', 'America/Nipigon': 'CAD',
  'America/Rainy_River': 'CAD', 'America/Pangnirtung': 'CAD', 'America/Blanc-Sablon': 'CAD',
  'America/Atikokan': 'CAD',
  // Mexico
  'America/Mexico_City': 'MXN', 'America/Cancun': 'MXN', 'America/Merida': 'MXN',
  'America/Monterrey': 'MXN', 'America/Matamoros': 'MXN', 'America/Chihuahua': 'MXN',
  'America/Ciudad_Juarez': 'MXN', 'America/Ojinaga': 'MXN', 'America/Mazatlan': 'MXN',
  'America/Bahia_Banderas': 'MXN', 'America/Hermosillo': 'MXN', 'America/Tijuana': 'MXN',
  // Brazil
  'America/Sao_Paulo': 'BRL', 'America/Bahia': 'BRL', 'America/Fortaleza': 'BRL',
  'America/Recife': 'BRL', 'America/Belem': 'BRL', 'America/Maceio': 'BRL',
  'America/Araguaina': 'BRL', 'America/Santarem': 'BRL', 'America/Campo_Grande': 'BRL',
  'America/Cuiaba': 'BRL', 'America/Manaus': 'BRL', 'America/Porto_Velho': 'BRL',
  'America/Boa_Vista': 'BRL', 'America/Eirunepe': 'BRL', 'America/Rio_Branco': 'BRL',
  'America/Noronha': 'BRL',
};

/** Resolves a currency from an IANA time zone name, or null when unknown. */
export function currencyForTimeZone(timeZone: string): string | null {
  const exact = TZ_TO_CURRENCY[timeZone];
  if (exact) return exact;
  if (timeZone.startsWith('Australia/')) return 'AUD';
  if (
    timeZone.startsWith('America/Indiana/') ||
    timeZone.startsWith('America/Kentucky/') ||
    timeZone.startsWith('America/North_Dakota/')
  ) return 'USD';
  return null;
}

/**
 * Region → currency, used only as a fallback when the time zone isn't in the
 * table above (e.g. exotic or spoofed zones).
 */
const REGION_TO_CURRENCY: Record<string, string> = {
  // Eurozone
  AT: 'EUR', BE: 'EUR', CY: 'EUR', DE: 'EUR', EE: 'EUR', ES: 'EUR', FI: 'EUR',
  FR: 'EUR', GR: 'EUR', HR: 'EUR', IE: 'EUR', IT: 'EUR', LT: 'EUR', LU: 'EUR',
  LV: 'EUR', MT: 'EUR', NL: 'EUR', PT: 'EUR', SI: 'EUR', SK: 'EUR',
  // Everything else Frankfurter covers
  AU: 'AUD', BG: 'BGN', BR: 'BRL', CA: 'CAD', CH: 'CHF', LI: 'CHF', CN: 'CNY',
  CZ: 'CZK', DK: 'DKK', GB: 'GBP', HK: 'HKD', HU: 'HUF', ID: 'IDR', IL: 'ILS',
  IN: 'INR', IS: 'ISK', JP: 'JPY', KR: 'KRW', MX: 'MXN', MY: 'MYR', NO: 'NOK',
  NZ: 'NZD', PH: 'PHP', PL: 'PLN', RO: 'RON', SE: 'SEK', SG: 'SGD', TH: 'THB',
  TR: 'TRY', US: 'USD', ZA: 'ZAR',
};

const KNOWN_CURRENCIES = new Set(Object.values(REGION_TO_CURRENCY));

/**
 * Coerces an arbitrary parsed value into a well-formed FxRates table, or null
 * when anything about it is unusable — callers treat null as "no cache".
 */
function normalizeRates(value: unknown): FxRates | null {
  if (!value || typeof value !== 'object') return null;
  const { date, rates, fetchedAt } = value as Record<string, unknown>;
  if (typeof date !== 'string' || typeof fetchedAt !== 'number') return null;
  if (!rates || typeof rates !== 'object') return null;

  const cleanRates: Record<string, number> = {};
  for (const [code, rate] of Object.entries(rates as Record<string, unknown>)) {
    if (typeof rate === 'number' && Number.isFinite(rate) && rate > 0) {
      cleanRates[code] = rate;
    }
  }
  if (Object.keys(cleanRates).length === 0) return null;

  return { date, rates: cleanRates, fetchedAt };
}

/** Reads the cached rate table. Returns null when absent or unusable (may be stale). */
export function loadCachedRates(): FxRates | null {
  try {
    const raw = window.localStorage.getItem(FX_STORAGE_KEY);
    if (!raw) return null;
    return normalizeRates(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function isFresh(rates: FxRates): boolean {
  return Date.now() - rates.fetchedAt < FX_TTL_MS;
}

/**
 * Fetches today's USD-based rate table from Frankfurter and caches it.
 * Throws on network/shape errors; callers decide the fallback (stale cache or USD-only).
 */
export async function fetchRates(): Promise<FxRates> {
  const response = await fetch(FX_API_URL);
  if (!response.ok) throw new Error(`Rates request failed: ${response.status}`);
  const payload = (await response.json()) as { date?: unknown; rates?: unknown };

  const normalized = normalizeRates({
    date: payload.date,
    rates: payload.rates,
    fetchedAt: Date.now(),
  });
  if (!normalized) throw new Error('Rates response has an unexpected shape');

  try {
    window.localStorage.setItem(FX_STORAGE_KEY, JSON.stringify(normalized));
  } catch {
    // Ignore write failures (e.g. storage disabled or quota exceeded).
  }
  return normalized;
}

/**
 * The currency to display on load: an explicitly saved preference wins, then
 * the device's time zone (a proxy for where the user actually is), then the
 * browser language's region, then USD.
 */
export function detectDefaultCurrency(): string {
  const saved = loadCurrencyPref();
  if (saved) return saved;
  try {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const fromTimeZone = timeZone && currencyForTimeZone(timeZone);
    if (fromTimeZone) return fromTimeZone;
  } catch {
    // No zone info available — fall through to the language region.
  }
  try {
    // maximize() infers a region for region-less tags like "de" or "ja".
    const region = new Intl.Locale(navigator.language).maximize().region;
    if (region && REGION_TO_CURRENCY[region]) return REGION_TO_CURRENCY[region];
  } catch {
    // Unparseable locale tag — fall through to USD.
  }
  return 'USD';
}

function loadCurrencyPref(): string | null {
  try {
    const saved = window.localStorage.getItem(CURRENCY_PREF_KEY);
    return saved && KNOWN_CURRENCIES.has(saved) ? saved : null;
  } catch {
    return null;
  }
}

export function saveCurrencyPref(code: string): void {
  try {
    window.localStorage.setItem(CURRENCY_PREF_KEY, code);
  } catch {
    // Ignore write failures; the choice still applies for this session.
  }
}

/** Converts a USD price into `code`, or null when no rate is available. */
export function convertFromUsd(
  priceUsd: number,
  code: string,
  rates: Record<string, number> | null
): number | null {
  if (code === 'USD') return priceUsd;
  const rate = rates?.[code];
  return typeof rate === 'number' ? priceUsd * rate : null;
}

const formatters = new Map<string, Intl.NumberFormat>();

function getFormatter(code: string): Intl.NumberFormat | null {
  const cached = formatters.get(code);
  if (cached) return cached;

  let formatter: Intl.NumberFormat;
  // The site is English-only, so prices are pinned to English formatting
  // ("€214") rather than following the browser language ("214 €"). The default
  // 'symbol' display keeps dollar-family currencies distinguishable (MX$, CA$,
  // A$) where narrowSymbol would collapse them all to "$".
  try {
    formatter = new Intl.NumberFormat('en', {
      style: 'currency',
      currency: code,
      maximumFractionDigits: 0,
    });
  } catch {
    return null;
  }
  formatters.set(code, formatter);
  return formatter;
}

/**
 * Formats a USD price in the requested display currency, falling back to plain
 * USD whenever the currency can't be converted or formatted.
 */
export function formatPrice(
  priceUsd: number,
  code: string,
  rates: Record<string, number> | null
): string {
  const converted = convertFromUsd(priceUsd, code, rates);
  if (converted !== null) {
    const formatter = getFormatter(code);
    if (formatter) return formatter.format(converted);
  }
  return getFormatter('USD')?.format(priceUsd) ?? `$${priceUsd.toFixed(0)}`;
}
