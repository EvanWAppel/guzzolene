import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { PublicPurchase } from "@/lib/public-data";
import { STORAGE_KEY } from "@/lib/demo-overlay";

// Charts pull in Recharts (needs ResizeObserver) — not under test here.
vi.mock("@/components/charts/OverviewGrid", () => ({ default: () => null }));

// Spy the real server actions to prove the demo NEVER calls them.
const createPurchase = vi.fn();
const updatePurchase = vi.fn();
const deletePurchase = vi.fn();
vi.mock("@/actions/purchases", () => ({
  createPurchase: (...a: unknown[]) => createPurchase(...a),
  updatePurchase: (...a: unknown[]) => updatePurchase(...a),
  deletePurchase: (...a: unknown[]) => deletePurchase(...a),
}));

import DemoDashboard from "@/components/DemoDashboard";

function baseRow(overrides: Partial<PublicPurchase> = {}): PublicPurchase {
  return {
    id: "base-1",
    userId: null,
    date: "2024-03-03",
    cost: "40.00",
    gallons: "10.000",
    odometer: 50000,
    pricePerGallon: "4.000",
    fuelGrade: "87",
    createdAt: new Date("2024-03-03T00:00:00Z"),
    ...overrides,
  };
}

beforeEach(() => {
  sessionStorage.clear();
  vi.clearAllMocks();
  // Grant geolocation so we can prove it's discarded in demo (G-23).
  Object.defineProperty(navigator, "geolocation", {
    configurable: true,
    value: {
      getCurrentPosition: (ok: PositionCallback) =>
        ok({ coords: { latitude: 36.1, longitude: -115.1 } } as GeolocationPosition),
    },
  });
});

describe("DemoDashboard", () => {
  it("shows a persistent read-only demo banner (G-22)", () => {
    render(<DemoDashboard base={[baseRow()]} events={[]} />);
    expect(screen.getByText(/read-only demo/i)).toBeInTheDocument();
  });

  it("renders the real (location-stripped) base data (G-15)", () => {
    render(<DemoDashboard base={[baseRow({ date: "2024-03-03" })]} events={[]} />);
    expect(screen.getAllByText("2024-03-03").length).toBeGreaterThan(0);
  });

  it("adding a fill-up writes to the sandbox, not the server, and discards location (G-17/G-18/G-23)", async () => {
    render(<DemoDashboard base={[baseRow()]} events={[]} />);

    fireEvent.change(screen.getByLabelText(/^date$/i), {
      target: { value: "2026-06-15" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save fill-up/i }));

    // The new row shows up in the demo view (summary + list)...
    await waitFor(() =>
      expect(screen.getAllByText("2026-06-15").length).toBeGreaterThan(0),
    );
    // ...the real server action was never called...
    expect(createPurchase).not.toHaveBeenCalled();
    // ...and the persisted overlay row carries no location (G-23).
    const overlay = JSON.parse(sessionStorage.getItem(STORAGE_KEY)!);
    expect(overlay.added).toHaveLength(1);
    expect(overlay.added[0]).not.toHaveProperty("lat");
    expect(overlay.added[0]).not.toHaveProperty("lng");
  });

  it("deleting a base row tombstones it in the sandbox, leaving real data intact (G-19)", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<DemoDashboard base={[baseRow({ id: "base-1", date: "2024-03-03" })]} events={[]} />);

    fireEvent.click(screen.getByRole("button", { name: /delete/i }));

    await waitFor(() =>
      expect(screen.queryByText("2024-03-03")).not.toBeInTheDocument(),
    );
    expect(deletePurchase).not.toHaveBeenCalled();
    const overlay = JSON.parse(sessionStorage.getItem(STORAGE_KEY)!);
    expect(overlay.deleted).toContain("base-1");
    confirmSpy.mockRestore();
  });
});
