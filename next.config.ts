import type { NextConfig } from "next";

/**
 * The API lives in a separate repository (hbserenity-api) and is reached
 * through a rewrite rather than called directly from the browser.
 *
 * That is what keeps CORS out of the picture entirely: every request the
 * browser makes goes to this origin, and Next proxies it onward server-side.
 * Session cookies stay first-party, so the API needs no CORS middleware and no
 * `SameSite=None`.
 *
 * It also means `BETTER_AUTH_URL` on the API must be set to **this** app's
 * public origin, not the API's own host. Better Auth defaults `trustedOrigins`
 * to `baseURL` and checks the Origin header on state-changing requests; the
 * rewrite forwards the browser's Origin, so an API configured with its own
 * hostname would reject sign-in. Pointing the base URL here also makes
 * verification and password-reset links land where the user actually is.
 *
 * Returning a plain array runs these as `afterFiles`, so anything under
 * `src/app/api/**` wins and only unmatched paths fall through to the API —
 * route handlers here remain possible without giving up the proxy.
 *
 * Scope is deliberately narrow. Only Better Auth lives under `/api` on the
 * API; the domain endpoints are at the root (`/properties`, `/bookings`,
 * `/admin/...`). Those are NOT proxied, because nothing needs them in the
 * browser: server components fetch them server-side against `API_ORIGIN`,
 * where CORS does not apply and the extra hop through this process is wasted.
 * The rewrite exists for the one client that genuinely runs in the browser —
 * the Better Auth client, which needs its cookies to be first-party.
 *
 * Not proxied, and must not be: the M-Pesa callback. Safaricom calls the API
 * directly, server to server, and never touches this origin.
 */
const apiOrigin = process.env.API_ORIGIN ?? "http://localhost:9999";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiOrigin}/api/:path*`,
      },
    ];
  },

  images: {
    // Property photos come from ImageKit. The endpoint is per-environment, so
    // it is read from config rather than pinned to one account.
    remotePatterns: process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT
      ? [new URL(`${process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT}/**`)]
      : [],
  },
};

export default nextConfig;
