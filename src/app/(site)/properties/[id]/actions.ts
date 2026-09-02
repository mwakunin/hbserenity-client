"use server";

import { z } from "zod";

import { ApiError, apiGet, apiSend } from "@/lib/api/client";

/**
 * Server actions for the booking panel.
 *
 * These exist so the browser never needs a route to the API for anything but
 * auth. The rewrite in next.config.ts covers `/api/*` — where Better Auth
 * lives — and the domain endpoints sit at the API's root, unproxied on
 * purpose. Actions run on the server, forward the session cookie, and keep the
 * API's address out of the client bundle entirely.
 *
 * TanStack Query calls these directly: `queryFn` takes any async function, not
 * only a fetch, so the quote can be a query without inventing an endpoint for
 * it.
 */

const dateRange = z.object({
  propertyId: z.uuid(),
  checkIn: z.iso.date(),
  checkOut: z.iso.date(),
}).refine(r => r.checkOut > r.checkIn, {
  message: "Check-out must be after check-in",
  path: ["checkOut"],
});

export async function getQuote(input: z.infer<typeof dateRange>) {
  const { propertyId, checkIn, checkOut } = dateRange.parse(input);

  const search = new URLSearchParams({ checkIn, checkOut });
  return apiGet<"/properties/{id}/quote">(
    `/properties/${propertyId}/quote?${search}`,
  );
}

export async function getAvailability(input: {
  propertyId: string;
  from: string;
  to: string;
}) {
  const search = new URLSearchParams({ from: input.from, to: input.to });
  return apiGet<"/properties/{id}/availability">(
    `/properties/${input.propertyId}/availability?${search}`,
  );
}

const createBookingInput = dateRange.safeExtend({
  guestCount: z.number().int().positive(),
});

export type CreateBookingResult
  = | { status: "created"; bookingId: string }
  /** Not signed in — the caller sends the guest to sign in and comes back. */
    | { status: "unauthenticated" }
  /** Dates were taken between quoting and booking. */
    | { status: "unavailable"; message: string }
    | { status: "invalid"; message: string };

export async function createBooking(
  input: z.infer<typeof createBookingInput>,
): Promise<CreateBookingResult> {
  const parsed = createBookingInput.safeParse(input);
  if (!parsed.success)
    return { status: "invalid", message: parsed.error.issues[0].message };

  try {
    // The total is deliberately not sent. The API computes it from its own
    // pricing and snapshots it onto the booking; a client-sent price is never
    // trusted, so quoting it here would only invite disagreement.
    const booking = await apiSend<{ id: string }>("/bookings", "POST", parsed.data);
    return { status: "created", bookingId: booking.id };
  }
  catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 401)
        return { status: "unauthenticated" };

      // 409 is the overlap constraint firing — someone else booked these
      // nights while this guest was deciding. It is the expected outcome of a
      // race, not a fault.
      if (error.status === 409) {
        return {
          status: "unavailable",
          message: "Those dates have just been taken. Please choose another range.",
        };
      }

      const body = error.body as { message?: string } | null;
      return {
        status: "invalid",
        message: body?.message ?? "That booking could not be created.",
      };
    }
    throw error;
  }
}
