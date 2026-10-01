import { ImageResponse } from "next/og";

/**
 * Generated OpenGraph / social-preview card for the showcase (PRD §5.8.3).
 *
 * Rendered at build time (statically optimized) — no external asset to keep in
 * sync and no runtime cost. Exact art direction is a first pass; see the Stream K
 * hand-off note. 1200x630 is the standard large-image card size.
 */
export const alt =
  "Guzzolene — a personal fuel journal. Real fuel economy and price trends in context.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BG = "#0f0f10";
const INK = "#f5f2ec";
const MUTED = "#a9a29a";
const BRAND = "#ee4d84";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: BG,
          color: INK,
          padding: 80,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16, color: MUTED, fontSize: 26, letterSpacing: 4 }}>
          <div style={{ width: 14, height: 14, borderRadius: 999, background: BRAND }} />
          A PERSONAL FUEL JOURNAL
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ fontSize: 132, fontWeight: 800, letterSpacing: -3, lineHeight: 1 }}>
            Guzzolene<span style={{ color: BRAND }}>.</span>
          </div>
          <div style={{ fontSize: 40, color: MUTED, maxWidth: 900, lineHeight: 1.25 }}>
            One car. A world of moving parts. Fuel economy and price trends, in the context of the events behind them.
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, color: MUTED, fontSize: 26 }}>
          <span>Next.js 16</span>
          <span style={{ color: BRAND }}>·</span>
          <span>React Server Components</span>
          <span style={{ color: BRAND }}>·</span>
          <span>Sign-in-free live demo</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
