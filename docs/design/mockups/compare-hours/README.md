# Compare Hours (§4.6) — mockups

The **§4.6 Compare Hours** design track — the **friendly head-to-head** reached from a friend's
Profile/Friends row (SOC-02's *"Compare hours"* action), the **marquee social payoff** and the
**core return-driver** (SOC-03). A **novel interaction** (no single screen to extend), so it kicks off
as **three distinct organizing models** → owner gate → converge. Design-side only — §5.10 behavior
(SOC-03 · PROF-03 · ECON-01) is specified; shape gaps go to the inbox (OQ-074).

See **[`compare-hours-brief.md`](compare-hours-brief.md)** for the contract, the entry seam, the locked
component names, the three directions, the P1–P5 panel contract, and the hard rules.

## Drafts (for the owner gate — 2026-06-22)
Three **distinct ways to READ the comparison** (different organizing principle, not a recolor). Each
renders **P1 has-overlap · P2 no-shared-games · P3 friends leaderboard · P4 Skeleton · P5
privacy-limited (PROF-03)**; Offline + LoadError deferred to converge (caption-noted).

| File | Model | Thesis (how it reads the comparison) |
|---|---|---|
| [`compare-draft-a-ledger.html`](compare-draft-a-ledger.html) | **A · Side-by-side ledger** | Two aligned **YOU \| RIKO** columns — `CompareTotals` up top, then every shared game on its own row with both hour counts **aligned in the same two columns**, a quiet orange **StateMark** marking who leads each row; the leaderboard slice beneath. The **calm, scannable spreadsheet** pole — read top to bottom, no drama. **Burt: clean** ✅ (1 fix: GameCard snapped to the catalog `/thumb` 44×62 + the F-02 TL+BR step). |
| [`compare-draft-b-versus.html`](compare-draft-b-versus.html) | **B · Versus / head-to-head** ← **OWNER PICK (2026-06-23)** | A **duel** framing: a big totals **face-off** at the top (both totals large + a split **margin bar** + a verdict pill — who's ahead, by how much), then per-game **card-vs-card matchups** — **their `GameCard`/cell (96×134) on the left, yours on the right, the two hour counts between them with the winner in orange** (owner refinement 2026-06-23: matchup UI swapped from paired bars to draft A's numeric stats in this card-flanked layout; cards up-sized to `/cell` for legibility; cards now render the **real `#art-*` symbols** on per-game frames, and since it's a versus the two cards are **different designs of the same game** — their game-frame card vs your slate+foil card, 2026-06-24). The **playful, competitive** pole. **Burt: clean** ✅. |
| [`compare-draft-c-diff.html`](compare-draft-c-diff.html) | **C · Diff-first / overlap** | Leads with the **library overlap** (a three-segment *only-you · shared · only-them* bar) + the compact totals, then the shared games as **center-diverging deltas sorted by biggest gap** — orange = your turf, lavender = theirs — so you read **where you each dominate**; the leaderboard for context. The **insight / story** pole. **Burt: clean** ✅ (1 fix: removed a `<code>` monospace voice from a doc caption). |

**Status:** **owner picked B (Versus) — 2026-06-23**, with the matchup UI reworked to the card-vs-card
layout (their card · stats · your card, winner orange; cards up-sized). Drafts A + C kept for history.
Still **in pass** — refining B before converge; **not yet converged**. Converge target (next):
`compare-states.html` (full matrix incl. lifecycle), then the design-spec formalization + API page-audit
(OQ-074).

**Card-tap navigation (owner Q, 2026-06-23):** every matchup card is a doorway to the **Game page (§4.2)**
for that game — **your** card opens your view, your **friend's** opens their **friend-view** (their card ·
per-game compare · adopt, SOC-11 / decision 0020). Composes the existing §4.2 states — no spec change;
noted on the board as a hint and carried to converge.

## New components introduced (form is each draft's; names locked, ratified at converge)
`CompareHeader` (the who-vs-who — Avatars + names) · `CompareTotals` (total hours · total games ·
who's-ahead) · `ComparePair`/`CompareRow` (per shared game — `GameCard`/thumb + your hrs | their hrs +
who-leads) · `FriendsLeaderboard`/`LeaderRow` (ranked, your row highlighted). **Reuse:** `Avatar`
(PROF-08) · `GameCard`/`thumb` (F-01, the catalog `/thumb` 44×62 + its TL+BR step) · `StatTile` ·
`ListRow` · `RankChip` · `SectionHeader`(+`TertiaryLink`) · the `StateMark` · the `.return-link`
friend-view back-seam · `DeviceShell` + `NavBand` (FRIENDS active) · the §1.6 lifecycle family.

## Built off the social cluster
Inherits the Find-Add 4.8 / Friends draft A shell verbatim — DeviceShell + NavBand (FRIENDS active),
the Teal/Midnight tokens, the flat **Scanline-Energize** keycaps (F-03), the orange **StateMark** (never
the pink shell LED), the **F-06** type scale (21/15/11/9), and the §1.8 lifecycle grammar, so Compare
reads as the same app.

## Non-commerce (the law honored)
**No gold anywhere** — comparing creates no card; gold = card-creating only (F-02 / ECON-01). The
no-shared-games nudge (browse their collection / recommend a game) wears **system orange**, never gold.
**Completion % is OUT** for v2 — the comparison axis is **hours, then games**. Compare is **read-only**
over the friend's visible data (PROF-03). The PIXELS mark is unused.

## Privacy is a first-class state (PROF-03)
Compare runs only over the **friend-visible field set**. A friend who hides **hours** or **games** limits
the compare — the hidden axis **drops out cleanly, never leaks** (P5 renders the hours-hidden case: the
totals cell shows a quiet HIDDEN lock, the per-game block becomes a `lock-well`, the friend leaves the
hours leaderboard; the games axis still compares). **Block (SOC-09)** severs Compare entirely.

## Flags raised (design-side only — never edited the spec)
- **OQ-074** — `GET /me/compare/:friendId` response shape is unenumerated (api-contract prose-only).
  Proposed in the inbox: the **per-game-pair** `{ gameId, title, yourHours, theirHours, leader }`, the
  **totals** `{ yourHours, theirHours, yourGames, theirGames, leader }`, and the **leaderboard-slice**
  `{ rank, user, hours/games }`. For the API page-audit at converge.

## Buttons + marker
Flat **Scanline-Energize** keycaps (F-03, owner-locked 2026-06-18) — isolated to a single `.btn:active`
rule so a future ripple can swap it. The on-screen marker is the orange `StateMark` pixel-square
(`--scr-accent`), never the pink shell LED. Shell `NavBand` keys stay physical.
