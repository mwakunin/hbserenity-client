import Link from "next/link";

import { QueryProvider } from "@/components/providers/query-provider";

/**
 * The host's shell, deliberately separate from the guest site.
 *
 * Everything under /admin is host-only. The API enforces that itself —
 * `requireRole("admin")` on each route — so this layout is presentation, not
 * a security boundary. Treat it as chrome; never as the thing keeping a guest
 * out of the dashboard.
 */
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <QueryProvider>
      <div className="mx-auto flex min-h-full w-full max-w-[480px] flex-col bg-surface-container-low">
        <header className="sticky top-0 z-10 border-b border-outline-variant/60 bg-primary text-on-primary">
          <div className="flex items-center justify-between px-4 py-3">
            <Link href="/admin" className="font-headline text-lg">
              Host
            </Link>
            <Link href="/" className="text-xs opacity-80 underline">
              View site
            </Link>
          </div>
        </header>

        <nav className="flex gap-4 border-b border-outline-variant/60 bg-surface-container-lowest px-4 py-2 text-xs">
          <Link href="/admin" className="text-on-surface-variant">Overview</Link>
          <Link href="/admin/properties" className="text-on-surface-variant">Properties</Link>
          <Link href="/admin/calendar" className="text-on-surface-variant">Calendar</Link>
          <Link href="/admin/payments" className="text-on-surface-variant">Payments</Link>
        </nav>

        <main className="flex-1">{children}</main>
      </div>
    </QueryProvider>
  );
}
