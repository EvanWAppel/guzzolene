import { describe, it, expect } from "vitest";
import robots from "@/app/robots";

describe("robots route", () => {
  it("allows crawling of the site root", () => {
    const result = robots();
    const rules = Array.isArray(result.rules) ? result.rules : [result.rules];
    const wildcard = rules.find((r) => r.userAgent === "*");
    expect(wildcard).toBeDefined();
    expect(wildcard!.allow).toBe("/");
  });

  it("keeps authenticated app surfaces out of the index", () => {
    const result = robots();
    const rules = Array.isArray(result.rules) ? result.rules : [result.rules];
    const disallowed = rules
      .flatMap((r) => (Array.isArray(r.disallow) ? r.disallow : r.disallow ? [r.disallow] : []))
      .join(" ");
    expect(disallowed).toMatch(/\/dashboard/);
    expect(disallowed).toMatch(/\/admin/);
  });

  it("advertises the canonical host", () => {
    expect(robots().host).toContain("guzzo-lene.com");
  });
});
