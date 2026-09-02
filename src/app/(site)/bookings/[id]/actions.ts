"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { ApiError, apiGet, apiSend } from "@/lib/api/client";

/**
 * Paying for a booking, and watching for the outcome.
 *
 * The STK push is asynchronous by nature: the API answers 202 as soon as
 * Safaricom accepts the request, and the real result arrives later on a
 * callback the guest's browser never sees. So the flow is "ask, then watch the
 * booking" rather than "ask and read the answer".
 */

/**
 * A server action is a public endpoint: its arguments come from whatever the
 * caller sends, not from the page that renders the form. An unchecked id goes
 * straight into an API path, so `../admin/payments/reconcile` or a value
 * carrying `?` or `#` reshapes the request rather than merely failing it.
 * Every id is parsed before it is interpolated.
 */
const bookingId = z.uuid();

export type PayResult
  = | { status: "pushed"; customerMessage: string }
  /** A prompt is already on the handset, or the booking is no longer payable. */
    | { status: "conflict"; message: string }
    | { status: "invalid"; message: string }
    | { status: "unauthenticated" };

export async function payForBooking(
  id: string,
  phoneNumber?: string,
): Promise<PayResult> {
  const parsed = bookingId.safeParse(id);
  if (!parsed.success)
    return { status: "invalid", message: "That booking could not be found." };

  try {
    const res = await apiSend<{ customerMessage: string }>(
      `/bookings/${parsed.data}/pay`,
      "POST",
      phoneNumber ? { phoneNumber } : {},
    );
    return { status: "pushed", customerMessage: res.customerMessage };
  }
  catch (error) {
    if (!(error instanceof ApiError))
      throw error;

    const body = error.body as { message?: string; error?: { issues?: { message: string }[] } } | null;

    if (error.status === 401)
      return { status: "unauthenticated" };

    // 409 covers both "a prompt is already live" and "this booking cannot be
    // paid for any more". The API's message says which, and it is written for
    // the guest, so it is passed through rather than replaced.
    if (error.status === 409)
      return { status: "conflict", message: body?.message ?? "This booking cannot be paid for right now." };

    if (error.status === 422) {
      return {
        status: "invalid",
        message: body?.error?.issues?.[0]?.message ?? "That phone number was not accepted.",
      };
    }

    if (error.status === 502) {
      return {
        status: "conflict",
        message: "M-Pesa could not be reached. Please try again in a moment.",
      };
    }

    return { status: "invalid", message: body?.message ?? "The payment could not be started." };
  }
}

/** The booking as it stands now — the only honest source of "did it work?". */
export async function getBookingStatus(id: string) {
  return apiGet<"/bookings/{id}">(
    `/bookings/${bookingId.parse(id)}`,
    { authenticated: true },
  );
}

// --- the guest's own actions on a booking ---------------------------------

export type CancelResult =
  | { status: "ok" }
  /** Already cancelled, already finished, or the stay has begun. */
  | { status: "refused"; message: string }
  | { status: "needsReason"; message: string }
  | { status: "unauthenticated" };

export async function cancelBooking(
  id: string,
  reason?: string,
): Promise<CancelResult> {
  const parsed = bookingId.safeParse(id);
  if (!parsed.success)
    return { status: "refused", message: "That booking could not be found." };

  try {
    await apiSend(`/bookings/${parsed.data}/cancel`, "POST", reason ? { reason } : {});
    revalidatePath(`/bookings/${parsed.data}`);
    revalidatePath("/bookings");
    return { status: "ok" };
  }
  catch (error) {
    if (!(error instanceof ApiError))
      throw error;

    const body = error.body as {
      message?: string;
      error?: { issues?: { message: string }[] };
    } | null;

    if (error.status === 401)
      return { status: "unauthenticated" };

    // A paid stay cannot be called off without a reason on the record — that
    // is the case people argue about later.
    if (error.status === 422) {
      return {
        status: "needsReason",
        message: body?.error?.issues?.[0]?.message
          ?? "A reason is required to cancel a booking that has been paid for.",
      };
    }

    return {
      status: "refused",
      message: body?.message ?? "This booking can no longer be cancelled.",
    };
  }
}

export type ReviewResult =
  | { status: "ok" }
  | { status: "refused"; message: string }
  | { status: "unauthenticated" };

export async function submitReview(
  id: string,
  input: { rating: number; comment?: string },
): Promise<ReviewResult> {
  const parsed = bookingId.safeParse(id);
  if (!parsed.success)
    return { status: "refused", message: "That booking could not be found." };

  try {
    await apiSend(`/bookings/${parsed.data}/review`, "POST", {
      rating: input.rating,
      ...(input.comment?.trim() ? { comment: input.comment.trim() } : {}),
    });
    revalidatePath(`/bookings/${parsed.data}`);
    return { status: "ok" };
  }
  catch (error) {
    if (!(error instanceof ApiError))
      throw error;
    if (error.status === 401)
      return { status: "unauthenticated" };

    // 409 covers "already reviewed" and "the stay is not finished". Both are
    // correct refusals, and the API's wording is written for the guest.
    return {
      status: "refused",
      message: (error.body as { message?: string })?.message
        ?? "This stay cannot be reviewed yet.",
    };
  }
}
