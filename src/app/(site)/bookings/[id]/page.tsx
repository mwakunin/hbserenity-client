import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { CancelBooking, WriteReview } from "@/components/booking-actions";
import { ApiError, apiGet } from "@/lib/api/client";
import { formatDate, formatMoney, nightsBetween, pluralise } from "@/lib/format";

export const metadata = { title: "Your booking" };

const COPY = {
  confirmed: {
    heading: "Booking confirmed!",
    body: "Your payment came through and the dates are yours. We have emailed you the details.",
    tone: "text-primary",
  },
  pending_payment: {
    heading: "Waiting for payment",
    body: "These dates are held for you, but the stay is not confirmed until M-Pesa completes.",
    tone: "text-on-surface",
  },
  completed: {
    heading: "Stay completed",
    body: "We hope it was a good one. You can leave a review now.",
    tone: "text-on-surface",
  },
  cancelled: {
    heading: "Booking cancelled",
    body: "This booking was called off and the dates have been released.",
    tone: "text-on-surface-variant",
  },
} as const;

export default async function BookingPage({ params }: PageProps<"/bookings/[id]">) {
  const { id } = await params;

  let booking;
  try {
    booking = await apiGet<"/bookings/{id}">(`/bookings/${id}`, { authenticated: true });
  }
  catch (error) {
    if (error instanceof ApiError && error.status === 401)
      redirect(`/sign-in?next=${encodeURIComponent(`/bookings/${id}`)}`);
    if (error instanceof ApiError && error.status === 404)
      notFound();
    throw error;
  }

  const property = await apiGet<"/properties/{id}">(`/properties/${booking.propertyId}`, {
    revalidate: 60,
  });

  // Never includes checkoutRequestId — the API withholds it from every
  // endpoint, because it is all a forged callback would need.
  const payments = await apiGet<"/bookings/{id}/payments">(
    `/bookings/${id}/payments`,
    { authenticated: true },
  ).catch(() => ({ data: [] }));

  const paid = payments.data.some(p => p.status === "success");
  const copy = COPY[booking.status as keyof typeof COPY] ?? COPY.pending_payment;
  const nights = nightsBetween(booking.checkIn, booking.checkOut);

  return (
    <div className="px-4 py-10">
      <div className="text-center">
        <h1 className={`font-headline text-3xl ${copy.tone}`}>{copy.heading}</h1>
        <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-on-surface-variant">
          {copy.body}
        </p>
      </div>

      <section className="mt-8 rounded-lg bg-surface-container-lowest p-5 ring-1 ring-outline-variant/50">
        <h2 className="font-headline text-lg text-on-surface">{property.title}</h2>
        <p className="text-xs text-on-surface-variant">
          {property.town}
          ,
          {" "}
          {property.county}
        </p>

        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-on-surface-variant">Check in</dt>
            <dd className="text-on-surface">{formatDate(booking.checkIn)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-on-surface-variant">Check out</dt>
            <dd className="text-on-surface">{formatDate(booking.checkOut)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-on-surface-variant">Guests</dt>
            <dd className="text-on-surface">
              {pluralise(booking.guestCount, "guest")}
              {" · "}
              {pluralise(nights, "night")}
            </dd>
          </div>
          <div className="flex justify-between border-t border-outline-variant/60 pt-2">
            <dt className="text-on-surface-variant">Total</dt>
            <dd className="font-semibold text-on-surface">
              {formatMoney(booking.totalAmountCents, booking.currency)}
            </dd>
          </div>
        </dl>

        <p className="mt-4 text-[11px] text-on-surface-variant">
          Reference
          {" "}
          {booking.id}
        </p>
      </section>

      {payments.data.length > 0 && (
        <section className="mt-5">
          <h2 className="font-headline text-lg text-on-surface">Payments</h2>
          <ul className="mt-2 space-y-2">
            {payments.data.map(payment => (
              <li
                key={payment.id}
                className="rounded-lg bg-surface-container-lowest p-3 ring-1 ring-outline-variant/50"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm text-on-surface">
                    {formatMoney(payment.amountCents, booking.currency)}
                  </span>
                  <span className="text-[10px] uppercase tracking-wide text-on-surface-variant">
                    {payment.status}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-on-surface-variant">
                  {payment.phoneNumber}
                  {payment.mpesaReceiptNumber ? ` · ${payment.mpesaReceiptNumber}` : ""}
                </p>
                {payment.resultDesc && (
                  <p className="mt-0.5 text-[11px] text-on-surface-variant">
                    {payment.resultDesc}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {booking.status === "completed" && <WriteReview bookingId={booking.id} />}

      {booking.status === "pending_payment" && (
        <Link
          href={`/bookings/${booking.id}/checkout`}
          className="mt-5 block rounded-md bg-cta px-5 py-3 text-center text-sm font-medium text-cta-foreground"
        >
          Complete payment
        </Link>
      )}

      {/* Only a booking that still holds its dates can be called off. */}
      {(booking.status === "pending_payment" || booking.status === "confirmed") && (
        <CancelBooking bookingId={booking.id} isPaid={paid} />
      )}

      <Link
        href="/properties"
        className="mt-3 block rounded-md border border-outline-variant px-5 py-3 text-center text-sm text-on-surface"
      >
        Browse more stays
      </Link>
    </div>
  );
}
