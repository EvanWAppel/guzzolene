import { describe, it, expect } from "vitest";
import { PUBLIC_ROUTES } from "@/proxy";

/**
 * Regression net for the demo's accessibility: `/demo` is an anonymous public
 * surface (PRD §5.4.3). If it ever drops off this list, the auth proxy would
 * redirect recruiters to sign-in. Keep the public showcase routes here.
 */
describe("public routes", () => {
  it("includes the showcase home and the read-only demo", () => {
    expect(PUBLIC_ROUTES).toContain("/");
    expect(PUBLIC_ROUTES).toContain("/demo");
  });

  it("does NOT expose the authenticated dashboard", () => {
    expect(PUBLIC_ROUTES).not.toContain("/dashboard");
    expect(PUBLIC_ROUTES.some((r) => r.startsWith("/dashboard"))).toBe(false);
  });

  /**
   * H-1 — the photo-extraction endpoint must stay behind the auth gate: there is
   * no extraction path from `/demo` or while signed out. It must never appear in
   * the public matcher, and the only public `/api` route is the Clerk webhook.
   */
  it("does NOT expose the photo-extraction endpoint (extract-and-discard)", () => {
    expect(PUBLIC_ROUTES).not.toContain("/api/extract-pump");
    expect(PUBLIC_ROUTES.some((r) => r.includes("extract-pump"))).toBe(false);

    const apiRoutes = PUBLIC_ROUTES.filter((r) => r.startsWith("/api"));
    expect(apiRoutes).toEqual(["/api/webhooks(.*)"]);
  });
});
