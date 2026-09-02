import Link from "next/link";
import { redirect } from "next/navigation";

import type { BookingRow } from "@/lib/dashboard";
import type { PropertySummary } from "@/components/property-card";

import { ApiError, apiGet } from "@/lib/api/client";
import { summarise, windowOf } from "@/lib/dashboard";
import { formatDate, formatMoney, pluralise } from "@/lib/format";
import { requireAdmin } from "@/lib/session";

export const metadata = { title: "Host dashboard" };

export default async function AdminDashboardPage() {
  await requireAdmin("/admin");

  const window = windowOf(30);

  let bookings: BookingRow[];
  let properties: PropertySummary[];
  try {
    // An admin session sees every booking; a guest would see only their own,
    // so a non-admin landing here gets a truthful but empty dashboard rather
    // than someone else's data.
    const [bookingPage, propertyPage] = await Promise.all([
      apiGet<"/bookings">("/bookings?limit=100", { authenticated: true }),
      apiGet<"/properties">("/properties?limit=100"),
    ]);
    bookings = bookingPage.data as unknown as BookingRow[];
    properties = propertyPage.data as unknown as PropertySummary[];
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
        The next 30 days across your published listings.
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
          label="Booked value"
          value={formatMoney(stats.bookedValueCents, stats.currency)}
          // Deliberately not "revenue": these are agreed booking totals, not
          // money M-Pesa has settled.
          note="agreed totals for stays starting in this window"
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
          The design lists a guest name against each booking. `GET /bookings`
          returns `guestId` and nothing else about the guest, and there is no
          endpoint to resolve one, so the property is shown instead. Naming
          them needs a join on the API side.
        */}
        <p className="mt-3 text-[11px] leading-relaxed text-on-surface-variant">
          Guest names are not shown: the bookings endpoint returns a guest id
          only. Occupancy covers published listings, since drafts are not
          returned by the API.
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
