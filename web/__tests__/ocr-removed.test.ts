import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "..");

describe("OCR feature removal (Stream B)", () => {
  it("upload-photo API route is removed", () => {
    expect(existsSync(path.join(ROOT, "app/api/upload-photo"))).toBe(false);
  });

  it("extract-pump API route is removed", () => {
    expect(existsSync(path.join(ROOT, "app/api/extract-pump"))).toBe(false);
  });

  it("lib/claude.ts is removed", () => {
    expect(existsSync(path.join(ROOT, "lib/claude.ts"))).toBe(false);
  });
});
