import { afterEach, describe, expect, it, vi } from "vitest";

import { appliedFilters, filterValue, isCompleteRange, today } from "./search-filters";

describe("filterValue", () => {
  it("takes a non-empty string", () => {
    expect(filterValue("Diani")).toBe("Diani");
  });

  it.each([
    ["an empty string", ""],
    ["nothing", undefined],
    // `?town=a&town=b`. Truthy, and not something the API accepts — treating
    // it as present is what made the page claim a filter it never sent.
    ["a repeated parameter", ["a", "b"]],
    ["a repeated parameter with one value", ["a"]],
  ])("rejects %s", (_label, value) => {
    expect(filterValue(value as string | string[] | undefined)).toBeUndefined();
  });
});

describe("isCompleteRange", () => {
  it("accepts both ends in order", () => {
    expect(isCompleteRange("2026-09-10", "2026-09-14")).toBe(true);
  });

  it.each([
    ["only a check-in", "2026-09-10", ""],
    ["only a check-out", "", "2026-09-14"],
    ["neither", "", ""],
    ["a backwards range", "2026-09-14", "2026-09-10"],
    // Half-open: a stay has to be at least one night.
    ["the same day twice", "2026-09-10", "2026-09-10"],
  ])("rejects %s", (_label, from, to) => {
    expect(isCompleteRange(from, to)).toBe(false);
  });
});

describe("appliedFilters", () => {
  it("passes through the filters the API accepts", () => {
    expect(appliedFilters({ county: "Kwale", town: "Diani", minGuests: "4" }))
      .toEqual({ county: "Kwale", town: "Diani", minGuests: "4" });
  });

  it("drops empty and repeated parameters", () => {
    expect(appliedFilters({ town: "", county: ["a", "b"], propertyType: "villa" }))
      .toEqual({ propertyType: "villa" });
  });

  // `page` is what pagination varies, so counting it as a filter would make
  // page 2 of an unfiltered list claim to be filtered.
  it("never treats page as a filter", () => {
    expect(appliedFilters({ page: "3" })).toEqual({});
  });

  it("keeps a usable date range", () => {
    expect(appliedFilters({ checkIn: "2026-09-10", checkOut: "2026-09-14" }))
      .toEqual({ checkIn: "2026-09-10", checkOut: "2026-09-14" });
  });

  /*
   * The API answers 422 to each of these, and the client turns a 422 into a
   * thrown error — so forwarding one replaced the search page with an error
   * screen. Dropped whole rather than half-sent: sending one date would
   * filter by a range nobody asked for.
   */
  it.each([
    ["a lone check-in", { checkIn: "2026-09-10" }],
    ["a lone check-out", { checkOut: "2026-09-14" }],
    ["a backwards range", { checkIn: "2026-09-14", checkOut: "2026-09-10" }],
    ["the same day twice", { checkIn: "2026-09-10", checkOut: "2026-09-10" }],
    ["a repeated check-in", { checkIn: ["a", "b"], checkOut: "2026-09-14" }],
  ])("drops both dates for %s", (_label, params) => {
    const applied = appliedFilters(params as Record<string, string | string[]>);

    expect(applied.checkIn).toBeUndefined();
    expect(applied.checkOut).toBeUndefined();
  });

  it("keeps the other filters when the dates are unusable", () => {
    expect(appliedFilters({ town: "Diani", checkIn: "2026-09-10" }))
      .toEqual({ town: "Diani" });
  });

  // The request, the "match your filters" wording and the pagination links
  // are all derived from this, so an unfiltered search must be empty.
  it("is empty when nothing was asked for", () => {
    expect(appliedFilters({})).toEqual({});
    expect(Object.keys(appliedFilters({ page: "2", town: "" }))).toHaveLength(0);
  });
});

describe("today", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  /*
   * `toISOString()` is UTC. In Nairobi — UTC+3, where these guests are — every
   * moment between midnight and 03:00 reports yesterday, so a date input
   * would offer a day already gone as its earliest selectable one.
   *
   * The test runs in the machine's own zone, so it asserts against local date
   * parts rather than a fixed string: what matters is that it tracks the
   * local calendar, not UTC's.
   */
  it("follows the local calendar day, not UTC", () => {
    // 22:30Z, which is already tomorrow anywhere east of UTC+1:30.
    const instant = new Date("2026-09-02T22:30:00Z");
    vi.useFakeTimers();
    vi.setSystemTime(instant);

    const pad = (n: number) => String(n).padStart(2, "0");
    const local = `${instant.getFullYear()}-${pad(instant.getMonth() + 1)}-${pad(instant.getDate())}`;

    expect(today()).toBe(local);
  });

  it("is a plain YYYY-MM-DD, which is what a date input takes", () => {
    expect(today()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("pads a single-digit month and day", () => {
    vi.useFakeTimers();
    // Local noon, so the date is the same in any plausible zone.
    vi.setSystemTime(new Date(2026, 0, 5, 12, 0, 0));

    expect(today()).toBe("2026-01-05");
  });
});
