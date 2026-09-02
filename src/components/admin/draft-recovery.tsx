"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";

import { forgetDraft, listDrafts, subscribeToDrafts } from "@/lib/recent-drafts";

/**
 * Listings created on this device that no list can show.
 *
 * The API returns active listings only, to every caller, while a new listing
 * defaults to draft — so without the id a host cannot reach their own work.
 * These ids are kept in this browser as a bridge. Remove this component when
 * the API can list drafts.
 *
 * Read through `useSyncExternalStore` rather than an effect that sets state:
 * localStorage is an external store, and reading it that way avoids both the
 * hydration mismatch — the server has no localStorage — and the cascading
 * render of writing back what was just read.
 */
export function DraftRecovery({ activeIds }: { activeIds: string[] }) {
  const raw = useSyncExternalStore(
    subscribeToDrafts,
    listDrafts,
    // Server snapshot: drafts exist only in the browser.
    () => "[]",
  );

  const [dismissed, setDismissed] = useState<string[]>([]);
  const published = useMemo(() => new Set(activeIds), [activeIds]);

  const drafts = useMemo(() => {
    try {
      const all = JSON.parse(raw) as { id: string; title: string }[];
      return all.filter(d => !published.has(d.id) && !dismissed.includes(d.id));
    }
    catch {
      return [];
    }
  }, [raw, published, dismissed]);

  // Anything now published is reachable through the real list, so its local
  // copy is dropped. That is a write, so it belongs here rather than in the
  // render above.
  useEffect(() => {
    try {
      for (const draft of JSON.parse(raw) as { id: string }[]) {
        if (published.has(draft.id))
          forgetDraft(draft.id);
      }
    }
    catch {
      // A corrupt value is not worth failing the page over.
    }
  }, [raw, published]);

  const forget = useCallback((id: string) => {
    forgetDraft(id);
    setDismissed(current => [...current, id]);
  }, []);

  if (drafts.length === 0)
    return null;

  return (
    <section className="mt-6 rounded-lg border border-dashed border-outline-variant p-4">
      <h2 className="text-sm font-medium text-on-surface">Unpublished drafts</h2>
      <p className="mt-1 text-[11px] leading-relaxed text-on-surface-variant">
        Created on this device. The API cannot list drafts, so they are
        remembered here — clearing site data loses these links.
      </p>

      <ul className="mt-3 space-y-1">
        {drafts.map(draft => (
          <li key={draft.id} className="flex items-center justify-between gap-3">
            <Link
              href={`/admin/properties/${draft.id}`}
              className="min-w-0 truncate text-xs text-primary underline"
            >
              {draft.title || draft.id}
            </Link>
            <button
              type="button"
              onClick={() => forget(draft.id)}
              className="shrink-0 text-[11px] text-on-surface-variant underline"
            >
              Forget
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
