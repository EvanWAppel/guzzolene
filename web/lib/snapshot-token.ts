import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Shareable-snapshot tokens (PRD §5.7, DECISIONS D-4).
 *
 * A snapshot token is a compact, HMAC-signed, self-expiring encoding of the
 * PUBLIC filtered-view state — the date range and whether world-event overlays
 * are shown. It carries NO location and no owner identity; it only names a view
 * of already-public data (see `public-data.ts` / PRD §5.4.2). The signature (an
 * HMAC-SHA256 over an env secret) prevents a visitor from forging or widening a
 * view; the embedded `exp` bounds how long a shared link stays live.
 *
 * Format: `base64url(JSON payload) + "." + base64url(HMAC-SHA256(body))`.
 *
 * This module is server-only (it uses `node:crypto` and the signing secret).
 * The client share affordance never imports it — it receives a signed token as
 * a prop.
 */

/** Default link lifetime: 30 days (DECISIONS D-4). */
export const SNAPSHOT_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** ISO `YYYY-MM-DD` bounds, mirroring the `from`/`to` search params. */
export interface SnapshotRange {
  from?: string;
  to?: string;
}

/** The public view a snapshot names. `events` = are world-event overlays shown. */
export interface SnapshotView {
  range: SnapshotRange;
  events: boolean;
}

/** The signed payload: the view plus its expiry (epoch ms). */
export interface SnapshotPayload extends SnapshotView {
  exp: number;
}

export type VerifyResult =
  | { status: "valid"; payload: SnapshotPayload }
  | { status: "expired" }
  | { status: "invalid" };

/**
 * The signing secret. Throws (rather than falling back to a default) when
 * unset — an unsigned/predictably-signed token would defeat the boundary, so we
 * surface the misconfiguration instead of hiding it (see `claude.md`).
 */
export function getSnapshotSecret(): string {
  const secret = process.env.SNAPSHOT_SIGNING_SECRET;
  if (!secret) {
    throw new Error(
      "SNAPSHOT_SIGNING_SECRET is not set — cannot sign or verify snapshot tokens.",
    );
  }
  return secret;
}

function base64urlEncode(input: string | Buffer): string {
  return Buffer.from(input).toString("base64url");
}

function hmac(body: string, secret: string): Buffer {
  return createHmac("sha256", secret).update(body).digest();
}

/** Sign an already-built payload. Exposed mainly for tests; callers use `createSnapshotToken`. */
export function signSnapshot(payload: SnapshotPayload, secret: string = getSnapshotSecret()): string {
  const body = base64urlEncode(JSON.stringify(payload));
  const sig = base64urlEncode(hmac(body, secret));
  return `${body}.${sig}`;
}

/** Build and sign a token for a view, stamping a 30-day expiry by default. */
export function createSnapshotToken(
  view: SnapshotView,
  opts: { now?: number; ttlMs?: number; secret?: string } = {},
): string {
  const now = opts.now ?? Date.now();
  const ttlMs = opts.ttlMs ?? SNAPSHOT_TTL_MS;
  const payload: SnapshotPayload = {
    range: view.range,
    events: view.events,
    exp: now + ttlMs,
  };
  return signSnapshot(payload, opts.secret ?? getSnapshotSecret());
}

function isSnapshotPayload(value: unknown): value is SnapshotPayload {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  if (typeof v.exp !== "number" || !Number.isFinite(v.exp)) return false;
  if (typeof v.events !== "boolean") return false;
  if (typeof v.range !== "object" || v.range === null) return false;
  const r = v.range as Record<string, unknown>;
  if (r.from !== undefined && typeof r.from !== "string") return false;
  if (r.to !== undefined && typeof r.to !== "string") return false;
  return true;
}

/**
 * Verify a token. Returns a discriminated result rather than throwing, because
 * an expired or forged link is expected external input, not a program fault:
 * the route renders a clean "link expired / invalid" state for anything but
 * `valid`. Signature comparison is constant-time.
 */
export function verifySnapshot(
  token: string,
  opts: { now?: number; secret?: string } = {},
): VerifyResult {
  const secret = opts.secret ?? getSnapshotSecret();
  const now = opts.now ?? Date.now();

  if (typeof token !== "string") return { status: "invalid" };
  const parts = token.split(".");
  if (parts.length !== 2) return { status: "invalid" };
  const [body, sig] = parts;
  if (!body || !sig) return { status: "invalid" };

  const expected = base64urlEncode(hmac(body, secret));
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expected);
  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
    return { status: "invalid" };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return { status: "invalid" };
  }
  if (!isSnapshotPayload(parsed)) return { status: "invalid" };

  if (now > parsed.exp) return { status: "expired" };
  return { status: "valid", payload: parsed };
}
