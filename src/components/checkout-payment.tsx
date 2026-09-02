"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";

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
    enabled: prompted,
    refetchInterval: query =>
      query.state.data?.status === "pending_payment" ? 3000 : false,
  });

  if (booking.data?.status === "confirmed") {
    router.replace(`/bookings/${bookingId}`);
    return null;
  }

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
          disabled={prompted}
          className="mt-1 w-full rounded-md border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface disabled:opacity-60"
        />
      </label>

      {!prompted
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
                Check your phone
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
                onClick={() => { setPrompted(false); setMessage(null); }}
                className="mt-3 text-xs text-primary underline"
              >
                Nothing arrived? Try again
              </button>
            </div>
          )}

      {!prompted && message && <p className="text-xs text-error">{message}</p>}
    </div>
  );
}
