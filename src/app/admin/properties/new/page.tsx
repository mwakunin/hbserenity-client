import Link from "next/link";

import { PropertyForm } from "@/components/admin/property-form";

export const metadata = { title: "New listing" };

export default function NewPropertyPage() {
  return (
    <div className="px-4 py-6">
      <Link href="/admin/properties" className="text-xs text-primary underline">
        ← Properties
      </Link>
      <h1 className="mt-2 font-headline text-2xl text-on-surface">New listing</h1>
      <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">
        Saved as a draft unless you set it active. Photos and seasonal rates are
        added after it exists.
      </p>

      <div className="mt-5">
        <PropertyForm />
      </div>
    </div>
  );
}
