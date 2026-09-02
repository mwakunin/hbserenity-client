"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

/**
 * TanStack Query, scoped to the things that genuinely happen in the browser.
 *
 * Most of this app's data is fetched in server components, which need no
 * client cache at all. Query earns its place in three places: the search
 * filters, where results are refetched as the user types; availability
 * lookups on a property, which change while the user is picking dates; and
 * polling a booking after an STK push, where the answer arrives out of band
 * from Safaricom and the page has to notice.
 *
 * Created inside state rather than at module scope. A module-level client is
 * shared across every request the server handles, which on the server means
 * one user's cached data can be served to the next.
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // The server already rendered fresh data; refetching the moment
            // the page hydrates would throw that away and flash the UI.
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            // A 404 or 422 will not become a different answer on retry, and
            // retrying a rejected booking wastes the guest's time.
            retry: (failureCount, error) => {
              const status = (error as { status?: number })?.status;
              if (status && status >= 400 && status < 500)
                return false;
              return failureCount < 2;
            },
          },
        },
      }),
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
