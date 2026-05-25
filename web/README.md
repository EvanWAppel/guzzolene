# Gas Economics — Web App

A public web application that turns a personal gas purchase log (tracked since December 2018) into interactive charts — and lets approved users track their own fuel data with the same visualizations.

Live: **https://web-eta-six-52.vercel.app**

This is the web frontend for the [Gas Economics](../) Python project. The original tool generated static Matplotlib charts locally; this version serves those same charts interactively to anyone with a browser and adds multi-user support.

---

## What It Does

**Public home page** — anyone can visit and see the owner's gas purchase history since 2018: price per gallon over time, cost per mile vs. WTI crude oil price, total spend, and gallons pumped. Significant geopolitical events (Aramco drone attack, COVID lockdowns, Colonial Pipeline hack, Russia invading Ukraine, etc.) are marked as dashed reference lines on every chart.

**User accounts** — visitors can sign up, but access is gated. New accounts land on a `/pending` page until the admin approves them. Once approved, users get their own dashboard where they can log fill-ups and generate the same charts against their own data.

**World events overlay** — users can search Wikipedia directly from the chart page, pick an article, set a date, and pin it as a reference line on their own charts. The same feature populates the owner's public charts with the hardcoded events from the Python project.

**Admin panel** — the owner can approve or deny pending users from `/admin`.

---

## How It's Built

### Framework — Next.js 16 (App Router)

Every page is a React Server Component by default, meaning data fetching happens on the server before anything is sent to the browser. The home page is statically regenerated every hour (`revalidate = 3600`) — it's fast for visitors and cheap on database calls. Interactive pieces (charts, search, the upload form) are marked `"use client"` and run in the browser.

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

The six visualizations from the Python project are re-implemented as React components using Recharts, a chart library built for React. Each chart is a Client Component that receives pre-aggregated monthly data as props from the Server Component page. The aggregation logic in `lib/aggregations.ts` mirrors the Python `utils.monthly_avg()` function — grouping raw fill-ups by month and averaging the values.

WTI crude oil prices for the cost-per-mile chart are fetched from Yahoo Finance's JSON API at build/request time, replacing the static `oil_prices.csv` from the Python project.

World events appear as `<ReferenceLine>` components from Recharts — vertical dashed lines with rotated labels, staggered at four y-positions to avoid overlap.

### Wikipedia Integration

The event search in the charts page calls the Wikipedia API directly from the browser — no backend needed, no API key required. The `searchWikipedia()` function in `lib/wikipedia.ts` hits the public `w/api.php` endpoint with `action=query&list=search`. Results show in a dropdown; the user picks one and chooses a date (Wikipedia search results don't reliably contain a single canonical date, so this is manual), and the event is saved to `world_events` via a Server Action.

### Route Protection — Proxy

Next.js 16 replaced `middleware.ts` with `proxy.ts`. The `proxy` function wraps Clerk's `clerkMiddleware`, which runs on every non-public request before the page renders. Public routes (home, sign-in, sign-up, pending, webhook) are matched with `createRouteMatcher` and let through. Everything else requires a valid Clerk session with `approved: true` or `role: admin`.

---

## Project Structure

```
web/
├── app/
│   ├── page.tsx                        # Public home — owner's charts
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
│   ├── EventSearch.tsx                 # Wikipedia search + chart pin
│   ├── HomeNav.tsx                     # Auth-aware nav (client)
│   ├── AddFillUpForm.tsx               # Fill-up entry form
│   └── RecentFills.tsx                 # Dashboard recent-fills list
├── lib/
│   ├── db/schema.ts                    # Drizzle table definitions
│   ├── aggregations.ts                 # Monthly averaging logic
│   ├── oil-prices.ts                   # Yahoo Finance WTI fetch
│   └── wikipedia.ts                    # Wikipedia search client
├── actions/
│   ├── purchases.ts                    # CRUD for gas_purchases
│   ├── events.ts                       # CRUD for world_events
│   └── admin.ts                        # Approve / deny via Clerk API
├── proxy.ts                            # Route protection
└── seed/seed-owner.ts                  # One-time CSV import
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
npm run db:seed
```

This reads `../gas_purchases.csv` and re-inserts all rows (plus the 8 hardcoded geopolitical events) as `user_id = null`.

---

## Environment Variables

| Variable | Source |
|---|---|
| `DATABASE_URL` | Neon (auto-provisioned via Vercel Marketplace) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk (auto-provisioned) |
| `CLERK_SECRET_KEY` | Clerk (auto-provisioned) |
| `CLERK_WEBHOOK_SECRET` | Clerk dashboard → Webhooks → Signing Secret |
| `ADMIN_USER_ID` | Clerk dashboard → Users → your user ID |
