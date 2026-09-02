import Image from "next/image";
import { notFound, redirect } from "next/navigation";

import { CheckoutPayment } from "@/components/checkout-payment";
import { ApiError, apiGet } from "@/lib/api/client";
import { formatDate, formatMoney, nightsBetween, pluralise } from "@/lib/format";

export const metadata = { title: "Checkout" };

/**
 * Confirm the stay, then pay for it.
 *
 * The booking already exists by the time this page renders — it was created
 * in `pending_payment` when the guest reserved, which is what holds the dates
 * against other guests while they pay.
 */
export default async function CheckoutPage({ params }: PageProps<"/bookings/[id]/checkout">) {
  const { id } = await params;

  let booking;
  try {
    booking = await apiGet<"/bookings/{id}">(`/bookings/${id}`, { authenticated: true });
  }
  catch (error) {
    if (error instanceof ApiError && error.status === 401)
      redirect(`/sign-in?next=${encodeURIComponent(`/bookings/${id}/checkout`)}`);
    // Someone else's booking is a 404 too, so ids cannot be probed.
    if (error instanceof ApiError && error.status === 404)
      notFound();
    throw error;
  }

  // Already paid, or called off — either way there is nothing to pay here.
  if (booking.status !== "pending_payment")
    redirect(`/bookings/${id}`);

  const property = await apiGet<"/properties/{id}">(`/properties/${booking.propertyId}`, {
    revalidate: 60,
  });
  const cover = property.images.find(i => i.isCover) ?? property.images[0];
  const nights = nightsBetween(booking.checkIn, booking.checkOut);

  return (
    <div className="px-4 py-6">
      <h1 className="font-headline text-2xl text-on-surface">Checkout</h1>

      <section className="mt-4 overflow-hidden rounded-lg bg-surface-container-lowest ring-1 ring-outline-variant/50">
        {cover && (
          <div className="relative aspect-[16/9]">
            <Image src={cover.url} alt="" fill sizes="480px" className="object-cover" />
          </div>
        )}
        <div className="p-4">
          <h2 className="font-headline text-lg text-on-surface">{property.title}</h2>

          <dl className="mt-3 grid grid-cols-2 gap-3 text-xs">
            <div>
              <dt className="uppercase tracking-wide text-on-surface-variant">Check in</dt>
              <dd className="mt-0.5 text-sm text-on-surface">{formatDate(booking.checkIn)}</dd>
            </div>
            <div>
              <dt className="uppercase tracking-wide text-on-surface-variant">Check out</dt>
              <dd className="mt-0.5 text-sm text-on-surface">{formatDate(booking.checkOut)}</dd>
            </div>
          </dl>

          <p className="mt-3 text-xs text-on-surface-variant">
            {pluralise(booking.guestCount, "guest")}
            {" · "}
            {pluralise(nights, "night")}
          </p>
        </div>
      </section>

      <section className="mt-5">
        <CheckoutPayment bookingId={booking.id} />
      </section>

      <section className="mt-5 rounded-lg bg-surface-container p-4">
        <div className="flex items-baseline justify-between">
          <span className="text-xs uppercase tracking-wide text-on-surface-variant">
            Total amount
          </span>
          <span className="font-headline text-xl text-on-surface">
            {formatMoney(booking.totalAmountCents, booking.currency)}
          </span>
        </div>
        {/*
          The booking's own snapshotted total, not a fresh quote. It was fixed
          when the booking was created and is never recalculated, so showing a
          recomputed figure could differ from what is actually charged.
        */}
        <p className="mt-1 text-xs text-on-surface-variant">
          Fixed when you reserved. This is the amount M-Pesa will request.
        </p>
      </section>
    </div>
  );
}
