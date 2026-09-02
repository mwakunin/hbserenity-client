"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { createBlackout, getAvailability } from "@/app/admin/calendar/actions";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";

interface Listing {
  id: string;
  title: string;
}

/** YYYY-MM-DD, `days` from today, in UTC to match the API's date columns. */
function dayFrom(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Sixty nights per listing, and a way to block some of them.
 *
 * Ranges are half-open exactly as the API stores them: a range ending on the
 * 5th does not include the 5th, and the checkout day is immediately available
 * to the next guest. Rendering it any other way would show back-to-back stays
 * as a conflict when they are perfectly legal.
 */
export function CalendarView({ listings }: { listings: Listing[] }) {
  const router = useRouter();
  const [propertyId, setPropertyId] = useState(listings[0]?.id ?? "");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const from = dayFrom(0);
  const to = dayFrom(60);

  const availability = useQuery({
    queryKey: ["availability", propertyId, from, to],
    queryFn: () => getAvailability(propertyId, from, to),
    enabled: Boolean(propertyId),
  });

  // Each night mapped to why it is unavailable, so a booked night and a
  // blocked one can be told apart at a glance.
  const nights = useMemo(() => {
    const taken = new Map<string, "booked" | "blackout">();

    for (const range of availability.data?.unavailable ?? []) {
      const cursor = new Date(`${range.start}T00:00:00Z`);
      const stop = new Date(`${range.end}T00:00:00Z`);
      while (cursor < stop) {
        taken.set(cursor.toISOString().slice(0, 10), range.reason);
        cursor.setUTCDate(cursor.getUTCDate() + 1);
      }
    }

    return Array.from({ length: 60 }, (_, i) => {
      const date = dayFrom(i);
      return { date, reason: taken.get(date) ?? null };
    });
  }, [availability.data]);

  async function block(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);

    try {
      const result = await createBlackout({ propertyId, startDate: start, endDate: end, reason });

      if (result.status === "ok") {
        setStart("");
        setEnd("");
        setReason("");
        await availability.refetch();
        router.refresh();
        return;
      }
      if (result.status === "unauthenticated") {
        router.push("/sign-in?next=%2Fadmin%2Fcalendar");
        return;
      }
      setMessage(result.message);
    }
    catch {
      setMessage("Something went wrong. Please try again.");
    }
    finally {
      setBusy(false);
    }
  }

  if (listings.length === 0) {
    return (
      <p className="mt-4 rounded-lg bg-surface-container p-5 text-center text-sm text-on-surface-variant">
        No published listings to show a calendar for.
      </p>
    );
  }

  return (
    <div className="mt-4">
      <label className="block text-xs text-on-surface-variant">
        Listing
        <select
          value={propertyId}
          onChange={e => setPropertyId(e.target.value)}
          className="mt-1 w-full rounded-md border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface"
        >
          {listings.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}
        </select>
      </label>

      <div className="mt-4">
        <div className="flex items-center gap-3 text-[11px] text-on-surface-variant">
          <span className="flex items-center gap-1">
            <span className="h-3 w-3 rounded-sm bg-surface-container-high" />
            Free
          </span>
          <span className="flex items-center gap-1">
            <span className="h-3 w-3 rounded-sm bg-primary" />
            Booked
          </span>
          <span className="flex items-center gap-1">
            <span className="h-3 w-3 rounded-sm bg-secondary" />
            Blocked
          </span>
        </div>

        {/*
          A failed request must not render as an empty calendar. With no data
          every night falls through to "free", which is the one answer a host
          acts on — blocking dates, or promising a guest a stay — and it would
          be indistinguishable from a property with nothing booked.
        */}
        {availability.isPending
          ? <div className="mt-2 h-24 animate-pulse rounded-md bg-surface-container" />
          : availability.isError
            ? (
                <div className="mt-2 rounded-md bg-surface-container p-4 text-center">
                  <p className="text-xs text-on-surface-variant">
                    The calendar could not be loaded, so these nights are unknown —
                    not free.
                  </p>
                  <button
                    type="button"
                    onClick={() => availability.refetch()}
                    className="mt-2 text-xs text-primary underline"
                  >
                    Try again
                  </button>
                </div>
              )
            : (
              <ol className="mt-2 grid grid-cols-10 gap-1">
                {nights.map(night => (
                  <li
                    key={night.date}
                    title={`${formatDate(night.date)}${night.reason ? ` — ${night.reason}` : " — free"}`}
                    className={`aspect-square rounded-sm text-[9px] leading-none ${
                      night.reason === "booked"
                        ? "bg-primary text-on-primary"
                        : night.reason === "blackout"
                          ? "bg-secondary text-on-secondary"
                          : "bg-surface-container-high text-on-surface-variant"
                    } flex items-center justify-center`}
                  >
                    {night.date.slice(8)}
                  </li>
                ))}
              </ol>
            )}
        <p className="mt-2 text-[11px] text-on-surface-variant">
          The next 60 nights from
          {" "}
          {formatDate(from)}
          .
        </p>
      </div>

      <form onSubmit={block} className="mt-5 rounded-lg bg-surface-container p-4">
        <p className="text-sm font-medium text-on-surface">Block dates</p>
        <p className="mt-1 text-[11px] text-on-surface-variant">
          For maintenance or personal use. The end date is exclusive — a block
          ending on the 5th leaves the 5th bookable.
        </p>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <label className="text-xs text-on-surface-variant">
            From
            <input
              required
              type="date"
              min={from}
              value={start}
              onChange={e => setStart(e.target.value)}
              className="mt-1 w-full rounded-md border border-outline-variant bg-surface px-2 py-1.5 text-sm text-on-surface"
            />
          </label>
          <label className="text-xs text-on-surface-variant">
            Until (exclusive)
            <input
              required
              type="date"
              min={start || from}
              value={end}
              onChange={e => setEnd(e.target.value)}
              className="mt-1 w-full rounded-md border border-outline-variant bg-surface px-2 py-1.5 text-sm text-on-surface"
            />
          </label>
        </div>

        <label className="mt-2 block text-xs text-on-surface-variant">
          Reason (optional)
          <input
            value={reason}
            placeholder="Repainting the veranda"
            onChange={e => setReason(e.target.value)}
            className="mt-1 w-full rounded-md border border-outline-variant bg-surface px-2 py-1.5 text-sm text-on-surface"
          />
        </label>

        {message && <p className="mt-2 text-xs text-error">{message}</p>}

        <Button
          type="submit"
          disabled={busy}
          className="mt-3 w-full bg-primary text-on-primary hover:bg-primary/90"
        >
          {busy ? "Blocking…" : "Block these dates"}
        </Button>

        {/*
          There is no way back: /blackouts is POST-only, with no endpoint to
          list or remove one. Saying so before the click is the difference
          between a considered decision and a trap.
        */}
        <p className="mt-2 text-[11px] leading-relaxed text-on-surface-variant">
          A block cannot be removed — the API has no endpoint for it yet. Check
          the dates before confirming.
        </p>
      </form>
    </div>
  );
}
