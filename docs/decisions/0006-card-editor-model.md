# 0006 — Card editor model (vector composition)

- **Date:** 2026-06-08
- **Status:** accepted
- **Related IDs:** CARD-01..19, COSM-01, MOD-07/08

## Context
The Card editor is the soul of the app and its heaviest screen. We worked it out in the walkthrough
and pressure-tested it with a three-mindset agent panel (UX, creative/competitive, product strategy).

## Decision
- **In-app vector composition, no imports.** Cards are composed from placeable **vector primitives**
  (shapes, letters, numbers, icons; free + premium packs) + an optional colour/gradient base.
  **No image uploads. No AI art.** This is a feature: it nearly eliminates the UGC moderation
  surface and keeps creation entirely in-app. (CARD-02)
- **Front-only editing; standardized stats back.** Trading-card portrait. (CARD-01)
- **One animated effect at a time, plus a separate stackable *finish* layer** (holo/foil/metallic) —
  a deliberate, scoped exception to "one effect" because a finish is what makes a card feel
  collectible. (CARD-12)
- **Rich-but-cheap toolkit ships; heavy ops parked.** Layers panel, multi-select/group, snapping,
  pan/zoom, undo/redo, per-element opacity/gradient/stroke/shadow/flip/blend, colour & type system —
  all in. Clip-to-shape masking, boolean ops, pattern/array are **parked** (§10). (CARD-08..11)
- **Preview-then-acquire** for premium, with a publish-time reconcile. (CARD-13)
- **Flatten pipeline:** editable composition JSON ≠ display render. On save/publish we flatten to a
  static image (thumbnail + full); viewers download one image, never the layers; the effect + finish
  render as runtime overlays; element count is capped (configurable). Rendering via
  **react-native-skia**. (CARD-15)
- **Default-card guarantee:** every collection entry always resolves to a card (selected → fallback →
  system placeholder); no blank/broken cards anywhere. (CARD-18)
- **Adoption only (no remix)** and **no external sharing** in v2 — both noted as future (§10).

## Rationale / alternatives
- **Uploads / AI art** rejected by the product owner — out-of-hand moderation + off-brand. Vector
  composition threads "real creativity, entirely in-app."
- **Remix/fork** (store editable source for public cards) rejected for v2 — adoption-only is simpler;
  remix is parked.
- **External sharing** rejected for v2 despite being the cheapest growth loop — parked.
- The panel's biggest catches folded into the spec: a **layers panel** (the glaring omission),
  draft/autosave/exit-safety, snapping/alignment, a real colour system, asset-library search, and two
  edge-cases (**text/glyph abuse screening MOD-07**, **entitlement-loss/takedown policy MOD-08**).
