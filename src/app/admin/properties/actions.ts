"use server";

import { revalidatePath } from "next/cache";
import type { PropertyInput, RateInput } from "@/lib/schemas/property";

import { ApiError, apiGet, apiSend } from "@/lib/api/client";
import { propertyInput, rateInput } from "@/lib/schemas/property";

/**
 * Managing listings, photos and seasonal rates.
 *
 * The Zod schemas here mirror the API's own rules rather than inventing
 * looser ones. That is for the guest's benefit, not the server's — the API
 * validates everything again and the database has CHECK constraints behind
 * that. The point is a readable message before a round trip, never a second
 * source of truth.
 */

export type SaveResult =
  | { status: "ok"; id: string }
  | { status: "invalid"; message: string; field?: string }
  | { status: "unauthenticated" };

function fromApiError(error: unknown): SaveResult {
  if (!(error instanceof ApiError))
    throw error;

  if (error.status === 401 || error.status === 403)
    return { status: "unauthenticated" };

  const body = error.body as {
    message?: string;
    error?: { issues?: { message: string; path?: (string | number)[] }[] };
  } | null;

  const issue = body?.error?.issues?.[0];
  return {
    status: "invalid",
    message: issue?.message ?? body?.message ?? "That could not be saved.",
    field: issue?.path?.[0] ? String(issue.path[0]) : undefined,
  };
}

export async function createProperty(input: PropertyInput): Promise<SaveResult> {
  const parsed = propertyInput.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { status: "invalid", message: issue.message, field: String(issue.path[0] ?? "") };
  }

  try {
    const created = await apiSend<{ id: string }>("/properties", "POST", parsed.data);
    revalidatePath("/admin/properties");
    return { status: "ok", id: created.id };
  }
  catch (error) {
    return fromApiError(error);
  }
}

export async function updateProperty(
  id: string,
  input: Partial<PropertyInput>,
): Promise<SaveResult> {
  try {
    await apiSend(`/properties/${id}`, "PATCH", input);
    revalidatePath("/admin/properties");
    revalidatePath(`/admin/properties/${id}`);
    revalidatePath(`/properties/${id}`);
    return { status: "ok", id };
  }
  catch (error) {
    return fromApiError(error);
  }
}

export type DeleteResult =
  | { status: "ok" }
  | { status: "blocked"; message: string }
  | { status: "unauthenticated" };

export async function deleteProperty(id: string): Promise<DeleteResult> {
  try {
    await apiSend(`/properties/${id}`, "DELETE");
    revalidatePath("/admin/properties");
    return { status: "ok" };
  }
  catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 401 || error.status === 403)
        return { status: "unauthenticated" };

      // A listing with bookings against it cannot be removed — the API maps
      // the foreign key violation to 409 rather than orphaning a guest's stay.
      if (error.status === 409) {
        return {
          status: "blocked",
          message: (error.body as { message?: string })?.message
            ?? "This listing has bookings and cannot be deleted.",
        };
      }
    }
    throw error;
  }
}

// --- photos ---------------------------------------------------------------

/**
 * Credentials for one direct-to-ImageKit upload.
 *
 * Answers 409 when the API has no ImageKit credentials configured, which is
 * the normal state of a local checkout — worth saying plainly rather than
 * surfacing as "the upload failed".
 */
export async function getUploadAuth(propertyId: string) {
  return apiSend<{
    token: string;
    expire: number;
    signature: string;
    publicKey: string;
    urlEndpoint: string;
  }>(`/properties/${propertyId}/images/upload-auth`, "POST");
}

export async function attachImage(
  propertyId: string,
  input: { url: string; fileId: string; isCover?: boolean },
) {
  try {
    await apiSend(`/properties/${propertyId}/images`, "POST", input);
    revalidatePath(`/admin/properties/${propertyId}`);
    revalidatePath(`/properties/${propertyId}`);
    return { status: "ok" as const };
  }
  catch (error) {
    return fromApiError(error);
  }
}

export async function removeImage(propertyId: string, imageId: string) {
  try {
    await apiSend(`/property-images/${imageId}`, "DELETE");
    revalidatePath(`/admin/properties/${propertyId}`);
    // The public page too, as attaching and setting a cover both do. A
    // removed photo that keeps appearing to guests — possibly as the cover —
    // is the one case where the stale copy is actively wrong.
    revalidatePath(`/properties/${propertyId}`);
    return { status: "ok" as const };
  }
  catch (error) {
    if (error instanceof ApiError && error.status === 502) {
      // The API deletes the CDN copy first and keeps the record if that
      // fails, so the photo is still there — saying "removed" would be a lie.
      return {
        status: "invalid" as const,
        message: "ImageKit would not delete the file, so the photo was kept. Try again.",
      };
    }
    return fromApiError(error);
  }
}

export async function setCoverImage(propertyId: string, imageId: string) {
  try {
    await apiSend(`/property-images/${imageId}`, "PATCH", { isCover: true });
    revalidatePath(`/admin/properties/${propertyId}`);
    revalidatePath(`/properties/${propertyId}`);
    return { status: "ok" as const };
  }
  catch (error) {
    return fromApiError(error);
  }
}

// --- seasonal rates -------------------------------------------------------

export async function listRates(propertyId: string) {
  return apiGet<"/properties/{id}/rate-overrides">(
    `/properties/${propertyId}/rate-overrides`,
    { authenticated: true },
  );
}

export async function createRate(input: RateInput): Promise<SaveResult> {
  const parsed = rateInput.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { status: "invalid", message: issue.message, field: String(issue.path[0] ?? "") };
  }

  try {
    const created = await apiSend<{ id: string }>("/rate-overrides", "POST", parsed.data);
    revalidatePath(`/admin/properties/${input.propertyId}`);
    return { status: "ok", id: created.id };
  }
  catch (error) {
    if (error instanceof ApiError && error.status === 409) {
      // Seasons cannot overlap: a night with two prices has no answer, and
      // the API enforces that with an exclusion constraint.
      return {
        status: "invalid",
        message: "These dates overlap an existing season for this property.",
        field: "startDate",
      };
    }
    return fromApiError(error);
  }
}

export async function deleteRate(propertyId: string, rateId: string) {
  try {
    await apiSend(`/rate-overrides/${rateId}`, "DELETE");
    revalidatePath(`/admin/properties/${propertyId}`);
    return { status: "ok" as const };
  }
  catch (error) {
    return fromApiError(error);
  }
}

// --- amenities ------------------------------------------------------------

/** The catalogue every listing picks from. Public, so no session is needed. */
export async function listAmenities() {
  return apiGet<"/amenities">("/amenities", { revalidate: 300 });
}

/**
 * Replace the amenities on a listing.
 *
 * A PUT of the complete set, which is what the API takes: unticking a box is
 * expressed by leaving it out, so a re-submitted form is idempotent and there
 * is no separate detach call to get wrong.
 */
export async function setAmenities(propertyId: string, amenityIds: string[]) {
  try {
    await apiSend(`/properties/${propertyId}/amenities`, "PUT", { amenityIds });
    revalidatePath(`/admin/properties/${propertyId}`);
    // The guest-facing listing renders these, so it goes stale too.
    revalidatePath(`/properties/${propertyId}`);
    return { status: "ok" as const };
  }
  catch (error) {
    return fromApiError(error);
  }
}
