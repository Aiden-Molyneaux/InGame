# M5 Entry Decision Log — the §0 gate receipt

> The [m5-build-task §0](m5-build-task.md) entry-gate receipt (template: the M4 log). Filed
> **2026-07-12** — the same day as the Apple/RevenueCat provisioning sitting and the 0072 pricing
> ruling. Authority: decisions [0072](../decisions/0072-m5-economy-model-and-pricing.md) +
> [0073](../decisions/0073-m5-entry-gate-rulings.md); DoD = m5-build-task §8.

**No M5 surface build starts until:** (a) this gate is landed **✅ DONE (2026-07-12)** **and**
(b) the M4 close-out commit exists + `m5` is cut from it **⬜ OWED — the owner's gate-5 sign-offs +
committing the ~32 in-flight §3.6/light-theme files**.

## The rulings

| §0 | Item | Ruling | Recorded in |
|---|---|---|---|
| 0.1 | OQ-122 read-class (gate-3) | RATIFIED — `SYS-01-PUBLIC-READ`/`publishedOnly()` + bearer `AUTH-LOOKUP`; folds OQ-126; composition never crosses users | 0073 · product-spec 0.55 (SYS-01) |
| 0.2 | Pricing + adoption model | **Adoption = component acquisition + free design grant**; 7-tier ladder (1–10 ULTIMATE) @ 5 PX/$; 5-SKU pack line; floor −25. Residue: roster re-tag → focused pass (blocks P10 only); OQ-137 title-ink free | 0072 · product-spec 0.54 · api-contract 0.56 |
| 0.3 | IAP restore | Rides `POST /iap/validate` (documented reuse) | 0073 · api-contract 0.57 |
| 0.4 | Refusal codes + ledger enum | Six 409s (F-17, land-as-built); reason enum pinned | 0073 · api-contract 0.57 |
| 0.5 | Render storage | StorageProvider seam, local-disk now, R2 pre-beta | 0073 · provisioning-log #14 |
| 0.6 | Block × adopted card | **Keep it** (owner-picked); gallery invisibility; M5 slice only | 0073 · product-spec 0.55 (SOC-09) |
| 0.7 | CARD-19 + rate limits | ≥3 els/≥2 types · publish 3/10min+10/day · adopt 30/min+200/day · global hash-dedup (G-K async) | 0073 · api-contract 0.57 |
| 0.8 | Refund copy | "Purchases are yours to keep" — OQ-092 closed | 0073 |
| 0.9 | AUTH-01 breach-check | Re-slot → M6 | 0073 · product-spec 0.55 |
| 0.10 | Carryover | OQ-138 flattened-only galleries · OQ-100 AdoptCount public · OQ-101 adopt online-only · 136/140 ⟨stretch⟩ · 141 rides P3 | 0073 |
| 0.11 | M1-P | Apple + RevenueCat **DONE** (same-day sitting); Google percolating; owed = provisioning-log §3 | [m1p-provisioning-log](m1p-provisioning-log.md) |

## Still owed before §3 surface build (not part of this gate)
- **M4 close-out**: owner gate-5 sign-offs (device walk verdicts stand; the milestone-wide sign-off
  is the owner's word) + **one commit of the in-flight tree** → cut `m5` from it.
- **The §1 publish-thread spike** (first build act, budget-capped, go/no-go owner checkpoint).
- **Roster tier re-tag** (focused pass, Fable pre-proposes) — before P10 seeds, not before P1.

## Health
`/health` re-run after the 0.54/0.55 + 0.56/0.57 doc-graph bumps → 🟢
([dashboard](../PROJECT-HEALTH.md)).
