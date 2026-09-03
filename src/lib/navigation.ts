/**
 * Where a sign-in may send someone afterwards.
 *
 * Only a path on this site. `?next=` is attacker-controlled — it survives in
 * a link anyone can send — so an unchecked value turns the sign-in page into
 * an open redirect: `?next=https://evil.example` lands the guest on someone
 * else's site wearing the trust of having just signed in here, which is how a
 * convincing credential-harvest page gets its audience.
 *
 * A single leading slash is the whole rule. `//evil.example` is
 * protocol-relative and goes off-site despite starting with one, and
 * `/\evil.example` is treated as `//` by some parsers, so both are refused
 * rather than trimmed into something that looks safe.
 */
export function safeNext(value: unknown): string {
  if (typeof value !== "string")
    return "/";

  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\"))
    return "/";

  return value;
}
