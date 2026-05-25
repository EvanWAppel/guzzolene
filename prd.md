# Guzzolene — Product Requirements

**One-liner:** A personal fuel-economy tracker. Log fill-ups, see fuel-cost and efficiency trends over time, and overlay geopolitical events for context.

**Audience for this PRD:** an AI coding agent (Claude Code). Sections are structured for direct loading as task context. File paths reference the current repo layout.

---

## 1. Product thesis

A practical app for one driver to record gasoline purchases and visualize the resulting trends. The geopolitical-event overlay is one feature among several — not the product's reason for existing.

Origin: the owner has logged every fill-up for a 2018 Mazda 3 Sport since December 2018. The original tool was a Python notebook that produced static Matplotlib charts. The web app is the active product; the notebook is preserved but frozen.

---

## 2. Users and access model

- **Owner** — one person (the developer). Sole admin. Owner data is shown on the public home page with `user_id = null` rows.
- **Invited friends** — sign up via Clerk, land on `/pending`, gain a dashboard only after the owner approves them from `/admin`. Approval is recorded in Clerk `publicMetadata.approved`.
- **Public visitors** — read-only view of the owner's charts at `/`. No sign-in required.

This model is intentional and stays small. See non-goals (§7) for what is excluded.

---

## 3. Surfaces

Two surfaces, treated as one product:

| Surface | Path | Status |
|---|---|---|
| Web app (Next.js 16 App Router) | `web/` | **Active.** All roadmap work lands here. |
| Python notebook + CLI | `main.py`, `utils.py`, `scratch.ipynb` | **Frozen.** Documented for historical context; no roadmap items. |

The Python surface reads from `gas_purchases.csv` and writes PNGs to `images/`. Its analyses (monthly aggregation, WTI overlay, event lines) were the original spec the web app reimplements.

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

---

## 6. Cross-cutting requirements

- **Mobile parity.** Every roadmap item must work on iPhone Safari at 390px width. Desktop should not regress.
- **Type safety.** Drizzle schema is the source of truth; do not bypass with raw SQL where a query builder works.
- **No new auth surfaces.** Approval flow stays exactly as documented in §4.6. Do not add password reset, email verification beyond Clerk's defaults, etc.
- **Errors surface.** Per `claude.md`: do not hide or wrap errors. Failed offline-sync attempts must be visible to the user, not silently retried forever.

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

---

## 8. Open questions / deferred decisions

These do not block the next iteration but must be answered before the relevant feature lands.

1. **Reverse geocoding stations.** Browsers don't do it natively. Options when revisited: Google Places (API key + cost), Nominatim (free, terms restrict heavy use), self-curated favorites list. Decision deferred until a "stations" view is built.
2. **Offline-sync conflict resolution.** If a user adds the same fill-up on two offline devices, both will sync. Iteration scope assumes this won't happen in practice (one driver, one phone). Revisit if duplicates appear.
3. **Removing OCR — what becomes of old `photo_url` values?** Migration drops the column. Existing pump-photo blobs in Vercel Blob are orphaned. Acceptable to leave them; a separate cleanup script can purge later.
4. **Hardcoded-event migration idempotency.** Need a stable key (e.g. `(date, title)` unique constraint or upsert on a synthetic slug) to make `db:seed` safe to re-run after the migration.
5. **Filter UI shape on public home vs dashboard.** Same component, but the public page has no "save as default" need. Default to identical UI; revisit if user feedback diverges.

---

## 9. Glossary

- **Owner** — the developer; the single admin; the source of public-home data.
- **Approved user** — a Clerk-authenticated user with `publicMetadata.approved === true`.
- **Pending user** — signed up but not yet approved. Stuck on `/pending`.
- **Fill-up** — one row in `gas_purchases`. One refueling event.
- **Event** — one row in `world_events`. Renders as a dashed reference line on charts.
- **Public surface** — `/`, viewable without sign-in. Shows only owner data.
