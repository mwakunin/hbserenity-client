"use server";

import { revalidatePath } from "next/cache";

import { ApiError, apiGet, apiSend } from "@/lib/api/client";

/**
 * The host's calendar.
 *
 * Availability merges two sources the API keeps in separate tables — bookings
 * and blackouts — and reports them as one list of unavailable ranges, each
 * labelled with which it came from. That distinction matters here: a booked
 * range is someone's stay, a blacked-out one is the host's own decision.
 */

export async function getAvailability(propertyId: string, from: string, to: string) {
  const search = new URLSearchParams({ from, to });
  return apiGet<"/properties/{id}/availability">(
    `/properties/${propertyId}/availability?${search}`,
    { revalidate: 0 },
  );
}

export type BlackoutResult =
  | { status: "ok" }
  /** Overlaps a booking or another blackout. */
  | { status: "conflict"; message: string }
  | { status: "invalid"; message: string }
  | { status: "unauthenticated" };

export async function createBlackout(input: {
  propertyId: string;
  startDate: string;
  endDate: string;
  reason?: string;
}): Promise<BlackoutResult> {
  if (!(input.endDate > input.startDate))
    return { status: "invalid", message: "The end date must be after the start date." };

  try {
    await apiSend("/blackouts", "POST", {
      propertyId: input.propertyId,
      startDate: input.startDate,
      endDate: input.endDate,
      ...(input.reason?.trim() ? { reason: input.reason.trim() } : {}),
    });
    revalidatePath("/admin/calendar");
    return { status: "ok" };
  }
  catch (error) {
    if (!(error instanceof ApiError))
      throw error;

    if (error.status === 401 || error.status === 403)
      return { status: "unauthenticated" };

    // 409 is the exclusion constraint, or the booking-versus-blackout check
    // the API runs under a row lock. Either way these dates are already spoken
    // for, and blocking them twice has no meaning.
    if (error.status === 409) {
      return {
        status: "conflict",
        message: (error.body as { message?: string })?.message
          ?? "Those dates are already booked or blocked.",
      };
    }

    const body = error.body as { message?: string; error?: { issues?: { message: string }[] } } | null;
    return {
      status: "invalid",
      message: body?.error?.issues?.[0]?.message ?? body?.message ?? "That could not be saved.",
    };
  }
}
