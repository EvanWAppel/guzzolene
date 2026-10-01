/**
 * Parser for the project's append-only `DECISIONS.md` ledger (repo root).
 *
 * The public `/engineering` page renders real trade-offs straight from that
 * file so the write-up can never drift from the recorded decisions. This module
 * is pure (no fs, no React) so it is trivially unit-testable; the page does the
 * one file read and hands the markdown here.
 */

export type Decision = {
  id: string;
  title: string;
  chose: string;
  rejected: string;
  why: string;
};

/**
 * The trade-offs surfaced on `/engineering`, in display order (PRD §5.8.1):
 * privacy-by-construction location stripping, the sessionStorage demo sandbox,
 * and extract-and-discard photo entry. Each id must exist in `DECISIONS.md`.
 */
export const FEATURED_DECISION_IDS = ["D-5", "D-6", "D-1"] as const;

const HEADING_RE = /^###\s+([A-Za-z0-9-]+)\s+—\s+(.+?)\s*$/;
const FIELD_RE = /^-\s+\*\*(Chose|Rejected|Why):\*\*\s*(.*)$/;

/** Extract every `### <id> — <title>` decision block with its Chose/Rejected/Why. */
export function parseDecisions(markdown: string): Decision[] {
  const decisions: Decision[] = [];
  let current: Decision | null = null;

  for (const line of markdown.split("\n")) {
    const heading = HEADING_RE.exec(line);
    if (heading) {
      current = {
        id: heading[1],
        title: heading[2],
        chose: "",
        rejected: "",
        why: "",
      };
      decisions.push(current);
      continue;
    }

    if (!current) continue;

    // A new (non-decision) section closes the current block.
    if (line.startsWith("## ") || line.startsWith("# ")) {
      current = null;
      continue;
    }

    const field = FIELD_RE.exec(line);
    if (field) {
      const value = field[2].trim();
      if (field[1] === "Chose") current.chose = value;
      else if (field[1] === "Rejected") current.rejected = value;
      else current.why = value;
    }
  }

  return decisions;
}

/**
 * Pick the featured decisions in display order. Throws if any featured id is
 * absent from the ledger — we surface the drift loudly rather than silently
 * render a shorter page (per `claude.md`: do not hide errors).
 */
export function selectFeatured(
  decisions: Decision[],
  ids: readonly string[] = FEATURED_DECISION_IDS,
): Decision[] {
  const byId = new Map(decisions.map((d) => [d.id, d]));
  return ids.map((id) => {
    const decision = byId.get(id);
    if (!decision) {
      throw new Error(
        `DECISIONS.md is missing featured decision "${id}" required by /engineering`,
      );
    }
    return decision;
  });
}
