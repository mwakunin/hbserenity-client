import { SignInForm } from "@/components/sign-in-form";

export const metadata = { title: "Sign in" };

/**
 * Where to send the guest after signing in.
 *
 * Only a path on this site. `?next=` is attacker-controlled — it survives in a
 * link anyone can send — so an unchecked value turns the sign-in page into an
 * open redirect: `?next=https://evil.example` lands the guest on someone
 * else's site wearing the trust of having just signed in here, which is how a
 * convincing credential-harvest page gets its audience.
 *
 * A single leading slash is the whole rule. `//evil.example` is
 * protocol-relative and goes off-site despite starting with one, and
 * `/\evil.example` is treated as `//` by some parsers, so both are refused
 * rather than trimmed into something that looks safe.
 */
function safeNext(value: unknown): string {
  if (typeof value !== "string")
    return "/";

  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\"))
    return "/";

  return value;
}

/**
 * Signing in is required before booking.
 *
 * A booking belongs to a guest — the API takes `guestId` from the session and
 * never from the request — so there is no anonymous path to a reservation.
 */
export default async function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  const params = await searchParams;
  const next = safeNext(params.next);

  return (
    <div className="px-4 py-10">
      <h1 className="font-headline text-2xl text-on-surface">Sign in to book</h1>
      <p className="mt-2 text-sm text-on-surface-variant">
        Your bookings and payment receipts live in your account.
      </p>
      <SignInForm next={next} />
    </div>
  );
}
