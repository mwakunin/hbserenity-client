"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { createRate, deleteRate } from "@/app/admin/properties/actions";
import { Button } from "@/components/ui/button";
import { formatDate, formatMoney } from "@/lib/format";

interface RateOverride {
  id: string;
  startDate: string;
  endDate: string;
  pricePerNightCents: number;
  label: string | null;
}

/**
 * Seasonal pricing.
 *
 * A season beats the weekend rate, which beats the base rate — an explicit
 * Christmas price should not be undercut because the date lands on a Friday.
 * Ranges are half-open like everything else here: a season ending on the 1st
 * does not price the 1st.
 *
 * Seasons cannot overlap. The API enforces that with an exclusion constraint
 * rather than a check-then-insert, because two concurrent inserts would both
 * pass a pre-check and a night with two prices has no defined answer.
 */
export function RateManager({
  propertyId,
  rates,
  currency,
}: {
  propertyId: string;
  rates: RateOverride[];
  currency: string;
}) {
  const router = useRouter();
  const [startDate, setStart] = useState("");
  const [endDate, setEnd] = useState("");
  const [shillings, setShillings] = useState("");
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function add(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const result = await createRate({
      propertyId,
      startDate,
      endDate,
      pricePerNightCents: Math.round(Number(shillings)) * 100,
      label: label.trim() || undefined,
    });

    setBusy(false);

    if (result.status !== "ok") {
      setError("message" in result ? result.message : "That could not be saved.");
      return;
    }

    setStart("");
    setEnd("");
    setShillings("");
    setLabel("");
    router.refresh();
  }

  async function remove(id: string) {
    setBusy(true);
    await deleteRate(propertyId, id);
    setBusy(false);
    router.refresh();
  }

  return (
    <div>
      <h2 className="font-headline text-lg text-on-surface">Seasonal rates</h2>
      <p className="mt-1 text-[11px] text-on-surface-variant">
        Overrides both the base and weekend price for the nights it covers.
        Existing bookings keep the price they were made at.
      </p>

      {rates.length > 0 && (
        <ul className="mt-3 space-y-2">
          {rates.map(rate => (
            <li
              key={rate.id}
              className="flex items-start justify-between gap-3 rounded-lg bg-surface-container-lowest p-3 ring-1 ring-outline-variant/50"
            >
              <div className="min-w-0">
                <p className="text-sm text-on-surface">
                  {formatMoney(rate.pricePerNightCents, currency)}
                  <span className="text-on-surface-variant"> / night</span>
                </p>
                <p className="mt-0.5 text-xs text-on-surface-variant">
                  {formatDate(rate.startDate)}
                  {" – "}
                  {formatDate(rate.endDate)}
                  {rate.label ? ` · ${rate.label}` : ""}
                </p>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => remove(rate.id)}
                className="shrink-0 text-xs text-error underline"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={add} className="mt-4 space-y-2 rounded-lg bg-surface-container p-3">
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs text-on-surface-variant">
            From
            <input
              required
              type="date"
              value={startDate}
              onChange={e => setStart(e.target.value)}
              className="mt-1 w-full rounded-md border border-outline-variant bg-surface px-2 py-1.5 text-sm text-on-surface"
            />
          </label>
          <label className="text-xs text-on-surface-variant">
            Until (exclusive)
            <input
              required
              type="date"
              value={endDate}
              onChange={e => setEnd(e.target.value)}
              className="mt-1 w-full rounded-md border border-outline-variant bg-surface px-2 py-1.5 text-sm text-on-surface"
            />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs text-on-surface-variant">
            Price per night (KES)
            <input
              required
              type="number"
              min={0}
              value={shillings}
              onChange={e => setShillings(e.target.value)}
              className="mt-1 w-full rounded-md border border-outline-variant bg-surface px-2 py-1.5 text-sm text-on-surface"
            />
          </label>
          <label className="text-xs text-on-surface-variant">
            Label (optional)
            <input
              value={label}
              placeholder="December high season"
              onChange={e => setLabel(e.target.value)}
              className="mt-1 w-full rounded-md border border-outline-variant bg-surface px-2 py-1.5 text-sm text-on-surface"
            />
          </label>
        </div>

        {error && <p className="text-xs text-error">{error}</p>}

        <Button
          type="submit"
          disabled={busy}
          className="w-full bg-primary text-on-primary hover:bg-primary/90"
        >
          {busy ? "Saving…" : "Add season"}
        </Button>
      </form>
    </div>
  );
}
