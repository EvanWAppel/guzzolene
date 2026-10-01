import { describe, it, expect } from "vitest";
import { siteMetadata, SITE_URL } from "@/lib/site-metadata";

describe("siteMetadata (OpenGraph / Twitter share hygiene)", () => {
  it("has a title and description", () => {
    expect(typeof siteMetadata.title).toBe("string");
    expect((siteMetadata.title as string).length).toBeGreaterThan(0);
    expect((siteMetadata.description as string).length).toBeGreaterThan(0);
  });

  it("sets an absolute metadataBase for OG image resolution", () => {
    expect(siteMetadata.metadataBase?.toString()).toContain(SITE_URL.replace(/\/$/, ""));
  });

  it("emits an OpenGraph card with title, description and website type", () => {
    const og = siteMetadata.openGraph!;
    expect(og.title).toBeTruthy();
    expect(og.description).toBeTruthy();
    expect((og as { type?: string }).type).toBe("website");
  });

  it("emits a Twitter summary_large_image card with title and description", () => {
    const tw = siteMetadata.twitter!;
    expect((tw as { card?: string }).card).toBe("summary_large_image");
    expect(tw.title).toBeTruthy();
    expect(tw.description).toBeTruthy();
  });
});
