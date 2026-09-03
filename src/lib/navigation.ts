/**
 * A base that exists only to resolve candidate paths against.
 *
 * `.invalid` is reserved by RFC 2606 and can never be a real host, so even a
 * value crafted to match this origin resolves to somewhere unreachable rather
 * than to a site someone controls.
 */
const SAME_SITE_BASE = "https://hbserenity.invalid";

/**
 * Where a sign-in may send someone afterwards.
 *
 * Only a path on this site. `?next=` is attacker-controlled — it survives in
 * a link anyone can send — so an unchecked value turns the sign-in page into
 * an open redirect: `?next=https://evil.example` lands the guest on someone
 * else's site wearing the trust of having just signed in here, which is how a
 * convincing credential-harvest page gets its audience.
 *
 * The candidate is resolved against a fixed base and kept only if it lands on
 * that origin, rather than checked against a list of dangerous prefixes. That
 * list is unwinnable: URL parsing strips tab, newline and carriage return
 * before resolving, so `/\n/evil.example` passes any "does it start with
 * //?" test and then resolves to `//evil.example`. Handing the question to
 * the same parser the browser uses means the tricks it normalises away are
 * normalised here first.
 *
 * What comes back is the re-serialised path, not the input, so the value
 * handed to the router cannot be re-interpreted differently by whatever reads
 * it next.
 */
export function safeNext(value: unknown): string {
  if (typeof value !== "string")
    return "/";

  // A same-site path starts with exactly one slash. Checked before parsing
  // because `new URL("https://evil.example", base)` is perfectly valid and
  // simply ignores the base.
  if (!value.startsWith("/"))
    return "/";

  let resolved: URL;
  try {
    resolved = new URL(value, SAME_SITE_BASE);
  }
  catch {
    return "/";
  }

  if (resolved.origin !== SAME_SITE_BASE)
    return "/";

  return `${resolved.pathname}${resolved.search}${resolved.hash}`;
}
