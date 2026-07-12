# COL-12 — Collection card peek-flip · handoff (paste-once, for a fresh session)

> You are picking up **COL-12**, the collection card peek-flip — a **spec'd-but-unbuilt M4 item**
> (deferred from M3; `collection.tsx:26` notes "the COL-12 peek-flip rides M4"). It slipped through the
> surface-by-surface M4 build because it's a Collection feature, not one of the editor surfaces. Its
> prerequisites are now all in place. Your job: **ground → (manifest-first) → build → verify (murr +
> parvati) → receipt + HARD STOP.** Commit only when the owner asks. This is greenfield-on-an-existing-
> screen: you're adding a mode to the Collection, not rebuilding it.

## 0 · The one thing to understand
COL-12 is **the FLIP mode of the card-tap four-mode law (CARD-23)**. Today every Collection card taps to
**NAVIGATE** (→ the Game page). COL-12 changes the **shelf + grid** views so a tap **flips the card in
place to its stats back** instead — a transient peek, no navigation. The back carries the navigation
(VIEW GAME); a **long-press** is the navigate shortcut; the **dense-list** view is unchanged (it already
prints the stats, so its tap stays NAVIGATE). Do **not** break the other three tap modes.

## 1 · Ground first (read in this order)
1. `AGENTS.md`/`CLAUDE.md` → `docs/00-INDEX.md` (truth-precedence + the change protocol §4). **Triage:**
   COL-12 is already fully specified — this is a **build**, so the doc work is a design-spec §2.1 note +
   the manifest, **not** a product-spec change (behaviour is spec'd).
2. **product-spec** `docs/spec/product-spec.md`: **COL-12** (the full behaviour — read it verbatim) +
   **CARD-23** (the four-mode tap law; FLIP is mode 2) + **CARD-01** (the standardized stats back).
3. **design-spec** `docs/design/design-spec.md`: §2.1 (Collection) + §1.5 GameCard interaction note
   (the CARD-23 grammar) + the DualFaceHero note in §2.4b (the Game-page hero already does a front↔back
   `.flipy` card — your visual + structural reference).
4. **api-contract** `docs/spec/api-contract.md` `GET /me/collection`: the item shape already carries
   everything the back needs — `hours · percentComplete · status · ownedSince` + the card's rider
   **`designer { userId, username }`** (the "CARD ARTIST" provenance). **No API change needed.**
5. **The code you extend + reuse:**
   - `apps/mobile/app/(tabs)/collection.tsx` — `ShelfView` · `GridView` · `ListView` · `TopView`. Every
     card currently `onPress={() => router.push('/game/${i.gameId}')}` (NAVIGATE). This is where FLIP goes.
   - **`apps/mobile/src/components/game/StatsBack.tsx`** — **ALREADY BUILT**: the CARD-01 stats back
     (`hours · percent · status · since · artist` + width/height). **Reuse it** as the flip's back face
     (it draws the F-02 `.flipy` stepped silhouette). Do NOT fork GameCard.
   - `apps/mobile/src/components/GameCard.tsx` — the front face; note its `/hero|grid|cell|mini` sizes.
   - **`apps/mobile/src/a11y/useReducedMotion.ts`** — **ALREADY BUILT** (the CARD-16 pass): the flip's
     reduce-motion fallback reads this (instant swap, no 3D spin).
   - `apps/mobile/src/store/prefsSlice.ts` (redux-persist) — where the first-run-coachmark "seen" flag lives.
6. `docs/decisions/0044-...` (§104 reduce-motion + §105 a11y — the flip must honour both) · `0048`
   (card-tap grammar) · `0026` (why the flip exists) · `0071` (the beta re-timed to M6 — COL-12 is a P1
   M4 item but **not release-blocking**; still build it to close M4).

## 2 · The behaviour (COL-12, precisely)
- **Views:** **shelf + grid** flip. **Dense-list stays NAVIGATE.** **TOP view** (`TopView`) *also* flips
  per **COL-13** ("cards flip, COL-12") — include it, but if it's fiddly, scope the core to shelf+grid
  and flag TOP as a follow-on (confirm with the owner).
- **Tap (front):** flips in place to the CARD-01 stats back (`StatsBack`). **Tap (back):** flips back to
  the art face. **Long-press (either face):** the NAVIGATE shortcut → the Game page (`/game/:gameId`).
- **The back** shows (own collection): **HOURS · % COMPLETE · STATUS · OWNED SINCE · CARD ARTIST +
  designer**. A **VIEW GAME** action on the back → the Game page. (`StatsBack` already lays these out.)
- **Transient:** the flip is **not persisted** — it resets on **leaving the Collection screen** and on
  **switching view-mode** (shelf↔grid↔list↔top). State lives in the Collection screen (e.g. a
  `flippedEntryId: string | null`, or a `Set`), cleared on view change + on blur/unmount. One-at-a-time
  or many-flipped is your call — the spec implies transient-per-card; simplest is one flipped at a time.
- **a11y (CARD-16):** the whole card is the tap-target (CARD-07); the flip is the **non-gesture path**
  (a plain tap, no gesture) and carries a screen-reader **"flip to stats"** action (`accessibilityActions`
  / an `accessibilityLabel` that updates) so a SR user can flip + read the back. Honour **reduce-motion**
  (`useReducedMotion()` → instant face-swap, no rotateY animation).
- **Discoverability:** a **first-run coachmark** (a one-time hint, e.g. "Tap a card to flip it") gated on
  a persisted "seen" flag. **NO persistent on-face indicator** (owner directive — the card face stays clean).
- **Friend-view parity (COL-10/11, PROF-03):** the friend collection is **M6/M7** — at M4 build the
  **own-collection** flip only; mark friend-view flip **EXPECTED(M6)** (the friend back would show
  hours/status/ownedSince + designer only — %complete/notes/rating owner-only; the payload already gates this).

## 3 · The build
- **The tap-mode swap** in `collection.tsx`: shelf/grid (+top) card `onPress` → toggle flip (not navigate);
  `onLongPress` → `router.push('/game/:gameId')`; list unchanged. Keep the now-playing hero + the ADD/tools
  taps intact (don't let the flip leak into the four-mode law's other modes).
- **The flip animation** (`motion.cardFlip`): a front↔back rotateY. RN has no reliable cross-platform CSS
  `backface-visibility`, so the idiomatic approach is **two `Animated.View` faces** (front rotates 0→180,
  back 180→360, gated by opacity/pointerEvents at the 90° midpoint) OR a simpler crossfade. **Under
  reduce-motion, skip the spin — instant face-swap.** 0044 §104 wants the marquee moments on a **shared
  timing/easing token set**; if none exists yet, use a sensible duration (~300–400ms) and note it (or add
  the shared token — check `theme` for a motion set first).
- **The back face:** feed `StatsBack` from the collection item (`hours`, `percentComplete`, `status`,
  `ownedSince`, `card.designer.username`). Size it to match the front card size per view (grid vs cell).
- **The coachmark + the "seen" flag** (prefsSlice) + the SR action + the transient reset.

## 4 · Rails (non-negotiable)
- **Manifest-first:** before touching code, extract/refresh the flip states into the collection manifest
  (or, if none, a short states list) from the board `docs/design/mockups/collection/collection-states.html`
  — the flip is drawn there (COL-12 was noted "stale on the board" in decision 0048; the app truth wins,
  record any divergence). Then build to it.
- **CARD-16 compliance is a gate** (reduce-motion + non-gesture + SR) — this feature is literally a CARD-16
  example in the spec. Don't regress it.
- **The four-mode law (CARD-23) stays intact** — list navigates, the hero/tools/add taps are untouched,
  display-only cards stay inert.
- **builder ≠ verifier · commit only when asked · reference behaviour by stable ID.** Owner model
  directive (CLAUDE.md, 2026-07-09): plan/review on the smart model, delegate mechanical build to Opus
  packet agents if you fan it out; **never spawn sub-agents inside a packet or poll-wait** (memory:
  builder-agents-no-subdelegation).

## 5 · Verify
- typecheck · lint · jest · the full vitest suite green.
- **Fresh murr** on the diff — attack: the transient-reset (does a flipped card survive a view-switch or a
  screen-leave when it shouldn't?), the reduce-motion path (no stuck half-flip — the KeepBeat lesson), the
  four-mode law (did the tap-swap break navigate/inspect/act-in-place anywhere?), the back's data (nulls:
  a game with no designer / null percentComplete).
- **Fresh parvati** on the running `:8082` — **the flip IS web-visible** (unlike the device decals), so
  drive it: shelf + grid tap→flip→tap-back, the back's fields + VIEW GAME, long-press→navigate, list stays
  navigate, the view-switch reset, reduce-motion (if drivable). → 0 flags.
- `/health` 🟢 after the doc touches.

## 6 · Gotchas
- **The flip is a real animation** — reduce-motion must instant-swap (reuse `useReducedMotion`, and learn
  from the CARD-16 KeepBeat bug: don't let an async reduce-motion read leave a face frozen mid-rotate).
- **Transient, not persisted** — reset on view-switch + blur; never write it anywhere.
- **Don't break the tap grammar** — the whole card is the tap-target; a flipped card's VIEW GAME + the
  long-press are the only navigate paths from shelf/grid.
- **No on-face indicator** (owner) — discoverability is the one-time coachmark only.
- **Own-collection only at M4** — friend-view flip is EXPECTED(M6); don't build the friend path.
- **`StatsBack` + the payload already exist** — reuse, don't rebuild; no API change.

## 7 · Owner decisions to surface (don't silently resolve)
- **TOP-view flip scope** (COL-13 says it flips; confirm it's in-scope now or a follow-on).
- **One-flipped-at-a-time vs. many** (spec implies transient-per-card; recommend one-at-a-time).
- **The shared `motion.cardFlip` timing token** (0044) — add it, or use a local duration and note it.
