import { describe, it, expect } from "vitest";
import { createRouteMatcher } from "@clerk/nextjs/server";
import { PUBLIC_ROUTES } from "@/proxy";

/**
 * Stream J (J-2): the read-only snapshot surface `/s/[token]` is anonymous
 * (PRD §5.7 — it renders already-public, location-stripped data). If it falls
 * out of PUBLIC_ROUTES the auth proxy would bounce shared links to sign-in,
 * breaking every snapshot URL. Keep the pattern here.
 */
describe("snapshot route is public", () => {
  it("lists the /s/ snapshot pattern in PUBLIC_ROUTES", () => {
    expect(PUBLIC_ROUTES).toContain("/s/(.*)");
  });

  it("matches a concrete snapshot URL as public", () => {
    const isPublic = createRouteMatcher(PUBLIC_ROUTES);
    // createRouteMatcher's matcher accepts anything with a nextUrl.pathname.
    const req = { nextUrl: { pathname: "/s/abc.def" }, url: "https://x/s/abc.def" } as never;
    expect(isPublic(req)).toBe(true);
  });

  it("still does not expose the authenticated dashboard", () => {
    const isPublic = createRouteMatcher(PUBLIC_ROUTES);
    const req = { nextUrl: { pathname: "/dashboard" }, url: "https://x/dashboard" } as never;
    expect(isPublic(req)).toBe(false);
  });
});
