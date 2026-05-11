export interface WikiSearchResult {
  pageid: number;
  title: string;
  snippet: string;
}

export async function searchWikipedia(query: string): Promise<WikiSearchResult[]> {
  const params = new URLSearchParams({
    action: "query",
    list: "search",
    srsearch: query,
    srlimit: "8",
    format: "json",
    origin: "*",
  });

  const res = await fetch(`https://en.wikipedia.org/w/api.php?${params}`);
  if (!res.ok) throw new Error("Wikipedia search failed");

  const data = await res.json();
  return data.query.search as WikiSearchResult[];
}
