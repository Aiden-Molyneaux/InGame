# 0003 — Achievements & easter eggs (in v2)

- **Date:** 2026-06-07
- **Status:** accepted
- **Related IDs:** ACH-01..08; reconciles COSM-04, ECON-05; touches NOTIF-01, SYS-04, PROF-03

## Context
The product owner wants achievements — both **milestone** achievements ("add 10 games", "contribute
5 entries", "acquire a premium effect") and **easter eggs** (surprise rewards for innocuous acts:
friend a specific user, add a specific game like Destiny or Fortnite). He specifically wants them in
**v2** so the engine doesn't have to be retrofitted later, which would also force awkward
retrospective ("back-granted") achievements.

## Decision
Build an achievement **system** in v2; defer the specific **content** to a later brainstorm (OQ-004).

- **Data-driven, server-configurable definitions** (condition + reward + visibility); new
  achievements/eggs ship without an app release (ACH-01).
- **Event-driven, idempotent trigger engine**: features emit domain events; the engine evaluates
  conditions; each achievement unlocks once per user and can't be farmed (ACH-02).
- **Two visibility types**: visible milestones with progress, and hidden easter eggs (ACH-03).
- **Rewards = mixed, server-configurable** (product owner's choice): badge/clout by default, with
  optional Customizer currency and/or cosmetic entitlements — including **achievement-exclusive
  cosmetics** that are earnable only and never sold (ACH-04). Reuses wallet/ledger + entitlements.
- **Showcase + celebration**: earned achievements display on the profile (ACH-05); unlocks fire a
  notification + in-app celebration (ACH-06).
- **Retrofit-proofing**: a domain-event emission convention is established in **Foundation
  (Phase 1)**; the engine itself lands in **Phase 6**. Because v2 ships with it, there is no
  back-granting (ACH-08).

## Rationale / alternatives
- **Badge/clout-only rewards** rejected — less "juicy" than the owner wants.
- **Generous economic rewards** rejected as the default — pours too much free currency into the
  economy; the mixed+configurable model keeps the faucet tunable.
- **Achievement-exclusive cosmetics** chosen because earned-only prestige *complements* the store
  (it's not a store SKU) rather than cannibalizing it.
- **Adding achievements in a later version** rejected — exactly the retrofit/back-grant pain the
  owner wants to avoid; the event plumbing is cheap to include now, expensive to add later.
