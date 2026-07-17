# 0075 — The M5 roster tiering + newcomer set (the re-tag sitting)

**Date:** 2026-07-13 · **Status:** LOCKED (owner redline of the Fable proposal; three tiers + the
HOLO-PLATE slot flagged for a one-line confirm — see Open) · **Owner:** Aiden
**Reinstates:** decision [0063](0063-cosm02-free-baseline-roster.md)'s free/premium intent that
[0068 §3](0068-roster-expansion-animation-driver.md) deliberately suspended (everything shipped
`basic`). This sitting turns the suspended split on. Companions: [0072](0072-m5-economy-model-and-pricing.md)
(the tier ladder) · [0074](0074-m5-gate1-sitting-generosity.md) (the Newcomer Ladder that needs the set).

## The tiering (SYS-08-tunable seed; every real item today; 26 premium)

**Frames** — free: CLEAN · LINE · DOUBLE LINE · TICKET · STUB · LIME · BUBBLEGUM · premium **3**:
GOLD · CHROME · EMBER GLOW · PLASMA · ORNATE GOLD · HOLO FOIL · **8** (animated): MARQUEE ·
**removed: BRACKETS**.
**Effects** — free: NONE · SOFT GLOW · SHEEN · DUST · VIGNETTE · premium **4**: HALFTONE · SCANLINE
*(moved from free)* · **8** (animated): FROST · EMBERS.
**Finishes** — free: STANDARD · MATTE · premium **3**: LINEN · **8** (animated): HOLOGRAPHIC ·
METALLIC · **removed: SUBTLE GLOSS**.
**Nameplates** — free: SLAB · RIBBON · BEVEL · CAPSULE · TAB · ARCH · DOGTAG · premium **3**: BRASS
*(the only premium nameplate)*.
**Fonts** — free: CHAKRA · PAYTONE · PIXEL · premium **2**: SLAB · MONO · SCRIPT · STENCIL.
**Inks · Vector Essentials** — all free (OQ-137 / decision 0017).
**Device shells** — free: TEAL · GRAPE *(moved to free)* · premium **6**: SUNSET *(moved to
premium)* · PINK · **8**: CARBON.
**Screen themes** — free: MIDNIGHT · PAPER *(light default stays free)* · premium **4**: DEEP SEA ·
BERRY · MINT · LILAC.
**Device stickers** — the 8-item pack stays fully free (0063 §5). Premium *packs* need pack
infrastructure that doesn't exist → the pre-launch content pass.

**Empty tiers at launch: 1 (accent) and 10 (ULTIMATE)** — nothing real qualifies; both fill in the
pre-launch content pass. Honest-empty > forced.

## The Newcomer Set (decision 0074's 7 ladder days)

Days 1–6 gift a real premium item (received by newcomers, still purchasable by everyone — gifts, not
exclusives), one per card aisle + one theme: **D1 LINEN · D2 STENCIL · D3 CHROME · D4 BRASS · D5 MINT
· D6 HALFTONE**. *(D4 = BRASS, swapped from the draft's DOGTAG once DOGTAG went free — a free item
can't be a gift.)* **D7 = the one true exclusive, reserved empty** until the content pass designs it
(the ladder no-ops gracefully on an empty slot).

## The pre-launch content pass (grown at this sitting)

New art owed before public launch (road-to-market M8 COSM design pass): ULTIMATE-tier legendaries ·
a tier-1 accent item · **HOLO PLATE** nameplate (0063-blessed, board-drawn, unbuilt) · an **animated
HOLO FOIL** frame variant (owner ask, tier 8) · the **D7 newcomer exclusive** · the parked 0063 "wow"
effects (galaxy/fire/…) · completing the icon library (19 → ~30, the acknowledged 0063 §6 gap).

## Consequences recorded
- **Free finishes drop to 2** (STANDARD · MATTE) — the thinnest aisle; owner accepted, may pull one
  back later.
- **P10 stays a seed-of-existing-items pass** (register tiers, apply the two removals, wire the 6
  newcomer slots + 1 empty, register `GET /cosmetics`) — **HOLO PLATE and all new art move to the
  pre-launch pass**, not P10 (keeps P10 mechanical / Sonnet-appropriate).
- **P10 implementation note:** removing BRACKETS / SUBTLE GLOSS must not orphan any dev-seed card or
  preset that references those ids — check + migrate or re-point before removal.
- The **aisle-header double-print** fix (parvati 🎨): H1 → "STORE AISLE", eyebrow keeps the specific
  aisle name — rides the next client touch (P7-adjacent), not P10.

## Open (owner one-line confirm before P10 launches)
- ⚠️ Three inferred tiers: **Halftone 4 · Scanline 4 · Linen 3** (owner said "lower than 6" /
  "higher than 1" without pinning) — recorded as Fable's read.
- The HOLO-PLATE-to-pre-launch move (vs the owner's earlier "Sure" to building it in P10).

## Ripples
product-spec **0.58** (COSM-03 roster-tiering changelog) · m5-build-task P10 gains the roster-seed
spec + the pre-launch content list · resolves the 0063/0068 deferred split · newcomer set feeds P11's
`newcomerLadderCosmetic` config slots.

## Amendment (owner, 2026-07-13, same sitting — supersedes the ⚠️ Open items)
**"3 is the baseline":** premium fonts **2 → 3** · HALFTONE + SCANLINE **→ 3** · screen themes
**4 → 6** · LINEN stays **3** (confirmed by the baseline rule). HOLO-PLATE-to-pre-launch: nodded.
**Live price points at launch: 3 / 6 / 8** (tiers 1 · 2 · 4 · 10 all launch empty — the 0072 ladder
keeps all seven as config vocabulary; the pre-launch content pass populates the gaps). Final:
**3 PX** = all premium fonts · all static premium frames · BRASS · LINEN · HALFTONE · SCANLINE ·
**6 PX** = SUNSET · PINK shells · all 4 premium themes · **8 PX** = MARQUEE · FROST · EMBERS ·
HOLOGRAPHIC · METALLIC · CARBON.
