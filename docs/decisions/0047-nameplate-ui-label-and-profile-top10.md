# 0047 — Nameplate is a UI label (F-06-bound); Profile showcase → Top-3 set-pieces + Top-10 view

**Date:** 2026-06-29 · **Status:** Accepted — ⚠ its **editing-surface choice (keep the dedicated §4.7 editor) is SUPERSEDED by decision 0049 (2026-06-30): the Top-10 is curated in the Collection "TOP" view** (`lists-states.html` re-homed into the Collection). The **cap-10 + Profile Top-3 + nameplate F-06** rulings stand. · **Owner:** Aiden (ruling) · Claude Code (spec-owner)
**Touches:** F-06 · PROF-05 · SOC-04 · CARD-07 · SOC-02 · COL-10 · `/me` · `/users/:id` · `/me/lists`

## Context
A pre-M1 audit (`docs/design/audit/2026-06-29/nameplate-sub9-legibility-audit.md`) found game-card
**nameplates rendering below the 9px F-06 floor** on small card variants (`/cell` 6px · `/mini` 4.5px ·
`/thumb` 3.2px). These were considered legal because the type-scale pass had treated the plate as
**print on the card object** (size-exempt). The owner ruled the carve-out wrong: the nameplate is
wayfinding, not decoration.

The fix raised a second question on the Profile, whose `TOP 5` showcase is the **SOC-04 curated list**
(`/me` `top5`, cap 5) edited by the just-converged §4.7 Lists/Top-5 editor. The owner chose to grow the
showcase rather than shrink the cards.

## Decision

### A — Nameplate = UI label, F-06-bound (reverses the print-exemption)
The card nameplate (`.plate`) obeys the **F-06 9px floor** like any on-screen label. A card size that
cannot hold a **≥ 9px** plate **drops the plate** and names the game in a **legible label beside/below**
(row title or caption). The card *back* stat print still scales with the card (it is not a nameplate).

**Application is phased.** Profile is done here; the remaining boards (the audit's Group A real
instances + the Group B/D redundant sub-floor plates) are a tracked sweep in SCREEN-STATUS. Foundation
rule **F-06 reworded**; **`/mini` and `/thumb` carry no plate** going forward.

### B — Profile showcase → Top-3 set-pieces + a clickable Top-10 view
- The **SOC-04 curated list grows from Top-5 to Top-10** (cap 5 → 10).
- The **Profile features the top 3** as legible **`GameCard/cell` (96×134) set-pieces** (10px plate held) *(corrected from `/grid`: 96×134 is the `/cell` size, not `/grid` 161×225 — owner ruling, OQ-114 / decision 0055, 2026-07-01)*
  + a **`VIEW TOP 10 ›`** `TertiaryLink`.
- **VIEW TOP 10** opens a **ranked two-per-row grid** of all 10 cards (same `/grid` card, scaled wider) —
  owner-picked layout. No new endpoint: ≤10 carded items inline in `/me`/`/users/:id`; the view is
  navigation + presentation.
- The §4.7 **Lists/Top-5 editor now curates 10** (`/me/lists` cap 5 → 10, `kind: top10`, `rank 1..10`).

## Consequences / ripples
- **product-spec 0.39:** SOC-04 (Top-5 → Top-10, cap 10, Profile features 3), PROF-05 (Top-3 + Top-10
  view), CARD-07 / SOC-02 / COL-10 / §6 data-model wording (Top-5 → Top-10). No new IDs (amendments).
- **api-contract 0.39:** `/me` + `/users/:id` `top5` → `top10` (`rank 1..10`); `/me/lists` cap 10 /
  `kind: top10` / `LIST_FULL` past 10. No new paths.
- **design-spec 0.43:** F-06 reworded (nameplate F-06-bound) + the type-scale card-print line; §2.2
  Profile recomposed (TOP 3 `/grid`×3 + Top-10 view) + state-matrix entry; §2.17 cap → 10 with the
  **board re-pass flagged owed**.
- **Board:** `profile/profile-states.html` applied (TOP 3 + Top-10 view); drafts in
  `profile/profile-top5-legibility-drafts.html` (A/B/C — owner picked B).
- **Owed (tracked, SCREEN-STATUS):**
  1. **§4.7 Lists editor board re-design 5 → 10 seats** — ✅ **DONE 2026-06-29** (design-spec §2.17 0.44 ·
     api 0.39 · `lists-states.html`): #1 `/hero` headliner + a 3-up `/cell` shelf of seats 2–10, the
     `/cell` plate snapped to the legible 10px floor; Burt PASS. (Was: "five fixed seats ARE the frame".)
  2. **Group A nameplate sweep** — ✅ **DONE 2026-06-29**: Contributor CARDS-DESIGNED `/cell` made
     legible (10px); Canvas PROOF size-ladder reconciled (legible /grid-96, dropped /mini+/thumb, caption
     reworded). (Lists seats/CardPicker handled in item 1.)
  3. **Group B/D cleanup** — ✅ **DONE 2026-06-29**: sub-9px plates dropped where a legible title sits
     beside (Discover · Collection strips · Friends feed · Admin/Report previews · Add-game · Game-page
     galleries · Onboarding rows · Store/Styler cosmetic samples), via a per-board F-06 override.
  4. **Catalog F-06 card** — ✅ **DONE 2026-06-29**: Catalog → v0.12 (F-06 rule card + plate-floor
     specimen amended to the ≥9px-or-drop ruling).

## Alternatives considered
- **Keep cards small, drop plate + caption everywhere (solution #2 globally):** legible but loses the
  "card as set piece" trophy feel the owner wants on the Profile. Used only where context already names
  the game (Group B/D).
- **Keep curated Top-5; feature 3, view all 5:** smallest ripple but contradicts the owner's Top-10 ask.
- **Separate auto "Top-10 by hours":** a second concept + endpoint; rejected for one coherent curated list.
