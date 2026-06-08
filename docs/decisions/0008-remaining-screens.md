# 0008 — Remaining-screens decisions

- **Date:** 2026-06-08
- **Status:** accepted
- **Related IDs:** DEV-01/03, SOC-03, SOC-04, CAT-07, ACH-05, AUTH-06/07

Quick decisions from the back half of the page-by-page walkthrough.

- **Device editor is lighter than the card editor** (DEV-01): shell colour + sticker placement,
  *not* the full vector toolkit; **personal-only** (devices aren't published/adopted); a free
  **default device** always renders; decoration can't obscure nav (DEV-03).
- **Compare adds total-games** (collection size) alongside hours; completion % stays out for v2 (SOC-03).
- **Lists = Top-5 only** for v2; general/custom lists parked (SOC-04).
- **Contributor profile + Achievements are friend-viewable** showcase surfaces (privacy-gated);
  **stats + achievement badges, no separate level/rank system** (CAT-07, ACH-05) — consistent with
  skipping the profile level badge earlier.
- **Onboarding = a guided, skippable quick-start** that lands the user on a populated collection
  (AUTH-06).
- **Account deletion** is provided in Settings (AUTH-07) — table stakes for a real app.

These complete the screen inventory; `ui-design-requirements.md` now specifies all screens.
