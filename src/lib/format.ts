/**
 * Money and dates, formatted the way the API stores them.
 *
 * Amounts cross the wire as integer cents with a separate currency, never as
 * floats — the API is strict about this because M-Pesa only moves whole
 * shillings. Formatting is the only place the value should ever be divided,
 * and it is division for display, not for arithmetic.
 */

export function formatMoney(cents: number, currency = "KES"): string {
  // The number is formatted by Intl; the currency is prefixed from the API's
  // own `currency` column rather than left to `style: "currency"`. In en-KE
  // that style renders KES as "Ksh", and every screen in the design reads
  // "KES 25,000". Prefixing keeps the design's wording and still follows the
  // API if a listing is ever priced in something else.
  const amount = new Intl.NumberFormat("en-KE", {
    // Kenyan prices are quoted in whole shillings; the API enforces that the
    // stored value is divisible by 100, so there are never cents to show.
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);

  return `${currency} ${amount}`;
}

/** A `date` column value (YYYY-MM-DD) as a readable day. */
export function formatDate(date: string): string {
  // Parsed as UTC on purpose: these are calendar dates, not instants, and
  // constructing them in local time can shift the day backwards.
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function nightsBetween(checkIn: string, checkOut: string): number {
  const from = Date.parse(`${checkIn}T00:00:00Z`);
  const to = Date.parse(`${checkOut}T00:00:00Z`);
  return Math.round((to - from) / 86_400_000);
}

/** "3 nights", "1 night" — the unit the price is quoted in. */
export function pluralise(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
