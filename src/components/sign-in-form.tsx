"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { signIn, signUp } from "@/lib/auth-client";

/**
 * Email and password, which is the sign-in method the API actually supports
 * today.
 *
 * Phone + OTP is fully built on the API side but dormant until an SMS provider
 * is wired, so offering it here would be a dead end. Google is registered only
 * when its credentials are set, so it is not assumed either.
 *
 * These calls go to `/api/auth/*` on this origin and are forwarded to the API
 * by the rewrite, which is what keeps the session cookie first-party.
 */
export function SignInForm({ next }: { next: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [checkInbox, setCheckInbox] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const result = mode === "in"
      ? await signIn.email({ email, password })
      : await signUp.email({ email, password, name });

    setPending(false);

    if (result.error) {
      setError(result.error.message ?? "That did not work. Please check and try again.");
      return;
    }

    // When the API can send mail it requires verification, and sign-up then
    // returns no session on purpose — so the address cannot be claimed by
    // whoever types it first. Redirecting would land on a page that bounces
    // straight back here.
    if (mode === "up" && !result.data?.user) {
      setCheckInbox(true);
      return;
    }

    router.push(next);
    router.refresh();
  }

  if (checkInbox) {
    return (
      <div className="mt-6 rounded-lg bg-surface-container p-5">
        <p className="text-sm font-medium text-on-surface">Check your email</p>
        <p className="mt-1 text-xs text-on-surface-variant">
          We sent a confirmation link to
          {" "}
          {email}
          . Your account is not active until you open it.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-3">
      {mode === "up" && (
        <label className="block text-xs text-on-surface-variant">
          Full name
          <input
            required
            value={name}
            onChange={e => setName(e.target.value)}
            className="mt-1 w-full rounded-md border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface"
          />
        </label>
      )}

      <label className="block text-xs text-on-surface-variant">
        Email address
        <input
          required
          type="email"
          autoComplete="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="mt-1 w-full rounded-md border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface"
        />
      </label>

      <label className="block text-xs text-on-surface-variant">
        Password
        <input
          required
          type="password"
          // The API sets a 10-character minimum; saying so beats a 422.
          minLength={10}
          autoComplete={mode === "in" ? "current-password" : "new-password"}
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="mt-1 w-full rounded-md border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface"
        />
      </label>

      {error && <p className="text-xs text-error">{error}</p>}

      <Button
        type="submit"
        disabled={pending}
        className="w-full bg-primary text-on-primary hover:bg-primary/90"
      >
        {pending ? "Please wait…" : mode === "in" ? "Sign in" : "Create account"}
      </Button>

      <button
        type="button"
        onClick={() => { setMode(mode === "in" ? "up" : "in"); setError(null); }}
        className="w-full text-xs text-primary underline"
      >
        {mode === "in" ? "New here? Create an account" : "Already have an account? Sign in"}
      </button>
    </form>
  );
}
