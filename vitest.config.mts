import path from "node:path";
import { defineConfig } from "vitest/config";

/**
 * Tests for the logic that has invariants, not for the framework.
 *
 * Everything covered here is a plain function: what counts as an applied
 * filter, which redirect targets are safe, what "today" means in Nairobi.
 * Those are the places this app has actually been wrong, and they need no
 * DOM, no server and no API — so the suite runs in under a second and can
 * gate every push.
 *
 * Rendering is deliberately out of scope for now. Component tests need a DOM
 * environment and a library, and they mostly re-assert what TypeScript and a
 * production build already check; the bugs worth catching here have been in
 * the functions underneath.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
    /*
     * Pinned, because a test about time zones is worthless in the wrong one.
     *
     * `today()` and the dashboard windows exist to stop UTC being mistaken
     * for the local calendar day, and on a UTC runner — which is what CI is —
     * the two agree and the tests pass whether the code is right or not. This
     * is where the guests are, and it is UTC+3, so the distinction is real.
     */
    env: { TZ: "Africa/Nairobi" },
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "html"],
      // Only what the suite claims to cover. A percentage over the whole app
      // would be a number about the untested UI, which is not what this is.
      include: ["src/lib/**/*.ts"],
      exclude: ["src/lib/api/schema.d.ts", "src/lib/**/*.test.ts"],
    },
  },
});
