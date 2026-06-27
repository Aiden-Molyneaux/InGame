# 0032 — Contributor profile (4.9) formalization

- **Date:** 2026-06-27
- **Status:** accepted
- **Related IDs:** **CAT-10** (new — contributor standing) · **CAT-07** (revised — "My Contributions") · CAT-02/05/09 (added games · adoption + presence aggregates) · CARD-01/05 (designed cards · adoptions) · PROF-03 (privacy) · PROF-07/SYS-04 (percentile chips + threshold gating) · `SectionEmpty` · §1.5 Contributor-profile set · §2.16 Contributor profile (design-spec)
- **Closes:** **OQ-079** (the CAT-07 ripple + percentile data-model + `GET /users/:id/contributions` enumeration, all owed at converge)
- **Source:** owner sign-off, 2026-06-26 (gate: **B · The Trophy Wall**) → iteration → converge 2026-06-26; this records the behaviour/shape decisions the formalization needed and ratifies the spec ripple.

## Context
The Contributor profile (§4.9, CAT-07) converged design-side as the canonical board `contributor-profile/contributor-states.html`. The owner picked **draft B · The Trophy Wall** at the gate, then iterated it twice: (1) replaced the contributor **achievement badges** (CATALOGUER / ARTISAN / FIRST FINDER / PROLIFIC) with a **percentile standing** rendered as the Profile **`PctPill`** tags-on-numbers (PROF-07), and dropped **field-edits (CAT-06)** as a surfaced contributor field; (2) recomposed the board into the **Profile grammar** (the `-profilelike` lineage) — boxless STATS tiles → SIGNATURE CARD hero → CARDS DESIGNED `/cell` grid → GAMES ADDED title rows — and gave the cards and games sections **equal VIEW ALL** links escaped outside their wells.

Convergence flagged a spec ripple (**OQ-079**): the new board **diverges from CAT-07's must-host list** (drops edits + badges, adds a standing), the percentile needs a **data model** (metric · cohort · thresholds · privacy), and the `GET /users/:id/contributions` payload was never enumerated. This pass rules those and formalizes the board.

## Decision

### CAT-07 — what the contributor profile hosts (revised)
CAT-07 is rewritten to the converged board: the surface hosts **added games** (CAT-02/05) and **designed cards** (CARD-01) with **adoption/usage stats** (total adoptions · total **collections reached** = the CAT-09 aggregate over the contributor's added games · counts) and a **contributor standing** (CAT-10); **each list opens a VIEW ALL** full view. Two things are **removed** from the surface:
- **Achievement badges / level system** — gone; the **standing is the ranking/pride signal**. (Any contributor *milestones* live with the achievements engine, ACH-*/OQ-004 — not on this surface.)
- **Field-edits (CAT-06)** — not surfaced here; they stay a catalog behaviour.

Still **friend-viewable** (PROF-03), still reached from the Profile **MY CONTRIBUTIONS** gateway only.

### CAT-10 — contributor standing (new, P2)
The percentile **`PctPill` chips (PROF-07)** on contribution stats (cards-designed / adoptions / games-added / collections-reached) are computed against the **contributor cohort** — users with **≥1 contribution** — *not* the whole population. Rationale: ranked against all users, every contributor trivially lands "top-X%", so the chip would carry no information. The standing:
- applies **wherever a contribution stat shows its chip** — the Profile clout stats (PROF-04) and the Contributor profile (CAT-07);
- is **threshold-gated** (PROF-07/SYS-04 — below the cohort floor → **no chip**, and "every tile renders cleanly without its chip");
- is **privacy-gated** — a chip attaches only to a stat the viewer is already allowed to see (PROF-03);
- **replaces the dropped achievement badges** as the pride signal; **no level system**.

### Board shape (design-spec §1.5 / §2.16)
The Contributor profile is a **Profile-grammar recomposition**, not a new screen vocabulary — it reuses `IdentityBlock`, the **boxless `StatTile`** row (the §2.2 de-well, 0.29), the PINNED-FAVOURITE `GameCard/hero` grammar (SIGNATURE CARD), `GameCard/cell` + `RankChip` (CARDS DESIGNED), the `Strip` row (GAMES ADDED → Game page §4.2), `SectionHeader` + `TertiaryLink` (VIEW ALL), the PROF-03 lock-well, and the §1.6 lifecycle. **One net-new component:** **`SectionEmpty`** — the *per-section* empty nudge inside an otherwise-populated profile (a **gold acquisitive `DESIGN A CARD`** variant for CARDS DESIGNED, F-02; a **neutral `ADD A GAME`** variant for GAMES ADDED), distinct from the whole-screen `EmptyState` of the never-contributed P2. The profile reads as a **top-N summary**; **VIEW ALL** opens the cursor-paginated full lists.

### Two edges from the completeness pass
- **(a) Standing on the privacy-limited / non-friend view.** The standing **rides the honest aggregates** — the limited shape still returns `stats` + `standing` (the percentile attaches to a stat the viewer can already see, CAT-09 aggregates are public), so the chips show; only the **item detail** (signature / lists) is withheld. This is exactly PROF-07's "a chip attaches only to a stat the viewer can already see" — no contradiction with the board, which shows the chip on the public totals.
- **(b) A contributor's own MOD-02 soft-hidden card.** Inherits **MOD-02** with no new rule: a soft-hidden card is **absent from another viewer's** `topCards` / VIEW ALL and from the public-facing counts (pending review); the **owner still sees their own** (self-visibility of soft-hidden content). Applying MOD-02, not extending it.

## API ripple (api-contract 0.28)
- **`GET /users/:id/contributions`** — enumerated, **two privacy-gated shapes (PROF-03)**:
  - **friend/full:** `{ user, stats { gamesAdded, cardsDesigned, totalAdoptions, totalReached }, standing { byAdoptions?, byGames?, byReach? } | null, signatureCard, topCards[], topGames[] }` (each `standing.*` a CAT-10 percentile vs the contributor cohort, `null` below the PROF-07 floor).
  - **non-friend/limited:** `stats` + `standing` only (honest aggregates); the lists/signature omitted. Empty contributor → zeroed stats, `null` standing/signature, empty lists. Blocked/suspended/deleted → the generic unavailable (MOD-09).
- **`GET /users/:id/contributions/cards?cursor=`** — VIEW ALL cards, adoption-sorted: `{ items[{ cardId, gameId, gameTitle, adoptionCount, card }], nextCursor? }`. PROF-03-gated.
- **`GET /users/:id/contributions/games?cursor=`** — VIEW ALL games, reach-sorted: `{ items[{ gameId, title, collectionsCount }], nextCursor? }` (CAT-09). PROF-03-gated.

## Rationale / alternatives
- **Achievement badges kept** — rejected: the owner found the four badges noisy and redundant once a quantitative standing exists; the percentile chip is the catalog-blessed gold value-marker (PROF-07), so it carries pride *and* resolves the prior Burt badge-gold ambiguity (a non-card gold glyph) in one move.
- **Percentile vs the whole population** — rejected: trivially ranks every contributor top-X% (most users contribute nothing), so the chip would be information-free. The **contributor cohort** is the only denominator that makes the standing mean something.
- **A dedicated standing bar** (the first take) — rejected by the owner for the **Profile-consistent tags-on-numbers** treatment (`PctPill` inside the stat tile) — one grammar across Profile and the contributor lens.
- **A new component vocabulary for 4.9** — rejected: the contributor profile is the *destination of a Profile gateway*, so it reads as a Profile recomposition; minting only `SectionEmpty` keeps the catalog small (the simplest-solution rule).

## Follow-ups
- **None blocking.** The standing's cohort floor + chip thresholds reuse the PROF-07/SYS-04 tunables (illustrative like the rest of the economy values, OQ-002/011). `SectionEmpty` is now a named §1.5 component available to any future per-section empty state.
