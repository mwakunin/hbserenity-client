/**
 * What the browse search sends, and what it refuses to send.
 *
 * Shared by the page that builds the request and the controls that build the
 * URL, so the two cannot disagree about what counts as an applied filter —
 * which is exactly how the page came to report "match your filters" over an
 * unfiltered list.
 */

/** Only the filters `GET /properties` accepts. */
export const FILTERS = [
  "county",
  "town",
  "propertyType",
  "minGuests",
  "maxPriceCents",
  // Availability. The API refuses one without the other, so these are only
  // ever set as a pair.
  "checkIn",
  "checkOut",
  "page",
] as const;

/** Search parameters as a route hands them over. */
export type SearchParams = Record<string, string | string[] | undefined>;

/**
 * A filter this page will actually send.
 *
 * A repeated parameter — `?town=a&town=b` — arrives as an array, which is
 * truthy but is not something the API takes, so it has to be skipped rather
 * than tested for truthiness.
 */
export function filterValue(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

/** The only date shape the API accepts: both ends, in order. */
export function isCompleteRange(from: string, to: string): boolean {
  return Boolean(from && to && to > from);
}

/**
 * Everything the search will actually send to the API.
 *
 * The dates are why this exists. The API refuses one without the other, and
 * refuses a backwards range — both 422, which the client turns into a thrown
 * error — so forwarding a hand-edited `?checkIn=` on its own replaced the
 * search page with an error screen. An unusable pair is dropped whole rather
 * than half-sent, which would filter by dates nobody asked for.
 *
 * `page` is excluded: it is not a filter, and it is what pagination varies.
 */
export function appliedFilters(params: SearchParams): Record<string, string> {
  const applied: Record<string, string> = {};

  for (const key of FILTERS) {
    if (key === "page" || key === "checkIn" || key === "checkOut")
      continue;
    const value = filterValue(params[key]);
    if (value !== undefined)
      applied[key] = value;
  }

  const checkIn = filterValue(params.checkIn);
  const checkOut = filterValue(params.checkOut);
  if (checkIn !== undefined && checkOut !== undefined && isCompleteRange(checkIn, checkOut)) {
    applied.checkIn = checkIn;
    applied.checkOut = checkOut;
  }

  return applied;
}

/**
 * Today on the guest's own calendar, as `YYYY-MM-DD`.
 *
 * Assembled from local date parts rather than `toISOString()`, which is UTC:
 * in Nairobi, which is UTC+3 and where these guests are, every moment between
 * midnight and 03:00 reports yesterday. A date input would then offer a day
 * that has already gone as its earliest selectable one.
 */
export function today(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}
