export interface OilPricePoint {
  date: string; // "YYYY-MM-01"
  price: number;
}

/**
 * Fetches monthly WTI crude oil prices from Yahoo Finance.
 * Uses the same data source as oil_prices.csv in the Python project.
 */
export async function getMonthlyOilPrices(
  startDate: string,
  endDate: string
): Promise<OilPricePoint[]> {
  const start = Math.floor(new Date(startDate).getTime() / 1000);
  const end = Math.floor(new Date(endDate).getTime() / 1000);

  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/CL=F` +
    `?interval=1mo&period1=${start}&period2=${end}`;

  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
    next: { revalidate: 3600 },
  });

  if (!res.ok) return [];

  const data = await res.json();
  const chart = data.chart?.result?.[0];
  if (!chart) return [];

  const timestamps: number[] = chart.timestamp ?? [];
  const closes: number[] = chart.indicators?.quote?.[0]?.close ?? [];

  return timestamps
    .map((ts, i) => ({
      date: new Date(ts * 1000).toISOString().slice(0, 7) + "-01",
      price: closes[i],
    }))
    .filter((p) => p.price != null && !isNaN(p.price));
}
