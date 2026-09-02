/**
 * Ids of listings this browser has created, kept so they can be found again.
 *
 * A workaround for a hole in the API, not a feature. `properties.status`
 * defaults to `draft`, and `GET /properties` filters to `status = "active"`
 * for every caller including an admin — so a newly created listing appears in
 * no list at all. `GET /properties/{id}` does return a draft to an admin, so
 * the id is the only thing standing between the host and their own work.
 *
 * The limits are worth being honest about: this is per-browser and per-device,
 * it does not survive cleared site data, and it knows nothing about drafts
 * created anywhere else. It is a bridge, not a source of truth.
 *
 * Delete this file when the API can list a host's drafts.
 */

const KEY = "hbserenity.recent-drafts";
const LIMIT = 20;

export interface RecentDraft {
  id: string;
  title: string;
  createdAt: string;
}

function read(): RecentDraft[] {
  if (typeof window === "undefined")
    return [];

  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  }
  catch {
    // Private windows and blocked site data both throw here. A host who
    // cannot record drafts should still be able to use the rest of the app.
    return [];
  }
}

export function rememberDraft(draft: { id: string; title: string }): void {
  try {
    const next = [
      { ...draft, createdAt: new Date().toISOString() },
      ...read().filter(d => d.id !== draft.id),
    ].slice(0, LIMIT);

    window.localStorage.setItem(KEY, JSON.stringify(next));
    announce();
  }
  catch {
    // Nothing to do: failing to remember must not fail the creation that
    // already succeeded on the server.
  }
}

/**
 * The raw stored value, for `useSyncExternalStore`.
 *
 * Returns the JSON string rather than a parsed array on purpose: the snapshot
 * has to be referentially stable between reads or React re-renders forever,
 * and `JSON.parse` hands back a new object every time.
 */
export function listDrafts(): string {
  if (typeof window === "undefined")
    return "[]";

  try {
    return window.localStorage.getItem(KEY) ?? "[]";
  }
  catch {
    return "[]";
  }
}

const listeners = new Set<() => void>();

export function subscribeToDrafts(onChange: () => void): () => void {
  listeners.add(onChange);
  // Another tab writing the same key also counts as a change.
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function announce(): void {
  for (const listener of listeners) listener();
}

export function forgetDraft(id: string): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(read().filter(d => d.id !== id)));
    announce();
  }
  catch {
    // See above.
  }
}
