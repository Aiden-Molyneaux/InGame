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
      hard reload — shake → Reload — to rule out a stale bundle as a confound). *(Flip-back confirmed working
      on device, round-4 report.)*
- [x] **Owner feedback round 4 (2026-07-13): shelf flip makes the meta text beside the card "flicker/
      disappear" momentarily, EVERY flip (iOS device).** Diagnosis: a headless-browser filmstrip (freezing
      the flip at 25°–180° against the real app) shows the projected card NEVER touches the text and the
      meta rect never moves — the artifact is native-compositor/animation-time only. The two device-only
      things happening at exactly tap time: (1) **every tap re-rendered ALL rows** (new Set → unmemoized
      FlipCards → fresh `parseComposition` objects → every skia Metal canvas redrew as the animation
      started); (2) `perspective` — the app's only 3D compositing. **Both fixed** (each correct
      independently): FlipCard is `React.memo` with a stable id-passing handler contract
      (`onToggle(entryId)`/`onNavigate(gameId)`, `useCallback` in the screen, coachmark latch via ref —
      a tap now re-renders ONLY the tapped card) + `useMemo`'d composition (identity-stable skia props);
      and the flip is now a **flat rotateY** (perspective dropped — the face narrows to an edge and
      unfurls; the 3D skew can return once the flicker is confirmed dead). Verified: jest 144/144 ·
      typecheck · lint · web round-trip (flip → stats-tap → back). **Owner device re-test owed.**
- [x] **Owner feedback round 5 (2026-07-13): still not smooth on shelf — "the card doesn't flip in one
      smooth animation, half disappears then reappears as the flip-side," + text flicker (shelf only).**
      Round-4's two changes were half-wrong: the memo/perf fix was fine to KEEP, but **removing `perspective`
      made it worse** — a flat rotateY squishes the card to a vertical line at 90°, and the **hard opacity
      swap** cut front→back at that point = the "disappear/reappear." And the flicker is shelf-only because
      shelf is the ONLY view with text beside the card. **Round-5 fix — the canonical RN card flip:** faces
      get `backfaceVisibility: 'hidden'` and **`perspective` is restored** — the away-facing side hides
      itself crossing 90°, so it's one continuous 3D turn with **NO opacity animation at all**. Removing the
      opacity animation is also the flicker cure: animating opacity on a Metal-backed react-native-skia
      `<Canvas>` is a known iOS flash source, and it was the only thing changing on the card's skia layer
      each frame. `settled`-gated hit-testing + the round-3 pass-through chain are unchanged. Verified:
      typecheck · lint · jest 144/144. The smoothness + flicker are inherently native-render properties the
      automation lane (RAF-throttled) cannot show → **owner device re-test owed** (hard reload first).
- [x] **Owner feedback round 6 (2026-07-13): round-5 still broken.** The decisive read across rounds 3–5:
      every variant animated a TRANSFORM on faces hosting skia/svg content (perspective turn · flat rotateY ·
      backface-hidden turn) and every one tore on Fabric-iOS/Expo Go — the transform animation itself is the
      unreliable mechanism there (none of it reproduces on web). **The 3D turn is RETIRED on this surface:
      the flip is now a pure opacity CROSSFADE** (front 1→0 · back 0→1, no transforms anywhere) — the form
      decision 0026 already names (its reduce-motion variant). Both faces reach opacity 0 when inactive
      (the F-02 silhouettes are notched on different corners, so a stacked opaque face would peek through
      the other's notches). `settled` hit-gating, memoization, a11y unchanged. Verified: typecheck · lint ·
      jest 144/144 · web faces confirmed transform-free + flip toggling. **Follow-ups:** (a) if even the
      dissolve flickers on device → instant swap + file the Expo Go/Fabric repaint bug; (b) the 3D turn can
      be revisited as a polish experiment via reanimated UI-thread transforms (the stack already ships
      reanimated) once the Fabric behaviour is understood. **Owner device re-test owed.**
- [x] **Owner feedback round 7 (2026-07-13): "I liked the Flip more."** (The crossfade read as confirmation
      that the RN-`Animated` transform path was the artifact — the dissolve drew no flicker complaint.)
      **The 3D turn is BACK, rebuilt on REANIMATED** (~4.1.1, already in the stack driving the skia motion
      layer, decision 0068): `useSharedValue` + `withTiming` + `useAnimatedStyle`, each face's perspective
      rotateY AND its 90°-step opacity computed in ONE worklet — frame-synchronized on the UI thread via
      reanimated's own ShadowTree path, completely bypassing the `Animated` native driver that tore on
      Fabric-iOS in rounds 3–5. No `backfaceVisibility` (broken there, round 5). `settled` now latches via
      `runOnJS` from the withTiming completion; reduce-motion keeps the instant swap. Verified: typecheck ·
      lint · jest 144/144 (reanimated renders under jest-expo out of the box) · headless smoke on the real
      app (mounts, 17 cards, tap→stats state, no redbox). **Owner device re-test owed — the deciding one.**
- [x] **Round 8 (2026-07-13): the owner sent a SCREEN RECORDING — frame forensics finally pinned the real
      mechanism.** (ffmpeg-static → 334 frames @59fps of the reanimated flip on device, owner's 1-game dev
      shelf, DEFAULT Destiny 2 face — **no skia involved**.) The frames show, cleanly: (1) first half of
      the turn — the sibling meta text VANISHES entirely (present f0070, gone f0073, back f0080); (2)
      second half — the back renders as floating text + keycap with NO panel silhouette; (3) settled —
      everything perfect. One mechanism from both sides: **react-native-svg MIS-DRAWS under an animated 3D
      transform on Fabric-iOS** — the front's panel-coloured silhouette Svg sweeps its fill over the
      same-coloured row (erasing the text visually), the back's projects away (no silhouette). Rounds 3–5
      failed because RN-`Animated` vs reanimated was never the variable — the svg-under-animated-transform
      was. **Fix: rasterize the faces while turning** — `shouldRasterizeIOS`/`renderToHardwareTextureAndroid`
      bound to `!settled` (the RN-documented practice for transform animations): the subtree draws ONCE
      into a face-bounded offscreen bitmap and the transform composites the bitmap; the svg never sees the
      transform. Off at rest (no memory/blur cost); reduce-motion never rasterizes. Verified: typecheck ·
      jest 150/150 · headless smoke (mounts + flips). *(Full lint blocked by the PARALLEL session's
      `apps/api/src/dev/seed-dev.ts:225` rule-01 violation — their in-flight commerce work, not this lane;
      surfaced to the owner, not touched.)* **Owner device re-test owed.**
- [x] **Round 9 (2026-07-13, owner: "still broken — works PERFECTLY in Grid; start back at the basics").**
      The Grid-vs-Shelf datum re-framed everything: the identical FlipCard renders the turn perfectly in
      the grid (whose cell is a card-tight box holding nothing else) and breaks only in the wide shelf ROW
      where the mid-turn mis-drawn svg can sweep across the sibling meta text. The flip code was never the
      remaining bug — the CONTEXT was. **Fix (structural, grid-parity): the shelf card now sits in a
      `cardSlot` — a real (overflow:'hidden' → never flattened, `collapsable={false}`), exactly card-sized
      (138×193), CLIPPING wrapper.** masksToBounds makes the text artifact impossible by construction —
      paint from the turning card's subtree cannot cross the boundary onto the row — and the card-tight
      real ancestor replicates the structure the grid empirically proves correct. Rest states unclipped
      (the back is exactly slot-sized); only the mid-turn ~8px projected overhang meets the boundary.
      Everything else untouched (grid untouched — it works). Verified: typecheck · jest 150/150 · headless
      smoke. **Owner device re-test = the gate.**
- [x] **parvati** on the running `:8082` → **0 flags** (`m4-review-notes.md`, 2026-07-12): the back face + coachmark +
      hero-never-flips + meta-beside are screenshot-verified; the flip *motion* + grid faces are DOM/jest-verified
      (the automation renderer throttles `requestAnimationFrame` and won't paint skia FRONT faces — a manual
      on-device flip pass is owed, alongside the CARD-16 VoiceOver/reduce-motion spot-walk).
- [x] `/health` 🟢 after the design-spec §2.1 build-note (docs in sync · decision traceability · formalization debt none).
