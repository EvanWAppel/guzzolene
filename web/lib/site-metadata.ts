import type { Metadata } from "next";

/**
 * Shared site metadata (PRD §5.8.3 — shareability hygiene).
 *
 * Kept in a plain module (no next/font, no ClerkProvider) so it is importable
 * from both the root layout and unit tests. The OpenGraph/Twitter *image* is
 * provided by the `app/opengraph-image.tsx` + `app/twitter-image.tsx` file
 * conventions (Next injects the image tags automatically); this object supplies
 * the title, description, and card metadata around it, plus the `metadataBase`
 * the framework needs to make the generated image URL absolute.
 */
export const SITE_URL = "https://guzzo-lene.com";

const TITLE = "Guzzolene — A Personal Fuel Journal";
const DESCRIPTION =
  "One car. A world of moving parts. Explore real fuel economy and price trends with the world events behind them — a Next.js 16 portfolio build with a sign-in-free live demo.";

export const siteMetadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    siteName: "Guzzolene",
    url: SITE_URL,
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};
