# COL-12 — Collection card peek-flip · screen manifest (from collection-states.html, 2026-07-12)

> **Surface:** M4 COL-12 — the peek-flip **mode** added to the existing Collection screen (a mode of
> the CARD-23 four-mode tap law: FLIP is mode 2). **Board:** `docs/design/mockups/collection/collection-states.html`
> C5 peek-flip stage (`:1196–1440` — grid · shelf · friend artboards).
> **Code:** `apps/mobile/app/(tabs)/collection.tsx` + **new** `src/components/collection/FlipCard.tsx`
> + **new** `src/components/Coachmark.tsx` + **extended** `src/components/game/StatsBack.tsx` (optional
> `gameTitle`/`footer`) + `src/store/prefsSlice.ts` (`col12CoachmarkSeen`). Reuses `CardFace`,
> `StatsBack`, `ScreenButton`, `useReducedMotion`.
>
> **The one law:** today every Collection card taps to **NAVIGATE** (→ Game page). COL-12 changes the
> **shelf + grid** views so a tap **flips the card in place** to its CARD-01 stats back; the back's
> **VIEW GAME** + a **long-press** carry the navigate. **Dense-list stays NAVIGATE** (its rows already
> print the stats). The other three CARD-23 modes must not regress.
>
> **Scope filter: M4, own-collection.** Friend-view (COL-10/11) is **EXPECTED(M6/M7)** — not built here.
> Later-milestone elements are marked `EXPECTED(<milestone> · <ID>)`; parvati must not flag them.
>
> **Status legend:** `OWED` = built + verified this pass · `PRE` = pre-existing, correct, untouched ·
> `EXPECTED(…)` = later-milestone, not built · `GAP` = declared divergence from the board (see below).

---

## The behaviour (COL-12 · CARD-23 mode 2 · decision 0026)

| # | Element | Component | Docks | Behaviour | Status |
|---|---------|-----------|-------|-----------|--------|
| 1 | Front face (art) — the whole card is the tap-target (CARD-07) | `FlipCard` → `CardFace` | shelf row / grid cell | **tap → flip to back**; **long-press → NAVIGATE** (`/game/:gameId`) | OWED (`:1227–1248`, `:1310–1354`) |
| 2 | Back face — YOUR STATS · HOURS · COMPLETE · STATUS · SINCE · CARD ARTIST | `FlipCard` → `StatsBack` | replaces front | reused from the Game-page dual-face back; **tap (off the button) → flip back**; **long-press → NAVIGATE** | OWED (`:1231–1244`, `:1323–1336`) |
| 3 | Game title on the back (`cb-title`) | `StatsBack` `gameTitle` prop | back header | "YOUR STATS" demotes to an eyebrow above the game name | OWED (`:1234`, `:1326`) |
| 4 | VIEW GAME › control on the back | `StatsBack` `footer` → `ScreenButton` secondary·mini·block | back foot | **tap → NAVIGATE** (nested Pressable; does not bubble to the flip-back tap) | OWED (`:1242`, `:1334`) — decision 0026 follow-up (real cream keycap, mini+block) |
| 5 | Flip animation (rotateY, ~320ms) | `FlipCard` `Animated` | on card | two faces, front 0→180 / back 180→360, opacity+pointerEvents gated at the 90° midpoint | OWED — `motion.cardFlip` realised as a local `FLIP_MS` (GAP-D4) |
| 6 | Reduce-motion (CARD-16) | `useReducedMotion()` | on card | **instant face-swap** — `setValue` (no rotation), re-runs on the runtime toggle so no stuck half-flip (the KeepBeat lesson) | OWED |
| 7 | Screen-reader flip action (CARD-16 non-gesture path) | `FlipCard` a11y | on card | the card is a `button`; label + hint update per face ("tap to flip to stats" / "…back"); VIEW GAME is the SR navigate path | OWED |
| 8 | First-run coachmark (CARD-16) — "TAP A CARD TO FLIP IT" | `Coachmark` | above the shelf/grid body | shown once (`!col12CoachmarkSeen` && ≥1 flippable card && shelf/grid && not searching); dismisses on first flip or ✕; sets the persisted flag | OWED (`:1276–1277` caption) |
| 9 | **No** persistent on-face indicator (owner directive) | — | — | the card front stays clean; discoverability is the coachmark only | OWED (`:1276`) |
| 10 | Dense-list tap stays NAVIGATE | `ListView` | list | unchanged — a list row already prints HRS·STATUS | PRE (`:1278`, decision 0026 scope) |
| 11 | Now-Playing **hero showcase** never flips | `NowPlayingHero` | above body | unchanged — it stays the showcase + LOG HOURS (tap → NAVIGATE, mode 1) | PRE (`:1379`) |
| 12 | Transient reset | `collection.tsx` | — | flip state = a `Set<entryId>` on the screen; **cleared on view-switch + on blur/unmount**; never persisted | OWED (decision 0026) |

## State-table walk (the changed predicate)

- **`flippedIds: Set<string>`** — empty by default. A shelf/grid card tap toggles its `entryId` in the
  set (**owner ruling 2026-07-12: many-flipped**, not one-at-a-time). `view` change → `setFlippedIds(new Set())`
  (a `useEffect` on `view` catches both the tools cycle and the drawer's set-view). Screen blur → the
  existing `useFocusEffect` cleanup clears it too. The now-playing **hero** (parent) and **dense-list**
  are outside this predicate — they still NAVIGATE.

---

## Later-milestone / deferred — listed, EXPECTED, NOT built (parvati: do not flag)

| Item | Board | Owned by | Mark |
|------|-------|----------|------|
| Friend-view flip (privacy-gated back — hours·status·since + designer only; notes/rating/platforms owner-only) | `:1384–1440` | M6/M7 (COL-10/11, PROF-03) | EXPECTED(M6/M7 · `/users/:id/collection`) |
| **TOP-view flip** (COL-13 "cards flip") | — (board draws no TOP flip) | follow-on | **EXPECTED(deferred · owner 2026-07-12)** — TOP cards are `mini`/`cell` (64×89 / 96×134); a legible stats back won't fit + TOP rows already print hours (the dense-list redundancy). Revisit with a larger TOP card + real COL-13 curation. |
| Real designer attribution on the back | throughout | card-pipeline | EXPECTED — the back's CARD ARTIST reuses the Game-page convention `isCustom ? 'YOU' : null` (GAP-D1) |

---

## Component reuse (compose, don't fork)

- **New:** `FlipCard` (the two-face animated flipper + a11y + the whole-card tap grammar) · `Coachmark`
  (a dismissible first-run hint strip). Both DS-token-driven (F-06 9/11, `theme.scr.*`).
- **Extended (backward-compatible):** `StatsBack` gains optional `gameTitle?: string` + `footer?: ReactNode`
  — **both default to the current game-page render** (unset → byte-identical tree), so the DualFaceHero
  back is unchanged. One back component, no drift.
- **Reused (existing):** `CardFace` (front, `pointerEvents:none` so the wrapping Pressable owns the tap),
  `ScreenButton` (secondary·mini·block = the VIEW GAME keycap), `useReducedMotion` (the one CARD-16 source),
  `prefsSlice` (the persisted coachmark flag). No API change — `useGetCollectionQuery` already loads the shelf.

---

## Declared divergences / assumptions (parvati reads these as reconciled)

- **GAP-D1 (designer rider):** decision 0026 / api-contract 0.24 specced a `designer { userId, username }`
  rider on the collection payload, but the serializer never emitted it (the game-page manifest confirms
  "CARD ARTIST = DEFAULT for the stub; real designer arrives with `card_designs`"). **App truth wins:** the
  flip back reuses the Game-page's shipped convention `artist = card.isCustom ? 'YOU' : null` → StatsBack
  renders "YOU" / "DEFAULT". **No API change** (the handoff's "no API change needed" conclusion holds,
  though its stated premise — that the rider exists — was stale).
- **GAP-D2 (VIEW GAME + game-title placement):** the handoff said "StatsBack already lays these out" — it
  does not (StatsBack has no button and no game name). Realised by extending StatsBack with the two optional
  props above rather than forking it or building a bespoke back.
- **GAP-D3 (`.flipy` reference):** the handoff called the Game-page hero "a front↔back `.flipy` card" — the
  `DualFaceHero` is **side-by-side, no flip** (its own comment). `.flipy` is only StatsBack's stepped-corner
  silhouette. So there is no existing rotateY flip to copy; the animation is built fresh in `FlipCard`.
- **GAP-D4 (`motion.cardFlip` token):** 0044 §104 wants marquee motion on a shared timing/easing token set,
  but none exists in `theme` yet (PressSheet/KeepBeat each hold local durations). Realised as a local
  `FLIP_MS` const in `FlipCard` (cited to 0044 §104). **Owner follow-up:** extract a shared `theme.motion`
  set when the PressSheet/KeepBeat/FlipCard motion pass is done — a cross-cutting refactor, out of scope here.
- **Owner rulings 2026-07-12:** TOP-view flip deferred; **many-flipped** (Set-based) over one-at-a-time.
- **Screen palette:** `theme.scr.*` Midnight, not the board's local `--scr-bg` (the app-wide C5 note).

---

## Verify checklist (the gate — §5 of the handoff) — RESULTS

- [x] typecheck ✓ · lint ✓ (eslint + 10 custom rules incl. `rule-a11y-responder`) · **jest 81/81** ✓ ·
      **vitest unit 148/148** ✓. (Integration/Testcontainers structurally unaffected — the diff is 100%
      mobile client + docs, zero API/shared/schema changes.)
- [x] **murr** (fresh adversarial, fable+opus, findings adversarially verified) → **3 real defects, ALL fixed:**
      1. **(a11y, high)** the card `Pressable` was `accessible=true` → iOS/Android collapse the whole card into
         one element, so the nested VIEW GAME wasn't SR-focusable, the stat rows weren't announced, and long-press
         wasn't an SR action → **NO SR navigate path** (a CARD-16 regression). **Fix:** the card is a single SR
         button whose label reads the stats out + a "View game" `accessibilityAction` = the navigate path; both
         faces `aria-hidden`.
      2. **(tap-grammar, low)** the back's `pointerEvents` was gated on the raw `flipped` prop, so the invisible
         VIEW GAME was hit-testable during the ~160ms flip-in (opacity ≠ hit-test in RN) → a fast second tap could
         NAVIGATE not FLIP. **Fix:** gate on a `settled` state (animation-complete), `box-none` back.
      3. **(sizing, medium)** the added head + footer overflowed the shelf's fixed 138×193 back, shrinking the flex
         rows into the provenance. **Fix:** compact StatsBack spacing when a footer is present (game page untouched);
         measured VIEW GAME now sits 8px inside the card, no overlap.
      Plus a **web-only nested-`<button>`** hydration error found in verification (the card button contained the
      VIEW GAME button) → **fixed** by making the flip tap-layer a transparent sibling BEHIND the faces (faces pass
      taps through via `pointerEvents`), so no button nests in a button.
- [x] **Owner feedback (2026-07-12, two rounds): "no way to flip the card back."** Root cause: on NATIVE, RN
      hit-testing never falls through to a *sibling* behind a view that absorbs the touch — once the flip
      SETTLED (`box-none`), StatsBack's root View + its absoluteFill silhouette `Svg` were dead-zone targets,
      so back-taps died (the fast double-tap worked only because the mid-flip back is still fully `none`).
      Round 1 (stats-wrapper `none` only) was insufficient — the web check had only ever exercised the
      not-settled path (the automation RAF-throttle means `settled` never turns true there). **Fix (round 2):**
      when a footer is present, StatsBack's WHOLE hit-tree declines — root `box-none` · Svg `none` · inner
      `box-none` · stats wrapper `none` — so the only hittable element on the back is the VIEW GAME keycap;
      every stats-area tap falls through to the flip layer (→ flip back). Game-page render (no footer) stays
      default `auto`. **Verified on `:8082` (real Chrome), settled state EMULATED** (back face forced fully
      hittable — stricter than the real `box-none`): `elementFromPoint` at eyebrow/rows/provenance all resolve
      to the flip-layer button and a real click flips the card home without navigating; the keycap probe
      resolves to "View <game> game page" (the settled VIEW GAME tap, previously unexercisable, now verified).
      **Round 3 (owner: still failing on device):** the round-2 `pointerEvents="none"` ON the Svg works on web
      (CSS `pointer-events` on a real `<svg>` — why the web probe passed) but **react-native-svg's NATIVE view
      runs a custom hitTest that doesn't reliably honor the prop**, so on device the absoluteFill silhouette Svg
      kept absorbing back-taps — it is the only full-card element left un-pruned. **Fix:** the Svg is wrapped in
      a plain core `View` with `pointerEvents="none"` (compact only) — a core RN view honors 'none'
      unconditionally and prunes the subtree from hit-testing before the Svg's custom hitTest is ever consulted,
      both platforms. Web hit-tree re-verified (wrapper `pointer-events:none` confirmed in computed style; probes
      unchanged). The native path is exactly what web cannot exercise → **owner device re-test owed** (with a
      hard reload — shake → Reload — to rule out a stale bundle as a confound).
- [x] **parvati** on the running `:8082` → **0 flags** (`m4-review-notes.md`, 2026-07-12): the back face + coachmark +
      hero-never-flips + meta-beside are screenshot-verified; the flip *motion* + grid faces are DOM/jest-verified
      (the automation renderer throttles `requestAnimationFrame` and won't paint skia FRONT faces — a manual
      on-device flip pass is owed, alongside the CARD-16 VoiceOver/reduce-motion spot-walk).
- [x] `/health` 🟢 after the design-spec §2.1 build-note (docs in sync · decision traceability · formalization debt none).
