import { describe, it, expect, afterEach } from "vitest";
import {
  SNAPSHOT_TTL_MS,
  createSnapshotToken,
  verifySnapshot,
  getSnapshotSecret,
} from "@/lib/snapshot-token";

/**
 * Stream J (J-1): the shareable-snapshot token is an HMAC-signed, expiring
 * encoding of the public filtered view state `{ range, events, exp }`.
 * verify() accepts a valid, unexpired token and rejects expired or tampered
 * ones — the security boundary for the read-only `/s/[token]` surface.
 */

const SECRET = "test-signing-secret-do-not-ship";

afterEach(() => {
  delete process.env.SNAPSHOT_SIGNING_SECRET;
});

describe("snapshot token round-trip (J-1)", () => {
  it("verifies a freshly signed token and returns the view state", () => {
    const view = { range: { from: "2024-01-01", to: "2024-06-30" }, events: true };
    const token = createSnapshotToken(view, { secret: SECRET });

    const result = verifySnapshot(token, { secret: SECRET });

    expect(result.status).toBe("valid");
    if (result.status !== "valid") throw new Error("expected valid");
    expect(result.payload.range).toEqual(view.range);
    expect(result.payload.events).toBe(true);
  });

  it("round-trips an empty (all-time) range and events=false", () => {
    const token = createSnapshotToken({ range: {}, events: false }, { secret: SECRET });
    const result = verifySnapshot(token, { secret: SECRET });
    expect(result.status).toBe("valid");
    if (result.status !== "valid") throw new Error("expected valid");
    expect(result.payload.range).toEqual({});
    expect(result.payload.events).toBe(false);
  });

  it("defaults to a 30-day expiry", () => {
    const now = Date.UTC(2026, 0, 1);
    const token = createSnapshotToken({ range: {}, events: true }, { secret: SECRET, now });
    const result = verifySnapshot(token, { secret: SECRET, now });
    expect(result.status).toBe("valid");
    if (result.status !== "valid") throw new Error("expected valid");
    expect(result.payload.exp).toBe(now + SNAPSHOT_TTL_MS);
    expect(SNAPSHOT_TTL_MS).toBe(30 * 24 * 60 * 60 * 1000);
  });
});

describe("snapshot token expiry (J-1)", () => {
  it("rejects a token whose exp is in the past", () => {
    const minted = Date.UTC(2026, 0, 1);
    const token = createSnapshotToken({ range: {}, events: true }, { secret: SECRET, now: minted });
    // 31 days later: past the 30-day TTL.
    const later = minted + 31 * 24 * 60 * 60 * 1000;
    const result = verifySnapshot(token, { secret: SECRET, now: later });
    expect(result.status).toBe("expired");
  });

  it("accepts a token right up to the moment of expiry", () => {
    const minted = Date.UTC(2026, 0, 1);
    const token = createSnapshotToken({ range: {}, events: true }, { secret: SECRET, now: minted });
    const atExpiry = minted + SNAPSHOT_TTL_MS;
    expect(verifySnapshot(token, { secret: SECRET, now: atExpiry }).status).toBe("valid");
  });
});

describe("snapshot token tamper resistance (J-1)", () => {
  it("rejects a token signed with a different secret", () => {
    const token = createSnapshotToken({ range: {}, events: true }, { secret: SECRET });
    expect(verifySnapshot(token, { secret: "some-other-secret" }).status).toBe("invalid");
  });

  it("rejects a tampered payload body", () => {
    const token = createSnapshotToken(
      { range: { from: "2024-01-01" }, events: true },
      { secret: SECRET },
    );
    const [body, sig] = token.split(".");
    // Flip a character in the encoded body; signature no longer matches.
    const flipped = (body[0] === "A" ? "B" : "A") + body.slice(1);
    const tampered = `${flipped}.${sig}`;
    expect(verifySnapshot(tampered, { secret: SECRET }).status).toBe("invalid");
  });

  it("rejects a tampered signature", () => {
    const token = createSnapshotToken({ range: {}, events: true }, { secret: SECRET });
    const [body, sig] = token.split(".");
    const flippedSig = (sig[0] === "A" ? "B" : "A") + sig.slice(1);
    expect(verifySnapshot(`${body}.${flippedSig}`, { secret: SECRET }).status).toBe("invalid");
  });

  it("rejects a structurally malformed token", () => {
    expect(verifySnapshot("not-a-token", { secret: SECRET }).status).toBe("invalid");
    expect(verifySnapshot("", { secret: SECRET }).status).toBe("invalid");
    expect(verifySnapshot("a.b.c", { secret: SECRET }).status).toBe("invalid");
  });
});

describe("snapshot signing secret (J-1)", () => {
  it("reads the secret from SNAPSHOT_SIGNING_SECRET", () => {
    process.env.SNAPSHOT_SIGNING_SECRET = "env-secret";
    expect(getSnapshotSecret()).toBe("env-secret");
  });

  it("throws (does not silently fall back) when the secret is unset", () => {
    delete process.env.SNAPSHOT_SIGNING_SECRET;
    expect(() => getSnapshotSecret()).toThrow(/SNAPSHOT_SIGNING_SECRET/);
  });

  it("uses the env secret when no explicit secret is passed", () => {
    process.env.SNAPSHOT_SIGNING_SECRET = "env-secret";
    const token = createSnapshotToken({ range: {}, events: true });
    expect(verifySnapshot(token).status).toBe("valid");
  });
});
