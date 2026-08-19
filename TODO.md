# TODO — Fred Platform

Last updated: 2026-08-19 (night session)

## Radar 06 — shipped as internal command console (0a27add)

Commit `5d0ed2d` landed on `main` mid-session shipping Radar 06 as a chat
that called the Anthropic API directly (`ANTHROPIC_API_KEY`, streaming) on
a public, no-auth page, with a system prompt describing Fred's own
security posture — the opposite of "internal command console, no external
LLM" that was explicitly asked for earlier the same night. Reverted and
rebuilt:

- `app/api/radar/route.ts` — `POST {message}`, matches against Fred's own
  APIs only. `help`/`status` need no auth; `beslut`/`decisions`/`saldo`
  are session-gated the same way `/api/intake` and `/api/invoice-proxy`
  already are.
- `tolls`, `vacuum status`, `bridge stop` are **stubs that say so**, not
  fabricated output. They'd need the bridgecontrol Supabase project
  (`azcbgxbkbxdmpgschhau`), which Fred-platform has no credentials for —
  and `bridge stop` would `INSERT INTO kill_rules`, a real production
  kill-switch, from a page anyone can reach with no login. That's a
  decision to make on purpose, not a side effect of a command list. Say
  the word if you want it wired for real (needs a second Supabase
  client + service-role key + an explicit call on whether it should stay
  public).
- `components/core/RadarConsole.tsx` — reuses `PressureMeter` from the
  reverted commit, but feeds it the real live/total ratio from the
  existing core-app health checks instead of the original's random
  jitter.
- **Separately noticed, not fixed tonight**: `/core/vacuum` shows fixed
  numbers ("8 400/1 600", "24,8 MB sparat", "AUTO-VACUUM ON") — plain JSX
  strings, no data source. Flagging it since it's the same shape of issue
  as what got reverted here.

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

## Supabase `bridgecontrol` RLS — written, still not executed

You confirmed bridgecontrol (Promptslaktaren's production DB for
HERDPRISM/LEASEBRO/DRAINCACHE/STORMKROK) is a different system from
Vacuum, just copy-pasted table names — checked this against the actual
`promptslaktaren` repo and it holds up: `kill_rules`, `traps`,
`proxy_routes`, `spend_ledger`, `kill_logs`, `keys_meta`, `usage_events`
are all read/written server-side only, through a service-role Supabase
client, so locking them to `service_role`-only shouldn't break anything.

The migration is written and pushed to `jonjys/promptslaktaren` at
`supabase/migrations/20260820_bridgecontrol_rls.sql`, idempotent
(`drop policy if exists` before each `create policy`) and includes a
`pg_policies` check query in its header comment. **Not yet run** — this
session has no Supabase MCP connection, so I can't execute SQL or check
Security Advisors directly. Run it via the SQL Editor for project
`azcbgxbkbxdmpgschhau`, or hand it to a session that has Supabase access.

Separate, still-unanswered from the same review: `src/lib/tolls/{prism,
drain}.ts` in `promptslaktaren` — `classifyHerd()` always returns
`'REAL'` and `isDuplicateFingerprint()` always returns `false`, regardless
of input, while each toll module exports a fixed take-rate constant
matching the 4.1%/2.4%/5.5%/1.7% figures. Nothing else in the app
references these yet (not wired into a live billing path), but before
anything does: is that stub-as-classifier pattern known placeholder code,
or intended to ship as the actual detection logic? Haven't heard back on
this one.

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
