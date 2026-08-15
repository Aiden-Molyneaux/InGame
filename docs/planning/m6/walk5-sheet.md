# Walk-5 sheet — the full iOS pass + the perf-wave probes (prepped 2026-08-08)

> The route itself is [`acceptance-suite-w4-to-now.md`](acceptance-suite-w4-to-now.md) — walk the
> whole app your way and jot notes as usual; they become the walk-5 stash. THIS sheet is what's NEW
> to probe on top, the rulings wanted, and the setup that's already done for you. Lean tags, tick
> as you go.

## Setup (state of the machine when you sit down)
- Stack: `node scripts/dev-stack.mjs up` then `doctor` — the db row now probes the CONTAINER
  (the :5432 false-green is fixed). If Docker Desktop crashed again: `docker start ingame-dev-db`.
- **Your phone lane:** `cd apps/mobile && npx expo start --dev-client` (**:8081**). ⚠ The old
  runbook line pins `REACT_NATIVE_PACKAGER_HOSTNAME=100.83.86.46` — that was the OLD box. This
  machine is **100.92.190.103** (`apps/mobile/.env` already points the API there; Tailscale ON on
  the phone). JS streams live — no rebuild needed for any of walk-5.
- **Admin console: RUNNING at `http://localhost:5173`** (detached vite; logs
  `.devstack/admin-vite*.log`). Your console login = demo_curator_m3 (admin/4 grant stands).
- Sign-in prefill is in place (dev builds only, still uncommitted). Rich walk-seed stands
  (31 Stardew cards · walkseed friends · the adopted Hades).

## A · The perf-wave device probes (R3+R5 — the freeze/windowing residue, ~5 min total)
- [ ] **The W-A7 forward-nav probe** (the one that retires the freeze question): Device →
  STICKERS, select a decal (bands/handles visible) → tap the **STORE keycap**. **PASS:** the Store
  is clean — no bands, no edit chrome. Return to Device. **PASS:** edit chrome re-publishes
  (the focusTick). Back-pop was always safe; this is the path Murr caught.
- [ ] **Motion brake:** put a marquee/embers card as the Collection hero → push a game page →
  sit 10s. **PASS:** no stutter/heat creep vs before; on RETURN the marquee resumes cleanly.
  (Frame-cost instinct call — you know what the old drag felt like.)
- [ ] **Big-shelf landing:** add a game (buried alphabetically) from add-flow → **PASS:** the
  shelf scrolls to it + pulses. While it's mid-scroll on a later try, tap the View keycap
  (shelf→grid mid-landing). **PASS:** no crash, grid re-lands or settles quietly (the stale-retry
  fix). Scroll the 18-card shelf fast. **PASS:** rows fill in without blanks/jank.
- [ ] **Flip-back beat (bless or flag):** flip a card, switch tabs, return. The flip-back now
  animates ON RETURN (freeze defers it). Documented as accepted — eyeball it once.
- [ ] **View-switch scroll reset (bless or flag):** switching shelf/grid/list now resets scroll
  to top (list remount). Old behavior kept arbitrary offsets.

## B · The two 30-second checks (carried from walk-4)
- [ ] `dismissTo` endings ×3: complete the add-flow from Collection, from a game page, from
  Discover — each ends on the RIGHT screen (no stacked ghosts; back doesn't replay the flow).
- [ ] `justAdded` on a buried row — covered by A's big-shelf landing (tick both).

## C · Owner-eye leftovers (one glance each)
- [ ] **Cool-marquee glow:** recolor a marquee frame to blue/teal — the chase light derives
  warm-pink-white (red channel saturates; faithful to the tints ruling but eyeball it).
- [ ] **No-spinner refetch:** search catalog from a settled-with-matches state — while
  refetching there's deliberately NO spinner in the slot (stale fan + MATCHING… header carry it).
- [ ] **Black-track WYSIWYG** (walk-4 note): the styler's black track vs the committed card.
- [ ] **P7 console owner-eye pile** (walk the console at :5173): your own `/me/cards` shows a
  pulled card with NO hidden badge until M7 (bless consciously) · reports queue acts on targetId
  blind · tokens in sessionStorage (documented tradeoff).

## D · Rulings wanted (say the word, I implement)
1. **Unfired landing never expires:** add a game while a status/genre filter excludes it — clear
   the filter minutes later and the shelf yanks-to + pulses it. Keep (OC-3 late-visibility) or
   bound the open window (~30s)?
2. **Flattened-thumb far rows** (the R3 follow-up seam): far shelf rows could render published
   cards' thumbs instead of live canvases past a threshold — needs a published-vs-draft split.
   Want it pre-beta, or park to M7?
3. **The sign-in prefill:** still walking, or does walk-5 end the walking phase (I revert it)?

## E · The RELEASE SOAK (the honest answer to your 60fps note — do AFTER the dev walk)
The P6 verdict was "the 30-min decay is mostly dev-runtime (RTK dev checks + LogBox)". The R1 fix
already landed; this proves the release posture. **A `soak` EAS profile now exists** (internal
distribution, NO dev client → release-mode JS baked in; same native layer + ATS exception, so it
reaches the dev API over Tailscale like the dev build does).
- Build (~5 min cloud, I can fire it on your word): `cd apps/mobile && eas build --profile soak --platform ios`
- Install from the build page/QR like any dev build (runbook §4) — it installs ALONGSIDE nothing;
  it replaces the app, so plan it after the dev-walk session, and reinstall the dev build after
  (one command, same runbook).
- **Protocol (~30 min):** replicate a walk-4-shaped session — browse tabs, open galleries +
  friend shelves, a styler session with autosave pauses, stack some game pages. Note the FEEL at
  minute 0 / 10 / 20 / 30. **PASS = no progressive decay** (constant 60fps modulo momentary
  loads). If decay persists → R4/R5 residue moves to the top and gets instrumented on-device.
- While you're in it: the marquee/embers heroes exercise the new motion brake in release mode.

## F · Appetite annex (the original sitting-batch leftovers — only if you feel like it)
- [ ] G-D re-fire demo (moderation re-report path) · [ ] §1-GO ratify · [ ] ACH no-farm demo ·
- [ ] G-K value nods (store pricing feel) · [ ] W-7 RevenueCat Android + G-J + sandbox — parked
  for the Android-lane session (next provisioning draft, on my queue).

*Findings → `walk5-notes.md` stash as usual; I triage into packets when you're done.*

## G · Perf-packet spot-checks (added post-landing 2026-08-08 — 60 seconds total)
- [ ] Card titles render in their real fonts everywhere (shelf, styler, PROOF view) and the PROOF
  flatten still exports — the new typeface cache's native asset path is web-proven, device-glance owed.
- [ ] Nothing network-weird after the API restart (gzip now on) — screens just load; if anything
  looks byte-mangled, tell me immediately.
