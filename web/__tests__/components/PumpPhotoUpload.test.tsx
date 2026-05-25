import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/actions/purchases", () => ({
  createPurchase: vi.fn(async () => undefined),
}));

import PumpPhotoUpload from "@/components/PumpPhotoUpload";

describe("PumpPhotoUpload fuel-grade dropdown", () => {
  it("renders a fuelGrade select with the expected options and defaults to 87", () => {
    render(<PumpPhotoUpload />);

    const select = screen.getByLabelText(/fuel grade/i) as HTMLSelectElement;
    expect(select).toBeInTheDocument();
    expect(select.tagName).toBe("SELECT");
    expect(select.name).toBe("fuelGrade");
    expect(select.value).toBe("87");

    const optionValues = Array.from(select.options).map((o) => o.value);
    expect(optionValues).toEqual(["87", "89", "91", "93", "diesel"]);
  });
});
