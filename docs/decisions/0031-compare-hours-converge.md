# 0031 — Compare Hours (§4.6) converged + formalized (the Versus direction)

> **Renumbered 2026-06-27** from 0029 → 0031 to resolve a parallel-session number collision with `0029-welcome-onboarding-formalization-public-endpoints.md` (which owns the "decision 0029" references across product-spec/api-contract/design-spec). This Compare record had no inbound numeric references, so it moved. No content change.

- **Date:** 2026-06-24
- **Status:** accepted
- **Related IDs:** SOC-03, SOC-02, PROF-05, PROF-03, ECON-01, SOC-11, OQ-074, OQ-077, OQ-078
- **Resolves:** **OQ-074** (the `GET /me/compare/:friendId` payload shape) · **OQ-077** (the Compare convergence + design-spec/API formalization debt). *(Behavior is unchanged — SOC-03 already specifies the comparison; this records the design convergence + the payload-shape page-audit.)*
- **Source:** the Compare Hours design track — brief → three distinct draft directions → owner gate → pick → refine → converge → formalize (2026-06-22 .. 2026-06-24).

## Context
§4.6 Compare Hours is the **marquee social payoff** (SOC-03, the core return-driver), reached from a
friend's Profile via the **Compare hours** action (SOC-02 / PROF-05). It is a novel interaction with no
single screen to extend, so the track explored **three distinct organizations of the comparison** to the
owner gate: **A "Side-by-side ledger"** (the calm aligned-columns spreadsheet), **B "Versus /
head-to-head"** (a totals face-off + per-game matchups), **C "Diff-first / overlap"** (the library
overlap + per-game deltas sorted by biggest gap).

## Decision
- **Direction:** the owner picked **B "Versus / head-to-head"** — it best serves SOC-03's "core
  return-driver" intent (the face-off delivers the who's-ahead payoff up front). Drafts A + C retired to
  history.
- **Refinements applied:** the per-game matchup is **card-vs-card** — **their** `GameCard/cell` on the
  game frame, **your** card on a premium **slate + foil/holo** frame (same game art, a *different card
  design* — the authentic CARD model where each user's displayed card per game is their own cosmetic);
  the two hour counts sit between them with the **winner in `scr.accent`**. Cards are the catalog
  **`/cell` (96×134)** rendering the real `#art-*` symbols. **A card-tap opens the Game page (§4.2)** for
  that game — yours, or the friend's friend-view (SOC-11). The highlighted leaderboard row is a flat
  `scr.accent`-tint fill (**no left-edge accent rail**, OQ-078).
- **Converged board:** `mockups/compare-hours/compare-states.html` — the full state matrix: **P1**
  has-overlap (the model) · **P2** no-shared-games · **P3** friends leaderboard · **P4** loading Skeleton
  · **P5** privacy-limited (PROF-03) · **L1** "Signal Lost" + RETRY · **L2** Offline (read-from-cache,
  SYS-10).
- **Components (design-spec 0.26 — §1.5 Compare set + §2.12 composition):** `CompareHeader` ·
  `CompareTotals` (the totals face-off) · `ComparePair`/`CompareRow` (the card-vs-card matchup) ·
  `FriendsLeaderboard`/`LeaderRow`.
- **Payload — OQ-074 (api-contract 0.25):** `GET /me/compare/:friendId` →
  `{ friend, totals { yourHours, theirHours, yourGames, theirGames, leader }, games[{ gameId, title,
  yourCard, theirCard, yourHours, theirHours, leader }] (the shared collection intersection — the two
  cards back the card-vs-card matchup, CARD-07/22), leaderboard[{ rank, user, hours, games, isMe }] }`.
  **Privacy-gated (PROF-03):** a hidden axis is **omitted, not zeroed** — hours hidden → every
  `theirHours` (+ the hours `totals` + the hours `leaderboard`) drops and the **games axis still
  compares**; collection hidden → `games`/`theirGames` drop; a block → unavailable (SOC-09, like
  `/users/:id`). **Read-only, non-commerce** (no PIXELS, **no gold** — comparing creates no card,
  ECON-01 / F-02); **completion % is OUT** (hours + games only).

## Rationale / alternatives
- **A "Side-by-side ledger"** and **C "Diff-first / overlap"** were retired — B leads with the emotional
  who's-ahead hit SOC-03 is reaching for; A's aligned totals and C's biggest-gap framing were grafted in
  as refinements rather than carried as separate screens.
- **Card composition in the matchup** (vs a flat stat row) was chosen so the cosmetic flex reads and
  Compare ties back to the card economy; "same game, different card design" is truthful to the CARD model
  and gives the versus its visual punch.
- **No new endpoint, no write** — the compare composes server-side from both collections; this is the
  profile-level SOC-03 read (distinct from decision 0020's *single-game* client-side compare, SOC-11).
- Per 00-INDEX §4, this record is the resting place for OQ-074 + OQ-077 (their rationale otherwise lived
  only in the api-contract / design-spec changelogs).
