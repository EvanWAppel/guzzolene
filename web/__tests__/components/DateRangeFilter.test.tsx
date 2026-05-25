import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const push = vi.fn();
const searchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  usePathname: () => "/",
  useSearchParams: () => searchParams,
}));

import DateRangeFilter from "@/components/DateRangeFilter";

describe("DateRangeFilter", () => {
  it("renders four preset chips and two date inputs", () => {
    render(<DateRangeFilter />);
    expect(screen.getByRole("button", { name: /30d/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /90d/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /1y/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /all/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/from/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/to/i)).toBeInTheDocument();
  });

  it("clicking a preset chip pushes URL with from/to query params", () => {
    push.mockClear();
    render(<DateRangeFilter />);
    fireEvent.click(screen.getByRole("button", { name: /30d/i }));
    expect(push).toHaveBeenCalledOnce();
    const url = push.mock.calls[0][0] as string;
    expect(url).toMatch(/from=\d{4}-\d{2}-\d{2}/);
    expect(url).toMatch(/to=\d{4}-\d{2}-\d{2}/);
  });

  it("clicking All clears query params", () => {
    push.mockClear();
    render(<DateRangeFilter />);
    fireEvent.click(screen.getByRole("button", { name: /^all/i }));
    expect(push).toHaveBeenCalledOnce();
    const url = push.mock.calls[0][0] as string;
    expect(url).not.toMatch(/from=/);
    expect(url).not.toMatch(/to=/);
  });
});
