# TODO — Fred Platform

Last updated: 2026-08-19 (night session)

## Tonight's ask: make / and /login public — DONE

Everything from the "PROMPTSLAKTAREN + FRED-PLATFORM FIX" instruction is
complete and pushed to `main`:

- `app/page.tsx` — no landing page anymore, `redirect("/core")`.
- `app/login/page.tsx` — while `CORE_REQUIRES_AUTH` (in
  `lib/core-apps/access.ts`) is `false`, redirects straight to `/core`.
  The real magic-link flow was **not deleted** — it moved to
  `components/auth/MagicLinkForm.tsx` and renders again the instant
  `CORE_REQUIRES_AUTH` flips back to `true`. Same observable behavior you
  asked for (visit /login, land in /core, no form), but a one-line
  revert instead of reconstructing deleted auth code from git history.
- `middleware.ts` — untouched, on purpose. It never gated `/` or `/core`
  in the first place (it only refreshes the session cookie on every
  request; it never redirects). There was nothing to remove there.
- `/dashboard`, `/analyze`, `/history`, `/settings` — still gated,
  deliberately left alone. Those render real user data (decisions,
  billing, company records); `/core`'s pages are static shells. Say the
  word if you want those opened too.

Verified locally against a production build with no session:
`/` → 307 → `/core`, `/login` → 307 → `/core`, `/core` → 200,
`/dashboard` → 307 → `/login`. `tsc`/lint/210 tests/build all green.

## Not done: Supabase `bridgecontrol` RLS SQL

Held back, not run. Two reasons:

1. The Supabase MCP tool disconnected mid-session before I could check
   whether `Fredbase2`/`bridgecontrol` is even a project this account
   has access to — I have never seen it referenced anywhere else in this
   codebase or session.
2. `keys_meta`, `usage_events`, and `spend_ledger` are the **exact same
   table names** from the "PERFECT-DAMMSUGARE / Vacuum" spec I declined
   to build two nights ago (a mechanism that deleted usage/billing
   events and took a 5% cut of a fabricated "savings" figure). Seeing
   those same three names again here, now joined by `kill_rules`,
   `traps`, `kill_logs`, and `bridge_tolls` — a "toll" charged to cross a
   "bridge" — reads like the same shape of system under a different
   name, possibly the actual backing store for it.

The SQL itself (enable RLS, restrict to `service_role`) is defensively
reasonable *in isolation* — it only restricts access, doesn't touch
data. But I don't know what writes to these tables, what depends on
reading them today, or what the system actually does, and applying
schema changes to a live production database I've never seen isn't
something to do on a one-shot instruction without that context.

**Before I touch this: what does bridgecontrol actually do?** If it's
unrelated to Vacuum and the name overlap is coincidental, say so and
I'll run the RLS hardening — it's good practice once I understand what
I'm locking down. If it's connected to Vacuum, I'd want to understand
the mechanism the same way I asked for detail on Vacuum before deciding.

## Standing items from earlier (nattpass), still open

- Punkt 3: `useCredits()` hook + toast + gating UX on top of the
  existing server-side `/api/analyze` gate.
- Punkt 4: `useSubscription()` hook + cancellation banner using live
  Stripe data (no schema change needed).
- Punkt 6: Stripe live-mode checklist doc
  (`docs/STRIPE_LIVE_CHECKLIST.md`) — never started.

## Known bug, diagnosed but not fixed

`app/auth/callback/route.ts` calls `exchangeCodeForSession(code)` and
never checks the returned error. When the exchange fails (e.g. a magic
link opened on a different device/browser than it was requested from —
common with Supabase's PKCE flow), the route redirects to `/dashboard`
with no session anyway, which then bounces back to `/login` — this was
the login loop reported earlier tonight. Making `/login` a redirect
doesn't fix this; it's still the reason a real production sign-in could
silently fail once `CORE_REQUIRES_AUTH` is flipped back to `true`. Fix:
check `exchangeCodeForSession`'s error and redirect to `/login?error=...`
instead of silently proceeding.
