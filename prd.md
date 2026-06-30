# Guzzolene — Product Requirements

**One-liner:** A personal fuel-economy tracker. Log fill-ups, see fuel-cost and efficiency trends over time, and overlay geopolitical events for context.

**Audience for this PRD:** an AI coding agent (Claude Code). Sections are structured for direct loading as task context. File paths reference the current repo layout.

---

## 1. Product thesis

A practical app for one driver to record gasoline purchases and visualize the resulting trends. The geopolitical-event overlay is one feature among several — not the product's reason for existing.

Origin: the owner has logged every fill-up for a 2018 Mazda 3 Sport since December 2018. The original tool was a Python notebook that produced static Matplotlib charts. The web app is the active product; the notebook is preserved but frozen.

**Dual purpose.** The product serves two audiences at once, and the design must honor both without compromise:
1. **A real personal utility** — the owner logs fill-ups from a phone, including at the pump and offline. This is the reason the data exists and must never be degraded for the sake of presentation.
2. **A portfolio showcase** — the public surface is also a recruiter-facing demonstration of the owner's engineering. The target impression is **modern-stack fluency**, framed product-first (it reads as a genuine shipped product, not a "Hi recruiters" landing page). See §5.4 for the showcase workstream.

---

## 2. Users and access model

- **Owner** — one person (the developer). Sole admin. Owner data is shown on the public home page with `user_id = null` rows.
- **Invited friends** — sign up via Clerk, land on `/pending`, gain a dashboard only after the owner approves them from `/admin`. Approval is recorded in Clerk `publicMetadata.approved`.
- **Public visitors** — read-only view of the owner's charts at the showcase home `/`. No sign-in required.
- **Demo visitors** — anonymous. Via `/demo` they get a sandboxed, read-only-overlay view of the owner's real data (with location stripped) inside the authenticated dashboard UI; any writes they make stay in a client-side per-session overlay (browser `sessionStorage`) and never touch real records — there is no server write path from the demo. Not a real account, no Clerk sign-in. See §5.4.3.

This model is intentional and stays small. See non-goals (§7) for what is excluded.

---

## 3. Surfaces

Two surfaces, treated as one product:

| Surface | Path | Status |
|---|---|---|
| Web app (Next.js 16 App Router) | `web/` | **Active.** All roadmap work lands here. |
| Python notebook + CLI | `main.py`, `utils.py`, `scratch.ipynb` | **Frozen.** Documented for historical context; no roadmap items. |

The Python surface reads from `gas_purchases.csv` and writes PNGs to `images/`. Its analyses (monthly aggregation, WTI overlay, event lines) were the original spec the web app reimplements.

The public web surface comprises three routes serving the dual purpose (§1): the **showcase home** (`/`, recruiter-facing, unauthenticated), the **read-only demo** (`/demo`, unauthenticated sandbox), and the **authenticated tool** (`/dashboard/*`, owner/approved-user logging). The showcase and demo are specified in §5.4.

---

## 4. As-is feature set

The current web product, as built. See `web/README.md` for implementation-level detail; this section captures the product surface for reference.

### 4.1 Public home page (`web/app/page.tsx`)
- Static-regenerated every 3600s.
- Renders the owner's six charts and a brief intro.
- No filters or interactivity beyond chart hover tooltips.

### 4.2 Authenticated dashboard (`web/app/dashboard/`)
- `/dashboard` — summary card + overview chart for the signed-in user's fill-ups.
- `/dashboard/add` — fill-up entry form. Optional pump-photo upload triggers Claude Haiku extraction that pre-fills the form.
- `/dashboard/visualizations` — full set of charts + event search/pin UI for the user's own data.

### 4.3 Visualizations (`web/components/charts/`)
Six core charts, each rendered as a Recharts client component fed pre-aggregated monthly data from a Server Component:
1. Overview (2×2 grid: cost, gallons, odometer, $/gal)
2. Price per gallon
3. Cost per mile, dual-axis with WTI crude oil price (Yahoo Finance fetched)
4. Total fill-up cost
5. Gallons pumped
6. Odometer
7. MPG and GPM (added in commit `c106118`)

All charts render `<ReferenceLine>` overlays for events with staggered y-labels.

### 4.4 Pump-photo OCR (`web/app/api/extract-pump/`, `web/lib/claude.ts`, `PumpPhotoUpload.tsx`)
- Photo uploaded to Vercel Blob → public URL passed to `claude-haiku-4-5` → returns `{cost, gallons, price_per_gallon, date}` → pre-fills form.
- **Slated for removal — see §5.1.**

### 4.5 Event search and pinning (`web/components/EventSearch.tsx`, `web/lib/wikipedia.ts`, `web/actions/events.ts`)
- Browser-side call to `en.wikipedia.org/w/api.php?action=query&list=search`.
- User picks an article from the dropdown, types a date manually, saves.
- Stored in `world_events` table (`user_id = null` for owner-visible-on-home, else the signed-in user's ID).
- Owner's eight curated events are currently in the seed script, not the UI — **slated to move to DB, see §5.3.**

### 4.6 Admin panel (`web/app/admin/`, `web/actions/admin.ts`)
- Lists pending Clerk users. Owner clicks Approve/Deny, which calls the Clerk Backend API to set `publicMetadata.approved`.
- Admin identity gated by `publicMetadata.role === "admin"`, set once manually in the Clerk dashboard.

### 4.7 Data model (`web/lib/db/schema.ts`)
- `gas_purchases` — `id`, `user_id` (nullable, null = owner), `date`, `cost`, `gallons`, `odometer`, `price_per_gallon`, `photo_url`.
- `world_events` — `id`, `user_id` (nullable), `date`, `title`, `description`, `wikipedia_url`.
- No `users` table. Identity lives entirely in Clerk.

### 4.8 Infrastructure
- Database: Neon Postgres via `@neondatabase/serverless`.
- Auth: Clerk (sessions, webhooks, metadata-based approval).
- Storage: Vercel Blob (only for pump photos — slated for removal).
- AI: Anthropic SDK (only for OCR — slated for removal).
- Hosting: Vercel.

---

## 5. Roadmap

Three workstreams, each a hardening pass on one of the three core feature areas. No new product surfaces.

### 5.1 Purchase entry — mobile-first PWA, no photos

**Goal:** Make the entry flow usable one-handed at the pump, on a phone, including offline. Remove the OCR feature.

**Requirements:**

1. **PWA install + offline draft capture**
   - Add a web app manifest and service worker so `/dashboard/add` is installable to the home screen.
   - Form input survives loss of connectivity: the user can fill out a fill-up offline, the draft is queued in IndexedDB (or equivalent), and a background sync flushes it to the server when online.
   - Acceptance: airplane-mode the device after loading the form, submit, re-enable network — the row appears in the DB without user intervention.
   - Out of scope: offline chart viewing (charts can require network).

2. **Mobile-shaped form**
   - Numeric keypad input types (`inputmode="decimal"`) on numeric fields.
   - Sticky "Save" button anchored to viewport bottom.
   - Large tap targets (≥44px). Single-column layout. No hover-only affordances.

3. **Remove OCR end-to-end**
   - Delete: `web/app/api/extract-pump/`, `web/app/api/upload-photo/`, `web/lib/claude.ts`, the Anthropic SDK dependency, the Vercel Blob dependency, `BLOB_READ_WRITE_TOKEN` and `ANTHROPIC_API_KEY` from required env vars, the photo dropzone in `PumpPhotoUpload.tsx` (likely delete the file).
   - Migration: drop `gas_purchases.photo_url` column. Destructive — call out in the migration PR.

4. **Capture station via browser geolocation**
   - On opening the add-fill-up form, request geolocation permission (do not require it).
   - If granted: store `lat` and `lng` floats on the row.
   - If denied or unsupported: row saves without location. No fallback UI required in this iteration.
   - Display: for now, render lat/lng as-is in the row detail. Reverse-geocoding to a human-readable station name is **deferred** — see §8.

5. **Capture fuel grade**
   - Enum dropdown: `87`, `89`, `91`, `93`, `diesel`.
   - Default selection: `87`.
   - Required field.

6. **Edit and delete fill-ups**
   - From the dashboard, owner/user can edit any of their own rows or delete them.
   - Server actions in `web/actions/purchases.ts` enforce ownership: a user can only mutate rows where `user_id` matches their Clerk ID (owner can mutate `user_id = null` rows).
   - Soft delete is not required — hard delete is acceptable.

**Schema changes:**
- `ALTER TABLE gas_purchases DROP COLUMN photo_url`
- `ALTER TABLE gas_purchases ADD COLUMN lat double precision`
- `ALTER TABLE gas_purchases ADD COLUMN lng double precision`
- `ALTER TABLE gas_purchases ADD COLUMN fuel_grade text NOT NULL DEFAULT '87'`

### 5.2 Visualizations — date-range filters

**Goal:** Let viewers narrow charts to a time window. No new chart types.

**Requirements:**

1. **Filter controls on both surfaces**
   - Public home (`/`) and authenticated visualizations page (`/dashboard/visualizations`) both get a filter strip.
   - Filter state persists in the URL as query params (e.g. `?from=2024-01-01&to=2025-01-01`) so links are shareable and refresh-stable.

2. **Filter types in this iteration**
   - **Date range only.** Preset chips: `30d`, `90d`, `1y`, `All-time`. Custom range via two date pickers.
   - Aggregation, fuel grade, and station filters are **deferred**.

3. **Filters affect every chart on the page**
   - All Recharts components re-render against the filtered dataset.
   - Event reference lines outside the filter window are hidden.
   - Cost-per-mile WTI overlay fetches the matching oil-price window.

4. **Caching constraint (public home)**
   - Today the public home uses `revalidate = 3600` static regeneration. URL-param filters break that cache.
   - Resolution: keep the default-range render statically cached; when query params are present, fall through to a dynamic render. Concretely, conditionally `cache: "no-store"` (or equivalent) on the data fetch when filters are non-default. Acceptance: home page without query params remains <100ms TTFB; with query params, sub-1s is acceptable.

**Schema changes:** none.

### 5.3 Events — edit/delete + owner events in the UI

**Goal:** Make event management symmetric with fill-up management. Stop treating owner events as code.

**Requirements:**

1. **Edit and delete events**
   - From `/dashboard/visualizations`, user can edit the date, title, or delete any of their own pinned events.
   - Ownership rules same as §5.1.6.

2. **Migrate owner's hardcoded events to DB**
   - Move the eight events from `main.py:EVENTS` (and the seed script that mirrors them) into `world_events` rows with `user_id = null`.
   - Done as a one-time migration script, runnable via `npm run db:seed` or a dedicated script. Idempotent: re-running must not duplicate.
   - After migration, delete the hardcoded list from the seed script.

3. **Owner-event management UI**
   - Owner can add, edit, or delete `user_id = null` events using the same `EventSearch.tsx` flow they use for personal events, with a "Pin to public home" toggle.
   - Concretely: when toggled on, the inserted row has `user_id = null`; otherwise it gets the owner's Clerk ID.

4. **Wikipedia stays the only source.** No free-form event entry, no curated event database in this iteration.

**Schema changes:** none.

### 5.4 Recruiter-facing showcase + read-only demo

**Goal:** Turn the public surface into a portfolio-grade showcase that signals **modern-stack fluency** to a skimming technical recruiter, while preserving the app's real purpose as the owner's personal fill-up logger. The two purposes coexist on one product (§1); neither is allowed to degrade the other.

**Priority & sequencing:** Top-priority workstream — it jumps ahead of §5.1–§5.3. It wraps the tool **as currently built** and does not block on the other workstreams. If the §5.1 mobile form has shipped, the demo uses it; otherwise it wraps the current form. No part of the showcase or demo writes to the owner's real data.

**Framing/tone:** Product-first. The page must read as a genuine, shipped product — *not* a "Hi recruiters" landing page. Portfolio/case-study material lives below the fold and in the footer; polish carries the signal.

**Requirements:**

#### 5.4.1 Showcase home (`/`)
Replaces the current charts-only home (§4.1). Top to bottom:

1. **Hero** — the product name/tagline, with the **live real-data charts as the centerpiece**. Reuses the §5.2 filtered public charts (date-range filter strip present); the charts *are* the data-viz demonstration. Real data is the point (owner-approved for public display), subject to the location invariant in 5.4.2.
2. **Case study (below the fold, understated but clearly labeled):**
   - **"Built with" strip/badges** — the live stack, skimmable in ~2s: Next.js 16 App Router, React Server Components, Clerk, Neon Postgres, Drizzle, PWA / Service Worker, Vercel hosting. (Keep it current as the stack evolves; e.g. OCR/Anthropic/Blob are being removed in §5.1.)
   - **Architecture diagram** — a small diagram of how the pieces fit (auth → app/RSC → DB → PWA → hosting). Asset committed under `/public`; source format (Excalidraw / Mermaid / exported SVG) is an implementation choice (§8).
   - **Written narrative** — short. The problem, and the key decisions and tradeoffs: why PWA over native, why drop OCR, why RSC + Drizzle, how offline sync works. Demonstrates judgment, not just tool usage.
   - **Source link** — prominent link to the public repo; optionally call out one well-built file.
3. **Identity footer:**
   - Owner's **real name + one-line bio**. *(Content TODO — owner supplies exact name and copy; do not invent.)*
   - **Links:** GitHub repo, GitHub profile, LinkedIn, downloadable resume served from `/public/resume.pdf`, and a `mailto:` contact. No contact form (§7).
   - **"Try the live demo"** CTA → `/demo` (5.4.3).

#### 5.4.2 Privacy invariant on public surfaces
- `lat`/`lng` (added in §5.1.4) are **never rendered or transmitted** on any unauthenticated surface — neither the showcase nor the demo. The server must **omit those columns from the query** for public/demo reads; hiding them client-side is insufficient.
- **Acceptance:** no `lat`/`lng` value appears in any network response on `/` or `/demo`.
- All other fill-up fields (date, cost, gallons, odometer, price, fuel grade) are owner-approved for public display.

#### 5.4.3 Read-only demo mode (`/demo`)
Lets an unauthenticated recruiter feel the dashboard and add-fill-up flow without signing in.

- **Anonymous, client-side per-session overlay.** No Clerk sign-in, no cookie. The sandbox lives in the browser's `sessionStorage`; there is no server write path from `/demo`. (Storage decision recorded in `web/docs/adr-demo-sandbox.md` — resolves the former §8.6/§8.7 open questions.)
- **Reads:** the owner's real fill-up history with **location stripped** (per 5.4.2), fetched server-side and rendered in the real authenticated dashboard UI (summary card, charts, rows).
- **Writes:** any add/edit/delete the recruiter performs lands **only in their client-side overlay** and is merged over the read-only base so the change appears immediately. Nothing touches the owner's real records — this is structural (no server write path), not merely guarded.
- **Reset:** the overlay is ephemeral — `sessionStorage` clears when the tab/session closes, so a fresh session starts from the base only; a 24h soft TTL discards stale overlays on load, and an explicit "Reset demo" control clears it.
- **Clarity:** a persistent, unmissable banner — "Read-only demo — your changes aren't saved." The recruiter must always know the state.
- **Add form:** the real form (mobile-shaped per §5.1 if shipped, else current). A geolocation prompt may appear, but any captured location is **discarded** in demo (not stored, not displayed).
- **Abuse:** because writes never reach the server, there is no anonymous write surface to rate-limit or clean up. Only a client-side cap on overlay size remains.

**Acceptance for 5.4.3:**
- `/demo` shows the dashboard populated with real data and **no location anywhere**.
- Adding a row updates the demo view but never the owner's real data (verify the real `gas_purchases` rows are unchanged).
- Opening a fresh session shows none of the previous session's writes.

#### 5.4.4 What stays behind auth
- The real logging tool (`/dashboard/*`) is unchanged and remains the owner's actual instrument for logging fill-ups on a phone. The showcase and demo are strictly additive and read-only with respect to real data.

**Schema changes:** none. The demo sandbox is client-side `sessionStorage` (no table, no migration, no new env var) per `web/docs/adr-demo-sandbox.md`.

---

## 6. Cross-cutting requirements

- **Mobile parity.** Every roadmap item must work on iPhone Safari at 390px width. Desktop should not regress.
- **Type safety.** Drizzle schema is the source of truth; do not bypass with raw SQL where a query builder works.
- **No new auth surfaces.** Approval flow stays exactly as documented in §4.6. Do not add password reset, email verification beyond Clerk's defaults, etc.
- **Errors surface.** Per `claude.md`: do not hide or wrap errors. Failed offline-sync attempts must be visible to the user, not silently retried forever.
- **Showcase craft is judged.** Because `/` and `/demo` are evaluated by recruiters (§5.4), they must meet a visibly high bar: accessible (keyboard + screen-reader sane, sufficient contrast), fast (the §5.2 caching budget applies to the showcase), and clean on iPhone Safari at 390px. Sloppiness here reads as the opposite of the intended signal.

---

## 7. Non-goals

Explicitly out of scope for this PRD and the next iteration:

- **Multi-vehicle per user.** One user = one car. No vehicle switcher, no per-vehicle aggregation. May revisit later.
- **Native mobile app.** PWA is the answer. No React Native, Swift, or Kotlin.
- **New chart types using grade/station data.** Fields are captured for future use; no visualizations are added this iteration.
- **Aggregation granularity controls** (weekly/monthly/yearly toggle). Monthly stays the only bucket.
- **Grade or station filters** on charts. Deferred until there is enough varied data to justify them.
- **Receipt/expense export.** Not a tax tool.
- **Roadmap work on the Python surface.** Frozen.
- **Reverse-geocoding stations** to human names. Deferred (see §8).
- **Contact form / message storage.** The showcase uses `mailto:` + social links only. No server-side form, no spam handling, no inbox storage.
- **Persistent demo accounts or demo sign-in.** The demo (§5.4.3) is anonymous and ephemeral; it never creates a real account or persists across sessions.
- **Recruiter/visitor analytics or tracking.** Not added in this iteration.
- **Interactive offline demonstration.** The demo cannot airplane-mode the recruiter's device; true offline/service-worker behavior is conveyed in the case-study narrative (§5.4.1), not exercised live in `/demo`.

---

## 8. Open questions / deferred decisions

These do not block the next iteration but must be answered before the relevant feature lands.

1. **Reverse geocoding stations.** Browsers don't do it natively. Options when revisited: Google Places (API key + cost), Nominatim (free, terms restrict heavy use), self-curated favorites list. Decision deferred until a "stations" view is built.
2. **Offline-sync conflict resolution.** If a user adds the same fill-up on two offline devices, both will sync. Iteration scope assumes this won't happen in practice (one driver, one phone). Revisit if duplicates appear.
3. **Removing OCR — what becomes of old `photo_url` values?** Migration drops the column. Existing pump-photo blobs in Vercel Blob are orphaned. Acceptable to leave them; a separate cleanup script can purge later.
4. **Hardcoded-event migration idempotency.** Need a stable key (e.g. `(date, title)` unique constraint or upsert on a synthetic slug) to make `db:seed` safe to re-run after the migration.
5. **Filter UI shape on public home vs dashboard.** Same component, but the public page has no "save as default" need. Default to identical UI; revisit if user feedback diverges.
6. **Demo sandbox storage + reset cadence (§5.4.3).** ✅ RESOLVED — `web/docs/adr-demo-sandbox.md`: client-side `sessionStorage` overlay; reset on tab close + 24h soft TTL.
7. **Demo abuse controls (§5.4.3).** ✅ RESOLVED by the same ADR: no server write surface exists, so no rate limiting/cleanup is needed — only a client-side overlay-size cap.
8. **Showcase identity content (§5.4.1).** Owner must supply: exact name, one-line bio, GitHub repo + profile URLs, LinkedIn URL, and `resume.pdf`. Left as content TODOs — not invented.
9. **Architecture diagram tooling/format (§5.4.1).** Excalidraw vs Mermaid vs hand-authored SVG; pick one and commit the source alongside the exported asset.
10. **Optional offline-flow GIF/video.** A short screen-recording of the at-the-pump offline capture could strengthen the case study even though the demo is read-only. Optional; decide if worth recording.

---

## 9. Glossary

- **Owner** — the developer; the single admin; the source of public-home data.
- **Approved user** — a Clerk-authenticated user with `publicMetadata.approved === true`.
- **Pending user** — signed up but not yet approved. Stuck on `/pending`.
- **Fill-up** — one row in `gas_purchases`. One refueling event.
- **Event** — one row in `world_events`. Renders as a dashed reference line on charts.
- **Public surface** — the unauthenticated routes: the showcase home `/` and the demo `/demo`. Shows only owner data, with location stripped.
- **Showcase** — the recruiter-facing `/` (§5.4.1): hero + live charts, case study, identity footer. Product-first framing.
- **Demo / demo visitor** — an anonymous, ephemeral `/demo` session (§5.4.3) that overlays the owner's real (location-stripped) data with the visitor's own sandboxed writes. Not a real account.
- **Sandbox** — the per-session, ephemeral, write-scoped store backing the demo. Resets per session; never touches `gas_purchases`.
