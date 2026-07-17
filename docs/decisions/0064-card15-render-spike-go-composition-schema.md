# 0064 — CARD-15 render-spike GO + composition element-schema formalization

**Status:** LOCKED · **Date:** 2026-07-05 · **Author:** Claude Code (spec owner), from the owner's
render-spike go/no-go · **Rules:** the CARD-15 flatten pipeline is proven (Gate G-H GO) and the
composition **vector-element schema** is formalized in `@ingame/shared`. Follows the M4 build brief §1
+ decision 0062 (M4 entry). Companion to the render module commit (`f904f0e`).

## Context
CARD-15 (composition JSON → flattened image) is M4's critical path — the brief front-loads it as a
budget-capped spike (§1) with an **owner go/no-go**. The owner set Gate **G-H = no token/time cap**
(fidelity + go/no-go, not spend; decision-log). The spike ran node-side via react-native-skia's
headless / canvaskit build and flattened a sample composition faithfully across the size-ladder.

## Decisions
1. **Gate G-H — GO (2026-07-05).** A faithful flatten of a sample card was demonstrated (F-02 stepped
   silhouette + gradient base + vector elements + rotation + stepped frame + nameplate; the effect as a
   **runtime overlay** on the flattened base; the PROOF size-ladder FULL/GRID/MINI/THUMB; cap-30). The
   flatten is milliseconds — nowhere near any budget. **Feasibility correction:** react-native-skia **is
   included in Expo Go on SDK 54** (no dev build; verified against the Expo docs) — an earlier
   assumption that it needed a custom dev client was wrong; **no feasibility wall**.
2. **The render module is the yield (`apps/mobile/src/render/`).** `buildCard.ts` is the shared,
   **source-agnostic** draw logic (the skia components are passed in), so ONE builder serves the live
   `<CardComposition>` `<Canvas>` AND the node flatten; `flattenComposition()` is the client/offline
   flatten (P11) that feeds `POST /cards/:id/save-private`. `+@shopify/react-native-skia 2.2.12`
   (rule-08 justified). Verified: typecheck + the structural render test + the tsx/canvaskit harness.
3. **Composition element schema formalized (`@ingame/shared`).** The M1 stub (`z.array(z.unknown())`,
   F21) is replaced with the real **vector-element** schema — `rect | ellipse | poly | text`,
   normalized 0..1 coords, `fill` — plus the **cap-30** ceiling (OQ-008) on the elements array. The
   `schemaVersion` discriminator + the version-aware `compositionHash` (F21) are unchanged; the
   composition envelope stays **`.passthrough()`**.
4. **Closed attributes deferred (with the Styler + COSM roster).** base / frame / effect+intensity /
   finish / nameplate / title reference **cosmetic ids** (COSM-01) and formalize with the Styler build
   + the COSM-02 roster (0063). Until then they render from the render-module's local `CardComposition`
   type and ride the passthrough envelope. Nothing validates them server-side yet (the editor is M4+).

## Consequences
- **product-spec 0.51** — CARD-15 gains the composition-schema formalization note.
- **api-contract 0.52** — the `POST /cards` `composition.elements` payload is the shared
  `compositionSchema` (rect/ellipse/poly/text, cap-30); the envelope passthrough carries the closed
  attributes.
- **`@ingame/shared`** — `compositionSchema` (elements typed + capped), `cardElementSchema`,
  `CardElement`, `MAX_ELEMENTS`; the shared vitest updated (element validation + cap-30). The render
  module imports `CardElement`/`MAX_ELEMENTS` from shared (single source).
- **Known finding:** the canvaskit **web backend lacks `font.measureText`** — approximated in the
  render module; native skia has it (revisit for the editors' text layout).
- **Follow-on:** wire the live editor `<Canvas>` + `save-private` flatten at the editor surfaces; fold
  the closed attributes into `@ingame/shared` when the COSM roster + asset-id scheme land.
