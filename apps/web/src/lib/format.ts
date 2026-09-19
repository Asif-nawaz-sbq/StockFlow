/**
 * The interface is English. Amounts stay in EUR because the business is a
 * European wholesaler, so en-GB gives "€1,234.50" - English conventions,
 * correct currency.
 */
const LOCALE = 'en-GB';

/**
 * Timezone is pinned rather than left to the runtime. The API container runs in
 * UTC and a browser runs in whatever the user's machine says, so an unpinned
 * formatter renders a different string on each side and React reports a
 * hydration mismatch. Pinning is also just correct here - a goods receipt
 * happened at a warehouse wall-clock time regardless of where it is read.
 */
const TIME_ZONE = 'Europe/Berlin';

const eur = new Intl.NumberFormat(LOCALE, {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
});

/**
 * Whole euros, no cents. Intl's `notation: 'compact'` combined with a currency
 * renders 9153.06 as "9.2K €" or worse depending on locale - dashboards and
 * chart axes read better with plain rounded amounts.
 */
const roundedEur = new Intl.NumberFormat(LOCALE, {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

const number = new Intl.NumberFormat(LOCALE);

const dateTime = new Intl.DateTimeFormat(LOCALE, {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: TIME_ZONE,
});

const dateOnly = new Intl.DateTimeFormat(LOCALE, {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: TIME_ZONE,
});

const dayMonth = new Intl.DateTimeFormat(LOCALE, {
  day: '2-digit',
  month: 'short',
  timeZone: TIME_ZONE,
});

export const formatEur = (cents: number): string => eur.format(cents / 100);
export const formatEurCompact = (cents: number): string => roundedEur.format(cents / 100);
export const formatNumber = (value: number): string => number.format(value);

export const formatDateTime = (value: string | null): string =>
  value ? dateTime.format(new Date(value)) : '—';

export const formatDate = (value: string | null): string =>
  value ? dateOnly.format(new Date(value)) : '—';

/** Short axis label for charts, e.g. "14 Aug". */
export const formatDayMonth = (value: string): string => dayMonth.format(new Date(value));

/** Compact relative label for table cells. */
export function formatRelative(value: string): string {
  const diffMs = Date.now() - new Date(value).getTime();
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  const days = Math.round(hours / 24);
  if (days < 31) return `${days} ${days === 1 ? 'day' : 'days'} ago`;
  return formatDate(value);
}
