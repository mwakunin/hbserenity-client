"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { cancelBooking, submitReview } from "@/app/(site)/bookings/[id]/actions";
import { Button } from "@/components/ui/button";

/**
 * Calling off a stay.
 *
 * A paid booking can be cancelled, and doing so moves no money — the payment
 * shows up on the host's attention list and the refund is arranged by hand.
 * Saying that here matters: a guest who expects an instant refund and gets
 * silence will assume something broke.
 *
 * The reason is only required once a booking has been paid for, which is a
 * rule the form cannot know on its own — the API answers 422 and that is
 * surfaced by revealing the field rather than by guessing up front.
 */
export function CancelBooking({
  bookingId,
  isPaid,
}: {
  bookingId: string;
  isPaid: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError(null);

    try {
      const result = await cancelBooking(bookingId, reason.trim() || undefined);

      if (result.status === "ok") {
        router.refresh();
        setOpen(false);
        return;
      }
      if (result.status === "unauthenticated") {
        router.push(`/sign-in?next=${encodeURIComponent(`/bookings/${bookingId}`)}`);
        return;
      }
      setError(result.message);
    }
    catch {
      setError("Something went wrong. Please try again.");
    }
    finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 w-full rounded-md border border-outline-variant px-5 py-3 text-center text-sm text-on-surface"
      >
        Cancel this booking
      </button>
    );
  }

  return (
    <div className="mt-3 rounded-lg bg-surface-container p-4">
      <p className="text-sm font-medium text-on-surface">Cancel this booking?</p>
      <p className="mt-1 text-xs text-on-surface-variant">
        The dates are released immediately.
        {isPaid
          ? " Your payment is not refunded automatically — we will arrange it and confirm once it has been sent."
          : " No payment has been taken, so there is nothing to refund."}
      </p>

      <label className="mt-3 block text-xs text-on-surface-variant">
        Reason
        {isPaid ? "" : " (optional)"}
        <textarea
          rows={2}
          value={reason}
          onChange={e => setReason(e.target.value)}
          className="mt-1 w-full rounded-md border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface"
        />
      </label>

      {error && <p className="mt-2 text-xs text-error">{error}</p>}

      <div className="mt-3 flex gap-2">
        <Button
          onClick={submit}
          disabled={busy}
          className="flex-1 bg-error text-on-error hover:bg-error/90"
        >
          {busy ? "Cancelling…" : "Yes, cancel"}
        </Button>
        <Button
          variant="outline"
          onClick={() => { setOpen(false); setError(null); }}
          disabled={busy}
          className="flex-1"
        >
          Keep it
        </Button>
      </div>
    </div>
  );
}

/**
 * Reviewing a finished stay.
 *
 * Only the guest on the booking may write one, only once the stay is
 * `completed`, and only once ever — all enforced by the API. `completed` is
 * applied by the reconciliation sweep after check-out, so a stay that has
 * clearly ended may briefly still be `confirmed` if the sweep is not running.
 */
export function WriteReview({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <p className="mt-3 rounded-lg bg-surface-container p-4 text-sm text-on-surface">
        Thank you — your review is published.
      </p>
    );
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const result = await submitReview(bookingId, { rating, comment });

      if (result.status === "ok") {
        setDone(true);
        router.refresh();
        return;
      }
      if (result.status === "unauthenticated") {
        router.push(`/sign-in?next=${encodeURIComponent(`/bookings/${bookingId}`)}`);
        return;
      }
      setError(result.message);
    }
    catch {
      setError("Something went wrong. Please try again.");
    }
    finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-3 rounded-lg bg-surface-container p-4">
      <p className="text-sm font-medium text-on-surface">How was it?</p>

      <div className="mt-2 flex gap-1">
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            aria-label={`${n} out of 5`}
            aria-pressed={rating === n}
            className={`h-9 w-9 rounded-md text-lg ${
              n <= rating ? "bg-primary text-on-primary" : "bg-surface text-on-surface-variant"
            }`}
          >
            ★
          </button>
        ))}
      </div>

      <label className="mt-3 block text-xs text-on-surface-variant">
        Comment (optional)
        <textarea
          rows={3}
          maxLength={2000}
          value={comment}
          onChange={e => setComment(e.target.value)}
          className="mt-1 w-full rounded-md border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface"
        />
      </label>

      {error && <p className="mt-2 text-xs text-error">{error}</p>}

      <Button
        type="submit"
        disabled={busy}
        className="mt-3 w-full bg-primary text-on-primary hover:bg-primary/90"
      >
        {busy ? "Publishing…" : "Publish review"}
      </Button>
    </form>
  );
}
