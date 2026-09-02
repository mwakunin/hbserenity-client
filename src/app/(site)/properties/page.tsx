import { Suspense } from "react";

import type { PropertySummary } from "@/components/property-card";

import { PropertyCard } from "@/components/property-card";
import { PropertyFilters } from "@/components/property-filters";
import { apiGet } from "@/lib/api/client";
import { pluralise } from "@/lib/format";

export const metadata = { title: "Search stays" };

/** Only the filters the API actually accepts. */
const FILTERS = ["county", "town", "propertyType", "minGuests", "maxPriceCents", "page"] as const;

export default async function PropertiesPage({ searchParams }: PageProps<"/properties">) {
  const params = await searchParams;
  const query = new URLSearchParams({ limit: "20" });

  for (const key of FILTERS) {
    const value = params[key];
    if (typeof value === "string" && value.length > 0)
      query.set(key, value);
  }

  const { data, meta } = await apiGet<"/properties">(`/properties?${query}`);
  const properties = data as unknown as PropertySummary[];
  const filtered = FILTERS.some(k => k !== "page" && params[k]);

  return (
    <div className="px-4 py-5">
      <h1 className="font-headline text-2xl text-on-surface">Find a stay</h1>

      <div className="mt-4">
        {/* useSearchParams needs a Suspense boundary to stay statically shell-able. */}
        <Suspense fallback={<div className="h-40 animate-pulse rounded-md bg-surface-container" />}>
          <PropertyFilters />
        </Suspense>
      </div>

      <p className="mt-4 text-xs text-on-surface-variant">
        {pluralise(meta.total, "home")}
        {filtered ? " match your filters" : " available"}
      </p>

      <div className="mt-3 grid gap-4">
        {properties.map(p => <PropertyCard key={p.id} property={p} />)}
      </div>

      {properties.length === 0 && (
        <div className="mt-6 rounded-lg bg-surface-container p-6 text-center">
          <p className="text-sm text-on-surface">Nothing matches those filters.</p>
          <p className="mt-1 text-xs text-on-surface-variant">
            Try a wider price range, or clear the location.
          </p>
        </div>
      )}

      {/*
        The design's search bar also carries a date range. `GET /properties`
        takes no date parameters, so filtering by availability would mean
        checking every listing separately. Left out rather than faked: a date
        picker that silently does not filter is worse than none.
      */}
      {meta.totalPages > 1 && (
        <p className="mt-6 text-center text-xs text-on-surface-variant">
          Page
          {" "}
          {meta.page}
          {" of "}
          {meta.totalPages}
        </p>
      )}
    </div>
  );
}
