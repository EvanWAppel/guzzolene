# Gas Economics — Web App

A public web application that turns a personal gas purchase log (tracked since December 2018) into interactive charts — and lets approved users track their own fuel data with the same visualizations. The public surface doubles as a portfolio showcase: a product-first landing page plus a read-only demo recruiters can click through without signing in.

Live: **https://guzzo-lene.com**

This is the web frontend for the [Gas Economics](../) Python project. The original tool generated static Matplotlib charts locally; this version serves those same charts interactively to anyone with a browser and adds multi-user support.

---

## What It Does

**Showcase home page** — anyone can visit `/` and see the owner's gas purchase history since 2018: price per gallon over time, cost per mile vs. WTI crude oil price, total spend, and gallons pumped. Significant geopolitical events (Aramco drone attack, COVID lockdowns, Colonial Pipeline hack, Russia invading Ukraine, etc.) are marked as dashed reference lines on every chart. The page is framed as a portfolio piece: a product-first hero, the live charts, then a below-the-fold case study (tech stack, an architecture diagram, the key build decisions, a link to this repo) and an identity footer (GitHub, LinkedIn, résumé, email).

**Read-only demo** — anyone can open `/demo` (no sign-in) and use the real dashboard UI against the owner's real data: summary cards, the recent-fills list, and the overview chart. Visitors can add, edit, and delete fill-ups and watch the charts update — but every change is sandboxed in their own browser (see *Read-only demo* under How It's Built). A persistent banner makes the read-only state clear, and a "Reset demo" control wipes the sandbox.

**Location privacy** — fill-ups can store the GPS location of the pump, but coordinates are **never sent to an unauthenticated visitor**. The public home and the demo both read through `lib/public-data.ts`, which strips `lat`/`lng` at the database query — not just in the UI.

**User accounts** — visitors can sign up, but access is gated. New accounts land on a `/pending` page until the admin approves them. Once approved, users get their own dashboard where they can log fill-ups (date, cost, gallons, price per gallon, odometer, fuel grade, and optionally the GPS location of the pump) and generate the same charts against their own data. Every fill-up can be edited or deleted from the dashboard afterward.

**Date-range filters** — every chart page (public home and dashboard visualizations) has a filter strip with `30d` / `90d` / `1y` / `All-time` preset chips plus a custom from/to range. The range lives in the URL query string, so filtered views are shareable. Event reference lines outside the selected range are hidden along with the data.

**World events overlay** — users can search Wikipedia directly from the chart page, pick an article, set a date, and pin it as a reference line on their own charts. Events can be edited or deleted after pinning. The owner (admin role) gets an extra "Pin to public home" toggle that publishes an event to the public charts; the original hardcoded events from the Python project are seeded into the database the same way.

**Installable PWA with offline capture** — the app ships a web manifest and service worker, so it can be installed to a phone home screen (opens straight to the Log Fill-up form). Fill-ups submitted while offline are queued in an IndexedDB outbox and synced automatically when connectivity returns — on the next dashboard visit, the browser `online` event, or a background-sync nudge from the service worker. Drafts that fail to sync stay queued with the error shown on the dashboard.

**Admin panel** — the owner can approve or deny pending users from `/admin`.

---

## How It's Built

### Framework — Next.js 16 (App Router)

Every page is a React Server Component by default, meaning data fetching happens on the server before anything is sent to the browser. The home page is statically regenerated every hour (`revalidate = 3600`) when visited without filter params; with a date-range filter in the query string it renders dynamically. Interactive pieces (charts, search, the entry form) are marked `"use client"` and run in the browser.

### Database — Neon Postgres + Drizzle ORM

Gas purchases and world events are stored in a serverless Postgres database hosted on Neon, provisioned through the Vercel Marketplace. Drizzle ORM provides a type-safe query layer — the schema in `lib/db/schema.ts` defines two tables:

- `gas_purchases` — one row per fill-up, with a `user_id` column. Rows where `user_id` is `null` belong to the owner and are shown on the public home page.
- `world_events` — events pinned to charts, same `user_id = null` convention for the owner's public events.

Because Neon is serverless, connections are opened per-request via HTTP rather than a persistent pool — this is handled by `@neondatabase/serverless`.

### Auth — Clerk

Clerk manages sign-up, sign-in, and session tokens. The approval flow works through Clerk's `publicMetadata` field on each user object:

- When someone signs up, a Clerk webhook fires a `user.created` event to `/api/webhooks/clerk`, which sets `publicMetadata.approved = false`.
- The proxy (Next.js 16's replacement for middleware) checks this metadata on every request. If a signed-in user's `approved` field isn't `true`, they're redirected to `/pending`.
- The admin sets `approved: true` via the Clerk Backend API, called from a Server Action in `/admin`.
- The admin themselves is identified by `publicMetadata.role = "admin"`, set manually once in the Clerk dashboard.

This means there's no `users` table in the database — all identity and approval state lives in Clerk.

### Charts — Recharts

The six visualizations from the Python project are re-implemented as React components using Recharts, a chart library built for React. Each chart is a Client Component that receives pre-aggregated monthly data as props from the Server Component page. The aggregation logic in `lib/aggregations.ts` mirrors the Python `utils.monthly_avg()` function — grouping raw fill-ups by month and averaging the values — and accepts an optional `{from, to}` range parsed from the URL by `lib/filters.ts`.

WTI crude oil prices for the cost-per-mile chart are fetched from Yahoo Finance's JSON API at build/request time, replacing the static `oil_prices.csv` from the Python project.

World events appear as `<ReferenceLine>` components from Recharts — vertical dashed lines with rotated labels, staggered at four y-positions to avoid overlap.

### Wikipedia Integration

The event search in the charts page calls the Wikipedia API through a Server Action (`searchWikipedia()` in `actions/wikipedia.ts`), which hits the public `w/api.php` endpoint with `action=query&list=search`. Running the fetch server-side (rather than directly from the browser) avoids cross-origin and content-blocker failures seen in installed iOS PWAs, and no API key is required. Results show in a dropdown; the user picks one and chooses a date (Wikipedia search results don't reliably contain a single canonical date, so this is manual), and the event is saved to `world_events` via another Server Action. Search errors and empty results are surfaced in the UI.

### PWA — Manifest, Service Worker, Offline Outbox

`public/manifest.webmanifest` plus a minimal service worker (`public/sw.js`, registered by `components/PWARegister.tsx`) make the app installable. To install: open the site in Chrome/Safari on your phone → browser menu → **Add to Home Screen** (Chrome shows an install prompt automatically). The installed app launches in standalone mode straight to `/dashboard/add`.

Offline support is an outbox, not a full offline app: when the add form detects `navigator.onLine === false`, the draft goes into an IndexedDB `outbox` store (`lib/offline-outbox.ts`) instead of the server action. `components/OutboxSync.tsx` (mounted in the dashboard layout) drains the outbox through `createPurchase` on mount, on the `online` event, and on a background-sync message from the service worker. Successful drafts are deleted; failures stay queued with the error displayed.

### Recruiter Showcase & Read-Only Demo

The public home (`/`) is composed of small presentational components — `ShowcaseHero`, `TechBadges`, `ArchitectureDiagram` (accessible HTML/CSS, not an image), `CaseStudy`, `SiteFooter` — above and below the reused chart components. The charts are fed by `listPublicPurchases()` in `lib/public-data.ts`, which projects an explicit column set that **omits `lat`/`lng`**, enforcing the location-privacy invariant at the query rather than the view.

The demo (`/demo`) lets an anonymous visitor exercise the dashboard without an account. Its design is recorded in [`docs/adr-demo-sandbox.md`](docs/adr-demo-sandbox.md). The key decision: **there is no server write path from the demo.** The page server-renders the same location-stripped base data and hands it to a client component (`DemoDashboard`) that holds the visitor's changes in a **`sessionStorage` overlay** (`lib/demo-overlay.ts`):

- **Reads** = the owner's real history, location stripped.
- **Writes** (add / edit / delete) live only in the overlay and are merged over the base on the client — base rows get edit-overrides or delete-tombstones; new rows are appended. The reused `AddFillUpForm` and `RecentFills` accept optional demo callbacks that route mutations to the overlay instead of the server actions.
- **Reset** = `sessionStorage` clears when the tab closes (so a fresh session starts from the base only), plus a 24h soft TTL and an explicit "Reset demo" button.
- Because nothing reaches the server, the owner's real `gas_purchases` data is *structurally* untouchable — not guarded by a permission check. That also means there is no anonymous write surface to rate-limit; the only cap is a per-session overlay size limit. Geolocation, if granted, is captured by the form but discarded in demo mode.

### Route Protection — Proxy

Next.js 16 replaced `middleware.ts` with `proxy.ts`. The `proxy` function wraps Clerk's `clerkMiddleware`, which runs on every non-public request before the page renders. Public routes — exported as `PUBLIC_ROUTES` (home `/`, the demo `/demo`, sign-in, sign-up, pending, webhook) — are matched with `createRouteMatcher` and let through. Everything else requires a valid Clerk session with `approved: true` or `role: admin`.

---

## Project Structure

```
web/
├── app/
│   ├── page.tsx                        # Showcase home — hero, charts, case study, footer
│   ├── demo/page.tsx                   # Public read-only demo (no auth)
│   ├── pending/page.tsx                # Awaiting approval screen
│   ├── sign-in / sign-up              # Clerk-hosted auth UI
│   ├── dashboard/                      # Auth + approval gated
│   │   ├── page.tsx                    # Summary + overview chart
│   │   ├── add/page.tsx                # Log a fill-up
│   │   └── visualizations/page.tsx     # Full charts + event search
│   ├── admin/page.tsx                  # Approve / deny pending users
│   └── api/
│       └── webhooks/clerk/             # Sets approved: false on sign-up
├── components/
│   ├── charts/                         # Recharts chart components
│   ├── ShowcaseHero.tsx                # Product-first hero (home)
│   ├── TechBadges.tsx                  # "Built with" stack strip (home)
│   ├── ArchitectureDiagram.tsx         # Accessible HTML/CSS system diagram (home)
│   ├── CaseStudy.tsx                   # Decisions/tradeoffs + source link (home)
│   ├── SiteFooter.tsx                  # Identity + links + demo CTA (home)
│   ├── DemoDashboard.tsx               # Demo orchestrator over the sandbox overlay
│   ├── DateRangeFilter.tsx             # Preset chips + custom range (URL-driven)
│   ├── EventSearch.tsx                 # Wikipedia search + chart pin
│   ├── EventList.tsx                   # Pinned events with edit/delete
│   ├── HomeNav.tsx                     # Auth-aware nav (client)
│   ├── AddFillUpForm.tsx               # Fill-up entry form (geo + offline queue; demo callback)
│   ├── OutboxSync.tsx                  # Drains offline outbox on dashboard
│   ├── PWARegister.tsx                 # Service worker registration
│   └── RecentFills.tsx                 # Recent fills with edit/delete (demo callbacks)
├── lib/
│   ├── db/schema.ts                    # Drizzle table definitions
│   ├── public-data.ts                  # Location-stripped read for public/demo surfaces
│   ├── demo-overlay.ts                 # Client-side sessionStorage demo sandbox
│   ├── aggregations.ts                 # Monthly averaging logic
│   ├── filters.ts                      # Date-range query param parsing
│   ├── offline-outbox.ts               # IndexedDB draft queue
│   ├── oil-prices.ts                   # Yahoo Finance WTI fetch
│   └── wikipedia.ts                    # Wikipedia search client
├── actions/
│   ├── purchases.ts                    # CRUD for gas_purchases
│   ├── events.ts                       # CRUD for world_events
│   └── admin.ts                        # Approve / deny via Clerk API
├── docs/
│   └── adr-demo-sandbox.md             # ADR: demo sandbox storage decision
├── public/
│   ├── manifest.webmanifest            # PWA manifest
│   ├── resume.pdf                      # Bundled résumé (linked from the footer)
│   └── sw.js                           # Service worker (install + background sync)
├── proxy.ts                            # Route protection (exports PUBLIC_ROUTES)
└── seed/
    ├── seed-owner.ts                   # One-time CSV import (purchases)
    └── seed-owner-events.ts            # Owner's public events (idempotent upsert)
```

---

## Local Development

```bash
cd web/
vercel env pull .env.local --yes   # pull all env vars from Vercel
npm install
npm run dev
```

The app runs at `http://localhost:3000`. All env vars (database, Clerk) come from the Vercel project — no manual `.env` editing needed after the initial pull.

### Re-seeding Owner Data

If the source CSV changes:

```bash
npm run db:seed          # gas purchases from ../gas_purchases.csv
npm run db:seed-events   # the 8 geopolitical events (idempotent upsert)
```

Both insert rows as `user_id = null` (owner-public data).

---

## Environment Variables

| Variable | Source |
|---|---|
| `DATABASE_URL` | Neon (auto-provisioned via Vercel Marketplace) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk (auto-provisioned) |
| `CLERK_SECRET_KEY` | Clerk (auto-provisioned) |
| `CLERK_WEBHOOK_SECRET` | Clerk dashboard → Webhooks → Signing Secret |
| `ADMIN_USER_ID` | Clerk dashboard → Users → your user ID |
