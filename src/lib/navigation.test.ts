import { describe, expect, it } from "vitest";

import { safeNext } from "./navigation";

/**
 * `?next=` decides where a guest lands immediately after signing in, and it
 * comes from a link anyone can send. Every case below is a URL that a browser
 * would happily follow off this site.
 */
describe("safeNext", () => {
  it.each([
    ["/", "/"],
    ["/bookings", "/bookings"],
    ["/properties/abc?from=search", "/properties/abc?from=search"],
    ["/admin/properties/1#photos", "/admin/properties/1#photos"],
  ])("keeps the same-site path %s", (input, expected) => {
    expect(safeNext(input)).toBe(expected);
  });

  it.each([
    // Absolute: the obvious case.
    ["https://evil.example"],
    ["http://evil.example/login"],
    // Protocol-relative — starts with a slash and still leaves the site.
    ["//evil.example"],
    ["//evil.example/pay"],
    // Backslash, which some parsers normalise to `//`.
    ["/\\evil.example"],
    ["/\\\\evil.example"],
    // Schemes that are not navigation at all.
    ["javascript:alert(1)"],
    ["data:text/html,<script>alert(1)</script>"],
    // Not a path.
    ["evil.example"],
    [""],
  ])("refuses %s", (input) => {
    expect(safeNext(input)).toBe("/");
  });

  /*
   * URL parsing strips tab, newline and carriage return before resolving, so
   * each of these passes a "does it start with //?" test and then resolves to
   * `//evil.example` — off-site, from a value that looked like a path. This
   * is why the check resolves against a base instead of matching prefixes.
   */
  it.each([
    ["newline", "/\n/evil.example"],
    ["carriage return", "/\r/evil.example"],
    ["tab", "/\t/evil.example"],
    ["a newline before a scheme", "/\nhttps://evil.example"],
    ["several control characters", "/\n\t\r/evil.example"],
    ["a control character mid-path", "/book\nings//evil.example"],
  ])("refuses a %s that resolves off-site", (_label, input) => {
    const resolved = new URL(safeNext(input), "https://hbserenity.test");

    expect(resolved.origin).toBe("https://hbserenity.test");
  });

  // The value handed onward is the parser's, not the caller's, so nothing
  // downstream can read it differently from how it was checked.
  it("returns a re-serialised path rather than the input", () => {
    expect(safeNext("/bookings/../admin")).toBe("/admin");
    expect(safeNext("/properties?a=1#top")).toBe("/properties?a=1#top");
  });

  // searchParams hands over an array for a repeated key, and anything at all
  // if the URL is hand-written.
  it.each([
    [["/a", "/b"]],
    [undefined],
    [null],
    [42],
    [{ toString: () => "/looks-safe" }],
  ])("refuses the non-string %s", (input) => {
    expect(safeNext(input)).toBe("/");
  });
});
