import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  parseDecisions,
  selectFeatured,
  FEATURED_DECISION_IDS,
} from "@/lib/decisions";

const FIXTURE = `# Decisions — Guzzolene

Some intro prose.

---

## 2026-01-01 — A round

### D-1 — Reintroduce photo-assisted entry, but extract-and-discard
- **Chose:** Re-add photo → field extraction, image never persisted.
- **Rejected:** The original design that stored the image in Blob.
- **Why:** Closes the AI gap while staying privacy-friendly.

### D-5 — Privacy by construction: strip location at the query
- **Chose:** Omit lat/lng in the public query projection.
- **Rejected:** Hiding coordinates only in the UI.
- **Why:** Location can never be transmitted to an unauthenticated visitor.
`;

describe("parseDecisions", () => {
  it("extracts id, title, chose, rejected, why for each entry", () => {
    const decisions = parseDecisions(FIXTURE);
    expect(decisions).toHaveLength(2);

    const d1 = decisions.find((d) => d.id === "D-1")!;
    expect(d1.title).toMatch(/extract-and-discard/i);
    expect(d1.chose).toMatch(/never persisted/i);
    expect(d1.rejected).toMatch(/blob/i);
    expect(d1.why).toMatch(/privacy/i);

    const d5 = decisions.find((d) => d.id === "D-5")!;
    expect(d5.title).toMatch(/strip location/i);
    expect(d5.chose).toMatch(/projection/i);
  });

  it("ignores prose and section headers, returns entries in file order", () => {
    const decisions = parseDecisions(FIXTURE);
    expect(decisions.map((d) => d.id)).toEqual(["D-1", "D-5"]);
  });

  it("returns an empty array when there are no decision entries", () => {
    expect(parseDecisions("# Nothing here\n\njust prose")).toEqual([]);
  });
});

describe("selectFeatured", () => {
  it("returns the featured decisions in FEATURED order", () => {
    const decisions = [
      { id: "D-1", title: "t1", chose: "c", rejected: "r", why: "w" },
      { id: "D-5", title: "t5", chose: "c", rejected: "r", why: "w" },
      { id: "D-6", title: "t6", chose: "c", rejected: "r", why: "w" },
      { id: "D-9", title: "extra", chose: "c", rejected: "r", why: "w" },
    ];
    const picked = selectFeatured(decisions, ["D-5", "D-6", "D-1"]);
    expect(picked.map((d) => d.id)).toEqual(["D-5", "D-6", "D-1"]);
  });

  it("throws (does not silently drop) when a featured id is missing", () => {
    expect(() => selectFeatured([], ["D-5"])).toThrow(/D-5/);
  });
});

describe("the real DECISIONS.md", () => {
  const md = readFileSync(join(process.cwd(), "..", "DECISIONS.md"), "utf8");

  it("parses into decision entries", () => {
    expect(parseDecisions(md).length).toBeGreaterThanOrEqual(3);
  });

  it("contains every featured decision the /engineering page renders", () => {
    const featured = selectFeatured(parseDecisions(md));
    expect(featured).toHaveLength(FEATURED_DECISION_IDS.length);
    for (const d of featured) {
      expect(d.title.length).toBeGreaterThan(0);
      expect(d.chose.length).toBeGreaterThan(0);
      expect(d.why.length).toBeGreaterThan(0);
    }
  });

  it("features the three PRD §5.8.1 trade-offs (location, demo sandbox, photo)", () => {
    const featured = selectFeatured(parseDecisions(md));
    const blob = featured
      .map((d) => `${d.title} ${d.chose} ${d.rejected} ${d.why}`)
      .join(" ")
      .toLowerCase();
    expect(blob).toMatch(/location|lat|lng/);
    expect(blob).toMatch(/sessionstorage|sandbox/);
    expect(blob).toMatch(/photo|discard/);
  });
});
