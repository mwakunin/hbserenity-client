import Link from "next/link";
import { redirect } from "next/navigation";


import { ApiError, apiGet } from "@/lib/api/client";
import { formatDate, formatMoney, pluralise } from "@/lib/format";

export const metadata = { title: "Your trips" };

const LABEL: Record<string, { text: string; className: string }> = {
  pending_payment: { text: "Awaiting payment", className: "bg-secondary-container text-on-secondary-container" },
  confirmed: { text: "Confirmed", className: "bg-primary text-on-primary" },
  completed: { text: "Completed", className: "bg-surface-container-high text-on-surface-variant" },
  cancelled: { text: "Cancelled", className: "bg-error-container text-on-error-container" },
};

/**
 * The guest's own bookings.
 *
 * `GET /bookings` scopes to the caller — a guest sees only their own, and the
 * API takes the identity from the session rather than any parameter, so there
 * is nothing here that could be widened by editing a URL.
 */
export default async function TripsPage() {
  let bookings;
  try {
    bookings = await apiGet<"/bookings">("/bookings?limit=50", { authenticated: true });
  }
  catch (error) {
    if (error instanceof ApiError && error.status === 401)
      redirect("/sign-in?next=%2Fbookings");
    throw error;
  }

  // One request per property would be an N+1; the ids are collected and the
  // list endpoint asked once. Only active listings come back, so a booking
  // against a since-deactivated property falls back to its id.
  const properties = await apiGet<"/properties">("/properties?limit=100", { revalidate: 60 });
  const byId = new Map(properties.data.map(p => [p.id, p]));

  const rows = [...bookings.data].sort((a, b) => b.checkIn.localeCompare(a.checkIn));

  return (
    <div className="px-4 py-6">
      <h1 className="font-headline text-2xl text-on-surface">Your trips</h1>

      {rows.length === 0
        ? (
            <div className="mt-6 rounded-lg bg-surface-container p-6 text-center">
              <p className="text-sm text-on-surface">No trips yet.</p>
              <Link href="/properties" className="mt-2 inline-block text-xs text-primary underline">
                Find somewhere to stay
              </Link>
            </div>
          )
        : (
            <ul className="mt-4 space-y-2">
              {rows.map((booking) => {
                const property = byId.get(booking.propertyId);
                const label = LABEL[booking.status] ?? LABEL.pending_payment;

                return (
                  <li key={booking.id}>
                    <Link
                      href={`/bookings/${booking.id}`}
                      className="block rounded-lg bg-surface-container-lowest p-4 ring-1 ring-outline-variant/50"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-on-surface">
                            {property?.title ?? "Listing unavailable"}
                          </p>
                          <p className="mt-0.5 text-xs text-on-surface-variant">
                            {formatDate(booking.checkIn)}
                            {" – "}
                            {formatDate(booking.checkOut)}
                          </p>
                          <p className="mt-0.5 text-xs text-on-surface-variant">
                            {pluralise(booking.guestCount, "guest")}
                            {" · "}
                            {formatMoney(booking.totalAmountCents, booking.currency)}
                          </p>
                        </div>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide ${label.className}`}>
                          {label.text}
                        </span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
    </div>
  );
}
