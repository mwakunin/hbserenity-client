import type { BookingRow } from "./dashboard";

import { afterEach, describe, expect, it, vi } from "vitest";

import { recentWindow, summarise, windowOf } from "./dashboard";

/** A booking with only the fields the dashboard reads. */
function booking(over: Partial<BookingRow> = {}): BookingRow {
  return {
    id: crypto.randomUUID(),
    propertyId: "p1",
    guestId: "g1",
    guestName: "Amina Wanjiru",
    checkIn: "2026-09-10",
    checkOut: "2026-09-13",
    guestCount: 2,
    status: "confirmed",
    totalAmountCents: 900_000,
    currency: "KES",
    cancelledAt: null,
    cancellationReason: null,
    cancelledBy: null,
    hasReview: false,
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    ...over,
  } as unknown as BookingRow;
}

/*
 * Both windows are Kenyan calendar days, because the API reads them that way.
 * 22:30Z on 2 September is 01:30 on the 3rd in Nairobi — the three-hour band
 * each day where UTC still reports yesterday.
 */
describe("windows", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  function atNairobiEarlyMorning() {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-02T22:30:00Z"));
  }

  it("looks forward from today in Nairobi, not in UTC", () => {
    atNairobiEarlyMorning();

    expect(windowOf(30)).toEqual({ from: "2026-09-03", to: "2026-10-03" });
  });

  it("looks back from today in Nairobi, and includes today", () => {
    atNairobiEarlyMorning();

    // 30 days ending today: `to` is tomorrow, so money taken this morning
    // counts, and `from` is 29 days before today.
    expect(recentWindow(30)).toEqual({ from: "2026-08-05", to: "2026-09-04" });
  });

  it("spans exactly the number of days asked for", () => {
    atNairobiEarlyMorning();

    const { from, to } = recentWindow(7);
    const days = (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`))
      / 86_400_000;

    // Half-open, so seven days is an eight-day span from `from` to `to`.
    expect(days).toBe(7);
  });

  // Money is a question about the past and occupancy about the future, so the
  // two windows must not be the same range.
  it("points the two windows in opposite directions", () => {
    atNairobiEarlyMorning();

    expect(recentWindow(30).to).not.toBe(windowOf(30).to);
    expect(recentWindow(30).from < windowOf(30).from).toBe(true);
  });
});

describe("summarise", () => {
  const window = { from: "2026-09-01", to: "2026-10-01" };

  it("counts only stays that hold or held dates", () => {
    const stats = summarise([
      booking({ status: "confirmed", checkIn: "2026-09-10", checkOut: "2026-09-13" }),
      booking({ status: "completed", checkIn: "2026-09-14", checkOut: "2026-09-16" }),
      // Neither of these is a stay: one was called off, the other is not paid.
      booking({ status: "cancelled", checkIn: "2026-09-20", checkOut: "2026-09-25" }),
      booking({ status: "pending_payment", checkIn: "2026-09-20", checkOut: "2026-09-25" }),
    ], 1, window);

    expect(stats.upcoming).toHaveLength(2);
    expect(stats.bookedNights).toBe(5);
  });

  // A stay that straddles the edge contributes only the nights inside it,
  // or occupancy would exceed the nights actually on offer.
  it("counts only the nights inside the window", () => {
    const stats = summarise([
      booking({ checkIn: "2026-08-28", checkOut: "2026-09-03" }),
    ], 1, window);

    expect(stats.bookedNights).toBe(2);
  });

  it("ignores a stay entirely outside the window", () => {
    const stats = summarise([
      booking({ checkIn: "2026-07-01", checkOut: "2026-07-05" }),
    ], 1, window);

    expect(stats.bookedNights).toBe(0);
    expect(stats.upcoming).toHaveLength(0);
  });

  // A NaN on a dashboard reads as a bug rather than as "nothing published".
  it("reports no occupancy rather than dividing by zero", () => {
    expect(summarise([], 0, window).occupancy).toBeNull();
  });

  it("measures occupancy against the nights actually on offer", () => {
    // Two listings over a 30-night window is 60 nights on offer; three booked.
    const stats = summarise([
      booking({ checkIn: "2026-09-10", checkOut: "2026-09-13" }),
    ], 2, window);

    expect(stats.nightsOnOffer).toBe(60);
    expect(stats.occupancy).toBeCloseTo(3 / 60);
  });

  it("lists upcoming stays soonest first", () => {
    const stats = summarise([
      booking({ checkIn: "2026-09-20", checkOut: "2026-09-22" }),
      booking({ checkIn: "2026-09-05", checkOut: "2026-09-07" }),
    ], 1, window);

    expect(stats.upcoming.map(b => b.checkIn)).toEqual(["2026-09-05", "2026-09-20"]);
  });
});
