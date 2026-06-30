import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import CaseStudy from "@/components/CaseStudy";

describe("CaseStudy", () => {
  it("renders a labeled section landmark", () => {
    render(<CaseStudy />);
    expect(
      screen.getByRole("region", { name: /how it.?s built|case study|behind/i }),
    ).toBeInTheDocument();
  });

  it("explains key decisions (PWA, OCR removal, offline)", () => {
    render(<CaseStudy />);
    expect(screen.getByText(/offline/i)).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /PWA, not a native app/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/OCR/i)).toBeInTheDocument();
  });

  it("links prominently to the source repo (G-10)", () => {
    render(<CaseStudy />);
    const repo = screen.getByRole("link", { name: /source|github|code/i });
    expect(repo).toHaveAttribute(
      "href",
      "https://github.com/EvanWAppel/guzzolene",
    );
  });
});
