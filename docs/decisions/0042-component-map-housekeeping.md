# 0042 — Component-map housekeeping (naming + a stale class)

**Date:** 2026-06-29 · **Owner:** Aiden · **Scribe:** Claude Code
**IDs:** none (naming / design-spec) · **Closes:** OQ-087 · OQ-088 · OQ-089
**Bumps:** component-map 0.3 · design-spec §1.5 (names)

## Context
Three small items surfaced during the 2026-06-28 component-map pass; trivial, batched here.

## Ruling (owner)
- **OQ-087 — `QueueRow` name clash.** Discover's drag-reorder queue row keeps **`QueueRow`**; the
  Admin reports-queue row becomes **`ModQueueRow`**. Distinct symbols in the map.
- **OQ-088 — un-catalogued onboarding banners.** Name them in §1.5: O9 "shelf is live" → **`LiveBanner`**;
  O6 NOTIF-04 priming panel → **`PrePrompt`**; the Friends aggregated-request banner → reuse
  **`InlineBanner`** (it's the existing banner grammar, not a new component).
- **OQ-089 — `.presence` is NOT stale (corrected on inspection).** The `.presence` blocks
  (`game-page-states.html` :744/:818) render the **live `PresenceStats` (CAT-09)** stat row
  (in-collections · friends-have-it · community-cards) — the board even labels it `PresenceStats`
  (hint :754). The audit note conflated the class **name** with the **cut online-presence** feature
  (`PresenceDot`/`StatPeek`, cut 0.23 per OQ-071). **Ruling: KEEP — it maps to `PresenceStats`.** The
  throwaway `.presence` class may optionally be renamed `.pstats` for clarity (non-blocking, mockup
  hygiene); **no deletion.**

## Ripple
- **component-map 0.3:** `ModQueueRow` added + disambiguated from `QueueRow`; `LiveBanner` / `PrePrompt`
  named; the `.presence` note **corrected** — it maps to `PresenceStats` (CAT-09), kept.
- **design-spec §2.14:** `LiveBanner` (O9) / `PrePrompt` (O6) named.
- **Board:** **no deletion** — `.presence` is the throwaway class for `PresenceStats` (CAT-09); an
  optional cosmetic rename only.
