import { notFound } from "next/navigation";

import { BookingPanel } from "@/components/booking-panel";
import { PropertyGallery } from "@/components/property-gallery";
import { ApiError, apiGet } from "@/lib/api/client";
import { pluralise } from "@/lib/format";

export const revalidate = 60;

type Property = Awaited<ReturnType<typeof loadProperty>>;

async function loadProperty(id: string) {
  return apiGet<"/properties/{id}">(`/properties/${id}`, { revalidate: 60 });
}

export async function generateMetadata({ params }: PageProps<"/properties/[id]">) {
  const { id } = await params;
  try {
    const property = await loadProperty(id);
    return { title: property.title, description: property.description };
  }
  catch {
    // A missing listing gets the default title; the page itself 404s below.
    return {};
  }
}

export default async function PropertyPage({ params }: PageProps<"/properties/[id]">) {
  const { id } = await params;

  let property: Property;
  try {
    property = await loadProperty(id);
  }
  catch (error) {
    // The API answers 404 for a draft listing as well as a missing one, so an
    // unpublished property is genuinely not discoverable by guessing an id.
    if (error instanceof ApiError && error.status === 404)
      notFound();
    throw error;
  }

  const reviews = await apiGet<"/properties/{id}/reviews">(
    `/properties/${id}/reviews?limit=3`,
    { revalidate: 60 },
  ).catch(() => null);

  return (
    <article className="pb-28">
      <PropertyGallery images={property.images} title={property.title} />

      <div className="px-4">
        <header className="pt-5">
          <p className="text-xs uppercase tracking-wide text-on-surface-variant">
            {property.town}
            ,
            {" "}
            {property.county}
          </p>
          <h1 className="mt-1 font-headline text-2xl leading-tight text-on-surface">
            {property.title}
          </h1>

          <ul className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-on-surface-variant">
            <li>{pluralise(property.maxGuests, "guest")}</li>
            <li aria-hidden>·</li>
            <li>
              {property.bedrooms === 0
                ? "Studio"
                : pluralise(property.bedrooms, "bedroom")}
            </li>
            <li aria-hidden>·</li>
            <li>{pluralise(property.beds, "bed")}</li>
            <li aria-hidden>·</li>
            <li>
              {property.bathrooms === 0
                ? "Shared bathroom"
                : pluralise(property.bathrooms, "bathroom")}
            </li>
          </ul>
        </header>

        <section className="mt-6">
          <h2 className="font-headline text-lg text-on-surface">About this escape</h2>
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-on-surface-variant">
            {property.description}
          </p>
        </section>

        {property.amenities.length > 0 && (
          <section className="mt-6">
            <h2 className="font-headline text-lg text-on-surface">Amenities</h2>
            <ul className="mt-3 grid grid-cols-2 gap-2">
              {property.amenities.map(a => (
                <li
                  key={a.id}
                  className="rounded-md bg-surface-container px-3 py-2 text-xs text-on-surface"
                >
                  {a.name}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="mt-6">
          <div className="flex items-baseline justify-between">
            <h2 className="font-headline text-lg text-on-surface">Reviews</h2>
            {reviews && reviews.summary.count > 0 && (
              <p className="text-xs text-on-surface-variant">
                ★
                {" "}
                {reviews.summary.averageRating?.toFixed(1)}
                {" · "}
                {pluralise(reviews.summary.count, "review")}
              </p>
            )}
          </div>

          {!reviews || reviews.summary.count === 0
            ? (
                <p className="mt-2 text-sm text-on-surface-variant">
                  No reviews yet — only guests who have completed a stay here can
                  leave one.
                </p>
              )
            : (
                <ul className="mt-3 space-y-3">
                  {reviews.data.map(review => (
                    <li
                      key={review.id}
                      className="rounded-lg bg-surface-container-lowest p-4 ring-1 ring-outline-variant/50"
                    >
                      <p className="text-xs font-medium text-on-surface">
                        {review.guestName}
                      </p>
                      <p className="mt-1 text-xs text-on-surface-variant">
                        ★
                        {" "}
                        {review.rating}
                        /5
                      </p>
                      {review.comment && (
                        <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
                          {review.comment}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
        </section>
      </div>

      <BookingPanel
        propertyId={property.id}
        maxGuests={property.maxGuests}
        pricePerNightCents={property.pricePerNightCents}
        currency={property.currency}
      />
    </article>
  );
}
