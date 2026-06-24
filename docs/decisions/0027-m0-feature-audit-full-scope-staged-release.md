# 0027 — M0 feature audit: full v1.0 scope, staged release

- **Date:** 2026-06-24
- **Status:** accepted
- **Related IDs:** ECON-05, ECON-05a (§10), SOC-09, NOTIF-01/04, CARD-15/09/10/11/16, OQ-046, AUTH-07, PROF-07, PROF-08, MOD-03/04, CAT-05
- **Resolves:** the M0 owner gate (road-to-market.md §11 gate 1 — the keep/cut/defer ruling)
- **Source:** the 2026-06-24 M0 feature audit (8-agent keep/cut/defer pass, adversarially verified) + the owner's ruling.

## Context
The M0 audit assessed the whole feature set against a *moderately aggressive* keep/cut/defer bar and a recommended **v1.0 = M1–M5** cut line, with Social (M6) and Engagement (M7) as fast-follows. Outcome: 72 keep / 38 defer / 3 cut, broadly well-calibrated — the spine (foundation, compliance, economy) almost all keep; prunes concentrated in **editor depth** and **social/engagement timing**. The adversarial verifier flagged a small number of non-scope correctness/sequencing landmines (below).

The owner ruled against the prune: **build the complete vision.**

## Decision

### Scope: full v1.0
v1.0 is the **complete feature set** — all of M1→M7. **Nothing is newly cut.** The only features that stay out are those already parked in product-spec **§10** by prior decisions (e.g. ECON-05a creator currency-kickback / revenue-share, external sharing beyond the card image, real-data integrations) — §10 is not reopened here. The audit's two discretionary cut suggestions, **PROF-07** (community percentile chips) and **PROF-08** (avatar-as-composition), stay **IN**.

The audit's "defer" list is re-read as **build-order, not exclusion** — every feature is still built.

### De-risking: staged release (not a smaller cut)
Risk is managed by **how we release, not how much we build**: ship to real hands in stages while the full product comes together.
- **M2** — on-device build (styled shell + profile) on a physical iPhone.
- **~M4** — closed beta (TestFlight / Play internal): the trophy case (collection + customization).
- **after M7 → M8** — public launch of the complete v1.0.

"Feature-complete" and "first release" are deliberately decoupled.

### Non-scope catches that survive the full-scope ruling (build constraints)
These the verifier flagged; they are correctness/sequencing, not scope, so they hold regardless:
1. **ECON-05 delivers progressively** — the raw adoption-count signal lands at **M5** (rides the kept creator dashboard, CARD-05); the prestige + cosmetic-milestone-unlock limbs land with the **achievements engine (ACH-04, M7)**. Because ACH ships *within* v1.0, the P0 promise is fully met by public launch — **no product-spec change needed**; the only artifact is that the ~M4–M7 beta window shows the count alone. (This settles the ECON-05 question raised at the gate: sequencing, not a spec edit.)
2. **A11y items are launch gates, not "ship-lighter" trims** — the non-hold purchase alternative (**OQ-046** residual) and the **CARD-16** non-gesture editor path + reduce-motion are store-review gates.
3. **NOTIF-01 cannot ship without NOTIF-04 priming** — the OS push prompt is one-shot; firing it cold permanently burns the opt-in. Hard pair.
4. **Editor build-order** — the **CARD-15** render/flatten pipeline is built **before** the editor depth tails (**CARD-09** align/distribute + numeric transform, **CARD-10** blend modes + parametric shapes, **CARD-11** eyedropper/saved-palettes/curved text), to protect the highest-risk build item's schedule.
5. **SOC-09 block-against-card-designer (light form)** ships with publishing (**M5**) — CAT-05 designer credit is attributable UGC, so App Store Guideline 1.2 "block a user" applies the moment cards publish.
6. **MOD-03 minimal in-app report queue** holds at v1.0 (reports must be actionable for store review); only the polished **MOD-04** console sequences to its phase.
7. **AUTH-07 deletion ripple** is wired against the kept CARD-18/CAT-05/MOD-08 set at M8 (no hollow row-delete that tears holes in adopters' collections).

## Rationale / alternatives
- **Full scope over the audit's prune** — chosen because (a) a collection app without customization, economy, and social is a *lesser, different* app, not a smaller InGame; (b) in a passion-driven solo build, **motivation is the scarcest resource** — a gutted v1 risks it as much as an over-large one; (c) agent-driven build volume + no hard deadline make full scope viable.
- **Accepted tradeoff:** a longer road to *public* launch (full scope at ~12 hr/wk is long even with agents) — mitigated, not eliminated, by the staged-release checkpoints above. This is the live top risk and is tracked in road-to-market.md §11.
- **Rejected — the M1–M5 public-v1.0 cut line:** ships faster and leaner and would dodge the heaviest gates, but contradicts the owner's vision and the converged Social/Engagement design already in flight.
- The full per-feature keep/cut/defer table is **superseded** by this full-scope ruling; its lasting value is the seven build constraints above. The complete audit transcript lives in the workflow run if ever needed.
