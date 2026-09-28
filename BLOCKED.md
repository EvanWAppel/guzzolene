# BLOCKED — what I need from Evan

- [ ] 🟡 **Add `SNAPSHOT_SIGNING_SECRET` to Vercel env** (needed for shareable snapshot URLs, §5.7, before they work in production). Generate a long random secret — e.g. `openssl rand -hex 32` — then add it to the Guzzolene Vercel project (Settings → Environment Variables, or `vercel env add SNAPSHOT_SIGNING_SECRET`) and to `web/.env.local` for local dev. It's an app-owned signing secret (not a personal-account credential), so it clears the personal-key guardrail. Until it's set, the share button simply doesn't render and `/s/<token>` routes error — the rest of the app is unaffected.

<!-- Resolved 2026-09-27: scoped, rate-limited, spend-capped Anthropic workspace key
     confirmed for the photo fill-up feature (§5.5). Stream H unblocked. -->
