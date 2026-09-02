"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { PropertyInput } from "@/lib/schemas/property";

import { createProperty, updateProperty } from "@/app/admin/properties/actions";
import { Button } from "@/components/ui/button";
import { rememberDraft } from "@/lib/recent-drafts";

const TYPES = ["apartment", "house", "villa", "cottage", "studio", "guesthouse"] as const;

const EMPTY: PropertyInput = {
  title: "",
  description: "",
  propertyType: "villa",
  status: "draft",
  county: "",
  town: "",
  address: "",
  maxGuests: 2,
  bedrooms: 1,
  bathrooms: 1,
  beds: 1,
  pricePerNightCents: 500000,
  cleaningFeeCents: 0,
};

/** Shillings in the input, cents on the wire. */
function Money({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: number | null | undefined;
  onChange: (cents: number | null) => void;
  hint?: string;
}) {
  return (
    <label className="block text-xs text-on-surface-variant">
      {label}
      <div className="mt-1 flex items-center gap-2">
        <span className="text-xs text-on-surface-variant">KES</span>
        <input
          type="number"
          min={0}
          step={1}
          value={value == null ? "" : value / 100}
          onChange={(e) => {
            const shillings = e.target.value;
            onChange(shillings === "" ? null : Math.round(Number(shillings)) * 100);
          }}
          className="w-full rounded-md border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface"
        />
      </div>
      {hint && <span className="mt-0.5 block text-[11px]">{hint}</span>}
    </label>
  );
}

function Num({
  label,
  value,
  onChange,
  min = 0,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
}) {
  return (
    <label className="block text-xs text-on-surface-variant">
      {label}
      <input
        type="number"
        min={min}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="mt-1 w-full rounded-md border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface"
      />
    </label>
  );
}

export function PropertyForm({
  propertyId,
  initial,
}: {
  propertyId?: string;
  initial?: Partial<PropertyInput>;
}) {
  const router = useRouter();
  const [form, setForm] = useState<PropertyInput>({ ...EMPTY, ...initial });
  const [error, setError] = useState<string | null>(null);
  const [field, setField] = useState<string | undefined>();
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);

  const set = <K extends keyof PropertyInput>(key: K, value: PropertyInput[K]) =>
    setForm(f => ({ ...f, [key]: value }));

  // Mirrors the DB constraint so the two fields cannot be submitted in a state
  // the database will refuse.
  const studio = form.propertyType === "studio";

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setField(undefined);
    setSaved(false);

    const payload = { ...form, bedrooms: studio ? 0 : form.bedrooms };

    // A server action can reject as well as return a refusal — a dropped
    // connection, or anything the action itself throws. Clearing `pending`
    // only on the happy path leaves the button disabled with no message, and
    // the host with a form they cannot submit or abandon.
    try {
      const result = propertyId
        ? await updateProperty(propertyId, payload)
        : await createProperty(payload);

      if (result.status === "unauthenticated") {
        router.push("/sign-in?next=%2Fadmin%2Fproperties");
        return;
      }
      if (result.status === "invalid") {
        setError(result.message);
        setField(result.field);
        return;
      }

      if (propertyId) {
        setSaved(true);
        router.refresh();
        return;
      }

      // A new listing defaults to `draft`, and the API's list endpoint returns
      // active listings only — to anyone. Without the id it would be
      // unreachable, so it is kept locally and the host is taken straight to it.
      if (payload.status !== "active")
        rememberDraft({ id: result.id, title: payload.title });

      router.push(`/admin/properties/${result.id}`);
    }
    catch {
      setError("Something went wrong. Please try again.");
    }
    finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block text-xs text-on-surface-variant">
        Title
        <input
          required
          value={form.title}
          onChange={e => set("title", e.target.value)}
          className="mt-1 w-full rounded-md border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface"
        />
      </label>

      <label className="block text-xs text-on-surface-variant">
        Description
        <textarea
          required
          rows={5}
          value={form.description}
          onChange={e => set("description", e.target.value)}
          className="mt-1 w-full rounded-md border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface"
        />
        <span className="mt-0.5 block text-[11px]">
          {form.description.length}
          /5000 — at least 10 characters
        </span>
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block text-xs text-on-surface-variant">
          Type
          <select
            value={form.propertyType}
            onChange={e => set("propertyType", e.target.value as PropertyInput["propertyType"])}
            className="mt-1 w-full rounded-md border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface"
          >
            {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>

        <label className="block text-xs text-on-surface-variant">
          Status
          <select
            value={form.status}
            onChange={e => set("status", e.target.value as PropertyInput["status"])}
            className="mt-1 w-full rounded-md border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface"
          >
            <option value="draft">Draft — not visible</option>
            <option value="active">Active — bookable</option>
            <option value="inactive">Inactive — hidden</option>
          </select>
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="block text-xs text-on-surface-variant">
          Town
          <input
            required
            value={form.town}
            onChange={e => set("town", e.target.value)}
            className="mt-1 w-full rounded-md border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface"
          />
        </label>
        <label className="block text-xs text-on-surface-variant">
          County
          <input
            required
            value={form.county}
            onChange={e => set("county", e.target.value)}
            className="mt-1 w-full rounded-md border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface"
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Num label="Sleeps (max guests)" value={form.maxGuests} onChange={n => set("maxGuests", n)} min={1} />
        <Num label="Beds" value={form.beds} onChange={n => set("beds", n)} min={1} />
        <div>
          <Num
            label={studio ? "Bedrooms (studio = 0)" : "Bedrooms"}
            value={studio ? 0 : form.bedrooms}
            onChange={n => set("bedrooms", n)}
          />
          {studio && (
            <p className="mt-0.5 text-[11px] text-on-surface-variant">
              Fixed at 0 for a studio.
            </p>
          )}
        </div>
        <Num label="Bathrooms" value={form.bathrooms} onChange={n => set("bathrooms", n)} />
      </div>

      <Money
        label="Price per night"
        value={form.pricePerNightCents}
        onChange={c => set("pricePerNightCents", c ?? 0)}
        hint="Whole shillings only — M-Pesa cannot move fractions."
      />
      <Money
        label="Weekend price (optional)"
        value={form.weekendPriceCents}
        onChange={c => set("weekendPriceCents", c)}
        hint="Applies to Friday and Saturday nights. A season overrides it."
      />
      <Money
        label="Cleaning fee"
        value={form.cleaningFeeCents ?? 0}
        onChange={c => set("cleaningFeeCents", c ?? 0)}
      />

      {error && (
        <p className="text-xs text-error">
          {field ? `${field}: ` : ""}
          {error}
        </p>
      )}
      {saved && <p className="text-xs text-primary">Saved.</p>}

      <Button
        type="submit"
        disabled={pending}
        className="w-full bg-primary text-on-primary hover:bg-primary/90"
      >
        {pending ? "Saving…" : propertyId ? "Save changes" : "Create listing"}
      </Button>
    </form>
  );
}
