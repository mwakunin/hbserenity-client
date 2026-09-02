"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { getBookingStatus, payForBooking } from "@/app/(site)/bookings/[id]/actions";
import { Button } from "@/components/ui/button";

/**
 * The pay step.
 *
 * Two things shape this. First, the guest's phone may not be on their account
 * — an email signup has none — so the number is asked for here and sent with
 * the push. Second, the outcome never comes back in the response: Safaricom
 * confirms on a callback to the API, so once the prompt is out the only
 * truthful thing to do is watch the booking's status.
 */
export function CheckoutPayment({
  bookingId,
  defaultPhone,
}: {
  bookingId: string;
  defaultPhone?: string | null;
}) {
  const router = useRouter();
  const [phone, setPhone] = useState(defaultPhone ?? "");
  const [prompted, setPrompted] = useState(false);
  /**
   * A prompt may be live that this page did not send.
   *
   * The API answers 409 when an attempt is already in flight, and 502 when it
   * could not reach Safaricom — which is not proof that no prompt was
   * delivered, which is why the API leaves the attempt pending rather than
   * failing it. In both cases the guest's handset may be showing a PIN
   * request right now. Showing the message and stopping would leave them
   * paying while this page insisted nothing was happening, so it watches the
   * booking instead. If the booking is genuinely no longer payable the first
   * poll says so and polling stops on its own.
   */
  const [watching, setWatching] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const pay = useMutation({
    mutationFn: () => payForBooking(bookingId, phone.trim() || undefined),
    onSuccess: (result) => {
      if (result.status === "pushed") {
        setPrompted(true);
        setMessage(result.customerMessage);
        return;
      }
      if (result.status === "unauthenticated") {
        router.push(`/sign-in?next=${encodeURIComponent(`/bookings/${bookingId}/checkout`)}`);
        return;
      }
      if (result.status === "conflict") {
        setWatching(true);
        setMessage(result.message);
        return;
      }
      setMessage(result.message);
    },
    onError: () => setMessage("The payment could not be started. Please try again."),
  });

  // Only polls once a prompt is actually out. Confirmation arrives on the
  // API's callback, so there is nothing to watch before then — and polling a
  // booking nobody is paying for is just load.
  const booking = useQuery({
    queryKey: ["booking", bookingId],
    queryFn: () => getBookingStatus(bookingId),
    enabled: prompted || watching,
    refetchInterval: query =>
      query.state.data?.status === "pending_payment" ? 3000 : false,
  });

  /*
   * `pending_payment` is the only status worth waiting on.
   *
   * Every other one is terminal, and the waiting panel has to end on all of
   * them — not just `confirmed`. Polling already stops for a cancelled or
   * completed booking, but the screen kept saying "waiting for confirmation",
   * so a guest whose booking was called off in another tab, or by the host,
   * was told to keep watching a handset for a prompt that will never be
   * answered.
   */
  const status = booking.data?.status;
  const confirmed = status === "confirmed";
  const settledOtherwise = status !== undefined && status !== "pending_payment" && !confirmed;

  // Navigation is a side effect, so it belongs in an effect and not in the
  // render pass — calling router.replace() while rendering mutates the router
  // during React's render, which React does not guarantee anything about.
  useEffect(() => {
    if (confirmed)
      router.replace(`/bookings/${bookingId}`);
  }, [confirmed, bookingId, router]);

  if (confirmed) {
    return (
      <p className="rounded-lg bg-surface-container p-4 text-center text-sm text-on-surface">
        Payment received. Taking you to your booking…
      </p>
    );
  }

  if (settledOtherwise) {
    return (
      <div className="rounded-lg bg-surface-container p-4 text-center">
        <p className="text-sm font-medium text-on-surface">
          {status === "cancelled"
            ? "This booking has been cancelled."
            : "This stay is already complete."}
        </p>
        <p className="mt-1 text-xs text-on-surface-variant">
          {status === "cancelled"
            // Cancelling does not retract a prompt already on the handset, and
            // a payment can still land afterwards — so this must not claim
            // nothing was taken.
            ? "There is nothing more to pay. If you were charged, it will show on the booking."
            : "There is nothing left to pay for it."}
        </p>
        <Link href={`/bookings/${bookingId}`} className="mt-3 inline-block text-xs text-primary underline">
          View booking
        </Link>
      </div>
    );
  }

  const awaiting = prompted || watching;

  return (
    <div className="space-y-4">
      <fieldset className="rounded-lg bg-surface-container-lowest p-4 ring-1 ring-outline-variant/50">
        <legend className="px-1 text-xs uppercase tracking-wide text-on-surface-variant">
          Payment method
        </legend>

        <label className="flex items-start gap-3 rounded-md bg-surface-container p-3">
          <input type="radio" name="method" defaultChecked className="mt-1 accent-primary" />
          <span>
            <span className="block text-sm font-medium text-on-surface">M-Pesa</span>
            <span className="block text-xs text-on-surface-variant">
              Pay instantly via STK push
            </span>
          </span>
        </label>

        {/*
          Present but inactive, on purpose. The API supports M-Pesa only —
          `payments.provider` is ready for more, but nothing implements a card.
          Showing it selectable would fail exactly when someone is trying to
          pay, so it is visibly disabled instead.
        */}
        <label
          aria-disabled
          className="mt-2 flex cursor-not-allowed items-start gap-3 rounded-md p-3 opacity-50"
        >
          <input type="radio" name="method" disabled className="mt-1" />
          <span>
            <span className="block text-sm font-medium text-on-surface">
              Credit / Debit Card
            </span>
            <span className="block text-xs text-on-surface-variant">
              Visa, Mastercard, Amex — coming soon
            </span>
          </span>
        </label>
      </fieldset>

      <label className="block text-xs text-on-surface-variant">
        M-Pesa number
        <input
          inputMode="tel"
          placeholder="07XX XXX XXX"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          disabled={awaiting}
          className="mt-1 w-full rounded-md border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface disabled:opacity-60"
        />
      </label>

      {!awaiting
        ? (
            <Button
              onClick={() => pay.mutate()}
              disabled={pay.isPending}
              className="w-full bg-cta text-cta-foreground hover:bg-cta/90"
            >
              {pay.isPending ? "Sending prompt…" : "Confirm & pay"}
            </Button>
          )
        : (
            <div className="rounded-lg bg-surface-container p-4 text-center">
              <p className="text-sm font-medium text-on-surface">
                {prompted ? "Check your phone" : "A payment may already be in progress"}
              </p>
              <p className="mt-1 text-xs text-on-surface-variant">
                {message ?? "Enter your M-Pesa PIN to complete the payment."}
              </p>
              <p className="mt-3 text-xs text-on-surface-variant">
                Waiting for confirmation…
              </p>
              {/*
                Retrying is offered rather than automatic. The API allows one
                live attempt per booking and asks Safaricom before releasing a
                stale one, so hammering this would only produce conflicts.
              */}
              <button
                type="button"
                onClick={() => { setPrompted(false); setWatching(false); setMessage(null); }}
                className="mt-3 text-xs text-primary underline"
              >
                Nothing arrived? Try again
              </button>
            </div>
          )}

      {!awaiting && message && <p className="text-xs text-error">{message}</p>}
    </div>
  );
}
