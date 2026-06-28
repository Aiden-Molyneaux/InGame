# 0026 — Collection card peek-flip (reverses OQ-059 / decision 0025)

- **Date:** 2026-06-24
- **Status:** accepted
- **Related IDs:** **COL-12** (new) · CARD-01 (card back) · CARD-16 (a11y / reduce-motion / coachmarks) · COL-10/11 (friend-view + privacy) · `motion.cardFlip` · §2.1 Collection (design-spec)
- **Supersedes:** decision 0025's OQ-059 ruling ("card flip stays Game-page-only — no Collection peek-flip")
- **Source:** owner directive, 2026-06-24 — owner asked that a card on the Collection (own + friend) afford flipping to its stats back in place. On review this is the exact thing OQ-059 had closed; surfaced to the owner, who chose to reverse it.

## Context
**OQ-059 (decision 0025, 2026-06-18) had rejected this feature.** It ruled the face→back flip stays a Game-page (§4.2) deep-inspect, and that the Collection scans stats via the dense-list mode + the shelf stats-eyebrow (OQ-033) — "without flipping a single card." The rejection was framed purely as a **stat-scanning** question ("no strong scan-the-backs case").

The owner's 2026-06-24 request reframes it as an **experiential / affordance** question: InGame is a retro "trophy case" of trading cards, and a physical collectible card has a back you turn over. That value (delight, tactility, "these are real collectibles") is the half OQ-059's utilitarian rationale never weighed — so the owner reopened and reversed it. The reversal was made deliberately through the change protocol (00-INDEX §4), not as a quiet edit.

## Decision

### COL-12 — the Collection gains an in-place card peek-flip
A game's card **flips in place to its standardized stats back** (CARD-01) on the Collection screen — a quick stats peek **without leaving the screen**.

- **Scope: shelf + grid only.** Dense-list is **excluded** — its rows already print hours/status and carry a navigate-chevron, so a list-row tap **stays "open the Game page."** This confines the tap-model change to full card faces.
- **Tap model:** **tap** a card flips it to the back; **tap the back** returns it; the back carries a **VIEW GAME** control → the Game page (§4.2); **long-press** = an optional shortcut straight to the page. (Tap was chosen for the flip — the delightful, low-friction gesture — while keeping primary navigation **visible** on the back rather than hidden behind a gesture.)
- **Transient:** the peek is local UI state, not persisted; it resets on leaving the screen or switching view mode. Animation reuses `motion.cardFlip`.
- **Friend-view (COL-10/11):** works, under the **same privacy gate** — the back shows only friend-visible fields (hours · status · owned-since + the card's designer attribution); notes / rating / personal platforms stay owner-only (COL-04/05, OQ-058). VIEW GAME → their friend-view Game page (M7).
- **Accessibility / discoverability:** the flip is a **tap** (the non-gesture path CARD-16 requires) carrying a screen-reader "flip to stats" action; **reduce-motion** → instant cross-fade, no rotation. Discoverability is a **first-run coachmark** (CARD-16) — **no persistent on-face indicator** (owner directive: the card face stays clean).

### API ripple (api-contract 0.24)
The back needs two fields the collection *list* reads didn't carry:
- **`designer { userId, username }`** on the card object — added to the "rides every card payload" rider, so it lands on `/me/collection`, `/users/:id/collection`, the switcher, and the gallery (alongside `equipped`, CARD-22). Renders the back's "CARD ART DESIGNED BY" line and **closes a latent gap** where the Game-page back (§4.2) already printed a designer with no backing field.
- **`percentComplete`** on `/me/collection` items (the own back's COMPLETE %). The **friend** payload omits it — the friend back shows hours/status/ownedSince + designer only (privacy gate).

## Rationale / alternatives
- **Keep OQ-059 (do nothing)** — rejected: the original rejection only answered the *informational* question; it never weighed the *experiential* value of a collectible card having a turnable back, which is core to the product's identity. The owner reversed on those grounds.
- **Tap = flip, long-press = open page** (owner's first proposal) — not taken: it demotes the primary action (open the Game page) to a *hidden* long-press, overloads long-press (already = tools sheet / Arrange grab on this screen), and makes "tap a card" mean something different here than on Top-5/recommendations (CARD-07). Resolved by putting a **visible VIEW GAME control on the back** instead, with long-press kept only as an optional shortcut.
- **Tap = open page, flip via a face glyph/swipe** — not taken: the owner wanted tap to be the flip and **no on-face indicator**; discoverability is carried by a first-run coachmark instead.
- **Include dense-list** — rejected: its thumb is too small to render a legible back, and the row already shows the stats, so a flip there is redundant; the row stays a navigation element.

## Follow-ups
- **Board ✅ (folded in 2026-06-24):** the COL-12 peek-flip stage (grid · shelf · friend) lives in the canonical `collection-states.html`; the scratch variant was retired. The on-back **VIEW GAME** control was reworked from a bespoke chip to the real `KeycapButton/secondary` (cream · flat · Scanline press) at the print-scale `mini`+`block` size. Owner review of the flip UI still welcome.
