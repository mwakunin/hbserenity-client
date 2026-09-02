import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/api/client";

/**
 * Who may see the host console.
 *
 * Called by each admin page rather than by the admin layout, which is what it
 * looks like it should be. Next's own authentication guide is explicit that a
 * layout is the wrong place: layouts do not re-render on client-side
 * navigation, so the check would not run when moving between /admin routes,
 * and "a layout also does not control whether the rest of the route renders —
 * route segments are rendered by the router, so a layout that hides or swaps
 * them does not stop them from running or from appearing in the RSC Payload."
 * A guard there would look like a boundary while not being one.
 *
 * This is still not the security boundary either. The API enforces
 * `requireRole("admin")` on every route it serves, and that is what actually
 * protects the data; a session cookie this app merely read could be stale.
 * What this adds is the correct answer for a caller who has no business here:
 * a redirect to sign-in instead of an unhandled 403 from the first fetch the
 * page happens to make.
 */
export async function requireAdmin(returnTo: string) {
  const user = await getSessionUser();

  if (!user)
    redirect(`/sign-in?next=${encodeURIComponent(returnTo)}`);

  // "host" is a role the API defines but does not grant the console to —
  // `requireRole("admin")` is what every admin route asks for, so anything
  // else is sent back to the guest site rather than to sign-in. Signing in
  // again would not change the answer.
  if (user.role !== "admin")
    redirect("/");

  return user;
}
