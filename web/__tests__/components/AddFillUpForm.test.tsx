import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/actions/purchases", () => ({
  createPurchase: vi.fn(async () => undefined),
}));

import AddFillUpForm from "@/components/AddFillUpForm";

describe("AddFillUpForm fuel-grade dropdown", () => {
  it("renders a fuelGrade select with the expected options and defaults to 87", () => {
    render(<AddFillUpForm />);

    const select = screen.getByLabelText(/fuel grade/i) as HTMLSelectElement;
    expect(select).toBeInTheDocument();
    expect(select.tagName).toBe("SELECT");
    expect(select.name).toBe("fuelGrade");
    expect(select.value).toBe("87");

    const optionValues = Array.from(select.options).map((o) => o.value);
    expect(optionValues).toEqual(["87", "89", "91", "93", "diesel"]);
  });

  it("does not render any photo upload UI", () => {
    render(<AddFillUpForm />);
    expect(screen.queryByText(/drop pump photo/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/extracting data with claude/i)).not.toBeInTheDocument();
  });
});
