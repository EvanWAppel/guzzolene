import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ArchitectureDiagram from "@/components/ArchitectureDiagram";

describe("ArchitectureDiagram", () => {
  it("renders a figure with an accessible name", () => {
    render(<ArchitectureDiagram />);
    const fig = screen.getByRole("figure", { name: /architecture/i });
    expect(fig).toBeInTheDocument();
  });

  it("labels the key pieces of the system", () => {
    render(<ArchitectureDiagram />);
    for (const node of [/clerk/i, /neon/i, /pwa/i, /vercel/i]) {
      expect(screen.getByText(node)).toBeInTheDocument();
    }
  });
});
