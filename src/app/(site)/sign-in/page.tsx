import { SignInForm } from "@/components/sign-in-form";
import { safeNext } from "@/lib/navigation";

export const metadata = { title: "Sign in" };

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
