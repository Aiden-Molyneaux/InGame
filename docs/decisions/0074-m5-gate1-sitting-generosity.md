# 0074 — The M5 gate-1 sitting: G-I signed · §1-GO ratified · refund posture · the generosity amendment

**Date:** 2026-07-13 · **Status:** LOCKED (the owner's gate-as-we-go sitting, live demos watched)
**Companions:** [0072](0072-m5-economy-model-and-pricing.md) · [0073](0073-m5-entry-gate-rulings.md) ·
[m5-entry-decision-log.md](../planning/m5-entry-decision-log.md)

## What the owner watched (live, real Postgres, 23/23)
The F36 double-spend core (5 parallel debits → 1 success, reconcile holds) · exactly-once starting
grant + parallel daily claims + parallel receipt replay · `sum(ledger.delta) == balance` across mixed
ops · the full-reversal refund landing at −30 past the −25 floor, replay-safe.

## Signatures

| # | Ruling | Status |
|---|---|---|
| 1 | **Generosity amendment (ECON-02 revised):** starting grant **5 → 10 PX** · the **Newcomer Ladder** — first **7 claims** (lifetime, non-consecutive, never lapses) at **+2/+2/+3/+3/+4/+5/+6 PX**, **each ladder day ALSO granting a free earned-only cosmetic** (the 7-item **newcomer set**, owner-picked at the roster pass; `source:'earned'`, never purchasable — ACH-04 prestige lane) · standing **+1/day (lapses)** from claim 8. One claim button throughout. Owner's rationale: the TCG front-loaded-generosity hook — inspire that feeling. Month-one free player ≈ 58 PX + 7 exclusives. All SYS-04 seeds. **→ build packet P11.** | ✅ SIGNED |
| 2 | Spend floor 0 — users never spend into debt (G-I invariant set confirmed as intent) | ✅ SIGNED |
| 3+4 | **Refund posture:** reversals land **fully** (even past −25 — the floor is a **monitoring tripwire**, `belowFloor` telemetry, never a clamp) · **no automated clawback** (provenance-tracking punishes honest refunders) · containment = Apple's refund gate → the self-punishing negative hole → **ECON-11 operator clawback** (audited, human) for egregious cases · **watch-lever recorded:** buy provenance complexity only if beta telemetry shows real abuse. Owner explicitly walked the 140-PX abuse scenario and accepted the self-bricking containment. | ✅ SIGNED |
| 5 | **§1-GO ratified:** publish-flatten in-process (node-skia in the API, ~30ms warm) · flattened renders on local disk behind the `StorageProvider` seam · **R2+CDN swap owed pre-M6-beta** (provisioning-log #14) | ✅ SIGNED |

**G-I: PASSED** (the economy change-class owner approval for P1/P2/P4 is banked). The P2 refund
divergence flagged at build review (contract 0.59) is hereby the ruled behavior.

## Ripples
product-spec **0.57** (ECON-02 rewrite · ECON-09 posture) · m5-build-task gains **P11** (ladder
build: config 10-PX start + ladder service + DailyBonusBar ladder-aware + newcomer-set entitlement
slot) · the roster pass gains the **newcomer-set (7 earned-only items)** deliverable · OQ-002's
remaining "login-bonus amount/cadence" lever: **resolved** (milestone thresholds still → M7).
