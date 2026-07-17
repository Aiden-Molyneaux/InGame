# 0073 — M5-entry gate rulings (the §0 sitting)

**Date:** 2026-07-12 · **Status:** LOCKED (owner: "whatever you think is best" after the OQ-122
walkthrough + the seven-defaults review; specific answers on 0.6/roster below) · **Owner:** Aiden
**Companion:** [0072](0072-m5-economy-model-and-pricing.md) (the §0.2 pricing/adoption-model ruling,
signed earlier the same day) · the gate receipt is
[`m5-entry-decision-log.md`](../planning/m5-entry-decision-log.md).

| §0 | Ruling |
|---|---|
| **0.1** | **OQ-122 RATIFIED (gate-3, walked + signed):** the third read-class — `// SYS-01-PUBLIC-READ` marker + `publishedOnly(table)` helper, lint-valid **only** with an explicit visibility predicate; cross-user payloads serialize through allowlist shapes that **never expose `composition`**; + the enumerated bearer-token `AUTH-LOOKUP` variant (SOC-10 invite tokens pre-named for M6). **Folds OQ-126** (`SYS-01-COMMUNITY-AGGREGATE` unifies under it). Retagging a user-owned table as GLOBAL stays forbidden. Enforced by `rule-02-scoping` + the SYS-07 standing tests; proven at the G-D re-fire (strip predicate → RED). → product-spec 0.55 SYS-01. |
| **0.2** | Ruled earlier (0072). **Residue:** per-item roster tier re-tag → **deferred to a focused pass** (Fable pre-proposes assignments, owner reacts — the 0072 pricing pattern); blocks P10 seeds only. **OQ-137**: title-ink = **free** (curated → free-pick ColorPicker; no economy dimension). |
| **0.3** | **Restore rides `POST /iap/validate`** — documented reuse, no new endpoint (closes the roadmap's one undrawn gap); consumables never re-granted (0017). → api-contract 0.57. |
| **0.4** | **409 refusal-code family** (LOOK_CAP precedent): `INSUFFICIENT_BALANCE{shortBy}` · `ALREADY_ADOPTED` · `NOT_PUBLISHED` · `MIN_COMPLEXITY` · `DUPLICATE_COMPOSITION` · `STARTER_PACK_CONSUMED`; 422 stays zod-only; codes append to `ERROR_CODES` only as their endpoint builds (F-17). **`currency_ledger.reason` enum pinned**: `starting_grant · daily_claim · pack_purchase · adoption · acquire · milestone · refund_reversal · admin_adjustment`. |
| **0.5** | **StorageProvider seam** (put/get/delete by key): local-disk impl now (API-served `/media/…`); **R2+CDN swap before the M6 beta** (provisioning-log #14). |
| **0.6** | **Block-a-designer keeps the adopted card** (owner-picked): copy + acquired components stay (MOD-08 pattern — blocking hides people, not possessions); mutual gallery/profile invisibility; new adoptions of a blocked designer refused. M5 ships the gallery/adopt slice; full block UX → M6. → product-spec 0.55 SOC-09. |
| **0.7** | **CARD-19 seeds** (G-K async, SYS-04/05-tunable): min-complexity **≥3 elements OR ≥2 distinct element types** (drafts/private exempt) · publish **3/10min + 10/day** · adopt **30/min + 200/day** (closes OQ-097's uncapped-bulk hole) · `wallet:spend` 30/min · `iap:validate` 10/min · hash-dedup = **global exact-match refuse**. |
| **0.8** | **Refund copy:** "purchases are yours to keep" — true under ECON-09 (no clawback), phrased not to over-promise against the lone ECON-11 operator exception. **Closes OQ-092.** (Floor −25 ruled in 0072.) |
| **0.9** | **AUTH-01 breach-list check re-slotted M5 → M6** (pre-beta hardening; security not economy; new runtime dep). → product-spec 0.55. |
| **0.10** | **Carryover stances:** OQ-138 — galleries consume **flattened images, never live canvases** (app-wide: live skia = editors only; the 16-WebGL ceiling doesn't bind M5). OQ-100 — gallery `AdoptCount` public **by design** (0024 precedent); hour-inference half → M7. OQ-101 — adopt **online-only** (disabled offline state) + `ALREADY_ADOPTED` idempotency. OQ-136/OQ-140 — ⟨stretch⟩, build only if the day has room. OQ-141 — cheap CoW copy-POST idempotency guard rides P3. |
| **0.11** | M1-P: Apple/RevenueCat **DONE** same day — see [`m1p-provisioning-log.md`](../planning/m1p-provisioning-log.md) (§3 = the 16-row owed table). Google Play percolating; G-J may carry (§5 rule). |

**Exit state:** product-spec **0.55** · api-contract **0.57** · OQs updated (122/126/092/097/100/101/
011/002/136/137/138/140/141) · m5-build-task §0 closed · `/health` 🟢 → **§3 build cleared** (P1 ·
P2 · P5 · the §1 spike first; P3 unblocked by 0.1; P10 waits on the roster pass).
