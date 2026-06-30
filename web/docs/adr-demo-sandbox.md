# ADR: Demo sandbox storage + reset mechanism

**Status:** Accepted
**Task:** G-1 (TASKS.md, Stream G)
**Implements:** PRD §5.4.3 (read-only demo), resolves PRD open questions §8.6 (storage + reset) and §8.7 (abuse controls)
**Date:** 2026-06-28

---

## Context

`/demo` lets an unauthenticated recruiter feel the dashboard and add-fill-up flow
without signing in (no Clerk). The behavior we committed to in the PRD:

- **Reads** = the owner's real fill-up history with `lat`/`lng` stripped (via the
  G-3 location-stripped public read).
- **Writes** (add / edit / delete) land **only in the visitor's session sandbox**,
  layered over the read-only base so the change appears immediately.
- The owner's real `gas_purchases` data is **never** mutated.
- The sandbox is **ephemeral**: a fresh session starts from the base only, and old
  sandboxes expire.

The decision this ADR makes: **where does the per-session sandbox state live, and
how does it reset.**

### Constraints that drive the decision

1. **Vercel functions are stateless.** A process-memory `Map` does not survive
   across invocations or regions — it is not an option for cross-request state.
2. **Anonymous + writeable = an abuse surface** *if and only if* writes hit a
   server-side store. Whatever we pick, the abuse exposure is a direct function of
   whether anonymous visitors can write to our infrastructure.
3. **`claude.md`: do not hide or wrap errors.** Fewer moving parts = fewer
   silent-failure modes to get wrong.
4. **The base data is already public.** The location-stripped history is rendered
   on `/` to anyone. Shipping that same base to the demo client is *not* a new
   disclosure.
5. **The demo's job is to convey UX feel, not to be inspected over the wire.** The
   real server/DB architecture is conveyed by the case study (§5.4.1) and the
   source link — not by what a recruiter finds in the demo's network tab.

---

## Options considered

### Option A — Client-side session overlay (CHOSEN)

Base (stripped real data) is fetched server-side and shipped to the demo client as
props. A small overlay module holds the visitor's writes in **`sessionStorage`**
and merges base + overlay in the (already client-side) chart and row components.

- **Storage:** `sessionStorage`, key `guzzolene:demo-sandbox`, a JSON document of
  the visitor's mutations.
- **Reset:** `sessionStorage` is per-tab and cleared when the tab/session closes —
  reset is the platform default, not code we maintain. Plus an explicit
  "Reset demo" button and a stored `createdAt` for a soft TTL check on load.
- **Real-data safety:** *structural* — there is no server write path from `/demo`
  at all, so touching `gas_purchases` is impossible, not merely guarded.
- **Abuse (§8.7):** **eliminated.** No anonymous server write surface ⇒ no rate
  limiting, no row-growth, no cleanup job. G-24 collapses to a client-side cap on
  overlay size (cosmetic).
- **Cost/infra:** zero. No new env var, table, migration, cron, or dependency.
- **Cons:** does not exercise a real server-action write path in the demo (not
  observable by the recruiter anyway); overlay state does not survive a hard reload
  or move between devices (irrelevant for a throwaway demo session).

### Option B — Postgres table `demo_sandbox_purchases` (server-side, TTL column)

Anonymous cookie-keyed session id; demo writes go to a separate, namespaced table
with a `session_id` + `expires_at`; overlay merge happens server-side; lazy purge
of expired rows on read plus a Vercel Cron sweep.

- **Pros:** exercises a real write path; centralized; merge is clean server-side.
- **Cons:** anonymous writes hit our DB ⇒ **must** build per-session caps + rate
  limiting + a purge job (all of §8.7). Neon row growth. More surface area to get
  the "real data untouched" guarantee right (enforced by code, not structure).
  Highest effort for a read-only demo.

### Option C — Upstash Redis (KV with native TTL)

Same cookie-keyed session id; sandbox document stored in Redis with a native TTL.

- **Pros:** native expiry (no sweep job), isolates demo data from the app DB, fast,
  and a "modern marketplace integration" talking point.
- **Cons:** adds a dependency + integration + env var; still an anonymous server
  write surface ⇒ still needs rate limiting and write caps. More infra than the
  demo's value justifies.

---

## Decision

**Adopt Option A — client-side `sessionStorage` overlay.**

It is the only option that makes "the owner's real data is never mutated" a
*structural* guarantee instead of a code-enforced one, and it deletes the entire
abuse / TTL-sweep / cleanup workstream that the server-side options drag in. It
fits the demo's actual purpose (feel the UX) and the project's "top priority,
minimal infra, wrap the tool as built" framing. The base data it ships is already
public, so there is no new disclosure. The production architecture that
demonstrates "modern stack fluency" is shown via the case study and source link,
not via the demo's write path.

### Refinement of the PRD wording

PRD §5.4.3 / §2 describe a "cookie-keyed session sandbox." This ADR refines that to
a **client-side `sessionStorage` overlay** (no cookie needed; the session boundary
is the browser tab). The PRD's *intent* — anonymous, per-session, ephemeral,
real-data-safe — is unchanged. Update those two PRD passages to say "client-side
per-session overlay" when convenient; not a blocker.

---

## Consequences / implementation contract

This is the contract the downstream G tasks build against.

### Overlay document shape (`sessionStorage`)

```jsonc
{
  "createdAt": "<ISO timestamp, stamped on first write>",
  "added":   [ /* full demo fill-up objects, client-generated id prefixed "demo-" */ ],
  "edits":   { /* baseRowId -> partial field overrides */ },
  "deleted": [ /* baseRowId tombstones */ ]
}
```

### Merge rules (applied client-side before render)

1. Start from the base array (real, location-stripped, from the server).
2. Drop any base row whose id is in `deleted`.
3. Apply `edits` field-overrides to matching base rows.
4. Concatenate `added` rows.
5. Sort by date as the normal dashboard does.

Charts and the row list (both client components in `/demo`) consume the merged
array. The add form reuses the real form component; on submit in demo mode it calls
the overlay module instead of the `createPurchase` server action.

### Reset / TTL

- Primary reset: `sessionStorage` clears on tab close (per-session by construction).
- Soft TTL: on load, if `now - createdAt > 24h`, discard the overlay and start
  fresh. (24h is a backstop; tune freely — it has no infra cost.)
- Explicit "Reset demo" control clears the key.

### Location is discarded in demo (PRD §5.4.3, task G-23)

The demo add path never stores or displays captured `lat`/`lng`. The overlay
document has no location fields. Combined with the server-side strip (G-3), this
keeps the §5.4.2 invariant — *no `lat`/`lng` in any `/` or `/demo` payload* —
trivially true: the base ships without it and the overlay never adds it.

### Errors surface (`claude.md`)

`sessionStorage` access can throw (quota, privacy mode). The overlay module must
let those throw / surface a visible banner — never swallow and silently no-op a
visitor's "save."

### Impact on existing G tasks

- **G-13 / G-14** — "cookie session bootstrap" becomes "initialize the
  client-side overlay module" (read/parse `sessionStorage`, soft-TTL check). No
  cookie, no server session.
- **G-17 / G-18 / G-19** — sandbox = the overlay module; "real `gas_purchases`
  unchanged" is now structural (there is no server write path to assert against —
  assert instead that the demo submit calls the overlay, not `createPurchase`).
- **G-20 / G-21** — reset is `sessionStorage` semantics + soft TTL (above).
- **G-24** — **reduced to a client-side overlay-size cap** (e.g. refuse > N added
  rows with a surfaced message). No server rate limiting / no purge job needed.

### Net infra added by the demo

None. No table, no migration, no cron, no env var, no dependency.
