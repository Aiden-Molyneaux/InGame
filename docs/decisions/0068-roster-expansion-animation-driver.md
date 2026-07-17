# 0068 — Styler roster expansion + the animation driver (all-basic-now)

**Status:** accepted (owner ruling, 2026-07-09) · **Date:** 2026-07-09 · **Author:** Claude Code
(the §3.x roster-expansion build) · **Rules:** brings a large batch of new closed-attribute cosmetics
into the Styler **now**, all as **basic tier**, and adds the **animation driver** that makes the
motion kinds actually move. **Amends [`0063`](0063-cosm02-free-baseline-roster.md)** (the free/premium
split is deferred — see §3). Companion to **0066** (the M4 card substrate) and **CARD-12/15** (effects
as runtime overlays; the flatten is a still image).

## Context
[`0063`](0063-cosm02-free-baseline-roster.md) fixed a deliberately small free roster and parked the
"wow" kinds (ornate/gold/animated frames · frost/fire/galaxy effects · holo/foil/metallic finishes ·
fancy fonts) as **premium, M5**. The owner has **not finalized any customization set** and wants the
whole expanded palette usable **during M4** to design with — deferring the free/premium call until the
sets settle. This record formalizes that expansion + the render work it required.

## Rulings

### 1 — The expansion (what lands, all `tier:'basic'`)
Added to the [`roster.ts`](../../apps/mobile/src/styler/roster.ts) constants the Styler consumes:
- **Frames (+10):** THIN GOLD · LIME · BUBBLEGUM · CHROME · STUB · ORNATE GOLD · EMBER GLOW · PLASMA ·
  HOLO FOIL · MARQUEE. New render kinds `ornate · glow · foil · marquee` join the existing five;
  THIN GOLD/LIME/BUBBLEGUM ride `thin-line`, CHROME rides `double-line`, STUB rides `ticket-notch`.
- **Effects (+4):** GRAIN · HALFTONE · FROST · EMBERS.
- **Finishes (+3):** LINEN · HOLOGRAPHIC · METALLIC.
- **Nameplates (+5):** CAPSULE · TAB · ARCH · DOGTAG · BRASS.
- **Fonts (+5):** PIXEL (Press Start 2P) · SLAB (Bitter) · MONO (Space Mono) · SCRIPT (Pacifico) ·
  STENCIL (Allerta Stencil) — each a bundled `@expo-google-fonts/*` dep, registered by `fontId` in
  `useCardSkiaCtx`; a still-loading typeface falls back to the default face (never a crash).
- **Frame thickness:** all frame widths bumped ~+0.008 normalized ("a couple pixels thicker", owner).
- **Dropped from the brainstormed set (owner):** the INNER GLOW effect, and the SATIN + HIGH GLOSS
  finishes.
- **STUB de-dup:** STUB rides `ticket-notch` in the app **accent-orange** (`#ff9f43`) so it stays a
  distinct tile from the existing cream TICKET (which is also `ticket-notch`).

### 2 — `tier` is declarative metadata; everything is usable NOW
`RosterItem` gains an optional `tier?: 'basic' | 'premium'` (absent = basic). Every entry today is
basic. **No entitlement gate exists in the app** (COSM-03/M5), so `tier` is metadata only — the Styler
shows and enables the whole roster. The owner re-tags individual items `'premium'` later (§3); that is
a one-field flip with no render/schema change. New kind strings ride the composition schema's
`.passthrough()` envelope unchanged (no server/schema edit — [`composition.ts`](../../packages/shared/src/schemas/composition.ts)),
and preset-recipe ids fit the existing `boundedText(40)`.

### 3 — Amendment to 0063: the free/premium split is DEFERRED
0063 §2–4 assigned frost/fire/galaxy, holo/foil/metallic, ornate/gold/animated to **premium (M5)**.
That split is **not yet in force**: per this ruling the whole set ships **basic** through M4, and the
free/premium partition is re-decided when the owner finalizes the customization sets (still COSM-03
territory for the eventual gate + store moat). 0063's roster tables are superseded by
[`roster.ts`](../../apps/mobile/src/styler/roster.ts) as the live source; the CAT-04-style
"owner-blessed seed, SYS-08-tunable" framing is unchanged.

### 4 — The animation driver (the load-bearing render ruling)
The motion kinds — **MARQUEE** frame, **FROST** + **EMBERS** effects, **HOLOGRAPHIC** + **METALLIC**
finishes — now animate in the live editor. **Architecture invariant:**

> `buildCardElements` stays a **pure static builder** — it draws every kind's **static keyframe** and
> remains the single source for the **flatten PNG** (CARD-15), the node test, and the live base.
> Motion is a **pure additive overlay** ([`render/animated.tsx`](../../apps/mobile/src/render/animated.tsx),
> `AnimatedCardLayer`) mounted **only in the live `<Canvas>`**, never in `drawAsImage`.

Consequences: nothing bakes (a saved/shared card is still one image — the animation is a live-view
enrichment, exactly like the CARD-12 effect overlays); `reduce-motion` simply doesn't mount the layer
(the keyframe stands); and only larger faces animate (`ANIMATE_MIN_W`, the finished-card `effect`
view) so a Collection grid of thumbnails never spins up dozens of Reanimated clocks. Driven by
Reanimated shared values (rn-skia reads them on the UI thread — no per-frame React re-render).

### 5 — kind+color frame matching (a correctness ripple)
Four frames now share the `thin-line` kind, so the Styler's selected-tile highlight and the
`draftToPresetStyle` preset-derive were changed to match **kind + color**, not kind alone (else picking
THIN GOLD would highlight/serialize THIN LINE). Forward application (id → `{kind,color,width}`) was
already exact. See [`app/styler/[gameId].tsx`](../../apps/mobile/app/styler/[gameId].tsx).

## AMENDED — the owner's iteration pass (2026-07-09, same day)
Seven rulings from the owner's first look, all landed:
1. **Filled bands** — every band frame is a SOLID border about as thick as the Double Line/Chrome
   footprint (`width` = visible thickness; the renderer strokes 2× and the clip takes the outer
   half). Double Line/Chrome keep their two-rule structure as the reference; Brackets keep arms.
2. **v2 renders** — ORNATE GOLD (grade band + cream pinstripe + corner rosettes) · FROST (crystalline
   shard spray, not fog) · HOLOGRAPHIC (banded rainbow + counter-shimmer) · METALLIC (diagonal
   brushed striations + specular). **PIXEL font** draws at 0.6× optical scale (`FONT_SCALE`).
3. **Retired:** the PIXEL frame + the GRAIN effect — out of the roster, renderer keeps the kinds
   (F21 legacy); the ARCADE kit moved onto cyan BRACKETS. History now lives in the
   [`cosmetics-ledger`](../design/cosmetics-ledger.md) (created by this ruling).
4. **Plates ride TOPMOST** — above frame, effect AND finish — and sit a couple px off the card's
   bottom edge (`plateGroup`; the PROOF overlay re-stamps it for parity).
5. **Animation is an explicit per-surface opt-in** (`animate` on CardFace), replacing the ≥180px
   width heuristic that had left every out-of-Styler surface static. Opted in: the Styler hero,
   the game-page DualFaceHero, the Collection now-playing hero, the Profile favourite +
   now-playing, CardDetail INSPECT, and the KeepBeat. Grids/rails/switcher cells stay static —
   the opt-in IS the clock budget.
6. **EquipReadout** resolves frames by kind+colour (kind alone misnamed the shared-kind frames).
7. Display renames at the band refit: THIN LINE → LINE · THIN GOLD → GOLD.

## Consequences / follow-ups
- **The free/premium partition is owed** before the store lands (M5) — re-tag `tier` per item.
- **Animation is live-only** — the flatten/thumbnail/shared image shows the static keyframe; a
  future flatten-to-storage (0066 §1) captures the keyframe, not motion. Documented, not a gap.
- **Verification:** typecheck · lint · 136 vitest-unit · 38 mobile-jest green; murr diff review +
  parvati built-screen review (this batch). Motion itself is not screenshot-verifiable — parvati
  confirms the rails + static keyframes + no-crash; motion is verified by construction + on device.
