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
});
