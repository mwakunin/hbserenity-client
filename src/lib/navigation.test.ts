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
    // Schemes that are not navigation at all.
    ["javascript:alert(1)"],
    ["data:text/html,<script>alert(1)</script>"],
    // Not a path.
    ["evil.example"],
    [""],
  ])("refuses %s", (input) => {
    expect(safeNext(input)).toBe("/");
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
