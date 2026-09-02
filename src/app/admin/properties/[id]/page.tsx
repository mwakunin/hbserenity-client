import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { listRates } from "@/app/admin/properties/actions";
import { DeleteProperty } from "@/components/admin/delete-property";
import { PhotoManager } from "@/components/admin/photo-manager";
import { PropertyForm } from "@/components/admin/property-form";
import { RateManager } from "@/components/admin/rate-manager";
import { ApiError, apiGet } from "@/lib/api/client";

export const metadata = { title: "Edit listing" };

export default async function EditPropertyPage({ params }: PageProps<"/admin/properties/[id]">) {
  const { id } = await params;

  let property;
  try {
    // Unlike the list endpoint, this one does return a draft to an admin —
    // which is the only reason a newly created listing is reachable at all.
    property = await apiGet<"/properties/{id}">(`/properties/${id}`, { authenticated: true });
  }
  catch (error) {
    if (error instanceof ApiError && error.status === 401)
      redirect(`/sign-in?next=${encodeURIComponent(`/admin/properties/${id}`)}`);
    if (error instanceof ApiError && error.status === 404)
      notFound();
    throw error;
  }

  const rates = await listRates(id).catch(() => ({ data: [] }));

  return (
    <div className="px-4 py-6">
      <Link href="/admin/properties" className="text-xs text-primary underline">
        ← Properties
      </Link>

      <div className="mt-2 flex items-start justify-between gap-3">
        <h1 className="font-headline text-2xl text-on-surface">{property.title}</h1>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide ${
            property.status === "active"
              ? "bg-primary text-on-primary"
              : "bg-secondary-container text-on-secondary-container"
          }`}
        >
          {property.status}
        </span>
      </div>

      {property.status !== "active" && (
        <p className="mt-2 rounded-md bg-secondary-container p-3 text-[11px] leading-relaxed text-on-secondary-container">
          This listing is not published, so it appears in no list — including
          this host area. Keep the link, or set it active to make it findable.
        </p>
      )}

      <section className="mt-5">
        {/*
          Nullable columns come back as null, which the form reads as "absent"
          rather than "cleared" — passing null straight through would make
          those inputs controlled-with-null and warn.
        */}
        <PropertyForm
          propertyId={property.id}
          initial={{
            ...property,
            address: property.address ?? undefined,
            weekendPriceCents: property.weekendPriceCents ?? undefined,
            cleaningFeeCents: property.cleaningFeeCents ?? undefined,
          }}
        />
      </section>

      <section className="mt-8">
        <PhotoManager propertyId={property.id} images={property.images} />
      </section>

      <section className="mt-8">
        <RateManager
          propertyId={property.id}
          rates={rates.data}
          currency={property.currency}
        />
      </section>

      <section className="mt-8 border-t border-outline-variant pt-5">
        <DeleteProperty propertyId={property.id} title={property.title} />
      </section>
    </div>
  );
}
