# 0004 — UI architecture & art direction

- **Date:** 2026-06-08
- **Status:** accepted
- **Related IDs:** PROF-05, COL-10, CARD-07, NOTIF-03, SOC-06/07; design-direction in `design/ui-design-requirements.md`

## Context
During the page-by-page walkthrough we set the information architecture and the art-direction intent
that Claude Design will work within.

## Decision
- **5 bottom tabs on the device "plastic":** Collection · Discover · Friends · Store · Profile.
  **Discover merges discovery + the Up Next queue.** Navigation lives on the device frame; all
  contextual actions live on the device "screen."
- **Device-as-frame metaphor:** a customizable retro console/cabinet that *houses* the collection;
  the frame is persistent chrome, cards scroll within it.
- **Art direction = "distinctive expression, legible navigation."** Be bold in collection
  presentation, transitions, the card object, the device, and celebrations; stay conventional in
  core navigation, dense lists, forms, and checkout. Justification: InGame is **low-frequency**, so
  users re-learn it each visit — novelty must not live in wayfinding.
- **Game Card = trading-card portrait**, art+title face, stats on flip; it is the **universal
  representation of a game everywhere** (CARD-07).
- **Two-mode screens:** Profile (PROF-05) and Collection (COL-10) each have a self mode and a
  read-only friend-view; Top-5 on a profile is the gateway into that person's collection.
- **No notifications center** (NOTIF-03) — contextual homes + push. **Gamertags live on the
  Profile.** **Achievements are reached from the Profile only.** **Activity feed lives on Friends**,
  aggregated/low-noise (SOC-06).
- Persistent **currency counter** on customization/commerce screens.

## Rationale / alternatives
- **Bold-everywhere navigation** rejected — too risky for a low-frequency app; the device fiction
  already supplies novelty *on top of* legible bones, so we don't need to gamble wayfinding.
- **Aesthetic-skin-only** rejected — wastes the device concept's expressive potential.
- On-screen control *styling* and a stylized *break-out* are deferred to Claude Design (OQ-006/007).
