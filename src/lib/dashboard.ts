import type { GetResponse } from "./api/client";

import { nightsBetween } from "./format";

/**
 * The dashboard's numbers, derived from the endpoints that exist.
 *
 * The design asks for Occupancy and Revenue. The API offers neither, so these
 * are computed here from the booking list — which constrains what they can
 * honestly be called:
 *
 * **Booked value is gone.** It summed agreed booking totals, which is not
 * money received, and `GET /admin/payments` now answers the real question —
 * so the dashboard reads revenue off the API rather than inferring it here.
 * Deleted rather than relabelled, which is what the note in its place asked
 * for.
 *
 * What is left is **occupancy**, which has no endpoint: booked nights against
 * the nights on offer. The denominator counts *active* listings only, so a
 * host with drafts sees occupancy over what was actually on sale — a draft
 * nobody could book is not an empty night.
 *
 * Delete the rest of this file too if the API ever computes occupancy.
 */

/** As `GET /bookings` returns them, so a contract change is a type error. */
export type BookingRow = GetResponse<"/bookings">["data"][number];

/** Statuses that represent a stay that is on, or was honoured. */
const EARNING = new Set(["confirmed", "completed"]);

export interface DashboardWindow {
  from: string;
  to: string;
}

/**
 * Where the properties are, and therefore what "today" means here.
 *
 * The same zone the API reduces its own date questions to. Read in UTC, the
 * first three hours of every Kenyan day report yesterday — long enough for a
 * dashboard loaded over morning coffee to count a stay that starts today as
 * still upcoming, and for the revenue window to be a day out of step with the
 * one the API resolves.
 */
const BUSINESS_TIME_ZONE = "Africa/Nairobi";

const dayParts = new Intl.DateTimeFormat("en-US", {
  timeZone: BUSINESS_TIME_ZONE,
  // Pinned so the parts are Gregorian in Latin digits whatever the host's
  // locale defaults are.
  calendar: "gregory",
  numberingSystem: "latn",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/**
 * Today in Nairobi, as `YYYY-MM-DD`.
 *
 * Assembled from typed parts rather than a formatted string: en-CA happens to
 * print this shape, but on a build whose ICU data lacks it the call silently
 * falls back to something like 9/3/2026, which still compares against a date
 * column and is always wrong.
 */
function todayInBusinessZone(): string {
  const parts = dayParts.formatToParts(new Date());
  const value = (type: string) => parts.find(p => p.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

/** `delta` days from a calendar day. Date-only, so no zone is involved. */
function shiftDay(day: string, delta: number): string {
  const at = new Date(`${day}T00:00:00Z`);
  at.setUTCDate(at.getUTCDate() + delta);
  return at.toISOString().slice(0, 10);
}

export function windowOf(days: number): DashboardWindow {
  const from = todayInBusinessZone();
  return { from, to: shiftDay(from, days) };
}

/** Nights of a booking that fall inside the window, half-open like the API. */
function nightsInWindow(booking: BookingRow, window: DashboardWindow): number {
  const start = booking.checkIn > window.from ? booking.checkIn : window.from;
  const end = booking.checkOut < window.to ? booking.checkOut : window.to;
  return end > start ? nightsBetween(start, end) : 0;
}

export function summarise(
  bookings: BookingRow[],
  activeProperties: number,
  window: DashboardWindow,
) {
  const earning = bookings.filter(b => EARNING.has(b.status));

  const bookedNights = earning.reduce(
    (total, b) => total + nightsInWindow(b, window),
    0,
  );

  const nightsOnOffer = activeProperties * nightsBetween(window.from, window.to);

  const upcoming = earning
    .filter(b => b.checkIn >= window.from && b.checkIn < window.to)
    .sort((a, b) => a.checkIn.localeCompare(b.checkIn));

  return {
    upcoming,
    bookedNights,
    nightsOnOffer,
    // Guarded: with no active listings the denominator is zero, and a NaN on a
    // dashboard reads as a bug rather than as "nothing published".
    occupancy: nightsOnOffer > 0 ? bookedNights / nightsOnOffer : null,
  };
}

/**
 * The `days` days up to and including today, as the API's half-open window.
 *
 * Backward-looking, unlike `windowOf`: money received is a question about the
 * past, and occupancy is a question about the future. Reusing one window for
 * both would have reported next month's revenue, which is always zero.
 *
 * Both bounds are Nairobi calendar days, which is how the API reads them.
 */
export function recentWindow(days: number): DashboardWindow {
  const today = todayInBusinessZone();

  // Half-open and inclusive of today: `to` is tomorrow, so money taken this
  // morning counts. The API resolves both bounds in this same zone.
  return {
    from: shiftDay(today, -(days - 1)),
    to: shiftDay(today, 1),
  };
}
