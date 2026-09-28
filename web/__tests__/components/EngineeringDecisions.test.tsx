import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import EngineeringDecisions from "@/components/EngineeringDecisions";
import type { Decision } from "@/lib/decisions";

const SAMPLE: Decision[] = [
  {
    id: "D-5",
    title: "Privacy by construction: strip location at the query",
    chose: "Omit lat/lng in the public query projection.",
    rejected: "Hiding coordinates only in the UI.",
    why: "Location can never be transmitted to an unauthenticated visitor.",
  },
  {
    id: "D-6",
    title: "Demo sandbox in sessionStorage, not the server",
    chose: "A client-side sessionStorage overlay merged before render.",
    rejected: "A server-side Postgres/Redis sandbox with per-session rows.",
    why: "Real data is never mutated — there is no server write path at all.",
  },
  {
    id: "D-1",
    title: "Reintroduce photo entry, but extract-and-discard",
    chose: "Send the photo to the model, then never persist the image.",
    rejected: "Storing the image in Vercel Blob with a pump_photo_url column.",
    why: "Closes the AI gap while staying privacy-friendly.",
  },
];

describe("EngineeringDecisions", () => {
  it("renders inside a labeled landmark region", () => {
    render(<EngineeringDecisions decisions={SAMPLE} />);
    expect(
      screen.getByRole("region", { name: /decision|trade-?off|engineering/i }),
    ).toBeInTheDocument();
  });

  it("renders each decision title as a heading", () => {
    render(<EngineeringDecisions decisions={SAMPLE} />);
    expect(
      screen.getByRole("heading", { name: /strip location at the query/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /demo sandbox in sessionstorage/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /extract-and-discard/i }),
    ).toBeInTheDocument();
  });

  it("shows the chose / rejected / why of each real trade-off", () => {
    render(<EngineeringDecisions decisions={SAMPLE} />);
    // location stripping
    expect(screen.getByText(/query projection/i)).toBeInTheDocument();
    expect(screen.getByText(/only in the UI/i)).toBeInTheDocument();
    // sessionStorage demo sandbox
    expect(screen.getByText(/client-side sessionstorage overlay/i)).toBeInTheDocument();
    expect(screen.getByText(/no server write path/i)).toBeInTheDocument();
    // extract-and-discard photo entry
    expect(screen.getByText(/never persist the image/i)).toBeInTheDocument();
    expect(screen.getByText(/pump_photo_url/i)).toBeInTheDocument();
  });

  it("labels the Chose / Rejected / Why parts of each decision", () => {
    render(<EngineeringDecisions decisions={SAMPLE} />);
    // there is one labelled part per decision
    expect(screen.getAllByText(/^chose$/i)).toHaveLength(SAMPLE.length);
    expect(screen.getAllByText(/^rejected$/i)).toHaveLength(SAMPLE.length);
    expect(screen.getAllByText(/^why$/i)).toHaveLength(SAMPLE.length);
  });

  it("renders each decision as its own article", () => {
    render(<EngineeringDecisions decisions={SAMPLE} />);
    const articles = screen.getAllByRole("article");
    expect(articles).toHaveLength(SAMPLE.length);
    expect(
      within(articles[0]).getByRole("heading", { name: /strip location/i }),
    ).toBeInTheDocument();
  });
});
