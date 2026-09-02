import { z } from "zod";

/**
 * Validation shared by the admin forms and the server actions.
 *
 * Split out of `actions.ts` because a `"use server"` module may only export
 * async functions — a Zod schema is a runtime object and makes the whole file
 * fail to compile.
 *
 * These rules mirror the API's own. They exist to give a readable message
 * before a round trip, never as a second source of truth: the API validates
 * again, and the database has CHECK constraints behind that.
 */

/** Money is stored in cents and M-Pesa only moves whole shillings. */
const wholeShillings = z
  .number()
  .int()
  .nonnegative()
  .refine(n => n % 100 === 0, "Must be a whole number of shillings");

export const propertyInput = z.object({
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().min(10).max(5000),
  propertyType: z.enum(["apartment", "house", "villa", "cottage", "studio", "guesthouse"]),
  status: z.enum(["draft", "active", "inactive"]),
  county: z.string().trim().min(1).max(100),
  town: z.string().trim().min(1).max(100),
  address: z.string().trim().max(500).optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  maxGuests: z.number().int().min(1).max(100),
  bedrooms: z.number().int().min(0).max(50),
  bathrooms: z.number().int().min(0).max(50),
  // Never 0: a listing that sleeps nobody is not bookable, and the database
  // says so too.
  beds: z.number().int().min(1).max(100),
  pricePerNightCents: wholeShillings,
  weekendPriceCents: wholeShillings.nullable().optional(),
  cleaningFeeCents: wholeShillings.optional(),
}).refine(
  // The DB constraint `properties_bedrooms_match_type` enforces this pairing.
  // Catching it here turns a 422 into a message pointing at the right field.
  p => (p.propertyType === "studio" ? p.bedrooms === 0 : p.bedrooms >= 1),
  {
    message: "A studio must have 0 bedrooms; every other type needs at least 1",
    path: ["bedrooms"],
  },
);

export type PropertyInput = z.infer<typeof propertyInput>;

export const rateInput = z.object({
  propertyId: z.uuid(),
  startDate: z.iso.date(),
  endDate: z.iso.date(),
  pricePerNightCents: wholeShillings,
  label: z.string().trim().min(1).max(120).optional(),
}).refine(r => r.endDate > r.startDate, {
  message: "End date must be after the start date",
  path: ["endDate"],
});


export type RateInput = z.infer<typeof rateInput>;
