# 0005 — Economy: single currency + user-facing ledger

- **Date:** 2026-06-08
- **Status:** accepted (refines decision 0001 D11/D12)
- **Related IDs:** ECON-01, ECON-07

## Context
`ECON-01` originally described a "dual economy" but never pinned down **what a user pays with for
premium effects/asset packs** (the create-side products). That gap defined the entire Store, so we
resolved it during the Store walkthrough.

## Decision
- **Single soft currency.** Real money **only ever buys Customizer currency**; premium cosmetics are
  never sold for real money directly. Currency is then spent on **both** adopting premium cards
  (1 each, ECON-03) **and** acquiring premium effects/packs to create your own (priced higher).
- **User-facing ledger.** The wallet shows **balance + a simple earn/spend history**, and is
  **surfaced on the Store screen** (the header counter is its entry point elsewhere) (ECON-07).

## Rationale / alternatives
- **Currency + direct real-money purchases** rejected — two payment paths, a more complex store, and
  achievement-earned currency couldn't buy effects.
- The single-currency model gives one mental model (à la V-Bucks/Robux), makes **achievement currency
  rewards spendable on everything**, and **preserves the two-tier value** (adopt a finished card
  cheap vs. pay more currency for the effect to make your own — ECON-04 still protects effect value).
- Surfacing the ledger heads off "where did my currency go?" confusion now that one currency flows in
  from bonuses/achievements/IAP and out to adoptions/effects.
