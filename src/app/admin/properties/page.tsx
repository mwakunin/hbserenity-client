import Link from "next/link";
import { redirect } from "next/navigation";

import type { PropertySummary } from "@/components/property-card";

import { ApiError, apiGet } from "@/lib/api/client";
import { formatMoney, pluralise } from "@/lib/format";
import { requireAdmin } from "@/lib/session";

export const metadata = { title: "Properties" };

/**
 * The host's listings — all of them.
 *
 * `?status=all` is admin-only and ignored for anyone else, so this is the one
 * place that asks for it. The default stays "active" even for an admin, which
 * is what makes browsing the site as one show what a guest sees; seeing drafts
 * has to be opt-in, and this page is the opt-in.
 *
 * Until the API grew that parameter a new listing appeared in no list at all,
 * since `properties.status` defaults to `draft` — the id was the only way back
 * to it. A localStorage bridge stood in for this and is now deleted.
 */
/** The API's own ceiling — `limit` is capped at 100, so this cannot be raised. */
const PAGE_SIZE = 100;

/**
 * Every listing, not the first hundred.
 *
 * This is the host's index of their own work, so a silent truncation is the
 * worst failure it could have: a listing that exists, is paid for, and simply
 * is not on the page. Asking for a bigger page is not an option — the API
 * caps `limit` at 100 and quietly clamps past that — so the remaining pages
 * are fetched, concurrently and bounded by the count the first page reports.
 */
async function loadAllProperties() {
  const first = await apiGet<"/properties">(
    `/properties?status=all&limit=${PAGE_SIZE}`,
    { authenticated: true },
  );

  if (first.meta.totalPages <= 1)
    return first;

  const rest = await Promise.all(
    Array.from({ length: first.meta.totalPages - 1 }, (_, i) =>
      apiGet<"/properties">(
        `/properties?status=all&limit=${PAGE_SIZE}&page=${i + 2}`,
        { authenticated: true },
      )),
  );

  return {
    data: [...first.data, ...rest.flatMap(r => r.data)],
    meta: first.meta,
  };
}

export default async function AdminPropertiesPage() {
  await requireAdmin("/admin/properties");

  let properties: PropertySummary[];
  let total: number;
  try {
    const page = await loadAllProperties();
    properties = page.data;
    // From the API, not from `properties.length`: they agree only when
    // everything was loaded, and that is the assumption worth stating rather
    // than re-deriving.
    total = page.meta.total;
  }
  catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 403))
      redirect("/sign-in?next=%2Fadmin%2Fproperties");
    throw error;
  }

  return (
    <div className="px-4 py-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-headline text-2xl text-on-surface">Properties</h1>
          <p className="mt-1 text-xs text-on-surface-variant">
            {pluralise(total, "listing")}
          </p>
        </div>
        <Link
          href="/admin/properties/new"
          className="shrink-0 rounded-md bg-primary px-3 py-2 text-xs text-on-primary"
        >
          + Add
        </Link>
      </div>

      <ul className="mt-4 space-y-2">
        {properties.map(p => (
          <li
            key={p.id}
            className="rounded-lg bg-surface-container-lowest p-4 ring-1 ring-outline-variant/50"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium text-on-surface">{p.title}</p>
                  {/*
                    Draft and inactive are the reason this list asks for every
                    status, so they have to be legible at a glance — an
                    unlabelled draft looks published.
                  */}
                  {p.status !== "active" && (
                    <span className="shrink-0 rounded-full bg-secondary-container px-2 py-0.5 text-[10px] uppercase tracking-wide text-on-secondary-container">
                      {p.status}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-on-surface-variant">
                  {p.town}
                  ,
                  {" "}
                  {p.county}
                </p>
                <p className="mt-0.5 text-xs text-on-surface-variant">
                  {formatMoney(p.pricePerNightCents, p.currency)}
                  {" / night · "}
                  {pluralise(p.maxGuests, "guest")}
                </p>
              </div>
              <Link
                href={`/admin/properties/${p.id}`}
                className="shrink-0 text-xs text-primary underline"
              >
                Edit
              </Link>
            </div>
          </li>
        ))}
      </ul>

      {properties.length === 0 && (
        <p className="mt-4 rounded-lg bg-surface-container p-5 text-center text-sm text-on-surface-variant">
          No listings yet.
        </p>
      )}
    </div>
  );
}
