import Link from "next/link";
import { redirect } from "next/navigation";

import type { PropertySummary } from "@/components/property-card";

import { DraftRecovery } from "@/components/admin/draft-recovery";

import { ApiError, apiGet } from "@/lib/api/client";
import { formatMoney, pluralise } from "@/lib/format";

export const metadata = { title: "Properties" };

/**
 * The host's listings.
 *
 * Shows what `GET /properties` returns, which is active listings only — the
 * handler filters on `status = "active"` regardless of who is asking. A draft
 * or deactivated listing therefore cannot appear here, which is worth stating
 * on the page rather than letting a host conclude they have lost one.
 */
export default async function AdminPropertiesPage() {
  let properties: PropertySummary[];
  try {
    const page = await apiGet<"/properties">("/properties?limit=100");
    properties = page.data as unknown as PropertySummary[];
  }
  catch (error) {
    if (error instanceof ApiError && error.status === 401)
      redirect("/sign-in?next=%2Fadmin%2Fproperties");
    throw error;
  }

  return (
    <div className="px-4 py-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-headline text-2xl text-on-surface">Properties</h1>
          <p className="mt-1 text-xs text-on-surface-variant">
            {pluralise(properties.length, "published listing")}
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
                <p className="truncate text-sm font-medium text-on-surface">{p.title}</p>
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
          No published listings.
        </p>
      )}

      <DraftRecovery activeIds={properties.map(p => p.id)} />

      <p className="mt-4 text-[11px] leading-relaxed text-on-surface-variant">
        Drafts and deactivated listings are not returned by the API, to any
        caller — only drafts created on this device can be listed above.
      </p>
    </div>
  );
}
