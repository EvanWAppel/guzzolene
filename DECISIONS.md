# Decisions — Guzzolene

Append-only log of decisions with a real trade-off (chose X, rejected Y, why).
The agent drafts each entry; Evan confirms it. Newest at the bottom.

---

## 2026-09-27 — Feature round: photo entry, anomaly detection, snapshots, showcase depth

Seeded from the requirements interview for the four new workstreams (PRD §5.5–§5.8).
Status: **confirmed by Evan, 2026-09-30.**

### D-1 — Reintroduce photo-assisted entry, but extract-and-discard
- **Chose:** Re-add photo → field extraction on the authenticated add form, rebuilt so the image is sent to the model and **never persisted**.
- **Rejected:** Leaving it removed (§4.4/Stream B); and the original design that stored the image in Vercel Blob with a `pump_photo_url` column.
- **Why:** The owner's résumé is AI-engineer-facing but the shipped product had no AI after Stream B — this closes that gap. Discarding the image avoids re-introducing Blob (a second billed personal-cloud resource + the orphaned-blob cleanup the removal noted) and is privacy-friendlier.

### D-2 — Extraction model: Claude Haiku 4.5
- **Chose:** `claude-haiku-4-5` ($1/$5 per MTok, vision-capable) for the extraction call.
- **Rejected:** Sonnet 5 ($2/$10); Opus 5 ($5/$25, also the claude-api skill's default).
- **Why:** The task is reading a few numbers off a photo — the cheapest vision model is sufficient and matches the removed feature's original choice. Cost matters because this call sits behind the spend-cap guardrail (see BLOCKED.md). Revisit to Sonnet 5 only if Haiku misreads messy/blurry photos in practice.

### D-3 — Anomaly detection: statistical, not LLM
- **Chose:** Rolling-baseline + z-score/IQR outlier flagging on MPG, as pure server-side functions.
- **Rejected:** Asking an LLM to spot/explain anomalies.
- **Why:** Deterministic and unit-testable (fits TDD), explainable to a reviewer, zero API cost, and no dependence on the gated key. The "more AI" of an LLM approach isn't worth the non-determinism and spend-cap load for a job statistics does cleanly.

### D-4 — Shareable snapshots: expiring signed token
- **Chose:** A signed token encoding the filtered view (date range + events) with a default **30-day** expiry, read through the existing location-stripped public-data path.
- **Rejected:** A permanent, never-expiring public snapshot link.
- **Why:** A link that lives forever once created is a standing exposure; an expiring, tamper-evident token is the safer default and demonstrates auth-boundary thinking — itself a hiring signal. 30 days is long enough to forward to a recruiter.

### Defaults adopted without a separate entry (stated in the interview)
- Photo upload is authenticated-only (never `/demo`); extracted fields are editable drafts the user confirms before save.
- Anomalies surface as flagged points + a plain-language annotation on the MPG chart.
- The `/engineering` page renders from this `DECISIONS.md`.

---

## 2026-09-27 — Ledger backfill for the `/engineering` page (Stream K / K-1)

Two decisions that were already made and shipped in Stream G but never written into
this ledger. Recorded here so the public `/engineering` write-up (PRD §5.8.1) renders
the three named trade-offs from a single real source. Content is drawn from the
shipped code (`web/lib/public-data.ts`) and `web/docs/adr-demo-sandbox.md`.
Status: **confirmed by Evan, 2026-09-30.**

### D-5 — Privacy by construction: strip location at the query
- **Chose:** Omit `lat`/`lng` from the query projection used by every public surface (`web/lib/public-data.ts`), so coordinates are never *transmitted* to an unauthenticated visitor.
- **Rejected:** Selecting all columns and hiding `lat`/`lng` only in the UI (or filtering them out client-side after they've already been sent).
- **Why:** A UI-only hide still ships coordinates on the wire, where a network tab or a scraped payload exposes them. Stripping at the database projection makes the §5.4.2 privacy invariant structural — there is no code path on `/` or `/demo` that can leak location — and it's guarded by a regression test (`privacy-no-location.test.ts`).

### D-6 — Demo sandbox in `sessionStorage`, not on the server
- **Chose:** A client-side `sessionStorage` overlay: the server ships the location-stripped real history as the read-only base, and the visitor's add/edit/delete writes live in the browser and are merged before render (see `web/docs/adr-demo-sandbox.md`).
- **Rejected:** A server-side sandbox — a namespaced Postgres table or Upstash Redis, keyed by an anonymous session cookie with a TTL.
- **Why:** A server write path for anonymous visitors is an abuse surface that drags in rate limiting, row-growth caps, and a TTL/cleanup job — and it makes "the owner's real data is never mutated" a code-enforced guarantee. The overlay makes that guarantee *structural* (there is no server write path from `/demo` at all), adds zero infrastructure, and the base it ships is already public. The cost is that overlay state doesn't survive a hard reload — irrelevant for a throwaway demo.
