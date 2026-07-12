# 0072 — M5 economy model: adoption-as-component-acquisition + the launch pricing sheet

**Date:** 2026-07-12 · **Status:** LOCKED (owner-ruled, "lock it in") · **Owner:** Aiden
**Context:** M5-entry §0.2 ([m5-build-task.md](../planning/m5-build-task.md)) — the pricing sheet was
the largest unspecified surface in the economy (OQ-011/OQ-002: no PX-per-$ rate, no pack tiers, no
component prices existed anywhere). Ruled early, ahead of the rest of the §0 sitting, to unblock
App Store Connect / RevenueCat product creation (M1-P lane, same day).

## Ruling 1 — Adoption is component acquisition (ECON-03/04 rewritten)

**Owner's instinct, Fable-endorsed as strictly better than the spec's model:**

> Adopting a card = **atomically acquiring its premium components the adopter doesn't already own**
> (at full component prices) **+ a free design grant**. Acquired components are **account-wide
> entitlements**, identical to store purchases, reusable in the adopter's own designs. Free cards
> adopt free; a card whose components you fully own adopts **free**. The creator earns the adoption
> (ECON-05 clout) on every path.

**Why the old model (flat 1 PX + scoped rights) lost:**
- It **underpriced the outcome**: a card carrying an 8-PX animated effect adopted for 1 PX — an 87%
  discount on the visual result for that game, quietly cannibalizing the store ECON-04 claimed to
  protect (it protected *reuse*, not the *outcome* people actually buy).
- It **dead-ended the adopter**: a scoped license you can't remix or grow from. The new model makes
  every spend **durable progression** — ownership accumulates, the editor gets richer, which drives
  more creation → publishing → adoption (the flywheel).
- It makes the community gallery **the store's best aisle**: every adoption is a component sale at
  full price; UGC becomes the merchandising.
- Personalized price chips ("3 PX for you — you own the frame") + the free-if-owned moment reward
  ownership and drive the next purchase.

**Consequences:** ECON-04's scoping concept is retired (revised in place, ID kept). Adopt-then-edit
sheds its reconcile step (ownership is outright). `card_adoptions.currency_paid` = the acquired sum.
Device cosmetics (shells/themes/sticker packs) never appear on cards → never in adoption pricing.
**The watch-lever at beta:** if gallery adoption feels dead, the fix is component repricing (server
config, instant) — not re-architecture.

## Ruling 2 — The 7-tier component ladder (adds the owner's ULTIMATE tier)

Base rate **5 PX/$** (1 PX ≈ $0.20). Tiers (SYS-04-tunable seed; relative order conforms to the
ruled store board, values were marked illustrative there):

| Tier | PX | Contents |
|---|---|---|
| Accent | 1 | premium inks, simple finishes |
| Trim | 2 | fonts |
| Standard | 3 | frames, nameplates |
| Deluxe | 4 | finishes, screen themes, sticker packs |
| Big | 6 | statement effects, standard premium shells |
| Showpiece | 8 | animated effects, marquee shells, drop items |
| **ULTIMATE** | **10** | legendary full-motion effects, flagship shells — "the biggest and best" |

ULTIMATE priced at 10 (not 12) deliberately: **one ultimate = one $1.99 base pack**, no
between-packs crack. Worst-case lavish card ≈ 22 PX (~$4.40); typical adoptions 1–8 PX. The free
player (~30 PX/mo from dailies) lives well — an accent a day or a showpiece a week.

## Ruling 3 — The 5-SKU pack line (conforms to the ruled Top-Up board)

Supersedes the orchestrator's earlier 6-SKU draft — the converged board's line (store-states P6:
starter row + 2×2 PackTile grid) is better-tuned: the $1.99 entry covers everything up to an
ULTIMATE (no impulse gap), starter is a $0.99 first-yes.

| SKU (consumable) | USD | PX | PX/$ |
|---|---|---|---|
| `px_pack_starter` ⭐ once/account (server-enforced, ECON-10) | $0.99 | 12 | 12.1 (≈2.4×) |
| `px_pack_010` | $1.99 | 10 | 5.0 (base) |
| `px_pack_030` | $4.99 | 30 | 6.0 (+20%) |
| `px_pack_065` | $9.99 | 65 | 6.5 (+29%) |
| `px_pack_140` | $19.99 | 140 | 7.0 (+39%) |

## Ruling 4 — Anchors

Start = 5 PX · daily = +1 PX (lapses, UTC-day) — unchanged. **Refund negative floor seeded −25 PX**
(ECON-09, SYS-04-tunable).

## Ripples
- product-spec **0.54** (ECON-01/03/04/09/10) · api-contract **0.56** (`POST /cards/:id/adopt`
  re-specified; personalized price chips).
- open-questions: **OQ-011 resolved** · **OQ-002 partially** (pack/price levers set; milestone
  thresholds stay open → M7 achievements).
- m5-build-task: §0.2 ruled · P3/P4 adopt/acquire semantics updated · P10 seeds get the tables above.
- The 0063 **premium roster re-tag** now has its tier vocabulary; the per-item assignment (which
  effects/shells land in which tier) remains a §0 sitting item.
- Store board: **no design change** — values were explicitly illustrative; the ruled layout stands.
