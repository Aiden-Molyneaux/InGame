# game-page — first-article receipt (M4 §3.1, 2026-07-05)

> **THE FIRST ARTICLE.** The M4 §3.1 Game-page hub shell — the CARD-23 NAVIGATE target + the
> M3-deferred per-game host — built + verified through the §2 pipeline (manifest → build → murr →
> parvati). Per the first-article rule this screen + its manifest + the parvati report go to the
> **owner ALONE** before any other M4 surface is built. **HARD STOP after this.**

## TL;DR
The shell is **built and live-verified** (PLAY · EDIT-STATS · CARDS · CardDetail · lifecycle L1/L2 ·
CARD-23 NAVIGATE) at a faithful board fidelity, within a scope the backend can actually back today.
**Two owner rulings are owed** before the editors build on this — both surfaced exactly where the
first-article stop is meant to surface them:
1. **OQ-133** — the CARDS-switcher backend substrate (`card_designs`, the switcher feed, `activeCardDesignId`,
   the `/cards/*` + `/me/style-presets` routes) is **specced but not coded**, contradicting the brief's
   "already exist (api-contract 0.51)". Built the honest interim (default-card-only switcher); owner rules
   whether to build that backend now or let it ride the Styler (§3.2).
2. **OQ-134** — the `CollectionItem` response omits `notes`/`rating`, so the dossier can't read them back.
Plus a **bonus unblock**: the recurring **web-login freeze** that defeated multiple M3-R parvati passes
is **fixed** — the M4 visual pipeline now runs on web.

---

## 1. What changed (commits · files · IDs)

| Commit | What | IDs |
|---|---|---|
| `7a08939` | **fix** — web dev-loop login: target localhost on web (dodge Chrome PNA) | OQ-120 |
| `9237321` | **feat** — the Game-page shell (route + components + Collection navigate wiring) | CARD-23/22/01/18, COL-01/02/03/05, WTP-03, OQ-056/CARD-24 |
| `3b21a74` | **docs** — the manifest + m4-review-notes seed + OQ-133/134 | — |
| `763beb2` | **fix** — murr: surface EDIT save errors + guards | — |

**New code:** `apps/mobile/app/game/[id].tsx` (the screen) · `apps/mobile/src/components/game/{DualFaceHero,
StatsBack,EquipReadout,PlayDossier,CardSwitcher,CardDetailSheet,GameTabDock}.tsx` · `apps/mobile/src/
components/ConfirmSheet.tsx` (the decision-0040 destructive confirm — new, owed app-wide).
**Changed code:** `GameCard.tsx` (+`pick` 138×193 size, the board `.gcard.pick`) · `ShellNav.tsx`
(`/game` = Collection context → NavBand COLLECTION-active) · `collection.tsx` (the LIST row →
`router.push('/game/'+gameId)`, the CARD-23 NAVIGATE realization, closing the M3 S4-g deferral).
**Docs:** `docs/planning/m4/game-page-manifest.md` (the contract) · `docs/planning/m4-review-notes.md`
(seeded) · `docs/open-questions.md` (+OQ-133/134). `/health` 🟢 after the doc-graph touch.

**RTK:** no new endpoints — the shell rides the M3-live `getCollection` / `updateEntry` /
`removeEntry` / `setNowPlaying`. The switcher's card list is client-derived from `entry.card`.

## 2. The bonus unblock — the web-login freeze is FIXED (a whole-pipeline win)

The "M3-R2 trap" that blocked web visual verification across M3-R was **two compounding faults**,
reproduced and fixed this session (2026-07-05):
- **Chrome Private Network Access** silently blocked the login POST from `localhost:8082` → the LAN IP
  `192.168.68.58:4000` baked into `apps/mobile/.env` (OPTIONS preflight 200, POST dropped — the
  "freeze"). curl worked (no PNA), which is why it looked like the API was fine. **Fix:** `api.ts` now
  targets `localhost:4000` on the **web** target only; the phone (native) keeps the LAN IP untouched
  (no `.env.local`, no `:8081` touch — every documented trap respected).
- **Stale API env** — the running :4000 process predated `DEV_CORS_ORIGINS=http://localhost:8082`, so
  POST responses lacked `Access-Control-Allow-Origin`. **Fix (operational):** restarted just the API
  (Metro adopted, no cold-start) so it reloaded `apps/api/.env.dev`.
Verified end-to-end: OPTIONS→204, POST→200 with ACAO, UI login → `/collection` renders.
**Consequence:** parvati (and every future M4 surface) can now be visually verified on web.

## 3. What I assumed / decided (recorded)

- **ASSUMPTION(OQ-133) — the CARDS switcher is default-card-only.** The brief + decision 0062 assume the
  switcher endpoints "already exist"; they exist only in the contract doc (decision 0058 §7 deferred
  `card_designs`/`platforms` "to M4 with their substrates" — that backend isn't built; §3.1 is the first
  M4 surface, and cards are only *created* in the Styler §3.2). So the switcher renders the one CARD-18
  default card (client-derived) + DESIGN NEW; SET-AS-MAIN / DELETE / EDIT-IN-STYLER / community-gallery
  are structure-present, behaviour-EXPECTED. **This is the well-grounded interim; the owner may re-rule
  to build the backend now — the first-article stop is the place.**
- **Catalog facts from the entry, not `GET /catalog/games/:id`** (unbuilt) — identical fields, no visible
  divergence; only the M4 owned states are in scope (not-owned = M6).
- **Screen palette = the app's Midnight `theme.scr.bg #14121f`**, not the board-local `--scr-bg #232045`
  — one screen palette across the app (every M2/M3 screen); a 🎨 token note, not a build target.
- **L3 offline = EXPECTED(SYS-10)** — the app has no offline-detection/cache infra (M3 Collection deferred
  it identically); built L1 skeleton + L2 load-error only.
- **CARD-15 composed face = EXPECTED** — the hero renders the CARD-18 default placeholder (decision 0058 §6);
  no skia on the shell (also sidesteps any skia-on-web risk for the first article).
- **Route key = `gameId`** (CARD-07's universal handle; matches the eventual `/catalog/games/:id`).

## 4. Pipeline results

- **Browser BOOT check (mandatory) — PASSED.** Collection LIST row → `/game/:gameId` mounts clean (no
  hook/early-return crash). Live-verified: PLAY (dual-face + dossier + now-tag), EDIT-STATS form → **DONE →
  PATCH 200 round-trip**, CARDS switcher (select-ring + DESIGN NEW + EquipReadout + deferred actions), the
  tab dock, NavBand COLLECTION-active & live.
- **murr (fresh-context diff review) — 1 major, 1 minor, 1 latent; ALL FIXED (`763beb2`).** Major: the EDIT
  save swallowed server errors silently (a malformed `ownedSince`/over-cap `hours` → 422 → no feedback) →
  now surfaced + client-guarded. Minor: DONE double-fire → `disabled` guard. Latent: route-level state could
  bleed across games IF game→game nav is ever added → reset-on-`id` effect. Everything else on the attack
  surface (Rules-of-Hooks/BOOT, null-safety, PATCH body, now-playing, remove, state machine, api.ts guard,
  tokens/F-06, a11y) **probed clean**.
- **parvati (fresh-context, running app vs manifest) — 1 🚩 flag · 12 ✅ expected · 3 🎨 polish; flag CLEARED
  + 2 polish addressed (`03eb3f0`) → 0 open flags.** BOOT passed on her own login → list-row NAVIGATE; she
  walked PLAY · EDIT-STATS (+DONE round-trip) · CARDS · CardDetail · Overflow→ConfirmSheet (cancelled, seed
  intact) · ABOUT. **The one flag:** the EDIT-STATS status field offered WISHLIST, a resolved-ruling violation
  (OQ-070 · decision 0025 — WISHLIST is out of the owned editor) → fixed (`OWNED_STATUSES`, 5 chips, verified
  live). **Polish:** CardDetail ✕ (added), CARDS DELETE greyed (was danger-red-while-disabled); the
  "COMPLETED 100%" label is an app-wide COL-02 choice, left as-is. All 12 EXPECTED items were correctly
  cited (CARD-15 face, notes/rating, platforms, switcher actions, community, SHARE, ABOUT). Full report:
  `m4-review-notes.md`.

## 5. What needs the owner's eyes (the hard-stop agenda)

1. **OQ-133 ruling** — build the `card_designs` + switcher-feed backend at §3.1 now, or ride the Styler (§3.2)?
   (The interim ships a coherent default-card switcher either way.)
2. **OQ-134 ruling** — add `notes`/`rating` to the `CollectionItem` response so the dossier reads them back?
   (Small serializer + api-contract bump; they're in the DB row already.)
3. **Gate-5 taste** — does the dual-face hero + dossier + switcher *feel like the trophy case*? (The
   automation-blind judgment; this is an aesthetic surface.)
4. **Manifest-template + parvati-checklist recalibration** — the corrections from this first article fold into
   the template before §3.2 (exactly as R1-1 did in M3-R). Notably: the substrate-reality banner + the
   milestone≠board-state disambiguation are now part of the template.
5. **Two small burt/owner calls:** the CARD ARTIST provenance name renders gold (board-faithful `.cb-prov
   .p-name`, but on-screen gold = F-02 acquisitive — card-content vs chrome?); the stats-back text is denser
   than the board (F-06 9px floor vs the mockup's sub-9px back).

## 6. State-table walks
The written state-table walks for every changed predicate (section tab · PLAY↔EDIT · card select · CardDetail
sheet · ConfirmSheet · now-playing · lifecycle) live in the manifest (`game-page-manifest.md` §"State-table
walks") per the binding recalibration rule (b).
