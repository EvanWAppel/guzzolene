import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import RecentFills from "@/components/RecentFills";
import type { GasPurchase } from "@/lib/db/schema";

function makePurchase(overrides: Partial<GasPurchase> = {}): GasPurchase {
  return {
    id: "p1",
    userId: "u_123",
    date: "2026-05-25",
    cost: "45.00",
    gallons: "12.500",
    odometer: 82000,
    pricePerGallon: "3.600",
    pumpPhotoUrl: null,
    fuelGrade: "87",
    createdAt: new Date(),
    ...overrides,
  };
}

describe("RecentFills", () => {
  it("renders the fuel grade for each fill-up", () => {
    const fills = [
      makePurchase({ id: "a", fuelGrade: "91" }),
      makePurchase({ id: "b", fuelGrade: "diesel" }),
    ];
    render(<RecentFills purchases={fills} />);
    expect(screen.getByText("91")).toBeInTheDocument();
    expect(screen.getByText("diesel")).toBeInTheDocument();
  });

  it("renders nothing visible when given an empty list", () => {
    const { container } = render(<RecentFills purchases={[]} />);
    expect(container.textContent ?? "").not.toMatch(/\d{2}/);
  });
});
