import Image from "next/image";
import Link from "next/link";

import { formatMoney, pluralise } from "@/lib/format";

/**
 * One listing in a list.
 *
 * Takes only the fields `GET /properties` actually returns. That endpoint does
 * NOT include images — only `GET /properties/{id}` does — so `coverUrl` is
 * optional and the card is designed to look deliberate without one rather than
 * collapsing. Fetching a photo per card would mean a request per listing.
 */
export interface PropertySummary {
  id: string;
  title: string;
  county: string;
  town: string;
  propertyType: string;
  maxGuests: number;
  bedrooms: number;
  beds: number;
  pricePerNightCents: number;
  currency: string;
  coverUrl?: string | null;
}

export function PropertyCard({ property }: { property: PropertySummary }) {
  const { coverUrl, title, town, county, currency } = property;

  return (
    <Link
      href={`/properties/${property.id}`}
      className="group block overflow-hidden rounded-lg bg-surface-container-lowest shadow-sm ring-1 ring-outline-variant/50 transition hover:shadow-md"
    >
      <div className="relative aspect-[4/3] bg-surface-container-high">
        {coverUrl
          ? (
              <Image
                src={coverUrl}
                alt=""
                fill
                sizes="(max-width: 480px) 100vw, 480px"
                className="object-cover transition group-hover:scale-[1.02]"
              />
            )
          : (
              // Not an error state: the list endpoint carries no images, so
              // this is the normal case until one is fetched per property.
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
