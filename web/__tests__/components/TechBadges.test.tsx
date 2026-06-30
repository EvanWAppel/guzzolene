import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import TechBadges from "@/components/TechBadges";

describe("TechBadges", () => {
  it("renders a 'Built with' section", () => {
    render(<TechBadges />);
    expect(screen.getByText(/built with/i)).toBeInTheDocument();
  });

  it("lists the live stack", () => {
    render(<TechBadges />);
    for (const tech of [
      /next\.js/i,
      /server components/i,
      /clerk/i,
      /neon/i,
      /drizzle/i,
      /pwa/i,
      /vercel/i,
    ]) {
      expect(screen.getByText(tech)).toBeInTheDocument();
    }
  });
});
