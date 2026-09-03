"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { GetResponse } from "@/lib/api/client";

import { setAmenities } from "@/app/admin/properties/actions";
import { Button } from "@/components/ui/button";

type Amenity = GetResponse<"/amenities">["data"][number];

/**
 * What a listing offers, ticked from the shared catalogue.
 *
 * The whole set is submitted rather than each change, because that is what
 * `PUT /properties/{id}/amenities` takes — unticking a box is expressed by
 * leaving it out. It also means a half-finished edit is never half-saved:
 * nothing is written until Save.
 */
export function AmenityPicker({
  propertyId,
  catalogue,
  selected,
}: {
  propertyId: string;
  catalogue: Amenity[];
  selected: string[];
}) {
  const router = useRouter();
  const [chosen, setChosen] = useState<string[]>(selected);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Compared as sets, so re-ticking a box back to where it started correctly
  // reads as "nothing to save".
  const dirty = chosen.length !== selected.length
    || chosen.some(id => !selected.includes(id));

  function toggle(id: string) {
    setSaved(false);
    setChosen(current =>
      current.includes(id) ? current.filter(x => x !== id) : [...current, id]);
  }

  async function save() {
    setBusy(true);
    setError(null);
    setSaved(false);

    try {
      const result = await setAmenities(propertyId, chosen);

      if (result.status === "unauthenticated") {
        router.push(`/sign-in?next=${encodeURIComponent(`/admin/properties/${propertyId}`)}`);
        return;
      }
      if (result.status !== "ok") {
        setError(result.message);
        return;
      }

      setSaved(true);
      router.refresh();
    }
    catch {
      setError("Something went wrong. Please try again.");
    }
    finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h2 className="font-headline text-lg text-on-surface">Amenities</h2>
      <p className="mt-1 text-[11px] text-on-surface-variant">
        Shown on the listing page. Tick everything the stay actually offers.
      </p>

      {catalogue.length === 0
        ? (
            <p className="mt-3 rounded-md bg-surface-container p-3 text-xs text-on-surface-variant">
              The amenity catalogue is empty.
            </p>
          )
        : (
            <ul className="mt-3 grid grid-cols-2 gap-2">
              {catalogue.map(amenity => (
                <li key={amenity.id}>
                  <label
                    className={`flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-xs ring-1 transition ${
                      chosen.includes(amenity.id)
                        ? "bg-secondary-container text-on-secondary-container ring-secondary"
                        : "bg-surface-container-lowest text-on-surface-variant ring-outline-variant/50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={chosen.includes(amenity.id)}
                      onChange={() => toggle(amenity.id)}
                      disabled={busy}
                      className="accent-primary"
                    />
                    <span className="truncate">{amenity.name}</span>
                  </label>
                </li>
              ))}
            </ul>
          )}

      <div className="mt-3 flex items-center gap-3">
        <Button onClick={save} disabled={busy || !dirty} className="text-xs">
          {busy ? "Saving…" : "Save amenities"}
        </Button>
        {saved && !dirty && <span className="text-xs text-on-surface-variant">Saved.</span>}
      </div>

      {error && <p className="mt-2 text-xs text-error">{error}</p>}
    </div>
  );
}
