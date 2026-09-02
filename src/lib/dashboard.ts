import { nightsBetween } from "./format";

/**
 * The dashboard's numbers, derived from the endpoints that exist.
 *
 * The design asks for Occupancy and Revenue. The API offers neither, so these
 * are computed here from the booking list — which constrains what they can
 * honestly be called:
 *
 * - **Booked value**, not revenue. It sums the totals of bookings that hold
 *   or held dates. A booking's total is snapshotted at reservation, so this is
 *   what was agreed, not what M-Pesa actually settled. Money received would
 *   mean reading payments, and there is no endpoint that lists them.
 *
 * - **Occupancy** counts booked nights against the nights on offer across the
 *   listings the API will show. That denominator is only the *active* ones —
 *   `GET /properties` filters to active even for an admin — so a host with
 *   drafts sees occupancy over their published portfolio, not all of it.
 *
 * Both are worth showing, and neither should be labelled as something it is
 * not. When the API grows real aggregates, this file should be deleted rather
 * than kept alongside them.
 */

export interface BookingRow {
  id: string;
  propertyId: string;
  checkIn: string;
  checkOut: string;
  guestCount: number;
  status: string;
  totalAmountCents: number;
  currency: string;
  createdAt: string;
}

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

  const bookedValueCents = earning
    .filter(b => b.checkIn >= window.from && b.checkIn < window.to)
    .reduce((total, b) => total + b.totalAmountCents, 0);

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
    bookedValueCents,
    currency: earning[0]?.currency ?? "KES",
  };
}
