"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { deleteProperty } from "@/app/admin/properties/actions";
import { Button } from "@/components/ui/button";
import { forgetDraft } from "@/lib/recent-drafts";

/**
 * Removing a listing.
 *
 * A listing with bookings against it cannot be deleted — the API maps the
 * foreign key violation to 409 rather than orphaning a guest's stay. That is
 * surfaced as an explanation, not a failure, because it is the correct
 * outcome and the host's real option is to deactivate instead.
 */
export function DeleteProperty({ propertyId, title }: { propertyId: string; title: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      const result = await deleteProperty(propertyId);

      if (result.status === "blocked") {
        setError(result.message);
        setConfirming(false);
        return;
      }
      if (result.status === "unauthenticated") {
        router.push("/sign-in?next=%2Fadmin%2Fproperties");
        return;
      }

      forgetDraft(propertyId);
      router.push("/admin/properties");
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
      <h2 className="font-headline text-lg text-on-surface">Delete listing</h2>
      <p className="mt-1 text-[11px] leading-relaxed text-on-surface-variant">
        Permanent. A listing with bookings cannot be deleted — deactivate it
        instead to take it off the site while keeping its history.
      </p>

      {error && <p className="mt-2 text-xs text-error">{error}</p>}

      {!confirming
        ? (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="mt-3 text-xs text-error underline"
            >
              Delete “
              {title}
              ”
            </button>
          )
        : (
            <div className="mt-3 flex gap-2">
              <Button
                onClick={remove}
                disabled={busy}
                className="flex-1 bg-error text-on-error hover:bg-error/90"
              >
                {busy ? "Deleting…" : "Yes, delete"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setConfirming(false)}
                disabled={busy}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          )}
    </div>
  );
}
