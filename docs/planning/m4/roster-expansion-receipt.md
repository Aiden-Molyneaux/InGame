# Receipt — Styler roster expansion + animation driver (decision 0068, 2026-07-09)

Builder: Claude Code. Scope: bring a large batch of cosmetics into the Styler **now, all basic tier**,
and build the **animation driver** that makes the motion kinds actually move. Verified by murr (code)
+ parvati (built screen). One decision record: [`0068`](../../decisions/0068-roster-expansion-animation-driver.md).

## What changed (files · IDs)
**Roster + types**
- `apps/mobile/src/styler/roster.ts` — `tier?` on `RosterItem`; +10 frames (thicker widths), +4 effects,
  +3 finishes, +5 nameplates, +5 fonts, all `tier:'basic'`. (COSM-02 / CARD-11/12)
- `apps/mobile/src/render/composition.ts` — extended `FrameKind`/`EffectKind`/`FinishKind`/`NameplateShape`.
- `packages/shared` — **untouched**: new kinds ride the composition schema's `.passthrough()`; preset ids
  fit `boundedText(40)`. No API/schema/endpoint change.

**Static renderer** (`apps/mobile/src/render/buildCard.ts`)
- New frame kinds `ornate/glow/foil/marquee`; effect overlays `grain/halftone/frost/embers`; finish
  overlays `linen/holographic/metallic`; nameplate shapes `capsule/tab/arch/dogtag/brass` (new `buildPlate`
  helper). All **static keyframes** — the builder stays pure (flatten + node-test unaffected in structure).
- `buildCompositionStrip` — the one-canvas rail builder (the WebGL-ceiling fix, below).

**Animation driver** (`apps/mobile/src/render/animated.tsx`, NEW)
- `AnimatedCardLayer` + `MarqueeChase` / `EmberRise` / `SheenSweep` (frost·holo·metallic), Reanimated-driven,
  clip-bounded, additive overlay. Mounted only in the live `<Canvas>` (`CardComposition` + `ProofPrint`
  overlay) — **never in the flatten**; reduce-motion → not mounted; size-gated (`ANIMATE_MIN_W=180`) so
  thumbnail grids don't spin up clocks.

**Fonts**
- `apps/mobile/src/render/CardComposition.tsx` — 5 `useTypeface` registrations (skia hero).
- `apps/mobile/app/_layout.tsx` — 5 `useFonts` (RN families for the FontPreview `<Text>`).
- `apps/mobile/package.json` + `tools/deps/justifications.json` — 5 `@expo-google-fonts/*` deps + ledger lines.

**Styler wiring**
- `apps/mobile/app/styler/[gameId].tsx` — frame selection + `draftToPresetStyle` now match **kind+color**
  (four frames share `thin-line`).
- `apps/mobile/src/components/styler/AttributeSection.tsx` — card rail routed through the strip (`CardRail`);
  `FONT_FAMILY` +5; `PlatePreview` +5 shapes (parvati fixes).
- `apps/mobile/src/render/CardComposition.tsx` / `components/canvas/lazySkia.tsx` — `CompositionStrip` +
  `LazyCompositionStrip`.

**Tests** (`apps/mobile/src/render/composition.test.ts`) — +20 covering every new kind/shape + present-paths.

## Verification
- typecheck ✓ · lint (incl. rule-08 deps) ✓ · **136 vitest-unit** ✓ · **40 mobile-jest** ✓.
- **murr** (fresh-context diff review): 0 blockers, 0 majors; the static-flatten / additive-overlay invariant
  holds; 3 minors (2 fixed: capsule/arch null-guard + present-path tests; 1 accepted: marquee stepped-notch).
- **parvati** (web `:8082` walk): 3 🚩 found + fixed + re-verified → **0 open** (WebGL-ceiling blanked the
  16-tile FRAME rail; new font previews; new plate previews). All rails render every tile; EMBER GLOW bloom +
  EMBERS keyframe/motes render on the hero; zero console errors; seed restored (copy-on-write discard). Full
  verdict in [`m4-review-notes.md`](../m4-review-notes.md).

## Decided / assumed
- **STUB → accent-orange** (`#ff9f43`) so it isn't a duplicate of the cream TICKET (both `ticket-notch`).
- **Frame widths +~0.008** (owner "a couple pixels thicker").
- **Animation is live-only** — the flatten/thumbnail/shared image shows the static keyframe (CARD-15).

## Needs the owner's eyes
- **The free/premium split** — everything is basic now; re-tag `tier:'premium'` per item when the sets settle.
- **MOTION on device** — continuous marquee chase / ember rise / sheen sweep can't be seen in stills.
- **Marquee light** traces a plain rectangle, not the F-02 stepped notch (hero-only; owner-taste).
- One residue DRAFT on the Elden Ring switcher from the QA walk (harmless under cap-30).
