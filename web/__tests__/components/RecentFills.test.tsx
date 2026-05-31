import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { GasPurchase } from "@/lib/db/schema";

const updateMock = vi.fn<(id: string, patch: Record<string, unknown>) => Promise<void>>(async () => undefined);
const deleteMock = vi.fn<(id: string) => Promise<void>>(async () => undefined);

vi.mock("@/actions/purchases", () => ({
  updatePurchase: (id: string, patch: Record<string, unknown>) => updateMock(id, patch),
  deletePurchase: (id: string) => deleteMock(id),
}));

import RecentFills from "@/components/RecentFills";

beforeEach(() => {
  updateMock.mockClear();
  deleteMock.mockClear();
});

function makePurchase(overrides: Partial<GasPurchase> = {}): GasPurchase {
  return {
    id: "p1",
    userId: "u_123",
    date: "2026-05-25",
    cost: "45.00",
    gallons: "12.500",
    odometer: 82000,
    pricePerGallon: "3.600",
    fuelGrade: "87",
    lat: null,
    lng: null,
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

describe("RecentFills edit/delete", () => {
  it("renders an Edit and Delete button on each row", () => {
    render(<RecentFills purchases={[makePurchase()]} />);
    expect(screen.getByRole("button", { name: /edit/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /delete/i })).toBeInTheDocument();
  });

  it("Edit puts the row into edit mode with values prefilled", () => {
    render(<RecentFills purchases={[makePurchase({ cost: "45.00", odometer: 82000 })]} />);
    fireEvent.click(screen.getByRole("button", { name: /edit/i }));

    const dateInput = screen.getByLabelText(/date/i) as HTMLInputElement;
    const costInput = screen.getByLabelText(/cost/i) as HTMLInputElement;
    const odoInput = screen.getByLabelText(/odometer/i) as HTMLInputElement;

    expect(dateInput.value).toBe("2026-05-25");
    expect(costInput.value).toBe("45.00");
    expect(odoInput.value).toBe("82000");
  });

  it("Save calls updatePurchase with the patch", async () => {
    render(<RecentFills purchases={[makePurchase()]} />);
    fireEvent.click(screen.getByRole("button", { name: /edit/i }));
    fireEvent.change(screen.getByLabelText(/cost/i), { target: { value: "50.00" } });
    fireEvent.change(screen.getByLabelText(/odometer/i), { target: { value: "82500" } });
    fireEvent.click(screen.getByRole("button", { name: /^save$/i }));

    await waitFor(() => expect(updateMock).toHaveBeenCalled());
    const [id, patch] = updateMock.mock.calls[0];
    expect(id).toBe("p1");
    expect(patch.cost).toBe("50.00");
    expect(patch.odometer).toBe(82500);
  });

  it("Delete confirms before calling deletePurchase", () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<RecentFills purchases={[makePurchase()]} />);
    fireEvent.click(screen.getByRole("button", { name: /delete/i }));
    expect(confirmSpy).toHaveBeenCalled();
    expect(deleteMock).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it("Delete proceeds when user confirms", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<RecentFills purchases={[makePurchase()]} />);
    fireEvent.click(screen.getByRole("button", { name: /delete/i }));
    await waitFor(() => expect(deleteMock).toHaveBeenCalledWith("p1"));
    confirmSpy.mockRestore();
  });
});
