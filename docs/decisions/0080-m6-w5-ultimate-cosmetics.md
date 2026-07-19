# 0080 — M6 W-5: "Ultimate" colour-customizable cosmetics (OQ-154)

**Date:** 2026-07-18 (nodded) → 2026-07-19 (filed) · **Status:** LOCKED (owner-signed, [beta-wave §E](../planning/m6/beta-feature-wave.md)) · **Owner:** Aiden
**Companions:** [`ultimate-cosmetics-draft.md`](../planning/m6/ultimate-cosmetics-draft.md) (the design draft this ratifies) · OQ-154 (resolved) · [`beta-feature-wave.md`](../planning/m6/beta-feature-wave.md) §A (packet W-5) / §E (the sign-off + amendment 1).

> **Provenance note (2026-07-19 audit reconcile):** these §7-of-the-draft rulings were nodded live in the
> §E sign-off ("Looks good … approved except as amended") but were never propagated from §E into the draft
> or a decision record. This is that record. The draft's §7 "owner-nod items" are now resolved as below.

## The decision
"Ultimate" is a colour-customizable tier of cosmetics: the user picks the cosmetic's colour (frame / nameplate / font) via the shared ColorPicker **in the Styler/Canvas editor**, and the chosen colour rides the composition JSON per-layer (the CARD-12 intensity precedent). It is **NOT a new cosmetic type or table** — a per-design `colorCustomizable` flag on catalog entries + the already-reserved-but-empty `ultimate` price band (the draft found both exist; near-zero schema).

## Owner rulings (draft §7, resolved)
1. **Price = the existing 10-PX `ultimate` band** (already in `COSMETIC_TIERS`, launch-empty). No new ECON band. [approved]
2. **Separate SKUs, NO promotion (§E amendment 1):** existing designs KEEP their normal single-colour versions at their current tiers; the colour-customizable versions are **minted as SEPARATE catalog entries alongside** — e.g. `MARQUEE` (frame, stays) + `MARQUEE ULTIMATE` (10 PX, customizable); same for `BRASS` (nameplate) and `SCRIPT`/pacifico (font). No grandfathering (nothing changes for existing owners). [amended from the draft's "promote in place"]
3. **Badge:** the gold-fill **ULTIMATE** chip + a hue-strip glyph + "ANY COLOUR — YOURS TO PICK". [approved]
4. **Adopt pricing:** ECON-03/04 unchanged — an unowned ultimate component adds its full 10 PX to the adopt-reconcile missing-sum, and the grant includes colour freedom. [approved]

## Notes
- No RevenueCat/IAP dependency — cosmetics are Pixel-priced (ECON-01). Effects/finishes are **excluded** from the beta cut (their colour would need to ride the runtime-overlay descriptor cross-user — an M7 seam; the draft records it).
- The one real render change is parameterizing the hard-coded brass gradient ramp (`buildCard.ts` ~L613); flatten bakes the colour (no cross-user leak).
- **Build owed** (W-5 is not yet built): the registry flag + the three ULTIMATE starter SKUs + the store badge + the editor ColorPicker hook + the composition colour attribute + a spec/contract ripple (COSM-/ECON- ids, api-contract row). Follows this decision.

## Impacted IDs
OQ-154 (resolved) · COSM-/ECON- (new ids at build time) · CARD-12/CARD-15 (composition colour attribute precedent).
