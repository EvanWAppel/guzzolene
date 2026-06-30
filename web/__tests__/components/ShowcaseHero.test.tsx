import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ShowcaseHero from "@/components/ShowcaseHero";

describe("ShowcaseHero", () => {
  it("renders the product name", () => {
    render(<ShowcaseHero totalFills={372} since="2018-12-01" />);
    expect(
      screen.getByRole("heading", { level: 1, name: /guzzolene/i }),
    ).toBeInTheDocument();
  });

  it("renders a tagline describing the product", () => {
    render(<ShowcaseHero totalFills={372} since="2018-12-01" />);
    // Product-first framing: the tagline is about the product, not the author.
    expect(screen.getByText(/fuel economy/i)).toBeInTheDocument();
  });

  it("surfaces the real-data stat (count + start year)", () => {
    render(<ShowcaseHero totalFills={372} since="2018-12-01" />);
    expect(screen.getByText(/372/)).toBeInTheDocument();
    expect(screen.getByText(/2018/)).toBeInTheDocument();
  });

  it("degrades gracefully with no data", () => {
    render(<ShowcaseHero totalFills={0} since={null} />);
    expect(
      screen.getByRole("heading", { level: 1, name: /guzzolene/i }),
    ).toBeInTheDocument();
  });
});
