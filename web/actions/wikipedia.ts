"use server";

import type { WikiSearchResult } from "@/lib/wikipedia";

/* Runs the Wikipedia search on the server. Doing this server-side (rather than
 * a browser fetch to en.wikipedia.org) avoids cross-origin / content-blocker
 * failures seen in installed iOS PWAs, and lets us send a descriptive
 * User-Agent as the Wikipedia API etiquette requests. */
export async function searchWikipedia(query: string): Promise<WikiSearchResult[]> {
  const params = new URLSearchParams({
    action: "query",
    list: "search",
    srsearch: query,
    srlimit: "8",
    format: "json",
  });

  const res = await fetch(`https://en.wikipedia.org/w/api.php?${params}`, {
    headers: { "User-Agent": "guzzolene/1.0 (https://guzzo-lene.com)" },
  });
  if (!res.ok) throw new Error(`Wikipedia search failed: ${res.status}`);

  const data = await res.json();
  return data.query.search as WikiSearchResult[];
}
