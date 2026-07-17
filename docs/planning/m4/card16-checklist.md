# CARD-16 — the a11y / reduce-motion checklist (M4 §3.6, spec-driven audit route)

> **What this is.** The §0.5 CARD-16 launch-gate work, run as the **spec-driven/audit hybrid** (owner
> ruling 2026-07-11): decision **0044**'s three contracts (§104 reduce-motion · §105 a11y baseline ·
> §106 content-resilience) — authored **in React-Native terms** (screen-reader = VoiceOver/TalkBack;
> no `:focus-visible`) — become the binding punch-list the build verifies against, backed by a
> **custom-lint rule** so the non-gesture/label baseline can't regress. Scope: the three editors
> (Styler · Canvas · Device) + their shared components; the app-wide baseline rides along where cheap.
> **Gate status:** the CARD-16 release-block now attaches to the **M6 beta** (decision 0071); the work
> lands at M4 while the editors are fresh. **Source contracts:** [`0044`](../../decisions/0044-ds-motion-a11y-resilience-contracts.md)
> (OQ-104/105/106) + OQ-046 (non-hold-buy alt, M5) + CARD-16 (product-spec).

## RN translation of the 0044 web contracts
| 0044 (web) | RN equivalent (what we check) |
|---|---|
| `prefers-reduced-motion` fallback | `AccessibilityInfo.isReduceMotionEnabled()` / reanimated `useReducedMotion()` → still/instant form |
| `:focus-visible` ring | N/A on touch RN — replaced by **screen-reader reachability** (every control is a focusable a11y element with a label) |
| `role="dialog"` + focus-trap + Esc | RN sheets: `accessibilityViewIsModal` (iOS) / `importantForAccessibility="no-hidden"` on the backdrop; a labelled close; return-focus is OS-managed |
| `aria-live` / `role="status"` | `accessibilityLiveRegion="polite"` (Android) + `AccessibilityInfo.announceForAccessibility()` (both) for async results |
| `role="switch"` / `aria-required` / `<label>` | `accessibilityRole="switch"|"adjustable"|"button"|"tab"` + `accessibilityState` + `accessibilityLabel` |
| non-gesture path for gesture-only reorder | every gesture ships a tap/stepper/`accessibilityActions` alternative (the CARD-16 "built-alongside" rail) |

## §A — Reduce-motion (0044 §104) — ✅ DONE (audit: only 11 animated sites app-wide; most transitions already instant)
- [x] **Shared `useReducedMotion()`** — `src/a11y/useReducedMotion.ts` (AccessibilityInfo-backed, **live-updates** on the OS toggle — the old per-site checks only sampled once).
- [x] The NO-list gated: **DeviceShell boundary zoom** (instant swap under reduce-motion, same path as web) · **PulledSheet slide** (docks instantly — fixes ConfirmSheet + the Styler SAVE sheet + the canvas panels' non-inline path at once) · **KeyboardLift** (snaps, no slide).
- [x] The already-gated sites converged onto the shared hook: **PressSheet** (was re-checking per press) · **KeepBeat** (was once-on-mount → **fixed the live-update bug**). `render/animated.tsx` keeps reanimated's own `useReducedMotion()` (UI-thread lane; same behaviour).
- Confirmed instant-by-construction (no fix needed): SectionDock · CanvasSurface panel swaps · the D2 device-switch beat · DevicePreviewStrip · the Styler section swap / carousel.

## §B — A11y baseline (0044 §105) — *building (two packets, disjoint file-sets)*
**Packet A11Y-STATUS (live regions):** save-lines (Styler/Canvas/Device) + inline errors + cap meters (announce the flip-to-full, not the count) + Offline/Preview strips + ProofView error → `accessibilityLiveRegion="polite"` + `announce`/`useAnnounceOnChange` on TRANSITION (never the per-frame PLACING readout). + the Styler section dots gain `accessibilityState`.
**Packet A11Y-CONTROLS (structure + non-gesture):**
- ColorPicker raw-`View`+responder controls → `Pressable` + `accessibilityState`; SV/hue `adjustable` gets real increment/decrement actions.
- SavedLook nested "remove" Pressable → **sibling** (the app's own rule).
- `accessible` on the labelled gesture surfaces (CanvasStage bed, Slip lock glyph).
- **The non-gesture STICKER SELECTION gap** — a screen-reader user can't select a placed decal (only a coord-tap in an unlabelled PanResponder). Fix: a transparent accessible select-target per placed sticker + a **re-zone** button in the steppers (the only current re-zone is a cross-band drag).
- TransformDrawer/StickerSteppers double-announce cleanup.
- **Non-gesture pairs already CONFIRMED covered** by the built-alongside rail (audit): bed-drag↔TransformDrawer arrows · corner-scale↔W/H steppers · rotate↔ROTATE stepper · drag-Z↔◂▸ ops · long-press↔⋯ badge · PROOF hold↔tap · BaseRail swipe↔chevrons · sliders `adjustable`. *(The Styler "section swipe" the code comments reference does not exist — sections are already tap-only; noted, not a gap.)*

## §B-sheets — modal a11y — PARTIAL (PulledSheet already has `role="dialog"` + `accessibilityViewIsModal`); backdrop-hidden + labelled-dismiss spot-check owed in the manual pass.

## §C — Content-resilience (0044 §106)
- [ ] Long text (card names · game titles · usernames) truncates with a cue (numberOfLines clamp), never blows layout — spot-check the editor readouts + tiles.
- [ ] Numbers width-guarded (the cap meter, hours, counts) — pairs with the ≤99,999 cap (OQ-091).

## §D — Enforcement (the "can't regress" half) — ✅ DONE
- [x] **`rule-a11y-responder`** (`tools/lint/rules/`, the `rule-theme-tokens` mechanism): bans the raw
  `onResponderRelease=` tap-as-button anti-pattern in every `.tsx`/`.jsx` UI file — a screen reader can't
  reliably reach it; use `Pressable`. Real drag gestures are exempt (they spread `PanResponder.panHandlers`,
  never a literal `onResponderRelease` prop). Fixture + F22 corpus meta-test green (20/20). *(A broader
  "every Pressable has a label" rule was considered but rejected — RN derives the name from `<Text>`
  children, so it false-positives; `eslint-plugin-react-native-a11y` is the M5+ option, noted.)*

## §E — Verify
- [x] typecheck · lint (both custom a11y + theme rules) · **69/69 jest** green.
- [x] Fresh **murr** (adversarial, fresh-context) on the diff → **2 major + 5 minor; all fixed/dispositioned:**
  - **M1** (re-zone button could exceed a band's 6-cap → 422 → wedged pipeline) — **FIXED**: the "Move
    to «zone»" button is `canReZone`-guarded (disabled + "«zone» is full" when the target band is full).
  - **M2** (my regression — the shared `useReducedMotion` resolves async, so KeepBeat's mount-fire pulse
    flashed then **froze mid-pulse permanently** for reduce-motion users) — **FIXED**: KeepBeat reverted to
    the direct `AccessibilityInfo.isReduceMotionEnabled()` await-before-start (correct for a one-shot;
    the shared hook serves the user-triggered/persistent transitions, which fire after resolution).
  - **m1** double inline-error announce in Canvas — **FIXED** (the always-mounted styler announce covers both postures).
  - **m2** OfflineStrip triple-announce (role=alert + liveRegion + announce) — **FIXED** (single `announce()` path).
  - **m3** PulledSheet replayed its slide on a mid-open reduce-motion toggle — **FIXED** (reduce read via ref, not a dep).
  - **m5** `sub.remove()` could throw on RNW where `matchMedia` is absent — **FIXED** (`sub?.remove()`).
  - **m4** (iOS VoiceOver activation hit-tests to the gesture surface; overlapping decals may select the
    wrong one — Android's ACTION_CLICK is exact) — **DOCUMENTED** known edge; the non-gesture path exists,
    the overlap case is imperfect on iOS only. **m6** (save-line announces once per edit) — accepted (honest).
  - **Clean lanes murr confirmed:** DeviceShell instant-swap matrices · KeyboardLift duration-0 target · ColorPicker onStep (no ref-lag, no double-fire) · the hook subscription · the announce first-mount/tick behaviour · the stepper double-announce removal · the select-target sibling z-order (sighted touch untouched).
- [ ] **Owed (device, the M6 beta gate):** a manual reduce-motion pass (toggle the OS setting) + a VoiceOver/TalkBack spot-walk of one editor — the RN-web lane can inspect the a11y attributes but can't drive VoiceOver or the OS reduce-motion toggle.
- [x] Receipt + design-spec note; CARD-16 **M4 work met**, its release-gate attaches to the **M6 beta** (decision 0071).

*(Sections A/B/C fill with the concrete file:line punch-list once the two audits land; then the build works down the boxes.)*
