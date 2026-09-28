import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "..");

/**
 * Photo-assisted entry was reintroduced as EXTRACT-AND-DISCARD (Stream H).
 * The old blob-backed OCR path stays gone; only these invariants are locked in:
 *   - no photo UPLOAD endpoint (image is never stored) and no Vercel Blob dep
 *   - no `pump_photo_url` column (schema unchanged; image never persisted)
 *   - the old `lib/claude.ts` module is not resurrected (new code is `lib/pump-extract.ts`)
 * The extraction endpoint itself (`/api/extract-pump`) is EXPECTED to exist now;
 * its auth gating is covered by `__tests__/api/extract-pump.test.ts` + `proxy.test.ts`.
 */
describe("extract-and-discard invariants (Stream H)", () => {
  it("has no photo-upload endpoint (image is never stored)", () => {
    expect(existsSync(path.join(ROOT, "app/api/upload-photo"))).toBe(false);
  });

  it("does not resurrect the old lib/claude.ts OCR module", () => {
    expect(existsSync(path.join(ROOT, "lib/claude.ts"))).toBe(false);
  });

  it("does not depend on @vercel/blob (nothing to persist the photo to)", () => {
    const pkg = JSON.parse(
      readFileSync(path.join(ROOT, "package.json"), "utf8"),
    ) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
    expect(pkg.dependencies?.["@vercel/blob"]).toBeUndefined();
    expect(pkg.devDependencies?.["@vercel/blob"]).toBeUndefined();
  });

  it("keeps the schema free of a pump_photo_url column", () => {
    const schema = readFileSync(path.join(ROOT, "lib/db/schema.ts"), "utf8");
    expect(schema).not.toMatch(/pump_photo_url|pumpPhotoUrl/);
  });
});
