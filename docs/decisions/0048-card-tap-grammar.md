# 0048 — Card-tap grammar (the four-mode law for tapping a game card)

**Date:** 2026-06-29 · **Status:** ✅ Accepted — the card-tap grammar (**CARD-23**) is **applied** to the
spec graph (product-spec 0.40 · design-spec 0.45 · 00-INDEX register). (b) The Top-editing conflict with
0047 is resolved in **direction** — owner ruled *fold §4.7 into a Collection TOP view*; the Top-rework
itself is **decision 0049** (draft). Board fixes remain owed (see ripples).
**Owner:** Aiden (rulings 2026-06-29) · Claude Code (spec-owner)
**Touches:** CARD-07 · CARD-01/22 · COL-12 · SOC-11 · PROF-05 · WTP-01/03 · SOC-06 · (new) **CARD-23**
**Source:** the pre-engineering card-tap audit — [`game-card-tap-audit.md`](../design/mockups/audit/2026-06-29/game-card-tap-audit.md)
(24-agent fan-out over all 20 converged boards + the spec graph), then 13 owner rulings.

## Why this exists
Tapping a game card appears on almost every screen, but the converged boards defined the *outcome* only
in caption prose (zero wired handlers) and several surfaces defined nothing. Before engineering, the
owner asked for one predictable, context-determined rule so the card-tap is implemented once, not
twenty ad-hoc ways.

## Decision — the four-mode law (new **CARD-23**)
A game card is the **universal handle for a game** (CARD-07). A single tap resolves to exactly one of
four modes, chosen **only by the role of the surface**, and **the whole card is always the tap-target**
(it mirrors any adjacent primary button — R-H):

| Mode | A tap… | Surfaces |
|---|---|---|
| **NAVIGATE** | opens the **Game page (§4.2)** — your card → owned-state; a friend's → friend-view | Compare matchups, list/search rows, contributor "games added", **pinned-favourite, now-playing**, **Up-Next queue + now-playing pin (R-QUEUE)**, **Friends-feed object-peek thumbs (R-FEED)**, onboarding finale |
| **FLIP** | flips in place to the stats back; the back's **VIEW GAME** / long-press → Game page | **Collection grid + shelf** (own & friend) — **COL-12** |
| **INSPECT** | opens **CardDetail** — card **enlarged** + EquipReadout (CARD-22) + adopt | Discover, Add-Game search, Game-page community gallery, contributor "cards designed"/V1, **the Game-page owned/friend hero (enlarge — R-ENLARGE)** |
| **ACT-IN-PLACE** | select / pick / add-to-Top / adopt — **never navigates** | Game-page CARDS switcher (select), CardPickers (pick), onboarding add-rail (add), any **arrange/edit mode** (R-SEAT: a plain tap is a no-op; drag reorders) |
| *(inert)* | nothing — actions live on buttons | card under construction (Styler/Canvas), Store live-preview, Report backdrop, held/celebration cards, logged-out Welcome |

**Corollaries:** lifecycle gates the *action*, not the *gesture* — offline (SYS-10) keeps
reads/flips/navigation alive and dims only writes; privacy (PROF-03) removes the cards entirely; a tap
target is the whole card, not a sub-element.

## The 13 rulings (owner, 2026-06-29) — all resolved
- **R-COL** → Collection tap = **FLIP** (COL-12 confirmed). *The converged `collection-states.html` is
  STALE — it draws no flip and its grid caption still says "tap any card → Game page"; board fix owed.*
- **R-TOP5** → a Profile **Top-3** card tap opens the person's **Collection, scrolled to that game**
  (the PROF-05/COL-10 gateway). *(The Top-10 size + Top-3 showcase already landed in 0047; the Top
  **editing** surface is the unresolved conflict below.)*
- **R-ENLARGE** → tapping the Game-page hero **enlarges** it (CardDetail inspect — yours: enlarge +
  share/edit; a friend's: enlarge + adopt, which also resolves **R-ADOPT** — one adopt path).
- **R-H** → the **whole card** is the tap-target, mirroring its primary button.
- **R-QUEUE / R-FEED** → **NAVIGATE** to the Game page.
- **R-SEAT** → in arrange/edit mode a single tap is a **no-op** (drag reorders).
- **R-MINIGRID** → contributor "cards designed" preview cells are tappable → **CardDetail**.
- **R-SUG** → "popular first adds" suggestion cards → **Add Game, pre-targeted** to that game.
- **R-TREND** → Discover trending opens its **community-card-design** CardDetail.
- **R-MODZOOM** → Admin ReviewPanel gets an **enlarge** on the reported card (low priority).
- **R-WELCOME** → logged-out landing showcase stays **decoration** (no destination exists).

## Spec-graph ripples (APPLIED 2026-06-29 — except boards)
- ✅ **product-spec → +CARD-23** "card-tap grammar" (the four-mode law + the whole-card corollary);
  CARD-07 gains the "the card is the handle, tappable" note; CARD-22/CardDetail note the owned/friend
  **enlarge** (R-ENLARGE). No api change (navigation + inspect are client-side over existing payloads).
  Bump product-spec 0.39 → **0.40** + changelog.
- **design-spec → §1.5 GameCard** gains the per-host interaction note it currently lacks; **§2.4b** the
  game-page hero enlarge. Bump → next.
- **api-contract:** no change (CARD-23 is client navigation/inspect over existing card payloads).
- **Boards owed:** re-fold COL-12 into `collection-states.html` (R-COL); draw the enlarge on
  `game-page-states.html` (R-ENLARGE); whole-card hit-target where only a button navigates (R-H);
  annotate `discover`/`friends`/`contributor` cards (R-QUEUE/R-FEED/R-MINIGRID).
- **00-INDEX** version register; `/health` after the graph edits.

## ⚠ Conflict with decision 0047 (must reconcile before any Top-editing spec)
0047 (accepted, same day, parallel session) **keeps the dedicated §4.7 Lists editor** (grown to 10
seats) + a standalone **VIEW TOP 10** grid. The owner separately told this session to **fold §4.7 into a
Collection "TOP" view** and retire it. These contradict on *where the Top is curated*. **CARD-23 itself
is neutral** to this (a Top-3 card tap → the Collection regardless), so this decision proceeded
independently. **Resolved 2026-06-29:** the owner ruled *fold §4.7 into a Collection TOP view* (retire the
dedicated editor) — captured as the Top-rework plan in **decision 0049** (draft), which **amends 0047**
and re-opens **OQ-083**. The two tracks must be coordinated before 0049 is applied.

## Alternatives considered
- **One blanket rule (always navigate):** rejected — loses the COL-12 flip delight and the
  community-card adopt/inspect flow the boards already rely on.
- **Leave it per-board (status quo):** rejected — that's the ambiguity this audit exists to remove.
