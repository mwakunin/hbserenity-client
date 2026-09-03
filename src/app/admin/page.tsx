import Link from "next/link";
import { redirect } from "next/navigation";

import type { BookingRow } from "@/lib/dashboard";
import type { PropertySummary } from "@/components/property-card";

import { ApiError, apiGet } from "@/lib/api/client";
import { recentWindow, summarise, windowOf } from "@/lib/dashboard";
import { formatDate, formatMoney, pluralise } from "@/lib/format";
import { requireAdmin } from "@/lib/session";

export const metadata = { title: "Host dashboard" };

export default async function AdminDashboardPage() {
  await requireAdmin("/admin");

  const window = windowOf(30);
  // Money is a question about the past; occupancy is a question about the
  // future. One window for both would report next month's revenue as zero.
  const earned = recentWindow(30);

  let bookings: BookingRow[];
  let properties: PropertySummary[];
  let takings: { receivedCents: number; refundedCents: number; netCents: number };
  try {
    // An admin session sees every booking; a guest would see only their own,
    // so a non-admin landing here gets a truthful but empty dashboard rather
    // than someone else's data.
    const [bookingPage, propertyPage, paymentPage] = await Promise.all([
      apiGet<"/bookings">("/bookings?limit=100", { authenticated: true }),
      apiGet<"/properties">("/properties?limit=100"),
      // `limit=1` because only the totals are wanted here: they are computed
      // over every matching attempt, not over the page, so asking for a page
      // of rows would be transfer for nothing.
      apiGet<"/admin/payments">(
        `/admin/payments?from=${earned.from}&to=${earned.to}&limit=1`,
        { authenticated: true },
      ),
    ]);
    bookings = bookingPage.data;
    properties = propertyPage.data;
    takings = paymentPage.totals;
  }
  catch (error) {
    // requireAdmin() has already run, so these are the API disagreeing with
    // the session this app read — a stale or revoked cookie. Same answer.
    if (error instanceof ApiError && (error.status === 401 || error.status === 403))
      redirect("/sign-in?next=%2Fadmin");
    throw error;
  }

  const byId = new Map(properties.map(p => [p.id, p]));
  const stats = summarise(bookings, properties.length, window);

  return (
    <div className="px-4 py-6">
      <p className="text-xs uppercase tracking-wide text-on-surface-variant">
        Host overview
      </p>
      <h1 className="mt-1 font-headline text-2xl text-on-surface">Dashboard</h1>
      <p className="mt-2 text-sm text-on-surface-variant">
        The next 30 days across your published listings, and what came in over
        the last 30.
      </p>

      <div className="mt-5 grid gap-3">
        <Stat
          label="Upcoming"
          value={String(stats.upcoming.length)}
          note={`check-in${stats.upcoming.length === 1 ? "" : "s"} in the next 30 days`}
        />
        <Stat
          label="Occupancy"
          value={stats.occupancy === null ? "—" : `${Math.round(stats.occupancy * 100)}%`}
          note={
            stats.occupancy === null
              ? "no published listings yet"
              : `${stats.bookedNights} of ${stats.nightsOnOffer} nights across ${pluralise(properties.length, "listing")}`
          }
        />
        <Stat
          label="Revenue"
          // Money M-Pesa actually settled, net of refunds — not agreed booking
          // totals, which is what this tile used to show and why it was called
          // "Booked value". The API counts `success` attempts only.
          value={formatMoney(takings.netCents, "KES")}
          note={takings.refundedCents > 0
            ? `last 30 days, after ${formatMoney(takings.refundedCents, "KES")} refunded`
            : "received in the last 30 days"}
        />
      </div>

      <div className="mt-5 flex gap-2">
        <Link
          href="/admin/properties"
          className="flex-1 rounded-md bg-primary px-4 py-2.5 text-center text-sm text-on-primary"
        >
          Properties
        </Link>
        <Link
          href="/properties"
          className="flex-1 rounded-md border border-outline-variant px-4 py-2.5 text-center text-sm text-on-surface"
        >
          View site
        </Link>
      </div>

      <section className="mt-8">
        <h2 className="font-headline text-lg text-on-surface">Recent bookings</h2>

        {bookings.length === 0
          ? (
              <p className="mt-2 rounded-lg bg-surface-container p-5 text-center text-sm text-on-surface-variant">
                No bookings yet.
              </p>
            )
          : (
              <ul className="mt-3 space-y-2">
                {[...bookings]
                  .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                  .slice(0, 8)
                  .map(booking => (
                    <li
                      key={booking.id}
                      className="rounded-lg bg-surface-container-lowest p-4 ring-1 ring-outline-variant/50"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-on-surface">
                            {booking.guestName}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-on-surface-variant">
                            {byId.get(booking.propertyId)?.title ?? "Unlisted property"}
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
                        <StatusPill status={booking.status} />
                      </div>
                    </li>
                  ))}
              </ul>
            )}

        {/*
          `GET /bookings` carries `guestName` now, so the design's "who booked"
          is answerable without a request per row. Occupancy still counts only
          active listings: the denominator is what a guest could have booked,
          and a draft was never on sale.
        */}
        <p className="mt-3 text-[11px] leading-relaxed text-on-surface-variant">
          Occupancy counts published listings only — a draft was never on sale.
        </p>
      </section>
    </div>
  );
}

function Stat({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-lg bg-surface-container-lowest p-4 ring-1 ring-outline-variant/50">
      <p className="text-xs uppercase tracking-wide text-on-surface-variant">{label}</p>
      <p className="mt-1 font-headline text-2xl text-on-surface">{value}</p>
      <p className="mt-0.5 text-xs text-on-surface-variant">{note}</p>
    </div>
  );
}

const PILL: Record<string, string> = {
  confirmed: "bg-primary text-on-primary",
  pending_payment: "bg-secondary-container text-on-secondary-container",
  completed: "bg-surface-container-high text-on-surface-variant",
  cancelled: "bg-error-container text-on-error-container",
};

function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide ${
        PILL[status] ?? "bg-surface-container text-on-surface-variant"
      }`}
    >
      {status.replace("_", " ")}
    </span>
  );
}
