import Link from "next/link";
import { Suspense } from "react";

import { PropertyCard } from "@/components/property-card";
import { PropertyFilters } from "@/components/property-filters";
import { apiGet } from "@/lib/api/client";
import { pluralise } from "@/lib/format";

export const metadata = { title: "Search stays" };

/** Only the filters the API actually accepts. */
const FILTERS = ["county", "town", "propertyType", "minGuests", "maxPriceCents", "page"] as const;

/**
 * A filter this page will actually send.
 *
 * A repeated parameter — `?town=a&town=b` — arrives as an array, which is
 * truthy but is not something the API takes, so it is skipped when the query
 * is built. Testing for truthiness instead of applying this same rule made
 * the page report "match your filters" over an unfiltered result set.
 */
function filterValue(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export default async function PropertiesPage({ searchParams }: PageProps<"/properties">) {
  const params = await searchParams;
  const query = new URLSearchParams({ limit: "20" });

  for (const key of FILTERS) {
    const value = filterValue(params[key]);
    if (value !== undefined)
      query.set(key, value);
  }

  const { data, meta } = await apiGet<"/properties">(`/properties?${query}`);
  const properties = data;
  const filtered = FILTERS.some(k => k !== "page" && filterValue(params[k]) !== undefined);

  /**
   * A link to another page of the same search.
   *
   * Built from the incoming params rather than from `query`, which carries
   * the API's `limit` — an implementation detail that has no business in a
   * URL a guest can copy. Every active filter is carried over: changing the
   * page must not silently widen the search back to everything.
   */
  function pageHref(page: number) {
    const next = new URLSearchParams();
    for (const key of FILTERS) {
      const value = filterValue(params[key]);
      if (key !== "page" && value !== undefined)
        next.set(key, value);
    }
    // Page 1 is the bare URL, so the first page has one address and not two.
    if (page > 1)
      next.set("page", String(page));

    const qs = next.toString();
    return qs ? `/properties?${qs}` : "/properties";
  }

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
        now accepts `checkIn`/`checkOut` and filters by availability, but this
        page does not send them yet — the picker is still to be built, and a
        date field that silently does not filter is worse than none.
      */}
      {meta.totalPages > 1 && (
        <nav
          aria-label="Pagination"
          className="mt-6 flex items-center justify-between gap-3 text-xs"
        >
          {/*
            The edges are omitted rather than disabled: a link to nowhere is
            still focusable and still reads as a control to a screen reader.
          */}
          {meta.page > 1
            ? (
                <Link href={pageHref(meta.page - 1)} rel="prev" className="text-primary underline">
                  ← Previous
                </Link>
              )
            : <span />}

          <span className="text-on-surface-variant">
            Page
            {" "}
            {meta.page}
            {" of "}
            {meta.totalPages}
          </span>

          {meta.page < meta.totalPages
            ? (
                <Link href={pageHref(meta.page + 1)} rel="next" className="text-primary underline">
                  Next →
                </Link>
              )
            : <span />}
        </nav>
      )}
    </div>
  );
}
