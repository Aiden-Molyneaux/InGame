# 0017 — Store economy batch: PIXELS identity, claimed daily bonus, starter pack, hold-to-buy, sticker/shell rescope

- **Date:** 2026-06-12
- **Status:** accepted
- **Related IDs:** ECON-01/02/06/07 (edited) · **ECON-10 (new)** · COSM-01 (retyped) · DEV-02 (edited) ·
  CARD-02/17 (rescoped) · ripples api-contract (acquire endpoint, wallet/daily-bonus shapes, store
  payload, device/cosmetic types) + ui-design-requirements (§1.5, §3.4, §4.11, §4.12).
- **Source:** the five owner rulings of the Store design track (2026-06-12), recorded verbatim in
  `docs/design/plans/2026-06-12-store-drafts-brief.md`; resolves OQ-041..OQ-044, OQ-046, OQ-047
  (OQ-045 stays open as named design debt). Design-side truth already landed (design-spec 0.10/0.11,
  catalog v0.3, `store-states.html`).

## The decisions

### 1. Currency identity — PIXELS (presentation naming, recorded for shared vocabulary)
The Customizer currency's in-app face is **Pixels** (singular *1 Pixel*, ticker **PX**), marked by
the **pixel-gem** (flat pixel-art facets, ink outline, blue glints — design-spec §1.5). The spec term
**"Customizer currency" is unchanged** as the system/config name; API field names stay neutral
(`balance`, `currency`). Chosen over CREDITS/INK/VOLTS and the BITS/SPARKS cuts across two identity
rounds.

### 2. Daily bonus is CLAIMED on the Store (ECON-02)
The login bonus becomes a **daily claim that lives on the Store screen** (the `DailyBonusBar`):
**+1 PX per day** (default), **idempotent per day**, **unclaimed days lapse** (no banking),
**no streaks in v2** (a future hook). Rationale: the Store gains a daily ritual beside the drop's
weekly one (ECON-08) — two return hooks on one surface. Values/cadence stay server-configurable
(SYS-04; OQ-002 still owns the numbers).

### 3. One-time Starter Pack (new ECON-10)
A single cheap IAP tier with **outsized value** (~2–2.5× the base PX-per-$ rate; drafted $0.99 → 12
PX), purchasable **once per account, ever**; the tile is flagged FIRST PURCHASE ONLY and disappears
(or shows purchased) afterwards. Top Up also **does the math for the user**: every pack states its
PX-per-$ and %-better-than-the-smallest-pack (presentation; values OQ-011).

### 4. Hold-to-buy is the spend confirm for instant currency purchases (ECON-01 clause)
Cosmetic purchases spend currency **instantly with no dialog**; the confirm is a **deliberate
press-and-hold** on BUY (release early = cancel, nothing spent). IAP packs keep the **platform's
native confirm**. An **accessible non-hold alternative is required** before build (owed in
design-spec gaps; tracked as the residual of OQ-046).

### 5. Restore semantics for consumables (ECON-06 clause)
**Restore purchases** = receipt re-validation + account-entitlement re-sync + completion of
interrupted transactions. **Consumable currency packs are never re-granted by restore** (no
double-grants); the wallet balance is account state, not receipt state.

### 6. Sticker packs are SHELL items; the card canvas sells nothing (COSM-01, CARD-02/17)
Curated glyph/sticker packs are pointless for cards — the card canvas already composes free vector
art (CARD-02). They are **shell sticker packs** (placed/scaled/rotated on the device shell, DEV-01).
The card canvas's vector elements are **all free baseline** in v2; premium-on-card remains the
**closed attributes** (effects · finishes · frames · fonts — decision 0014's taxonomy, CARD-13
unchanged). *(Whether a curated **card**-canvas pack ever returns is a future question — nothing in
v2 depends on it.)*

### 7. One handheld; shells, not models (COSM-01, DEV-02)
v2 has **one device body** (the pocket handheld). "Device model" and "device skin" collapse into one
cosmetic type: **device shell** (colourways/wraps). DEV-02 now reads: own multiple **shells**, switch
the active one; DEV-03's free default shell guarantee unchanged. No alternate body shapes in v2.

## Ripples
- **product-spec 0.17:** ECON-01 (display name + hold-to-buy clause) · ECON-02 (claim model) ·
  ECON-06 (restore clause) · **+ECON-10** · ECON-07 (ledger entry list refresh) · COSM-01 (retype) ·
  DEV-02 (shells) · CARD-02/17 (free-baseline vectors).
- **api-contract 0.15:** **+`POST /cosmetics/:id/acquire`** (the missing spend-currency purchase
  call — Store BUY + the editor reconcile had nothing to hit; audit find) · `/me/wallet` gains
  `dailyBonus { available, amount, nextResetAt }` · `/me/daily-bonus` notes (Store-claimed, lapses) ·
  `/store` payload (starter `oneTime/purchased`, pack shapes) · `/me/device` `activeShellId` ·
  `/cosmetics` type enum (shell_sticker_pack · device_shell).
- **ui-design-requirements 0.12:** §1.5 (Pixels naming) · §3.4 (daily claim · drop drawer · Top Up ·
  category renames · states line) · §4.11 (sheet detail · hold-to-buy + a11y alt · pack-contents
  view · whole-page theme preview · sticker preview deferred OQ-045) · §4.12 (ledger entries ·
  negative variant emphasis).
- **open-questions:** OQ-041/042/043/044/046/047 → Resolved (046 leaves an a11y residual in the
  design gaps); OQ-045 stays open (Device-editor pass).
