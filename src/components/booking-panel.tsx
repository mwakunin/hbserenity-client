"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  createBooking,
  getAvailability,
  getQuote,
} from "@/app/(site)/properties/[id]/actions";
import { Button } from "@/components/ui/button";
import { formatMoney, nightsBetween, pluralise } from "@/lib/format";

/** Debounce a value, so typing a date does not fire a request per keystroke. */
function useDebounced<T>(value: T, ms = 350): T {
  const [settled, setSettled] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);

  return settled;
}

const today = () => new Date().toISOString().slice(0, 10);

/**
 * Dates, price, and the reserve action.
 *
 * The quote comes from the API rather than being multiplied out here. Nightly
 * rates can carry seasonal overrides and a weekend rate, so a total computed
 * in the browser would quietly disagree with what the guest is charged — and
 * the booking snapshots the API's figure, not this one.
 */
export function BookingPanel({
  propertyId,
  maxGuests,
  pricePerNightCents,
  currency,
}: {
  propertyId: string;
  maxGuests: number;
  pricePerNightCents: number;
  currency: string;
}) {
  const router = useRouter();
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guestCount, setGuestCount] = useState(1);
  const [error, setError] = useState<string | null>(null);

  // Debounced together: a native date input fires on every partial value, and
  // a half-typed year would otherwise send a request for the year 0002.
  const range = useDebounced({ checkIn, checkOut });
  const complete = Boolean(range.checkIn && range.checkOut && range.checkOut > range.checkIn);

  const quote = useQuery({
    queryKey: ["quote", propertyId, range.checkIn, range.checkOut],
    queryFn: () => getQuote({ propertyId, checkIn: range.checkIn, checkOut: range.checkOut }),
    enabled: complete,
  });

  const availability = useQuery({
    queryKey: ["availability", propertyId, range.checkIn, range.checkOut],
    queryFn: () => getAvailability({ propertyId, from: range.checkIn, to: range.checkOut }),
    enabled: complete,
  });

  const taken = (availability.data?.unavailable.length ?? 0) > 0;

  const reserve = useMutation({
    // The debounced range, not the raw inputs. Those are what was quoted and
    // what availability was checked against; changing a date and pressing
    // Reserve inside the debounce window would otherwise book dates nobody
    // priced and nobody checked, at the total shown for the old ones.
    mutationFn: () => createBooking({
      propertyId,
      checkIn: range.checkIn,
      checkOut: range.checkOut,
      guestCount,
    }),
    onSuccess: (result) => {
      setError(null);

      switch (result.status) {
        case "created":
          router.push(`/bookings/${result.bookingId}/checkout`);
          break;
        case "unauthenticated":
          // Come back here afterwards rather than dropping the guest on the
          // home page having lost their dates.
          router.push(`/sign-in?next=${encodeURIComponent(`/properties/${propertyId}`)}`);
          break;
        default:
          setError(result.message);
      }
    },
    onError: () => setError("Something went wrong. Please try again."),
  });

  const nights = complete ? nightsBetween(range.checkIn, range.checkOut) : 0;

  return (
    <div className="fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-[480px] border-t border-outline-variant bg-surface-container-lowest p-4 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-on-surface-variant">
          Check in
          <input
            type="date"
            min={today()}
            value={checkIn}
            onChange={e => setCheckIn(e.target.value)}
            className="mt-1 w-full rounded-md border border-outline-variant bg-surface px-2 py-1.5 text-sm text-on-surface"
          />
        </label>
        <label className="text-xs text-on-surface-variant">
          Check out
          <input
            type="date"
            min={checkIn || today()}
            value={checkOut}
            onChange={e => setCheckOut(e.target.value)}
            className="mt-1 w-full rounded-md border border-outline-variant bg-surface px-2 py-1.5 text-sm text-on-surface"
          />
        </label>
      </div>

      <label className="mt-2 block text-xs text-on-surface-variant">
        Guests
        <select
          value={guestCount}
          onChange={e => setGuestCount(Number(e.target.value))}
          className="mt-1 w-full rounded-md border border-outline-variant bg-surface px-2 py-1.5 text-sm text-on-surface"
        >
          {Array.from({ length: maxGuests }, (_, i) => i + 1).map(n => (
            <option key={n} value={n}>{pluralise(n, "guest")}</option>
          ))}
        </select>
      </label>

      <div className="mt-3 flex items-end justify-between gap-3">
        <div className="min-w-0">
          {quote.data
            ? (
                <>
                  <p className="truncate text-lg font-semibold text-on-surface">
                    {formatMoney(quote.data.totalCents, quote.data.currency)}
                  </p>
                  <p className="text-xs text-on-surface-variant">
                    {pluralise(nights, "night")}
                    {" including fees"}
                  </p>
                </>
              )
            : (
                <>
                  <p className="text-lg font-semibold text-on-surface">
                    {formatMoney(pricePerNightCents, currency)}
                  </p>
                  <p className="text-xs text-on-surface-variant">
                    per night · pick dates for a total
                  </p>
                </>
              )}
        </div>

        <Button
          onClick={() => reserve.mutate()}
          disabled={!complete || taken || quote.isFetching || reserve.isPending}
          className="shrink-0 bg-primary text-on-primary hover:bg-primary/90"
        >
          {reserve.isPending ? "Reserving…" : "Reserve now"}
        </Button>
      </div>

      {taken && (
        <p className="mt-2 text-xs text-error">
          Some of those nights are already booked. Try another range.
        </p>
      )}
      {error && <p className="mt-2 text-xs text-error">{error}</p>}
    </div>
  );
}
