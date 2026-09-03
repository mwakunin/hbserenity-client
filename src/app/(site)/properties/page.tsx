import Link from "next/link";
import { Suspense } from "react";

import { PropertyCard } from "@/components/property-card";
import { PropertyFilters } from "@/components/property-filters";
import { apiGet } from "@/lib/api/client";
import { pluralise } from "@/lib/format";

export const metadata = { title: "Search stays" };

/** Only the filters the API actually accepts. */
const FILTERS = [
  "county",
  "town",
  "propertyType",
  "minGuests",
  "maxPriceCents",
  // Availability. The API refuses one without the other, so the filter UI
  // only ever sets them as a pair.
  "checkIn",
  "checkOut",
  "page",
] as const;

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

type Params = Awaited<PageProps<"/properties">["searchParams"]>;

/**
 * Everything this page will actually send to the API.
 *
 * Derived once and used for all three things that must agree: the request,
 * the "match your filters" wording, and the pagination links. When each
 * worked it out separately they drifted.
 *
 * The dates are the reason this is a function rather than a loop. The API
 * refuses one without the other, and refuses a backwards range — both 422 —
 * and `apiGet` turns a 422 into a thrown error, so forwarding a hand-edited
 * `?checkIn=` on its own replaced the search page with an error screen. The
 * filter UI cannot produce that, but the URL is a text field. An unusable
 * pair is dropped rather than half-sent: partially honouring it would filter
 * by dates nobody asked for.
 */
function appliedFilters(params: Params): Record<string, string> {
  const applied: Record<string, string> = {};

  for (const key of FILTERS) {
    if (key === "page" || key === "checkIn" || key === "checkOut")
      continue;
    const value = filterValue(params[key]);
    if (value !== undefined)
      applied[key] = value;
  }

  const checkIn = filterValue(params.checkIn);
  const checkOut = filterValue(params.checkOut);
  if (checkIn !== undefined && checkOut !== undefined && checkOut > checkIn) {
    applied.checkIn = checkIn;
    applied.checkOut = checkOut;
  }

  return applied;
}

export default async function PropertiesPage({ searchParams }: PageProps<"/properties">) {
  const params = await searchParams;
  const applied = appliedFilters(params);

  const query = new URLSearchParams({ limit: "20", ...applied });
  const page = filterValue(params.page);
  if (page !== undefined)
    query.set("page", page);

  const { data, meta } = await apiGet<"/properties">(`/properties?${query}`);
  const properties = data;
  const filtered = Object.keys(applied).length > 0;

  /**
   * A link to another page of the same search.
   *
   * Built from the applied filters rather than from `query`, which carries
   * the API's `limit` — an implementation detail with no business in a URL a
   * guest can copy. Every active filter is carried over: changing the page
   * must not silently widen the search back to everything.
   */
  function pageHref(target: number) {
    // The same applied set, so a page link cannot carry a date pair the
    // request itself dropped.
    const next = new URLSearchParams(applied);

    // Page 1 is the bare URL, so the first page has one address and not two.
    if (target > 1)
      next.set("page", String(target));

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
