"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

/**
 * Today, so a guest cannot search for a stay in the past.
 *
 * Assembled from local date parts rather than `toISOString()`, which is UTC:
 * in Nairobi, which is UTC+3 and where these guests are, every moment between
 * midnight and 03:00 reports yesterday. The date input would then offer a day
 * that has already gone as its earliest selectable one.
 */
function today() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** The only shape the API accepts: both ends, in order. */
function isCompleteRange(from: string, to: string) {
  return Boolean(from && to && to > from);
}

const TYPES = [
  { value: "", label: "All" },
  { value: "villa", label: "Villas" },
  { value: "apartment", label: "Apartments" },
  { value: "house", label: "Houses" },
  { value: "cottage", label: "Cottages" },
  { value: "studio", label: "Studios" },
  { value: "guesthouse", label: "Guesthouses" },
] as const;

/**
 * Search filters, kept in the URL.
 *
 * The URL is the state: a filtered search is shareable, survives a refresh,
 * and is rendered by the server rather than arriving empty and filling in.
 * These controls only push new query strings.
 *
 * The text inputs are debounced because they change on every keystroke and
 * each change is a server round trip. The chips and the select are not —
 * those are single deliberate clicks, and delaying them would just feel
 * broken.
 *
 * The dates are sent as a pair or not at all. The API refuses one without the
 * other with a 422 rather than ignoring it, which is the right answer — half
 * a range cannot say whether a listing is free — so this only navigates once
 * both are set, and clearing either clears both.
 */
export function PropertyFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const [town, setTown] = useState(params.get("town") ?? "");
  const [county, setCounty] = useState(params.get("county") ?? "");
  const type = params.get("propertyType") ?? "";
  const guests = params.get("minGuests") ?? "";
  /*
   * Held locally, not read back off the URL.
   *
   * A half-set range never reaches the URL, so a check-in read from `params`
   * would be blank the instant it was picked — the field would appear to
   * reject the date. These keep what the guest has chosen; the URL gets it
   * once both ends are set.
   */
  const [checkIn, setCheckIn] = useState(params.get("checkIn") ?? "");
  const [checkOut, setCheckOut] = useState(params.get("checkOut") ?? "");

  // Memoised on `params` so the debounce below can depend on it without the
  // timer being torn down and restarted on every render.
  const apply = useCallback((changes: Record<string, string>) => {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value)
        next.set(key, value);
      else next.delete(key);
    }
    // A new filter means a new first page; keeping the old one strands the
    // guest on an empty page 3 of a narrower result set.
    next.delete("page");
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }, [params, pathname, router]);

  const rangeApplied = isCompleteRange(checkIn, checkOut);

  /*
   * Dates travel together.
   *
   * A half-set range is kept in the inputs but never put in the URL: the API
   * answers 422 to one date without the other — deliberately, since ignoring
   * it would show dates that are taken as available — and a guest picking a
   * check-in has not asked for anything yet. Clearing either clears both, so
   * the URL never carries a range the API would refuse.
   */
  const applyDates = useCallback((from: string, to: string) => {
    const complete = isCompleteRange(from, to);
    apply({
      checkIn: complete ? from : "",
      checkOut: complete ? to : "",
    });
  }, [apply]);

  /*
   * Debounced: typing "Diani" is five keystrokes and should be one request.
   *
   * `params` is a dependency, so the pending timer is always built from the
   * current query string. Without it the effect keeps the params captured
   * when it ran, and picking a property type mid-typing would have the timer
   * rebuild the URL from the pre-click state and drop the type just chosen.
   * The cost is that changing any filter restarts the text debounce, which is
   * a 400ms delay rather than a lost filter.
   */
  useEffect(() => {
    const timer = setTimeout(() => {
      if (town !== (params.get("town") ?? "") || county !== (params.get("county") ?? ""))
        apply({ town, county });
    }, 400);

    return () => clearTimeout(timer);
  }, [town, county, params, apply]);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <input
          value={town}
          onChange={e => setTown(e.target.value)}
          placeholder="Town, e.g. Diani"
          className="rounded-md border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface"
        />
        <input
          value={county}
          onChange={e => setCounty(e.target.value)}
          placeholder="County, e.g. Kwale"
          className="rounded-md border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {TYPES.map(t => (
          <button
            key={t.value}
            type="button"
            onClick={() => apply({ propertyType: t.value })}
            aria-pressed={type === t.value}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs transition ${
              type === t.value
                ? "bg-primary text-on-primary"
                : "bg-surface-container text-on-surface-variant"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-on-surface-variant">
          Check in
          <input
            type="date"
            value={checkIn}
            min={today()}
            onChange={(e) => { setCheckIn(e.target.value); applyDates(e.target.value, checkOut); }}
            className="mt-1 w-full rounded-md border border-outline-variant bg-surface px-2 py-1.5 text-sm text-on-surface"
          />
        </label>
        <label className="text-xs text-on-surface-variant">
          Check out
          <input
            type="date"
            value={checkOut}
            min={checkIn || today()}
            onChange={(e) => { setCheckOut(e.target.value); applyDates(checkIn, e.target.value); }}
            className="mt-1 w-full rounded-md border border-outline-variant bg-surface px-2 py-1.5 text-sm text-on-surface"
          />
        </label>
      </div>

      {(checkIn || checkOut) && (
        <div className="flex items-center justify-between text-[11px] text-on-surface-variant">
          {/*
            Reports what was applied, not what was typed. Both dates present
            is not enough — a backwards range is refused by the API, so
            `applyDates` leaves it out of the URL, and saying "showing homes
            free for these dates" over an unfiltered list was a lie the guest
            had no way to catch.
          */}
          <span>
            {rangeApplied
              ? "Showing homes free for these dates."
              : checkIn && checkOut
                ? "Check-out must be after check-in."
                : "Pick both dates to filter by availability."}
          </span>
          <button
            type="button"
            onClick={() => { setCheckIn(""); setCheckOut(""); applyDates("", ""); }}
            className="text-primary underline"
          >
            Clear dates
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-on-surface-variant">
          Guests
          <select
            value={guests}
            onChange={e => apply({ minGuests: e.target.value })}
            className="mt-1 w-full rounded-md border border-outline-variant bg-surface px-2 py-1.5 text-sm text-on-surface"
          >
            <option value="">Any</option>
            {[1, 2, 4, 6, 8].map(n => (
              <option key={n} value={n}>
                {n}
                +
              </option>
            ))}
          </select>
        </label>

        <label className="text-xs text-on-surface-variant">
          Max per night
          <select
            value={params.get("maxPriceCents") ?? ""}
            onChange={e => apply({ maxPriceCents: e.target.value })}
            className="mt-1 w-full rounded-md border border-outline-variant bg-surface px-2 py-1.5 text-sm text-on-surface"
          >
            <option value="">Any</option>
            {[500000, 1000000, 2000000, 5000000].map(c => (
              <option key={c} value={c}>
                KES
                {" "}
                {(c / 100).toLocaleString("en-KE")}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
