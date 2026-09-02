import Link from "next/link";

import type { PropertySummary } from "@/components/property-card";

import { PropertyCard } from "@/components/property-card";
import { apiGet } from "@/lib/api/client";

/**
 * The home screen: a short pitch, then what is actually available.
 *
 * Rendered on the server against `GET /properties`, which returns only
 * `status: "active"` listings — a draft is invisible here without this page
 * having to filter anything.
 */
export const metadata = { title: "Stays on the Kenyan coast" };

// Listings change rarely and are the same for everyone, so this page is
// cacheable. Nothing here is per-guest, and nothing forwards a cookie.
export const revalidate = 60;

export default async function HomePage() {
  const { data, meta } = await apiGet<"/properties">("/properties?limit=6", {
    revalidate: 60,
  });

  const properties = data as unknown as PropertySummary[];

  return (
    <div className="px-4 pb-10">
      <section className="py-8">
        <h1 className="font-headline text-3xl leading-tight text-primary">
          Somewhere quiet,
          <br />
          right on the coast.
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-on-surface-variant">
          A small collection of homes we look after ourselves. Book directly —
          no platform fees, and you pay by M-Pesa.
        </p>
        <Link
          href="/properties"
          className="mt-5 inline-flex items-center rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-on-primary"
        >
          Browse all stays
        </Link>
      </section>

      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-headline text-xl text-on-surface">Available now</h2>
          {meta.total > properties.length && (
            <Link href="/properties" className="text-xs text-primary underline">
              See all
              {" "}
              {meta.total}
            </Link>
          )}
        </div>

        {properties.length === 0
          ? (
              <p className="rounded-lg bg-surface-container p-6 text-center text-sm text-on-surface-variant">
                No stays are listed just yet. Please check back shortly.
              </p>
            )
          : (
              <div className="grid gap-4">
                {properties.map(p => (
                  <PropertyCard key={p.id} property={p} />
                ))}
              </div>
            )}
      </section>
    </div>
  );
}
