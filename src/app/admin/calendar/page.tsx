import { redirect } from "next/navigation";

import type { PropertySummary } from "@/components/property-card";

import { CalendarView } from "@/components/admin/calendar-view";
import { ApiError, apiGet } from "@/lib/api/client";
import { requireAdmin } from "@/lib/session";

export const metadata = { title: "Calendar" };

export default async function CalendarPage() {
  await requireAdmin("/admin/calendar");

  let listings: PropertySummary[];
  try {
    const page = await apiGet<"/properties">("/properties?limit=100");
    listings = page.data as unknown as PropertySummary[];
  }
  catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 403))
      redirect("/sign-in?next=%2Fadmin%2Fcalendar");
    throw error;
  }

  return (
    <div className="px-4 py-6">
      <h1 className="font-headline text-2xl text-on-surface">Calendar</h1>
      <p className="mt-1 text-xs text-on-surface-variant">
        Booked and blocked nights, and a way to take dates off the market.
      </p>

      <CalendarView listings={listings.map(l => ({ id: l.id, title: l.title }))} />
    </div>
  );
}
