# Compare Hours (§4.6) — design-track kickoff: THREE drafts → gate → converge

The **§4.6 Compare Hours** design track — the friendly head-to-head reached from a friend's
Profile/Friends row (SOC-02's *"Compare hours"* action), the **marquee social payoff** and the
**core return-driver** (SOC-03). This file is the plan; the gate ruling is appended at the bottom once
the owner picks. Self-brief sources: product-spec §5.10 (SOC-01/02/03 · PROF-03/05 · SOC-09/11 ·
ECON-01) · ui-design-req §4.6 (+ §3.5 friend-view seam) · api-contract `/me/compare/:friendId` ·
SCREEN-STATUS row 4.6 (⬜ → 🔶 in-pass this pass). Per the design-iteration rule this is a **novel
interaction** with no single screen to extend, so it kicks off as **THREE distinct organizing models**
→ owner gate → converge (do **not** converge in this pass).

**Design-side only.** §5.10 behavior (SOC-03) is fully specified; the drafts render the **page**, never
the behavior. Any shape/behavior gap → an append to `docs/open-questions.md` (1 logged this pass —
OQ-074, the compare payload shape). The spec is never hand-patched.

## The screen (the contract — ui-design-req §4.6 · SOC-03)
A **friendly comparison** between you and one friend, *"Reached from a friend's profile/Friends."* The
canonical seam is **Friend's Profile (friend-view, PROF-05) → the `Compare hours` action (SOC-02) →
this screen**, between two **mutual friends** (SOC-01). **Must host** (verbatim, §4.6):

- per-game **hours side-by-side** — only games **you both own** (the collection intersection); hours is
  the per-game `hours played` field (COL-03) — `SOC-03`
- **total hours** — each side's summed hours — `SOC-03` / `PROF-04`
- **total games** — each side's collection size — `SOC-03` (added 0.7 / decision 0008)
- **who's-ahead** — the head-to-head verdict, read directly off hours/games (no points, no score) —
  `SOC-03`
- **friends leaderboard** — the viewer's friend cohort ranked (by hours / by games), your row marked —
  `SOC-03`

**OUT for v2 (drawn nowhere):** **completion %** (*"Completion % out for v2"* — the axis is hours +
games only) · **personal rating ⭐** (PRIVATE, never cross-user — COL-03) · **private notes / personal
platforms** (owner-only — COL-04/05). Compare is **read-only**; the comparison axis is **hours, then
games**.

## Scope the SCREEN — don't redraw the neighbours
This track draws **Compare Hours** only. The **friend Profile** (§3.5 / PROF-05) is the *entry* — drawn
only as the back-seam (`‹ RETURN TO <friend>`), not redrawn. The **single-game** compare
(*compare-with-mine*, SOC-11) is the **per-game cousin** that lives on the **Game page friend-view**
(§4.2, already converged) — **not** this screen; this screen is the **profile-level** SOC-03 head-to-head.
**Adopt / add-to-collection** (SOC-11/ECON-03) live on the friend collection-entry detail, **never** on
Compare — Compare is non-commerce (see below).

## API shape already drafted (🔶 — page-audit comes at converge)
One endpoint backs the whole screen: **`GET /me/compare/:friendId`** — *"Per-game + total hours,
total-games comparison + leaderboard slice (SOC-03)"* (api-contract line 119, v0.22).

**Central contract gap (flagged, not fixed):** the endpoint is **prose-only — no payload is
enumerated** (no per-game-pair, totals, or leaderboard-slice shape). Drawn against a **proposed** shape
and logged as **OQ-074** for the API page-audit at converge. Decision 0020 mints **no** new endpoint
(the *single-game* SOC-11 compare composes client-side); the profile-level SOC-03 compare rides this one
read.

## Non-commerce — NO gold anywhere (ECON-01 / F-02)
Comparing creates **no card** and spends **nothing**. **Gold is reserved for card-creating actions**
(ADD/adopt, F-02); Compare wears **system orange** for any prominent action (e.g. a RETRY or a
no-overlap nudge), **never gold**. The PIXELS mark is unused. Real money only ever buys Pixels (ECON-01)
— Compare is not a spend surface.

## Privacy is a first-class state (PROF-03)
Compare runs **only over the friend-visible field set**. A friend who hides **hours** or **games**
(PROF-03, managed in their Settings) **limits** the compare — the hidden axis **drops out cleanly, never
leaks**. **Hours hidden** → no per-game hours + no total-hours head-to-head + excluded from the hours
leaderboard (degrade to the games axis). **Games hidden** → no overlap to enumerate + no total-games →
the compare collapses toward a locked state. **Block (SOC-09)** severs Compare entirely (mutually
invisible — the entry seam disappears). Each draft renders a **privacy-limited** panel (P5) borrowing the
Profile `lock-well` grammar.

## The new components (the headline; FORM is each draft's, NAMES are locked)
No compare/leaderboard/stat-row component exists in the catalog — these are **new compositions** built
from catalog furniture, names ratified at converge:

- **`CompareHeader`** — the who-vs-who: **your `Avatar` + theirs + names** (Maverick vs Riko), the
  comparison's subject line.
- **`CompareTotals`** — **total hours · total games · who's-ahead** overall (composed from `StatTile`
  values, F-06 emphasis 15).
- **`ComparePair` / `CompareRow`** — one **shared game**: a `GameCard`/thumb (uncropped, F-01) + **your
  hrs | their hrs** + a quiet **who's-ahead** marker.
- **`FriendsLeaderboard` / `LeaderRow`** — the friend cohort ranked (hours/games), **your row
  highlighted** (composed from `ListRow` + `RankChip`).

**Reuse (don't reinvent):** `Avatar` (square monogram, PROF-08) · `GameCard`/`thumb`·`mini` (F-01) ·
`StatTile` · `ListRow` · `RankChip`(`/first`) · `SectionHeader`(+`TertiaryLink`) · flat
`KeycapButton`/`ToolKeycap` (Scanline Energize) · the `StateMark` (orange pixel-square) · the
`.return-link` friend-view back-seam · `DeviceShell` + `NavBand` (FRIENDS active) · the §1.6 lifecycle
family (`Skeleton`/`Signal-Lost`/`Offline`).

## The three models (different way to READ the comparison — not a recolor)
The distinctness axis is **how the comparison is organized** — the calm-ledger pole vs the competitive
pole vs the insight pole. All three sit on the **same inherited foundation** (Teal shell · Midnight
screen · flat keycaps · F-06 scale · §1.8 lifecycle) so Compare reads as the same app.

- **A · Side-by-side ledger** — [`compare-draft-a-ledger.html`](compare-draft-a-ledger.html). Two
  aligned **YOU | THEM** columns: `CompareTotals` up top, then per-shared-game `CompareRow`s with both
  hour counts **aligned in their columns** and a **quiet who's-ahead marker** per row; the leaderboard
  slice beneath. The **calm, scannable spreadsheet** pole — totals and every shared game readable at a
  glance, no drama.
- **B · Versus / head-to-head** — [`compare-draft-b-versus.html`](compare-draft-b-versus.html). A
  **duel** framing: a **big totals face-off** at the top (who's ahead overall, **by how much**), then
  per-game **matchups** as comparative **bars / diff rows** (the longer bar wins the row). The **playful,
  competitive** pole — the return-driver dialled up.
- **C · Diff-first / overlap** — [`compare-draft-c-diff.html`](compare-draft-c-diff.html). Leads with
  the **shared-games overlap** and the per-game **DELTAS sorted by biggest gap** (where each of you
  dominates — *"you crush Elden Ring, they own Stardew"*), the leaderboard for cohort context. The
  **insight / story** pole — the comparison as a read of where you diverge.

## Panel contract (each draft renders P1–P5; lifecycle deferred to converge WITH a caption note)
- **P1 — HAS-OVERLAP (the model thesis):** `CompareHeader` (you + them) · total hours · total games ·
  who's-ahead overall · the per-shared-game side-by-side (only games you **both** own) · the friends
  leaderboard slice. This panel *is* the model's argument.
- **P2 — NO-SHARED-GAMES:** a graceful empty (you own nothing in common) — a doorway, not a dead end: a
  nudge to **browse their collection** / **recommend a game** (orange action, **no gold** — non-commerce).
- **P3 — friends LEADERBOARD:** the cohort ranked (by hours, with a games toggle noted) — **your row
  highlighted**; Maverick / Riko / Vanta (+ a 4th for depth).
- **P4 — loading Skeleton:** the §1.6 `Skeleton` (solid fills, never an invite).
- **P5 — PRIVACY-LIMITED (PROF-03):** a friend who hides an axis — the hidden dimension locked
  (`lock-well` grammar), the still-visible axis compared; never leaks the hidden stat.

**Deferred to converge (caption it):** **Offline** (read from cache, read-only — SYS-10) · **LoadError**
("Signal Lost" + RETRY) — reuse the sibling §1.8 grammar verbatim.

## Buttons + marker — the LOCKED flat style (Scanline Energize · F-03, 2026-06-18)
Build **FLAT** — no raised edge, no press-travel. Pressed/active = **Scanline Energize** (CRT scanlines
over a hairline-darkened fill, no motion), isolated to a single `.btn:active` rule so a future ripple can
swap it. The on-screen marker = the **orange `StateMark`** pixel-square (`--scr-accent` `#ff9f43`), never
the pink shell LED (F-05/F-09). Shell `NavBand` keys stay **physical** (`0 4px 0`). Source grammar:
[`../find-add-friends/find-add-friends-states.html`](../find-add-friends/find-add-friends-states.html)
(the freshest Burt-clean sibling, itself off Friends draft A).

## Hard rules (carried from the social cluster)
- **Compose from the §1.5 catalog** — reuse the listed components; a genuinely-needed extra is built and
  flagged at the gate.
- **Tokens + shell + fonts inherited verbatim** from the social cluster (Teal shell · Midnight screen;
  Chakra Petch on screen / Paytone One on plastic, F-08); Google Fonts via the `media="print"` onload
  pattern; built-in SVG only.
- **F-06 type scale is law on screen — 21/15/11/9** (display/emphasis/body/micro). Card plates are print
  and scale with the card (exempt).
- **HTML only — no PNG artifacts.** Verify each draft in headless Edge, READ the render, walk every
  panel, **delete every screenshot before the turn ends**.
- **Burt-clean gate:** after building each draft, run the `burt` skill, apply fixes, re-run until clean
  (or only deliberate documented deviations remain) — *before* presenting.
- **Sample data (consistent across all three drafts):** **Maverick** = self · **Riko** = the friend.
  Totals — Maverick 1,240 hrs · 48 games; Riko 1,180 hrs · 41 games (Maverick ahead +60 hrs · +7 games).
  Shared games (your hrs | their hrs): Destiny 2 210|184 · Elden Ring 140|120 · Hollow Knight 88|102 ·
  Hades 64|96 · Stardew Valley 38|75 · Celeste 22|16. Each-owns-alone: you — Cyberpunk · Returnal; them
  — Hi-Fi Rush · Tunic. Leaderboard (by hours): Maverick 1,240 · Riko 1,180 · Vanta 870 · Nyx 540. All
  counts **caption-marked illustrative**.
- **Scope / git:** create only under `docs/design/mockups/compare-hours/`; read from `mockups/friends/`,
  `mockups/find-add-friends/`, `mockups/profile/`; edit **only** SCREEN-STATUS row 4.6 + append the one
  OQ line; **append-only** to open-questions. Personal account `Aiden-Molyneaux`, HTTPS, identity set —
  don't override; commit immediately staging only own paths; `git pull --rebase` before every push;
  commit messages name the IDs.

## File map
`docs/design/mockups/compare-hours/`
- `compare-hours-brief.md` — this plan
- `compare-draft-a-ledger.html` — **A · Side-by-side ledger**
- `compare-draft-b-versus.html` — **B · Versus / head-to-head**
- `compare-draft-c-diff.html` — **C · Diff-first / overlap**
- `README.md` — the file map + flags + Burt outcome
- Converge target (later): `compare-states.html` (full matrix incl. lifecycle)

## Process
1. Author this brief → commit → push; flip SCREEN-STATUS row 4.6 (⬜ → 🔶 in-pass).
2. Per draft (A, then B, then C): build → **run Burt** → iterate to clean → verify headless (delete
   shots) → README row → commit (`design: Compare Hours draft A/B/C — P1–P5 (compare track); Burt clean`)
   → `pull --rebase` → push.
3. Append **OQ-074** (the compare payload shape) → commit.
4. **Owner gate — STOP.** Summarize each model + how it reads the comparison + the pick + the per-draft
   Burt outcome; the owner opens the HTML directly. **Do not converge** — that's the next pass after the
   owner picks.

---

## Owner gate ruling — B (Versus), with a matchup rework (2026-06-23)
Owner picked **B · Versus / head-to-head** as the direction. Iteration notes, applied to
`compare-draft-b-versus.html` this pass:
- **Swap the matchup UI from draft A** — drop B's paired comparison bars; use draft A's **numeric**
  per-game stats instead.
- **New matchup layout:** the **friend's card on the left**, **your card on the right**, the **stats in
  the middle** with the **winner highlighted in orange** (`ComparePair`/`CompareRow` → `.vsrow`:
  `[their GameCard/mini] · [title + RIKO/YOU hours, winner orange + the gap] · [your GameCard/mini]`,
  each card labelled with its owner).
- **Up the card size for legibility** — matchup cards moved from `GameCard/thumb` (44×62) to
  **`GameCard/mini` (64×89)**, carrying the F-02 TL+BR step.
- **Card-tap navigation seam (owner Q, 2026-06-23):** every matchup card is a **doorway to the Game page
  (§4.2)** for that game — **your** card opens your view; your **friend's** opens their **friend-view**
  (their card · per-game compare · adopt, SOC-11 / decision 0020). No spec change (composes the existing
  §4.2 owned + friend-view states); noted on the board as a hint. Carry it to the converged board (and
  wherever a card appears in Compare).
The **face-off hero**, leaderboard, P2–P5 and lifecycle grammar are unchanged. Burt re-audited **clean**.
Drafts A + C retained for history. **Next: converge B → `compare-states.html`** (full lifecycle matrix),
then design-spec formalization + the API page-audit (OQ-074) — **not done this pass**.
