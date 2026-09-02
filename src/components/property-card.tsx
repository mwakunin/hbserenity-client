import Image from "next/image";
import Link from "next/link";

import type { GetResponse } from "@/lib/api/client";

import { formatMoney, pluralise } from "@/lib/format";

/**
 * One listing in a list, exactly as `GET /properties` returns it.
 *
 * Derived rather than restated. The hand-written version had drifted into
 * fiction: it declared a `coverUrl` string the API has never returned, and
 * every caller reached it through `as unknown as`, so nothing ever checked.
 * The list does carry a photo — `coverImage`, the whole record — which is
 * what makes a grid possible without a request per card. The gallery still
 * lives on `GET /properties/{id}`.
 */
export type PropertySummary = GetResponse<"/properties">["data"][number];

export function PropertyCard({ property }: { property: PropertySummary }) {
  const { coverImage, title, town, county, currency } = property;

  return (
    <Link
      href={`/properties/${property.id}`}
      className="group block overflow-hidden rounded-lg bg-surface-container-lowest shadow-sm ring-1 ring-outline-variant/50 transition hover:shadow-md"
    >
      <div className="relative aspect-[4/3] bg-surface-container-high">
        {coverImage
          ? (
              <Image
                src={coverImage.url}
                alt=""
                fill
                sizes="(max-width: 480px) 100vw, 480px"
                className="object-cover transition group-hover:scale-[1.02]"
              />
            )
          : (
              // A listing with no photos at all. `coverOf()` on the API falls
              // back to the lowest-ordered image, so this is not "nobody
              // pressed the cover button" — it is genuinely empty.
              <div className="flex h-full items-center justify-center">
                <span className="font-headline text-3xl text-on-surface-variant/40">
                  {title.charAt(0)}
                </span>
              </div>
            )}
      </div>

      <div className="p-4">
        <p className="text-xs uppercase tracking-wide text-on-surface-variant">
          {town}
          ,
          {" "}
          {county}
        </p>
        <h3 className="mt-1 font-headline text-lg leading-snug text-on-surface">
          {title}
        </h3>
        <p className="mt-1 text-xs text-on-surface-variant">
          {pluralise(property.maxGuests, "guest")}
          {" · "}
          {property.bedrooms === 0 ? "Studio" : pluralise(property.bedrooms, "bedroom")}
          {" · "}
          {pluralise(property.beds, "bed")}
        </p>
        <p className="mt-3 text-sm text-on-surface">
          <span className="font-semibold">
            {formatMoney(property.pricePerNightCents, currency)}
          </span>
          <span className="text-on-surface-variant"> / night</span>
        </p>
      </div>
    </Link>
  );
}
