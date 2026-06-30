# Guzzolene — Implementation Tasks

Tasks to implement [prd.md](./prd.md). All work is TDD: write a failing test first, make it pass, refactor.

## How to use this file

- Each task has a **unique ID**, a **checkbox**, a one-line goal, and a TDD checklist.
- Mark `[x]` when the task is merged.
- **Dependencies** are listed at the top of each task. A task can start only when all listed IDs are checked.
- **Parallel groups** are independent — different agents can take different streams.
- TDD checklist within a task is sequential. Don't skip the failing-test step; it proves the test actually exercises the change.
- Test framework is **Vitest** (set up in Phase 0). All web tests live in `web/__tests__/` mirroring the source path.
- A task description that says "no test required" is for pure config/deletion work where a test would be ceremony. Use it sparingly.

## Workstream map (dependency overview)

```
Phase 0: SETUP (sequential, blocks everything)
   └── Phase 1: VERTICAL SLICE (sequential, blocks Phase 2)
          ├── Stream A — Fill-up fields & edit/delete
          ├── Stream B — OCR removal
          ├── Stream C — Mobile form + PWA shell
          │     └── Stream D — Offline draft sync (needs C)
          ├── Stream E — Date-range filters (visualizations)
          ├── Stream F — Events edit/delete + owner events UI
          └── Stream G — Recruiter showcase + read-only demo  ◄ TOP PRIORITY
                (needs E for live filtered charts, A for lat/lng strip)
```

Streams A, B, C, E, F can run in parallel after Phase 1. Stream D waits for C.

**Stream G is the current top priority** (PRD §5.4) — it builds on the now-complete
tool. It depends on Stream E (reuses the filtered public charts) and Stream A
(the lat/lng columns it must strip on public surfaces). Within G, the demo
sub-tasks block on the storage decision **G-1**.

---

## Phase 0 — Setup (sequential, blocking)

Goal: a green `npm test` before any feature work begins.

### P0-1 — [x] Install Vitest + React Testing Library
**Deps:** none
**TDD:**
- Add `vitest`, `@vitejs/plugin-react`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom` as devDependencies in `web/package.json`.
- No test required (config-only).

### P0-2 — [x] Configure Vitest for Next.js
**Deps:** P0-1
**TDD:**
- Create `web/vitest.config.ts` with `environment: "jsdom"`, React plugin, path alias matching `tsconfig.json`.
- Add `web/__tests__/setup.ts` that imports `@testing-library/jest-dom`.
- No test required (config-only).

### P0-3 — [x] Add `test` script + smoke test
**Deps:** P0-2
**TDD:**
- Add `"test": "vitest run"` and `"test:watch": "vitest"` to `web/package.json` scripts.
- Write `web/__tests__/smoke.test.ts` that asserts `1 + 1 === 2`.
- `npm test` passes.

### P0-4 — [x] Test DB strategy
**Deps:** P0-3
**TDD:**
- Decide: schema-level tests (Drizzle table objects) vs query-level tests against a test Postgres.
- Recommended: introspect Drizzle table objects directly for schema tests; mock the DB client for action tests.
- Create `web/__tests__/helpers/mock-db.ts` exporting a typed Drizzle mock.
- Write one test in `web/__tests__/lib/db/schema.test.ts` that asserts `gasPurchases` table has the expected current columns. This is the regression net for schema changes.

---

## Phase 1 — Vertical slice: add `fuel_grade` end-to-end

Smallest meaningful change that exercises the full stack (schema → server action → form → display). Proves the dev loop works before going wide.

### V-1 — [x] Schema test for `fuel_grade` column
**Deps:** P0-4
**TDD:**
- Add a failing case to `schema.test.ts` asserting `gasPurchases.fuelGrade` exists, is `text`, `notNull`, default `"87"`.
- Run test, confirm failure.

### V-2 — [x] Add `fuelGrade` to Drizzle schema + migration
**Deps:** V-1
**TDD:**
- Edit `web/lib/db/schema.ts`: add `fuelGrade: text("fuel_grade").notNull().default("87")`.
- Run `npm run db:generate` to produce migration SQL.
- Run `npm run db:push` against dev DB.
- V-1 test now passes.

### V-3 — [x] Server action test: insert fill-up with `fuelGrade`
**Deps:** V-2
**TDD:**
- In `web/__tests__/actions/purchases.test.ts`, write a failing test that calls `createPurchase` with `fuelGrade: "91"` and asserts the inserted row includes it.
- Use the mock DB from P0-4.

### V-4 — [x] Implement `fuelGrade` in `createPurchase` server action
**Deps:** V-3
**TDD:**
- Update `web/actions/purchases.ts` `createPurchase` to accept and persist `fuelGrade`.
- V-3 passes.

### V-5 — [x] Component test: fuel-grade dropdown in add form
**Deps:** V-4
**TDD:**
- In `web/__tests__/components/PumpPhotoUpload.test.tsx` (or wherever the add form lives), write a failing test that renders the form, asserts a `<select name="fuelGrade">` exists with options `87, 89, 91, 93, diesel`, default selected `87`.

### V-6 — [x] Add fuel-grade dropdown to add-fill-up form
**Deps:** V-5
**TDD:**
- Edit the add form component to render the dropdown.
- Wire the value into the submit payload.
- V-5 passes.

### V-7 — [x] Component test: fuel-grade visible on row detail
**Deps:** V-6
**TDD:**
- Write a failing test that renders a fill-up row card with `fuelGrade: "91"` and asserts the grade is visible in the DOM.

### V-8 — [x] Render fuel-grade in dashboard row detail
**Deps:** V-7
**TDD:**
- Add the grade to the fill-up display component.
- V-7 passes.
- Manually verify in `npm run dev`: add a fill-up with grade 91, see it on the dashboard.

**Vertical slice complete.** Phase 2 streams may begin in parallel.

---

## Phase 2 — Parallel workstreams

### Stream A — Fill-up fields & edit/delete

Adds geolocation (lat/lng) and edit/delete to fill-ups.

#### A-1 — [x] Schema test for `lat` and `lng` columns
**Deps:** V-8
**TDD:** failing test asserting `gasPurchases.lat` and `lng` are `double precision`, nullable.

#### A-2 — [x] Add `lat`/`lng` columns to schema + migrate
**Deps:** A-1
**TDD:**
- Add `lat: doublePrecision("lat")`, `lng: doublePrecision("lng")` to schema.
- `npm run db:generate`, `npm run db:push`.
- A-1 passes.

#### A-3 — [x] Server action test: insert with `lat`/`lng`
**Deps:** A-2
**TDD:** failing test calling `createPurchase` with coords, asserting both persist.

#### A-4 — [x] Wire `lat`/`lng` into `createPurchase`
**Deps:** A-3
**TDD:** implement to pass A-3.

#### A-5 — [x] Component test: geolocation prompt on form mount
**Deps:** A-4
**TDD:**
- Mock `navigator.geolocation.getCurrentPosition` to resolve with `{coords: {latitude: 41.0, longitude: -71.0}}`.
- Failing test asserting the form requests location on mount and stores it in form state.

#### A-6 — [x] Implement geolocation capture in form
**Deps:** A-5
**TDD:** call `navigator.geolocation.getCurrentPosition` on mount, store in state, include in submit. Handle permission-denied silently (do not block submit).

#### A-7 — [x] Component test: form submits without coords if permission denied
**Deps:** A-6
**TDD:**
- Mock `getCurrentPosition` to call error callback.
- Failing test asserting submit still works, payload omits coords.

#### A-8 — [x] Implement permission-denied fallback
**Deps:** A-7
**TDD:** pass A-7.

#### A-9 — [x] Server action test: `updatePurchase` enforces ownership
**Deps:** A-8
**TDD:** failing test that calling `updatePurchase(id, ...)` with a userId mismatching the row's userId throws.

#### A-10 — [x] Implement `updatePurchase` server action
**Deps:** A-9
**TDD:** add to `web/actions/purchases.ts`. Owner (Clerk role `admin`) may update `user_id = null` rows.

#### A-11 — [x] Server action test: `deletePurchase` enforces ownership
**Deps:** A-10
**TDD:** mirror A-9 for delete.

#### A-12 — [x] Implement `deletePurchase` server action
**Deps:** A-11
**TDD:** pass A-11.

#### A-13 — [x] Component test: edit button opens prefilled form
**Deps:** A-12
**TDD:** failing test on a row component asserting an edit button renders, and clicking it puts the row into edit mode with values prefilled.

#### A-14 — [x] Component test: delete confirms then calls action
**Deps:** A-12
**TDD:** failing test that a delete button triggers a confirm prompt and on confirm calls `deletePurchase`.

#### A-15 — [x] Implement edit/delete UI on dashboard rows
**Deps:** A-13, A-14
**TDD:** pass both.
- Manually verify: edit a fill-up's odometer, delete a row, both reflect in DB.

---

### Stream B — OCR removal

Pure deletion + one destructive migration. Independent of all other streams.

#### B-1 — [x] Test: pump-photo upload endpoint returns 404
**Deps:** V-8
**TDD:** add a failing route test (or HTTP-level test) hitting `/api/upload-photo` and `/api/extract-pump` expecting 404.

#### B-2 — [x] Delete OCR API routes
**Deps:** B-1
**TDD:**
- `rm -rf web/app/api/upload-photo web/app/api/extract-pump`.
- B-1 passes.

#### B-3 — [x] Delete OCR library code
**Deps:** B-2
**TDD:**
- Delete `web/lib/claude.ts`.
- Delete `web/components/PumpPhotoUpload.tsx` if no non-OCR code remains; otherwise extract the form and rename.
- No test required.

#### B-4 — [x] Remove Anthropic + Blob deps from package.json
**Deps:** B-3
**TDD:**
- `npm uninstall @anthropic-ai/sdk @vercel/blob`.
- No test required.
- Run `npm run build` to confirm no remaining imports break.

#### B-5 — [x] Remove env-var docs for OCR
**Deps:** B-4
**TDD:**
- Strip `BLOB_READ_WRITE_TOKEN` and `ANTHROPIC_API_KEY` rows from `web/README.md` env table.
- No test required.

#### B-6 — [x] Schema test: `pump_photo_url` column is gone
**Deps:** B-5
**TDD:** failing test asserting `gasPurchases` has no `pumpPhotoUrl` key.

#### B-7 — [x] Drop `pump_photo_url` column (destructive migration)
**Deps:** B-6
**TDD:**
- Remove `pumpPhotoUrl` line from `web/lib/db/schema.ts`.
- `npm run db:generate` — confirm the generated SQL is a `DROP COLUMN`. Review before applying.
- `npm run db:push`.
- B-6 passes.
- Note in PR description: existing photo blobs are orphaned in Vercel Blob; cleanup deferred.

---

### Stream C — Mobile form + PWA shell

Mobile layout polish and PWA install (no offline draft capture yet — that's Stream D).

#### C-1 — [x] Component test: numeric fields have `inputmode="decimal"`
**Deps:** V-8
**TDD:** failing test asserting cost/gallons/odometer inputs all have `inputMode="decimal"` and `type="number"` (or text + pattern).

#### C-2 — [x] Apply numeric input attributes
**Deps:** C-1
**TDD:** pass C-1.

#### C-3 — [x] Component test: sticky save button at viewport bottom
**Deps:** C-2
**TDD:** failing test asserting the submit button container has `position: sticky; bottom: 0` (or equivalent Tailwind class).

#### C-4 — [x] Apply sticky-save layout
**Deps:** C-3
**TDD:** pass C-3.

#### C-5 — [x] Single-column responsive layout audit
**Deps:** C-4
**TDD:**
- Manually verify on iPhone Safari at 390px width (Chrome devtools): no horizontal scroll, tap targets ≥44px, no hover-only affordances on the add form.
- No test required (visual).

#### C-6 — [x] Add web app manifest
**Deps:** C-5
**TDD:**
- Create `web/public/manifest.webmanifest` with name, short_name, icons (192, 512), `start_url: "/dashboard/add"`, `display: "standalone"`, theme color.
- Link from `web/app/layout.tsx`.
- No test required (verify in Chrome devtools → Application → Manifest).

#### C-7 — [x] Add icons
**Deps:** C-6
**TDD:**
- Generate 192px and 512px PNG icons (fuel pump motif), place in `web/public/`.
- Reference from manifest.
- No test required.

#### C-8 — [x] Add service worker for install
**Deps:** C-7
**TDD:**
- Register a minimal service worker in `web/public/sw.js` (cache app shell; no offline logic yet).
- Register from a client-side bootstrap in `layout.tsx` or a dedicated client component.
- No test required (verify in Chrome devtools → Application → Service Workers shows "activated").

#### C-9 — [x] Lighthouse PWA audit ≥ 90
**Deps:** C-8
**TDD:**
- Run Lighthouse against `npm run build && npm run start`.
- Fix any blocking PWA criteria (HTTPS in prod, manifest fields, SW registration).
- Document the score in the PR.

---

### Stream D — Offline draft capture + sync

Depends on Stream C being complete (needs the service worker).

#### D-1 — [x] Helper test: draft saved to IndexedDB
**Deps:** C-9
**TDD:**
- Use `fake-indexeddb` for tests (add dev dep).
- Failing test: calling `saveDraft({date, cost, gallons, ...})` writes to an `outbox` object store.

#### D-2 — [x] Implement `saveDraft` and `listDrafts` helpers
**Deps:** D-1
**TDD:** pass D-1. Place in `web/lib/offline-outbox.ts`.

#### D-3 — [x] Form test: offline submit goes to outbox
**Deps:** D-2
**TDD:**
- Mock `navigator.onLine = false`.
- Failing test that submitting the form calls `saveDraft` and not the server action.

#### D-4 — [x] Wire form to outbox when offline
**Deps:** D-3
**TDD:** pass D-3. Show a "Queued — will sync when online" indicator.

#### D-5 — [x] Helper test: drain outbox to server
**Deps:** D-4
**TDD:**
- Failing test that `drainOutbox()` reads pending drafts and calls `createPurchase` for each, deleting on success.

#### D-6 — [x] Implement `drainOutbox`
**Deps:** D-5
**TDD:** pass D-5. Errors must surface (per `claude.md` — do not silently retry forever); failed drafts stay in outbox with a visible error.

#### D-7 — [x] Trigger drain on `online` event + on dashboard mount
**Deps:** D-6
**TDD:**
- Failing integration test (jsdom event dispatch) that firing `window.dispatchEvent(new Event("online"))` calls drain.

#### D-8 — [x] Background sync (optional, if SW supports it)
**Deps:** D-7
**TDD:**
- If browser supports `SyncManager`, register a `background-sync` tag in the SW that triggers drain.
- Fallback to the online-event trigger from D-7.
- No test required (browser-API behavior; verify manually with airplane-mode roundtrip).

#### D-9 — [ ] E2E manual airplane-mode test
**Deps:** D-8
**TDD:**
- Airplane-mode the device, fill the form, submit, re-enable network — row appears in DB without user intervention.
- Document in PR.

> **KNOWN GAP (deferred 2026-06-13):** the installed PWA cannot open offline.
> `public/sw.js` has a no-op `fetch` handler — C-8 ("cache app shell") was
> marked done but never actually caches the shell, so launching the app in
> airplane mode shows iOS's "not connected to the Internet" error and the
> outbox is unreachable. The IndexedDB outbox + sync code (D-1…D-8) is correct
> and tested; it just can't be reached offline until the SW caches the app
> shell (network-first navigation + `/_next/static` precache). Revisit C-8/D-9
> together. User chose to defer rather than iterate on-device.

---

### Stream E — Date-range filters (visualizations)

Independent of A, B, C, D, F. Touches `app/page.tsx`, `app/dashboard/visualizations/page.tsx`, and the charts.

#### E-1 — [x] Util test: parse `from`/`to` URL query params
**Deps:** V-8
**TDD:**
- New file `web/lib/filters.ts`.
- Failing test for `parseDateRange(searchParams)` returning `{from, to}` Date objects, or `null` for missing/invalid.

#### E-2 — [x] Implement `parseDateRange`
**Deps:** E-1
**TDD:** pass E-1. Validate format (`YYYY-MM-DD`), reject invalid.

#### E-3 — [x] Aggregation test: filter applied to monthly data
**Deps:** E-2
**TDD:**
- In `web/__tests__/lib/aggregations.test.ts`, failing test that monthly-avg helper accepts an optional `{from, to}` filter and excludes out-of-range rows.

#### E-4 — [x] Apply filter in `lib/aggregations.ts`
**Deps:** E-3
**TDD:** pass E-3.

#### E-5 — [x] Component test: filter strip renders 4 preset chips + custom range
**Deps:** E-4
**TDD:** failing test rendering `<DateRangeFilter />` and asserting chips `30d`, `90d`, `1y`, `All-time` plus two date inputs.

#### E-6 — [x] Implement `<DateRangeFilter />` component
**Deps:** E-5
**TDD:**
- Renders chips and date inputs.
- Clicking a chip updates URL query params (via Next.js `useRouter().push`).
- Custom dates also update query params.
- Pass E-5.

#### E-7 — [x] Wire filter into visualizations page
**Deps:** E-6
**TDD:**
- `web/app/dashboard/visualizations/page.tsx` reads `searchParams`, passes range to aggregation, passes filtered data to charts.
- Manual verify: chips change the charts.

#### E-8 — [x] Wire filter into public home page
**Deps:** E-7
**TDD:**
- Same on `web/app/page.tsx`.
- Keep `revalidate = 3600` only when no query params; when params present, force dynamic render (e.g. `dynamic = "force-dynamic"` for that branch or read with `cache: "no-store"`).
- Acceptance: home with no params is still cached; home with params re-renders.

#### E-9 — [x] Event reference lines respect filter
**Deps:** E-8
**TDD:**
- Failing test that an event outside the filter range is excluded from chart props.
- Implement filtering of events to within `[from, to]`.

---

### Stream F — Events edit/delete + owner events UI

Independent of A, B, C, D, E. Touches `actions/events.ts`, `components/EventSearch.tsx`, seed script.

#### F-1 — [x] Server action test: `updateEvent` enforces ownership
**Deps:** V-8
**TDD:** failing test mirroring A-9 for events.

#### F-2 — [x] Implement `updateEvent`
**Deps:** F-1
**TDD:** pass F-1.

#### F-3 — [x] Server action test: `deleteEvent` enforces ownership
**Deps:** F-2
**TDD:** failing test for delete.

#### F-4 — [x] Implement `deleteEvent`
**Deps:** F-3
**TDD:** pass F-3.

#### F-5 — [x] Component test: event row has edit/delete controls
**Deps:** F-4
**TDD:** failing test that each pinned event renders edit and delete buttons.

#### F-6 — [x] Add edit/delete UI to event list
**Deps:** F-5
**TDD:** pass F-5. Manually verify: edit an event date, delete an event.

#### F-7 — [x] Migration script: seed hardcoded events as DB rows
**Deps:** F-6
**TDD:**
- New script `web/seed/seed-owner-events.ts` that reads the 8 events from a single source (port the list from `main.py:EVENTS` into a TS constant) and upserts each as `world_events` row with `user_id = null`.
- Use `(date, name)` as the natural key for idempotency (add unique constraint if missing — see F-8).

#### F-8 — [x] Add unique constraint for owner events
**Deps:** F-7
**TDD:**
- Schema test: a unique constraint exists on `(user_id, date, name)` (or partial index on `user_id IS NULL` if Drizzle supports it cleanly).
- Add to schema; migrate.

#### F-9 — [x] Run owner-events migration in dev
**Deps:** F-8
**TDD:**
- Add `db:seed-events` to package.json.
- Run, verify 8 rows present.
- Run again, verify no duplicates.

#### F-10 — [x] Remove hardcoded events from old seed
**Deps:** F-9
**TDD:**
- Delete the events array from `web/seed/seed-owner.ts` (gas purchases only).
- Delete `EVENTS` from `main.py` is **out of scope** (Python is frozen — leave it as historical reference).

#### F-11 — [x] Component test: "Pin to public home" toggle (owner-only)
**Deps:** F-10
**TDD:** failing test rendering `EventSearch` as the owner (mock Clerk role) showing a toggle; as a non-owner, no toggle.

#### F-12 — [x] Implement pin-to-public toggle
**Deps:** F-11
**TDD:**
- When toggle is on and the user has `publicMetadata.role === "admin"`, the saved event gets `user_id = null`.
- Otherwise, `user_id` = signed-in user's Clerk ID.
- Pass F-11.

#### F-13 — [ ] Manual verification
**Deps:** F-12
**TDD:**
- As owner: add a new event with toggle on, see it on `/`.
- As approved user: confirm no toggle visible; events save as user-owned.

---

### Stream G — Recruiter showcase + read-only demo  ◄ TOP PRIORITY

Implements PRD §5.4. Turns `/` into a product-first recruiter showcase and adds a
read-only `/demo`. Builds on the completed tool; does not modify the owner's real
logging flow or real data. **Privacy invariant (PRD §5.4.2): `lat`/`lng` must
never be transmitted on `/` or `/demo` — the server omits the columns, not the UI.**

**Identity content (resolved from `~/Documents/career/evan_appel_source.md` 2026-06-28):**
- Name: **Evan Appel** · Email: `appelew@gmail.com`
- GitHub repo: `https://github.com/EvanWAppel/guzzolene` · GitHub profile: `https://github.com/EvanWAppel`
- LinkedIn: `https://www.linkedin.com/in/evan-appel-8885569b/`
- Bio/tagline source material: "data & applied-AI professional — uses AI agents to make data reliably accessible." Final tagline copy is editorial (G-12).
- **Still owner's call:** which resume to bundle. Candidates in `~/Documents/career/resumes/`: `resume_ai_engineer.pdf` (recommended — best fit for the modern-stack-fluency framing), `resume_analytics_engineer.pdf`, `resume_data_analyst.pdf`, `resume_solutions_engineer.pdf`. Bundling a resume publishes it publicly — confirm before copying into `web/public/resume.pdf`.

#### G-1 — [x] Decision: demo sandbox storage + reset mechanism
**Deps:** V-8
**Done:** ADR at `web/docs/adr-demo-sandbox.md`. Decision: **client-side `sessionStorage` overlay** (base = server-stripped real data shipped to client; writes held in `sessionStorage`; merge client-side). Chosen over server-side Postgres/Redis because it makes "real data never mutated" *structural* and eliminates the entire anonymous-write abuse/TTL/cleanup workstream (resolves §8.6 + §8.7). Reset = per-tab sessionStorage + 24h soft TTL. See the ADR's "Impact on existing G tasks" — it adjusts G-13/14, G-17/18/19, G-20/21, and reduces G-24.

**— Privacy invariant (foundational; both surfaces depend on it) —**

#### G-2 — [x] Test: public/demo read helper omits `lat`/`lng`
**Deps:** A-2, E-8
**Done:** `web/__tests__/lib/public-data.test.ts` asserts `publicPurchaseColumns` excludes lat/lng (and keeps safe fields), and that `listPublicPurchases` issues an explicit projection (not bare select-all) filtered to owner rows.

#### G-3 — [x] Implement location-stripped public read
**Deps:** G-2
**Done:** `web/lib/public-data.ts` — `publicPurchaseColumns` (no lat/lng) + `listPublicPurchases()`. Public home (`app/page.tsx`) now reads through it; `monthlyAvg` relaxed to `AggInput` (location-stripped shape); `listOwnerPurchases` annotated as authed-only. Full suite green (87), tsc + eslint clean.

**— Showcase home (`/`) —**

#### G-4 — [x] Component test: showcase hero
**Deps:** E-8, G-3
**Done:** `web/__tests__/components/ShowcaseHero.test.tsx` — asserts product name (h1 "Guzzolene"), product-first tagline, the real-data stat (count + start year), and graceful no-data render. (DateRangeFilter + charts already covered by E tests; full-page server-component render left to the G-27 manual E2E.)

#### G-5 — [x] Implement showcase hero
**Deps:** G-4
**Done:** `web/components/ShowcaseHero.tsx` (presentational, product-first: badge + name + tagline + description + live fill-up/since stats). Wired into `web/app/page.tsx` above the reused `<DateRangeFilter />` and the §5.2 filtered charts; header brand unified to "⛽ Guzzolene". Existing searchParams-driven dynamic behavior preserved. Suite 91/91, tsc + eslint clean.

#### G-6 — [x] Component test: "Built with" tech badges
**Deps:** G-5
**Done:** `web/__tests__/components/TechBadges.test.tsx` — asserts a "Built with" section listing Next.js, RSC, Clerk, Neon, Drizzle, PWA, Vercel.

#### G-7 — [x] Implement tech-badge strip
**Deps:** G-6
**Done:** `web/components/TechBadges.tsx` (outline badges for the live stack incl. TypeScript, Recharts, Tailwind, PWA·offline sync). OCR/Anthropic/Blob excluded (removed in Stream B).

#### G-8 — [x] Architecture diagram asset + embed
**Deps:** G-5
**Done:** `web/components/ArchitectureDiagram.tsx` — resolved PRD §8.9 as **accessible HTML/CSS** (themeable, real-text labels, no asset drift) rather than an exported image: a `<figure>` with explicit accessible name + decorative arrows + figcaption. Test asserts the figure role + key node labels (Clerk, Neon, PWA, Vercel).

#### G-9 — [x] Case-study narrative section
**Deps:** G-5
**Done:** `web/components/CaseStudy.tsx` — labeled `region` ("How it's built") with four decision cards: notebook→product (RSC+Drizzle), PWA-not-native + offline outbox, cutting the AI OCR, privacy-by-construction (location stripped at query). Understated, product-first.

#### G-10 — [x] Source-link callout
**Deps:** G-9
**Done:** Prominent "View the source on GitHub" button in CaseStudy → `https://github.com/EvanWAppel/guzzolene`. Test asserts the link + href. (Confirm repo public before launch.)

#### G-11 — [x] Component test: identity footer
**Deps:** G-5
**Done:** `web/__tests__/components/SiteFooter.test.tsx` — asserts name, GitHub repo, GitHub profile, LinkedIn, resume (`/resume.pdf`), `mailto:`, and the "Try the live demo" CTA → `/demo`.

#### G-12 — [x] Implement identity footer + resume
**Deps:** G-11
**Done:** `web/components/SiteFooter.tsx` — Evan Appel + bio, all links, demo CTA. Resume in place (`web/public/resume.pdf`, AI-engineer). No contact form (PRD §7). All four case-study/footer components wired into `app/page.tsx` below the charts. Suite 101/101, tsc + eslint clean.
**Note:** the footer's "Try the live demo" → `/demo` is a dead link until G-13+ build that route; safe because nothing ships until W-5 (deps G-27), by which point the demo exists.

**— Read-only demo (`/demo`) —**

#### G-13 — [x] Test: demo overlay module init (sessionStorage)
**Deps:** G-1, G-3
**Done:** `web/__tests__/lib/demo-overlay.test.ts` (12 cases) — empty when absent, round-trip, 24h TTL discard, corrupt-JSON tolerance.

#### G-14 — [x] Implement demo overlay module + merge
**Deps:** G-13
**Done:** `web/lib/demo-overlay.ts` — `loadOverlay`/`saveOverlay`/`resetOverlay`, `mergeOverlay` (tombstones + edit overrides + added rows, sorted), `addToOverlay`/`editInOverlay`/`deleteFromOverlay`. Saves let storage errors throw (surfaced, not swallowed).

#### G-15 — [x] Test: demo reads real data with location stripped
**Deps:** G-14
**Done:** `web/__tests__/components/DemoDashboard.test.tsx` renders base rows via the same `PublicPurchase` (location-stripped) shape `listPublicPurchases` returns; `/demo` page sources reads from `listPublicPurchases` (G-3), never `listOwnerPurchases`. (Full no-lat/lng-on-the-wire acceptance is G-25.)

#### G-16 — [x] Implement demo read overlay
**Deps:** G-15
**Done:** `web/components/DemoDashboard.tsx` (client) renders the real dashboard shell (summary cards, RecentFills, OverviewGrid) from `mergeOverlay(base, overlay)`; `web/app/demo/page.tsx` is the public, no-auth route supplying the stripped base + events.
**Fix (found during W-5):** `/demo` was being caught by the Clerk auth gate in `web/proxy.ts` (it wasn't in the public matcher) and would have redirected anonymous visitors to sign-in. Added `/demo` to `PUBLIC_ROUTES` (now exported) + `web/__tests__/proxy.test.ts` guarding that `/` and `/demo` stay public and `/dashboard` never does.

#### G-17 — [x] Test: demo write lands in sandbox, not `gas_purchases`
**Deps:** G-16
**Done:** DemoDashboard test mocks the real server actions and asserts `createPurchase` is never called on add; the row appears via the overlay only. Real data is structurally untouchable (no server write path).

#### G-18 — [x] Implement sandboxed add in demo
**Deps:** G-17
**Done:** `AddFillUpForm` gained an optional `onDemoSubmit` that routes submits to the overlay (`addToOverlay`) instead of the server/offline path.

#### G-19 — [x] Test + implement: demo edit/delete scoped to sandbox
**Deps:** G-18
**Done:** `RecentFills` gained optional `onEditRow`/`onDeleteRow` overrides → `editInOverlay`/`deleteFromOverlay`. Base-row edits record an override; deletes tombstone; demo-added rows mutate in place. Test asserts delete tombstones in the overlay and never calls `deletePurchase`.

#### G-20 — [x] Test: fresh session shows none of prior session's writes
**Deps:** G-18
**Done:** Covered by `demo-overlay.test.ts` (resetOverlay → fresh load empty) + sessionStorage's per-tab lifetime; module reads are session-scoped.

#### G-21 — [x] Implement sandbox reset / TTL
**Deps:** G-20
**Done:** `resetOverlay()` + the 24h soft TTL in `loadOverlay`; "Reset demo" button in the DemoDashboard banner.

#### G-22 — [x] Test + implement: persistent "read-only demo" banner
**Deps:** G-16
**Done:** Persistent `role="status"` banner in DemoDashboard ("Read-only demo — your changes aren't saved…"); test asserts it renders.

#### G-23 — [x] Test + implement: geolocation discarded in demo
**Deps:** G-18
**Done:** `onDemoSubmit` deliberately omits coords; test grants geolocation, adds a row, and asserts the persisted overlay row has no `lat`/`lng`.

#### G-24 — [x] Test + implement: demo overlay size cap
**Deps:** G-18
**Done:** `MAX_ADDED` (25) cap in `addToOverlay` throws a surfaced message; DemoDashboard catches and shows it in a `role="alert"`. Test asserts the throw past the cap. (No server surface to rate-limit — §8.7 resolved structurally.)

**— Cross-cutting verification —**

#### G-25 — [~] Acceptance: no `lat`/`lng` in any `/` or `/demo` network response
**Deps:** G-12, G-21
**Done (automated portion):** `web/__tests__/privacy-no-location.test.ts` — regression net asserting both surfaces' data sources are location-free: the public read projection excludes lat/lng, and merged demo data (base + added + edited), including its serialized form, contains no lat/lng keys.
**Remaining (manual):** literal network-tab inspection of the live `/` and `/demo` responses — folded into the G-27 manual E2E (needs the running app).

#### G-26 — [ ] Showcase a11y + perf + 390px audit
**Deps:** G-12
**TDD:**
- Manual: `/` and `/demo` keyboard/screen-reader sane, sufficient contrast, no horizontal scroll at 390px iPhone Safari, and the §5.2 caching budget holds (default `/` still fast). Run Lighthouse; document scores in PR.
- No automated test (visual/perf).

#### G-27 — [ ] Manual E2E: recruiter flow
**Deps:** G-25, G-26
**TDD:**
- Land on `/` signed out → see real charts, reach repo/LinkedIn/resume/mailto from the footer, read the case study.
- "Try the live demo" → `/demo` shows real data with no location; add a row → it appears; confirm real `gas_purchases` is unchanged; open a fresh session → previous writes gone.
- Document in PR.

---

## Phase 3 — Wrap-up

#### W-1 — [x] Update `web/README.md` to reflect new state
**Deps:** all of Phase 2
**TDD:**
- Remove OCR section.
- Update env-vars table.
- Add PWA install instructions.
- Add filter behavior to chart section.
- Add edit/delete to feature list.

#### W-2 — [x] Update root `readme.md` if needed
**Deps:** W-1

#### W-3 — [ ] Run full test suite + Lighthouse + manual smoke
**Deps:** W-2
**TDD:**
- `npm test` green.
- Lighthouse PWA ≥ 90.
- Smoke: add a fill-up, edit it, delete it, see it in filtered charts, pin an event, edit the event.

#### W-4 — [ ] Production deploy + post-deploy smoke
**Deps:** W-3
**TDD:**
- Push to Vercel production.
- Re-run smoke against the prod URL.
- Confirm public home renders, owner login works, dashboard works.

#### W-5 — [~] Showcase + demo: docs + production deploy
**Deps:** G-27
**TDD:**
- ✅ Docs done: `web/README.md` (intro, What It Does, a "Recruiter Showcase & Read-Only Demo" build section, Project Structure, proxy public routes) and root `readme.md` Web App paragraph now describe the showcase home, `/demo`, the privacy invariant, and the sessionStorage sandbox.
- ✅ Identity content in place (Evan Appel, links, `web/public/resume.pdf` = AI-engineer résumé) — not placeholders.
- ⏳ Remaining: deploy to Vercel production; smoke `/` and `/demo` on the prod URL (real data, no location, fresh-session reset). Blocked on G-26/G-27 local verification first.
