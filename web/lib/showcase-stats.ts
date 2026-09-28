/**
 * Real, human-checked showcase facts surfaced on `/` (PRD §5.8.2).
 *
 * `TEST_COUNT` is the total reported by `npm test` (vitest) on the main line.
 * It is a snapshot, not a live probe — bump it when the suite total changes so
 * the "N tests · CI green" marker never overstates. CI status is carried by the
 * GitHub Actions badge in the READMEs; the on-page marker mirrors it.
 */
export const TEST_COUNT = 157;
