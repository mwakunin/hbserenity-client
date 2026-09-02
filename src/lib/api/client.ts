import { cookies } from "next/headers";

import type { paths } from "./schema";

/**
 * Talking to hbserenity-api from the server.
 *
 * Server components call this directly against `API_ORIGIN`. They are already
 * on the server, so there is no CORS to satisfy and no reason to route the
 * request back out through this app's own proxy — that would be a pointless
 * extra hop. The rewrite in next.config.ts exists for the one caller that
 * genuinely lives in the browser, the Better Auth client.
 *
 * Types come from `schema.d.ts`, generated from the API's own OpenAPI
 * document (`pnpm codegen`). Nothing here restates a response shape by hand,
 * so a contract change surfaces as a type error rather than as a runtime
 * surprise.
 */

const API_ORIGIN = process.env.API_ORIGIN ?? "http://localhost:9999";

/** The 200 JSON body of a GET, read off the generated schema. */
export type GetResponse<P extends keyof paths>
  = paths[P] extends { get: { responses: { 200: { content: { "application/json": infer R } } } } }
    ? R
    : never;

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly path: string,
    readonly body: unknown,
  ) {
    super(`API ${status} for ${path}`);
    this.name = "ApiError";
  }
}

interface ApiFetchOptions extends Omit<RequestInit, "cache"> {
  /**
   * Forward the caller's session cookie.
   *
   * Off by default, and deliberately explicit: a page that forwards cookies
   * cannot be cached across users, so making it opt-in keeps the public
   * listing pages cacheable rather than accidentally personalising them.
   */
  authenticated?: boolean;
  /** Seconds to cache. Omit for no caching, which is right for anything per-user. */
  revalidate?: number;
}

async function request<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { authenticated, revalidate, headers, ...init } = options;

  const merged = new Headers(headers);
  merged.set("accept", "application/json");

  if (authenticated) {
    // The API identifies the guest by Better Auth's session cookie, which
    // arrived on this request and has to be passed along explicitly — a
    // server-side fetch carries no cookie jar of its own.
    merged.set("cookie", (await cookies()).toString());
  }

  const res = await fetch(`${API_ORIGIN}${path}`, {
    ...init,
    headers: merged,
    next: revalidate === undefined ? { revalidate: 0 } : { revalidate },
  });

  const body = res.status === 204 ? null : await res.json().catch(() => null);

  if (!res.ok)
    throw new ApiError(res.status, path, body);

  return body as T;
}

/** GET a path from the generated schema, with its response type. */
export function apiGet<P extends keyof paths & string>(
  path: P | (string & {}),
  options?: ApiFetchOptions,
): Promise<GetResponse<P>> {
  return request<GetResponse<P>>(path, options);
}

/** POST/PATCH/DELETE. Always authenticated — nothing mutates anonymously. */
export function apiSend<T>(
  path: string,
  method: "POST" | "PATCH" | "DELETE",
  body?: unknown,
  options?: ApiFetchOptions,
): Promise<T> {
  return request<T>(path, {
    ...options,
    method,
    authenticated: true,
    headers: { "content-type": "application/json", ...options?.headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
