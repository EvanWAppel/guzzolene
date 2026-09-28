import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site-metadata";

/**
 * `robots.txt` (PRD §5.8.3, closes the G-26 "no robots.txt" gap).
 *
 * The public showcase (`/`, `/demo`, `/engineering`) is open to crawlers; the
 * authenticated app surfaces are kept out of the index — there is nothing there
 * for a search engine and they redirect to sign-in anyway.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard", "/admin", "/pending", "/sign-in", "/sign-up", "/api"],
    },
    host: SITE_URL,
  };
}
