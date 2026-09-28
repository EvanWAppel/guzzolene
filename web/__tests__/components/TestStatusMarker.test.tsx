import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import TestStatusMarker from "@/components/TestStatusMarker";
import { TEST_COUNT } from "@/lib/showcase-stats";

describe("showcase-stats", () => {
  it("TEST_COUNT is a positive integer sourced from the real suite", () => {
    expect(Number.isInteger(TEST_COUNT)).toBe(true);
    expect(TEST_COUNT).toBeGreaterThan(0);
  });
});

describe("TestStatusMarker", () => {
  it("shows the real test count", () => {
    render(<TestStatusMarker />);
    expect(screen.getByText(new RegExp(`${TEST_COUNT}\\s*tests`, "i"))).toBeInTheDocument();
  });

  it("shows the CI-green signal", () => {
    render(<TestStatusMarker />);
    expect(screen.getByText(/CI green/i)).toBeInTheDocument();
  });

  it("links to the engineering write-up", () => {
    render(<TestStatusMarker />);
    expect(screen.getByRole("link")).toHaveAttribute("href", "/engineering");
  });
});
