import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { PublicPurchase } from "@/lib/public-data";

/**
 * Stream J (J-2 / J-4): the read-only snapshot surface `/s/[token]`.
 *
 * A valid token renders the exact filtered public view (location-stripped);
 * an expired or forged token renders a clean "link expired/invalid" state and
 * NEVER reads or leaks data. Privacy regression mirrors
 * `privacy-no-location.test.ts`: no `lat`/`lng` may appear in the response.
 */

const SECRET = "test-snapshot-secret";

// Real owner rows carry lat/lng; the public read strips them. We assert the
// snapshot response contains neither, so seed rows WITH location to prove the
// route only ever touches the stripped projection.
const listPublicPurchases = vi.fn();
vi.mock("@/lib/public-data", () => ({
  listPublicPurchases: () => listPublicPurchases(),
}));

const listOwnerEvents = vi.fn();
vi.mock("@/actions/events", () => ({
  listOwnerEvents: () => listOwnerEvents(),
}));

vi.mock("@/lib/oil-prices", () => ({
  getMonthlyOilPrices: vi.fn(async () => []),
}));

// Charts need Recharts/ResizeObserver — not under test. Stub them to expose the
// data + events they receive so we can assert the view was reconstructed right,
// and serialize that exact payload so the privacy net can inspect what would be
// transmitted to the client charts.
function chartStub(id: string) {
  return {
    default: ({ data, events }: { data?: unknown[]; events?: unknown[] }) => (
      <div
        data-testid={id}
        data-points={data?.length ?? 0}
        data-events={events?.length ?? 0}
        data-payload={JSON.stringify({ data: data ?? [], events: events ?? [] })}
      />
    ),
  };
}
vi.mock("@/components/charts/PricePerGallonChart", () => chartStub("ppg"));
vi.mock("@/components/charts/OverviewGrid", () => chartStub("overview"));
vi.mock("@/components/charts/CostPerMileChart", () => chartStub("cpm"));
vi.mock("@/components/charts/MpgChart", () => chartStub("mpg"));
vi.mock("@/components/charts/GpmChart", () => chartStub("gpm"));

import SnapshotPage from "@/app/s/[token]/page";
import { createSnapshotToken } from "@/lib/snapshot-token";

function baseRow(overrides: Partial<PublicPurchase> = {}): PublicPurchase {
  return {
    id: "base-1",
    userId: null,
    date: "2024-01-15",
    cost: "40.00",
    gallons: "10.000",
    odometer: 50000,
    pricePerGallon: "4.000",
    fuelGrade: "87",
    createdAt: new Date("2024-01-15T00:00:00Z"),
    ...overrides,
  };
}

async function renderSnapshot(token: string) {
  const ui = await SnapshotPage({ params: Promise.resolve({ token }) });
  return render(ui);
}

beforeEach(() => {
  process.env.SNAPSHOT_SIGNING_SECRET = SECRET;
  vi.clearAllMocks();
  listPublicPurchases.mockResolvedValue([
    baseRow({ id: "r1", date: "2024-01-15" }),
    baseRow({ id: "r2", date: "2024-02-15", odometer: 50300 }),
    baseRow({ id: "r3", date: "2024-03-15", odometer: 50600 }),
  ]);
  listOwnerEvents.mockResolvedValue([
    { id: "e1", userId: null, date: "2024-02-01", name: "Test event", description: null, wikipediaUrl: null },
  ]);
});

afterEach(() => {
  delete process.env.SNAPSHOT_SIGNING_SECRET;
});

describe("snapshot page — valid token (J-2)", () => {
  it("renders the filtered charts and shows event overlays when events=true", async () => {
    const token = createSnapshotToken({ range: {}, events: true }, { secret: SECRET });
    await renderSnapshot(token);

    expect(screen.getByTestId("ppg")).toBeInTheDocument();
    // Events were passed through to the charts.
    expect(screen.getByTestId("ppg").getAttribute("data-events")).toBe("1");
    expect(screen.queryByText(/expired|invalid/i)).not.toBeInTheDocument();
  });

  it("omits event overlays when events=false", async () => {
    const token = createSnapshotToken({ range: {}, events: false }, { secret: SECRET });
    await renderSnapshot(token);
    expect(screen.getByTestId("ppg").getAttribute("data-events")).toBe("0");
  });

  it("applies the encoded date range to the data", async () => {
    // Range excludes March; only Jan+Feb months remain.
    const token = createSnapshotToken(
      { range: { from: "2024-01-01", to: "2024-02-29" }, events: true },
      { secret: SECRET },
    );
    await renderSnapshot(token);
    const points = Number(screen.getByTestId("ppg").getAttribute("data-points"));
    expect(points).toBe(2);
  });
});

describe("snapshot page — expired / invalid token (J-2)", () => {
  it("shows a clean expired state and reads NO data for an expired token", async () => {
    const minted = Date.UTC(2026, 0, 1);
    const expiredToken = createSnapshotToken({ range: {}, events: true }, { secret: SECRET, now: minted, ttlMs: 1 });
    // Route uses Date.now() (well past `minted`), so the token is expired.
    await renderSnapshot(expiredToken);

    expect(screen.getAllByText(/expired/i).length).toBeGreaterThan(0);
    expect(screen.queryByTestId("ppg")).not.toBeInTheDocument();
    expect(listPublicPurchases).not.toHaveBeenCalled();
  });

  it("shows a clean invalid state for a forged token", async () => {
    await renderSnapshot("garbage.token");
    expect(screen.getAllByText(/invalid/i).length).toBeGreaterThan(0);
    expect(screen.queryByTestId("ppg")).not.toBeInTheDocument();
    expect(listPublicPurchases).not.toHaveBeenCalled();
  });
});

describe("snapshot page — privacy invariant (J-4, PRD §5.4.2)", () => {
  it("emits no lat/lng in the data transmitted to any chart", async () => {
    const token = createSnapshotToken({ range: {}, events: true }, { secret: SECRET });
    await renderSnapshot(token);

    const payloads = Array.from(document.querySelectorAll("[data-payload]")).map(
      (el) => el.getAttribute("data-payload") ?? "",
    );
    expect(payloads.length).toBeGreaterThan(0);
    for (const p of payloads) {
      expect(p).not.toMatch(/"lat"/);
      expect(p).not.toMatch(/"lng"/);
    }
  });
});
