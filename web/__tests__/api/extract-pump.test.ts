// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * H-1 — the extraction endpoint is auth-gated: an unauthenticated request (which
 * is what a signed-out visitor or a `/demo` visitor would carry) is rejected and
 * never reaches the model. The SDK and the extraction lib are both mocked so no
 * real API call is ever made.
 */
const authMock = vi.fn();
vi.mock("@clerk/nextjs/server", () => ({ auth: () => authMock() }));

const extractMock = vi.fn();
vi.mock("@/lib/pump-extract", () => ({
  extractPumpData: (img: unknown) => extractMock(img),
}));

vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = { parse: vi.fn() };
  },
}));

import { POST } from "@/app/api/extract-pump/route";

beforeEach(() => {
  authMock.mockReset();
  extractMock.mockReset();
});

function req(body: unknown) {
  return new Request("http://localhost/api/extract-pump", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/extract-pump", () => {
  it("rejects an unauthenticated request with 401 and never extracts", async () => {
    authMock.mockResolvedValue({ userId: null });

    const res = await POST(req({ imageData: "aGVsbG8=", mediaType: "image/jpeg" }));

    expect(res.status).toBe(401);
    expect(extractMock).not.toHaveBeenCalled();
  });

  it("extracts for an authenticated user and returns the drafted fields", async () => {
    authMock.mockResolvedValue({ userId: "user_123" });
    extractMock.mockResolvedValue({ totalCost: 45.1, gallons: 12.3 });

    const res = await POST(req({ imageData: "aGVsbG8=", mediaType: "image/jpeg" }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ totalCost: 45.1, gallons: 12.3 });
    expect(extractMock).toHaveBeenCalledWith({ data: "aGVsbG8=", mediaType: "image/jpeg" });
  });

  it("400s when the image is missing", async () => {
    authMock.mockResolvedValue({ userId: "user_123" });

    const res = await POST(req({}));

    expect(res.status).toBe(400);
    expect(extractMock).not.toHaveBeenCalled();
  });
});
