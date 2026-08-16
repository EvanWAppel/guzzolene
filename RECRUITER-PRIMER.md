# Guzzolene — Recruiter Primer & Portfolio Hardening Brief

*A working brief for the coding agent. Read this, then execute the "Do This First"
plan below. Honesty guardrails are always on: this is a personal after-hours project
built on one person's real car data, much of it agent-native (Claude Code) — which is a
story to tell, not hide. No fabricated metrics, no employer-confidential content, and
keep every skill claim defensible by pointing at code.*

---

## What it is

Guzzolene is a personal fuel-economy tracker that grew from a Python/pandas notebook into
a production Next.js web app. The one-line pitch: *every fill-up for one car, logged from
a phone and charted over time against the geopolitical events that moved the price of
gas — with a recruiter-facing showcase home and a fully interactive, zero-signup demo.*

The origin is honest and legible: `main.py` + `scratch.ipynb` analyze `gas_purchases.csv`
against `oil_prices.csv` with hardcoded world-event reference lines. That analysis became
`web/` — a Next.js 16 App Router app (React Server Components) with Clerk auth, a Neon
Postgres database via Drizzle ORM, Recharts visualizations, Tailwind UI, and an installable
PWA with offline draft capture. It is deployed at **guzzo-lene.com**.

Two things make it more than a CRUD tracker, and both are the interview hooks:

1. **Privacy-by-construction.** The public home (`/`) and the demo (`/demo`) must never
   transmit the car's `lat`/`lng`. That invariant is enforced at the **query layer** —
   `web/lib/public-data.ts` projects an explicit location-free column set (`listPublicPurchases`),
   so the coordinates never leave the database, rather than being hidden in the UI. There
   is a regression test (`web/__tests__/privacy-no-location.test.ts`) plus a verified
   on-the-wire check.
2. **A read-only demo with no backend abuse surface.** `/demo` ships the real
   (location-stripped) data to the client and layers anonymous writes in a `sessionStorage`
   overlay (`web/lib/demo-overlay.ts`): add/edit/delete are merged client-side with
   tombstones and overrides, capped and TTL'd. This makes "real data is never mutated" a
   *structural* property, not a rule — and eliminates the entire anonymous-write
   rate-limit/cleanup workstream. The design decision is recorded in
   `web/docs/adr-demo-sandbox.md`.

## Honest current state

The app is **feature-complete and well-tested**; what remains is visibility and the last
mile of live verification. Know this before touching anything so you don't rebuild or
double-claim it.

- **TDD throughout.** `TASKS.md` is a real, followed plan: every feature landed test-first
  (Vitest + React Testing Library). The suite is **132 tests, green**, with `tsc --noEmit`
  and eslint clean. Schema, server actions, components, the offline outbox, the demo overlay,
  the privacy invariant, and the auth proxy all have coverage.
- **Modern stack, used correctly.** RSC data fetching with `revalidate`/dynamic branching
  driven by search params; server actions with ownership enforcement; Drizzle schema +
  migrations; Clerk middleware (`web/proxy.ts`) with an explicit public-route matcher.
- **A real offline story.** IndexedDB outbox (`web/lib/offline-outbox.ts`) queues fill-ups
  when offline and drains them through the `createPurchase` server action on reconnect. As
  of the latest work the service worker now **caches the app shell** (`web/public/sw.js`:
  network-first navigations → cached page → precached `offline.html`; cache-first for
  `/_next/static`), so the installed PWA opens in airplane mode and reaches the outbox —
  covered by `web/__tests__/sw.test.ts`.
- **A deliberate cut.** An AI-powered pump-photo OCR feature was **removed** (Stream B) —
  a scope/cost decision worth narrating: knowing what *not* to ship is a signal.
- **Docs exist.** `web/README.md` and root `readme.md` describe the showcase, the demo, the
  privacy invariant, and the PWA. Identity content (name, GitHub, LinkedIn, résumé) is
  wired into `web/components/SiteFooter.tsx`, not placeholdered.

**What is genuinely missing** (and what the improvements below target):

1. **The recruiter showcase + demo aren't confirmed live, and the README hides the link.**
   The tracker is deployed at guzzo-lene.com, but W-4/W-5 are open: the Stream G showcase
   (`/`) and demo (`/demo`) have not been smoke-tested on the prod URL, and no live-demo link
   sits above the fold in the README. This is the single highest-leverage gap — the whole
   point of Stream G is a URL you send to a recruiter.
2. **No demo media.** There is no GIF or screenshot of the showcase home or the demo
   sandbox anywhere in the repo. A skimming reviewer sees a README, not the product.
3. **The a11y / performance / mobile audit is unrun.** G-26 is blocked-then-deferred:
   Lighthouse on `/` and `/demo`, a keyboard/screen-reader pass, and a 390px iPhone-Safari
   check have not been done. For a front-end-flavored portfolio piece, a posted Lighthouse
   score is table stakes.
4. **The offline flagship is unverified on-device.** D-9's code is done and tested, but the
   literal airplane-mode roundtrip (install → warm cache → offline → add → reconnect → row
   lands) has not been run on a real device, and there is no recording of it.
5. **No CI is merged.** An `add-ci` branch exists but the default branch has no visible
   test/typecheck gate — the rigor is real but invisible to a reviewer browsing GitHub.

Honesty note for interviews: much of this was built agent-native. The differentiator is
"an agent-native builder who still writes tests first, enforces a privacy invariant at the
data layer, and can defend every design decision by hand." Keep front-end/TypeScript claims
at the level the code supports; lead with the product and systems decisions.

## Flagship potential

**Flagship-grade for full-stack / product-engineer / forward-deployed-engineer screens,
strong-supporting for pure front-end depth.** The systems decisions here — a privacy
invariant enforced structurally, a demo sandbox that makes real data untouchable by
construction, a genuine offline-first PWA, and a clean notebook→product narrative — are a
better "can this person ship and reason about a real app end-to-end" signal than most
portfolio CRUD apps. The gap between "strong project" and "the piece Evan leads with" is
almost entirely **visibility**: deploy it, show it, prove the offline trick works. Close
gaps 1–4 and this is the demo you send before the first call.

---

## Ranked improvements

Each is scoped for a fast agent-native builder. Respect house rules: `uv` + pytest + ruff +
`ty` for any Python work (`main.py`/notebook are frozen historical reference — leave them);
the web keeps its own toolchain (Vitest, eslint, `tsc`). No hidden or wrapped errors. Commit
as small, narratable PRs.

### 1. Confirm the showcase + demo are live and link them above the fold *(effort: hours)*
**Unlocks: every full-stack / product-engineer / FDE screen — the entire point of the showcase.**

The tracker is deployed at guzzo-lene.com; finish W-4/W-5 for Stream G. Smoke `/` and `/demo`
on the prod URL — confirm the showcase renders with real stats, the demo sandbox
add/edit/delete/reset loop works, fresh-session isolation holds, and **no `lat`/`lng` appears
on the wire** — redeploying if the showcase build isn't live yet. Add a prominent
"▶ Try the live demo" link to the top of `web/README.md` and the repo description.

- **Acceptance:** a public prod URL for `/` and `/demo`; both smoke-pass signed-out; the
  privacy check re-run against prod; README links the live demo above the fold.
- **Why it wins:** a recruiter can click a URL in ten seconds. No amount of clean code
  substitutes for a working link.

### 2. Capture demo media (showcase + sandbox + charts) *(effort: hours)*
**Unlocks: every skim of the repo or README.**

Record a short GIF of the showcase home (hero, live stats, filtered charts with event
reference lines) and a second of the `/demo` sandbox loop (add a fill-up → see it in the
charts → reset). Commit to `web/docs/media/` (or `docs/media/`) and embed at the top of the
README.

- **Acceptance:** at least one showcase GIF and one demo-interaction GIF committed and
  embedded above the fold; file sizes reasonable (< ~5MB each so GitHub renders them).
- **Why it wins:** turns an invisible product into a three-second "oh, that's nice."

### 3. Run and post the a11y / Lighthouse / 390px audit (G-26) *(effort: hours)*
**Unlocks: front-end-flavored screens; quality-bar signal for all.**

`cd web && npm run build && npm start`, then Lighthouse on `/` and `/demo`, a keyboard +
screen-reader pass, and an iPhone-Safari 390px visual check. Fix what's cheap; document
scores in the README or a `web/docs/`. (The a11y anchor fix in PR #6 shows this is already
being taken seriously — make the result legible.)

- **Acceptance:** Lighthouse scores for `/` and `/demo` recorded; keyboard/SR pass noted;
  390px confirmed with no horizontal scroll and ≥44px tap targets; G-26 flipped to done.
- **Why it wins:** a posted Lighthouse score is a legible, cheap quality signal.

### 4. Verify the offline PWA on-device and record the roundtrip (D-9) *(effort: hours)*
**Unlocks: systems/reliability signal; proves the offline story is real, not aspirational.**

Install the PWA, open it once online to warm the cache, enable airplane mode, relaunch,
add a fill-up, re-enable network, and confirm the row lands in the DB unattended. Watch that
Clerk's client SDK renders the cached authed `/dashboard/add` page while offline; if it
fights the offline shell, gate accordingly. Capture a short screen recording.

- **Acceptance:** the airplane-mode roundtrip succeeds on a real device; a recording lives
  in the media folder and is linked from the README's PWA section; D-9 flipped to done.
- **Why it wins:** "offline-first" is a claim most portfolios can't back up — a recording
  makes it undeniable.

### 5. Add an ARCHITECTURE.md capturing the design record *(effort: hours)*
**Unlocks: systems-design authority; DevRel/advocacy writing sample.**

The `CaseStudy` component tells the story in-app; a `web/docs/ARCHITECTURE.md` gives an
interviewer (and Evan) a crib sheet: notebook→product with RSC + Drizzle, privacy enforced
at the query layer (link `public-data.ts` + the privacy test), the sessionStorage demo
overlay (link the ADR), the offline outbox + SW caching model, and why the AI OCR was cut.
Reuse the diagram from `web/components/ArchitectureDiagram.tsx`.

- **Acceptance:** `web/docs/ARCHITECTURE.md` exists, is linked from the README, and cites
  the load-bearing files/tests for each decision; no employer content.
- **Why it wins:** a ready answer to "walk me through your hardest decision on this project."

### 6. Merge CI so the rigor is visible *(effort: weekend)*
**Unlocks: quality-bar signal for all engineering screens.**

Land the `add-ci` branch (or a fresh workflow) that runs `npm test` + `tsc --noEmit` +
eslint on PRs to `main`, pin actions to commit SHAs, and add a status badge to the README.
The test discipline already exists — make GitHub show it.

- **Acceptance:** a CI workflow runs the web checks on PRs; actions SHA-pinned; a green
  badge renders in the README.
- **Why it wins:** converts hidden rigor (132 green tests) into a badge a reviewer sees
  without cloning.

---

## Do this first — one-week mini-plan

Order is by ROI. Day 1 alone moves Guzzolene from "a repo" to "a link you send a recruiter."

- **Day 1 (hours):** Smoke `/` + `/demo` on guzzo-lene.com (redeploy if the showcase build
  isn't live yet), re-run the on-the-wire privacy check, and put the live-demo link above
  the fold. *(Improvement 1.)*
- **Day 2 (hours):** Record the showcase + demo-sandbox GIFs and embed them; capture the
  on-device airplane-mode offline recording. *(Improvements 2 + 4.)*
- **Day 3 (hours):** Run the Lighthouse/a11y/390px audit, fix the cheap wins, post the
  scores; write `web/docs/ARCHITECTURE.md`. *(Improvements 3 + 5.)*
- **Weekend (stretch):** Merge CI with a README badge. *(Improvement 6.)*

Non-negotiables throughout: keep the suite green (`npm test`) and `tsc`/eslint clean, keep
the privacy invariant intact (no `lat`/`lng` on `/` or `/demo`, ever), leave the Python
notebook frozen, keep every change a small narratable PR, and keep skill claims honest. The
goal is a repo Evan can open in an interview, click a live demo, show the offline trick
working, and then walk a reviewer through the privacy-at-the-query-layer decision by hand.
