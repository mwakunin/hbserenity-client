"use client";

import { createAuthClient } from "better-auth/react";

/**
 * Better Auth, talking to the API through this app's own origin.
 *
 * `baseURL` is deliberately empty: the client then issues relative requests to
 * `/api/auth/*`, which the rewrite in next.config.ts forwards to the API. The
 * browser only ever sees this origin, so the session cookie is first-party and
 * no CORS is involved.
 *
 * The counterpart on the API side is that `BETTER_AUTH_URL` must be set to
 * this app's public origin. Better Auth defaults `trustedOrigins` to
 * `baseURL` and checks the Origin header on state-changing requests; the
 * rewrite forwards the browser's Origin, so an API pointed at its own
 * hostname answers 403 INVALID_ORIGIN to every sign-in.
 */
export const authClient = createAuthClient({
  baseURL: "",
});

export const { signIn, signUp, signOut, useSession } = authClient;
