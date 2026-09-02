import Link from "next/link";

import { QueryProvider } from "@/components/providers/query-provider";

/**
 * The guest-facing shell.
 *
 * A route group, so `(site)` never appears in a URL — the home page stays at
 * `/`. Admin gets its own layout under `/admin` rather than nesting inside
 * this one: the two share nothing but the fonts, and a host managing listings
 * should not be looking at a booking site's chrome.
 *
 * The design is drawn for mobile, so the shell is a centred column with a
 * maximum width rather than a desktop grid that happens to collapse.
 */
export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <QueryProvider>
      <div className="mx-auto flex min-h-full w-full max-w-[480px] flex-col bg-surface">
        <header className="sticky top-0 z-10 border-b border-outline-variant/60 bg-surface/95 backdrop-blur">
          <div className="flex items-center justify-between px-4 py-3">
            <Link href="/" className="font-headline text-lg text-primary">
              Homes by Serenity
            </Link>
            <nav className="flex gap-4 text-xs text-on-surface-variant">
              <Link href="/properties">Search</Link>
              <Link href="/bookings">Trips</Link>
            </nav>
          </div>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="border-t border-outline-variant/60 px-4 py-6 text-xs text-on-surface-variant">
          <p>Book directly with the host. Pay by M-Pesa.</p>
        </footer>
      </div>
    </QueryProvider>
  );
}
