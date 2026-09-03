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

export function windowOf(days: number): DashboardWindow {
  const now = new Date();
  const end = new Date(now);
  end.setUTCDate(end.getUTCDate() + days);
  return {
    from: now.toISOString().slice(0, 10),
    to: end.toISOString().slice(0, 10),
  };
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
 * The dates are UTC while the API resolves the window in Nairobi, so between
 * midnight and 03:00 local the range is a day behind. It shifts a rolling
 * total by one day at the edge and never double-counts, which is worth less
 * than a timezone dependency here.
 */
export function recentWindow(days: number): DashboardWindow {
  const today = new Date();
  const start = new Date(today);
  start.setUTCDate(start.getUTCDate() - (days - 1));
  const tomorrow = new Date(today);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

  return {
    from: start.toISOString().slice(0, 10),
    to: tomorrow.toISOString().slice(0, 10),
  };
}
