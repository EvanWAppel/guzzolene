import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * The SDK is ALWAYS mocked here — a real vision call costs money against a
 * spend-capped key (see the stream brief). `parseMock` stands in for
 * `client.messages.parse`.
 */
const parseMock = vi.fn();
vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = { parse: parseMock };
  },
}));

import { extractPumpData } from "@/lib/pump-extract";

const IMG = { data: "aGVsbG8=", mediaType: "image/jpeg" as const };

beforeEach(() => {
  parseMock.mockReset();
});

describe("extractPumpData (extract-and-discard)", () => {
  it("calls claude-haiku-4-5 with the base64 image and a structured-output format", async () => {
    parseMock.mockResolvedValue({ parsed_output: { totalCost: 45.1, gallons: 12.3 } });

    await extractPumpData(IMG);

    expect(parseMock).toHaveBeenCalledTimes(1);
    const params = parseMock.mock.calls[0][0];
    expect(params.model).toBe("claude-haiku-4-5");

    const content = params.messages[0].content;
    const imageBlock = content.find((b: { type: string }) => b.type === "image");
    expect(imageBlock.source).toMatchObject({
      type: "base64",
      media_type: "image/jpeg",
      data: "aGVsbG8=",
    });

    // Structured outputs, not free-text parsing.
    expect(params.output_config?.format).toBeDefined();
  });

  it("returns only the fields the model provided — missing ones stay undefined (not guessed)", async () => {
    parseMock.mockResolvedValue({ parsed_output: { totalCost: 45.1, fuelGrade: "91" } });

    const result = await extractPumpData(IMG);

    expect(result).toEqual({ totalCost: 45.1, fuelGrade: "91" });
    expect(result.gallons).toBeUndefined();
    expect(result.odometer).toBeUndefined();
    expect(result.pricePerGallon).toBeUndefined();
  });

  it("throws (does not swallow) when the model returns no parseable structured output", async () => {
    parseMock.mockResolvedValue({ parsed_output: null });
    await expect(extractPumpData(IMG)).rejects.toThrow();
  });

  it("propagates SDK errors instead of hiding them", async () => {
    parseMock.mockRejectedValue(new Error("boom"));
    await expect(extractPumpData(IMG)).rejects.toThrow("boom");
  });

  it("never persists the image (no Vercel Blob / storage import)", () => {
    const src = readFileSync(
      path.resolve(__dirname, "../../lib/pump-extract.ts"),
      "utf8",
    );
    expect(src).not.toMatch(/@vercel\/blob/);
    expect(src).not.toMatch(/pump_photo_url|pumpPhotoUrl/);
  });
});
