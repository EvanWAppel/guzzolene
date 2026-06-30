import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import SiteFooter from "@/components/SiteFooter";

describe("SiteFooter", () => {
  it("shows the author name", () => {
    render(<SiteFooter />);
    expect(screen.getByText(/evan appel/i)).toBeInTheDocument();
  });

  it("links to GitHub repo, GitHub profile, LinkedIn, resume, and email", () => {
    render(<SiteFooter />);
    const href = (name: RegExp) =>
      screen.getByRole("link", { name }).getAttribute("href");

    expect(href(/repo|source/i)).toBe("https://github.com/EvanWAppel/guzzolene");
    expect(href(/github profile|@evanwappel/i)).toBe(
      "https://github.com/EvanWAppel",
    );
    expect(href(/linkedin/i)).toBe(
      "https://www.linkedin.com/in/evan-appel-8885569b/",
    );
    expect(href(/resume/i)).toBe("/resume.pdf");
    expect(href(/email|appelew/i)).toBe("mailto:appelew@gmail.com");
  });

  it("has a 'Try the live demo' CTA pointing at /demo", () => {
    render(<SiteFooter />);
    expect(
      screen.getByRole("link", { name: /try the live demo/i }),
    ).toHaveAttribute("href", "/demo");
  });
});
