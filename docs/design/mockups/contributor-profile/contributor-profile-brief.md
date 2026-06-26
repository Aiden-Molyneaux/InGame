# Contributor profile — "My Contributions" (§4.9) — design-track kickoff: THREE drafts → gate → converge

The **§4.9 Contributor profile ("My Contributions")** design track — the **Contributor pride surface**
(`CAT-07`), reached **from Profile only** (the `MY CONTRIBUTIONS` `ListRow` gateway, `profile-states.html:535`,
count = 5). This file is the plan; the gate ruling is appended at the bottom once the owner picks.
Self-brief sources: product-spec §5.4 (`CAT-02/05/06/07/09` · the contribution data model) + `CARD-05`
(`AdoptCount`) + `PROF-03/07/08` (privacy · honest aggregates · the designed avatar) · ui-design-req §4.9
(+ §3.5 Profile gateway seam) · api-contract `GET /users/:id/contributions` · design-spec §2.2 (Profile —
the sibling this extends) · SCREEN-STATUS row 4.9 (⬜ → 🔶 in-pass this pass). Next by **road-to-market
build-order** — the only un-started **M5** surface (decision 0027, §12).

Per the design-iteration rule this is a **novel pride surface** with no single screen to *extend* (it is the
*destination* of a Profile gateway, not a redraw of Profile) — so it kicks off as **THREE distinct organizing
models** → owner gate → converge (do **not** converge in this pass).

**Design-side only.** §5.4 behavior (CAT-07) is fully specified; the drafts render the **page**, never the
behavior. Any shape/behavior gap → an append to `docs/open-questions.md` (the contributions payload shape is
the one already in view — see API below). The spec is never hand-patched.

## The screen (the contract — ui-design-req §4.9 · CAT-07)
A **Contributor pride surface** — *"the public record of what you've added to the community catalog."*
**Friend-viewable** (privacy-gated, PROF-03); **stats + achievement badges, NO separate level system**. The
canonical seam is **Profile → the `MY CONTRIBUTIONS` gateway row → this screen** (self from your Profile,
friend-view from theirs). **Must host** (verbatim, §4.9):

- **games you brought to the catalog** — entries you created (`CAT-02/05`), each carrying its **community
  reach** = the CAT-09 **collections count** ("IN N COLLECTIONS", anonymous + honest at any size)
- **fields you added** — canonical field edits, attributed (`CAT-06`) — the lighter-weight contribution
- **cards you designed** — your published card designs (`CARD-01`), each carrying its **adoption count**
  (`AdoptCount`, CARD-05) — how many players equipped your art
- **adoption / usage stats** — the headline totals (games · cards · total adoptions · collections reached)
- **contributor achievement badges** — earned milestone badges, **no level** (a glyph + label, not XP)

**States (§4.9):** self vs friend-view · empty (new user).

## Scope the SCREEN — don't redraw the neighbours
This track draws **Contributor profile** only. **Profile (§3.5 / 4.5, converged)** is the *entry* — drawn only
as the back-seam (`‹ RETURN TO PROFILE` self · `‹ RETURN TO <name>` friend), **not** redrawn. The individual
**Game page (§4.2)** and **Card editor / Styler (§4.3)** are where a contribution is *acted on* (view a game,
edit a card) — a contribution row/card is a **doorway** to those (hint only, like Compare's card-tap seam),
**not** those screens. **Achievements (§4.10)** is the *sibling* pride surface (general achievements, ACH-);
this screen shows **contributor** badges only — the two stay distinct (both hang off Profile).

## API shape already drafted (🔶 — page-audit comes at converge)
One endpoint backs the whole screen: **`GET /users/:id/contributions`** — *"Contributor profile data (CAT-07)"*
(api-contract line 57). Reads CAT-09 reach off `GET /catalog/games/:id` (`collectionsCount`) and adoption off
the card model (`AdoptCount`, CARD-05).

**Central contract gap (flagged, not fixed):** the endpoint is **prose-only — no payload is enumerated** (no
games-added-with-reach, cards-designed-with-adoptions, field-edit log, badge, or totals shape). The drafts
render a **proposed** shape; the **API page-audit + the OQ to enumerate it is owed at converge** (the Compare
precedent — OQ-074 — deferred its page-audit the same way). No new endpoint is minted.

## The F-02 gold nuance — this is a RECORD, so mostly NO gold (read carefully)
Contributor profile is a **pride/record** surface: **viewing** your stats, badges, and item lists creates no
card and spends nothing → **no gold** on the body. The subtlety (F-02, clarified 2026-06-23 — *gold =
acquisitive: card-creating · PIXELS · primary add-to-collection*; *orange = prominent non-acquisitive*):

- **EMPTY state (new user)** = the **cold-start Contributor hook** ("be the first — **ADD A GAME** /
  **DESIGN A CARD**"). ADD A GAME (catalog-creating, CAT-02) and DESIGN A CARD (card-creating, CARD-01) **are
  acquisitive → gold** — consistent with Add Game's gold ADD, Discover's contributor hook, the Styler DESIGN
  NEW gold-step. **These are the only gold on the screen.**
- Any other prominent action (friend-view ADD FRIEND if shown · VIEW IN COLLECTION · RETRY) = **system orange
  / cream**, never gold.
- **Contributor badges = earned glyphs, NOT acquisitive** → propose **non-gold** (cream/orange accent) per the
  F-02-clarified letter. **⚠ FLAG:** the Friends board carries an inherited `.achv` **gold-as-achievement
  glyph** (owner-ratified there). Whether earned badges wear gold is a **live cross-screen question** — render
  non-gold, surface it at the Burt gate for the owner to ratify one way across both surfaces.

## Privacy is a first-class state (PROF-03)
The friend-view runs **only over the friend-visible field set**. CAT-09 reach is an **anonymous, honest
aggregate** (no threshold gating — it can persist even when item detail is restricted). A privacy-limited
non-friend view **locks the item lists** (`lock-well` grammar, borrowed verbatim from `profile-states.html`'s
privacy-limited artboard) while the **honest totals** may still read — the hidden detail **never leaks**.
**Block (SOC-09)** severs the view entirely (the Profile gateway seam disappears). Each draft renders a
**privacy-limited** panel (P4).

## The new components (the headline; FORM is each draft's, NAMES locked at converge)
No contribution component exists in the catalog — these are **new compositions** built from catalog furniture
(profile/social cluster), names ratified at converge:

- **`ContribTotals`** — the headline stat header: **games added · cards designed · total adoptions ·
  collections reached** (composed from `StatTile`, F-06 emphasis 15; CAT-09 honest aggregates, **no PctPill** —
  these are counts, not PROF-07 percentiles).
- **`ContribRow` / `ContribCard`** — **one contribution**: a `GameCard` (the game you added or the card you
  designed) + its reach metric (**IN N COLLECTIONS** for a game · **N ADOPTIONS** for a card) + a quiet status.
- **`ContribBadge` / `BadgeTile`** — an **earned contributor milestone** (glyph + label, optional progress for
  in-progress; **no level**). **NEW** — Achievements (§4.10) isn't designed yet, so this is the first badge
  composition; built here, flagged for reconcile with §4.10 at converge.
- **`EditLogRow`** — a CAT-06 **field edit** (game · field added · attributed) — the quiet, lighter-weight log.

**Reuse (don't reinvent):** `Avatar` (square monogram, PROF-08) · `GameCard`/`cell`(96×134)·`mini`·`thumb`
(F-01) · `StatTile` · `AdoptCount` (CARD-05) · `RankChip`(+`/first`) · `ListRow`/`Strip` ·
`SectionHeader`(+`TertiaryLink`) · `GTag` · flat `KeycapButton`/`ToolKeycap` (Scanline Energize) · the gold
`KeycapButton/add` (empty-state hooks only) · the `StateMark` (orange pixel-square) · the `.return-link`
friend-view back-seam · the `lock-well` privacy grammar · `DeviceShell` + `NavBand` (**PROFILE active** —
this is a Profile sub-surface, no Contributor nav key) · the §1.6 lifecycle family.

## The three models (different way to ORGANIZE the record — not a recolor)
The distinctness axis is **how the contribution record is organized** — the archive pole vs the prestige pole
vs the impact pole. All three sit on the **same inherited foundation** (Teal shell · Midnight screen · flat
keycaps · F-06 · §1.8 lifecycle) so Contributions reads as the same app, a clear sibling of Profile.

- **A · THE RECORD (by type)** — [`contributor-draft-a-record.html`](contributor-draft-a-record.html).
  `ContribTotals` up top, then **a section per contribution type**: GAMES ADDED (`ContribRow`s + each game's
  reach) · CARDS DESIGNED (a `GameCard/cell` grid + `AdoptCount` each) · FIELD EDITS (`EditLogRow` log) ·
  BADGES (a strip). The **complete, honest archive** — the librarian's ledger, everything you've put in,
  scannable. The calm pole (closest in spirit to Profile's own sectioned scroll).
- **B · THE TROPHY WALL (by prestige)** — [`contributor-draft-b-trophy.html`](contributor-draft-b-trophy.html).
  Leads with the **BADGE CASE** (earned contributor milestones as a trophy grid) + your **most-adopted card** as
  a hero showcase (big `GameCard` + "ADOPTED N TIMES"); the full type-lists collapse beneath as secondary. The
  emotional **"look what I made that people love"** hit — pride dialled up. The showcase pole.
- **C · THE IMPACT DASHBOARD (by reach)** — [`contributor-draft-c-impact.html`](contributor-draft-c-impact.html).
  Leads with the aggregate **footprint** — "YOUR CARDS ARE EQUIPPED BY N PLAYERS" · "YOUR GAMES SIT IN N
  COLLECTIONS", big numbers first — the **effect** on the community, not a catalog of items. Then items **ranked
  by impact** (most-adopted card → least; most-collected game → least, `RankChip`). The data-story / insight pole.

## Panel contract (each draft renders P1–P5; lifecycle deferred to converge WITH a caption note)
- **P1 — SELF, POPULATED (the model thesis):** the contributor identity (`Avatar` + name) · `ContribTotals` ·
  the full record organized per the model · the badges. This panel *is* the model's argument.
- **P2 — EMPTY (new user, no contributions):** the cold-start **Contributor hook** — a friendly nudge with
  **ADD A GAME** + **DESIGN A CARD** (gold, acquisitive — F-02). A doorway, not a dead end.
- **P3 — FRIEND-VIEW (PROF-05):** viewing a **friend's** contributions — read-only, the `‹ RETURN TO <name>`
  back-seam, no edit/management; pride is friend-viewable **social proof** ("see what they built").
- **P4 — PRIVACY-LIMITED (PROF-03):** a non-friend / privacy-restricted view — the item lists locked
  (`lock-well`), the **honest aggregate totals** still readable (CAT-09), the hidden detail **never leaks**.
- **P5 — loading Skeleton:** the §1.6 `Skeleton` (solid fills, never an invite).

**Deferred to converge (caption it):** **Offline** (read from cache, read-only — SYS-10) · **LoadError**
("Signal Lost" + RETRY) — reuse the sibling §1.8 grammar verbatim.

## Buttons + marker — the LOCKED flat style (Scanline Energize · F-03, 2026-06-18)
Build **FLAT** — no raised edge, no press-travel. Pressed/active = **Scanline Energize** (CRT scanlines over a
hairline-darkened fill, no motion), isolated to a single `.btn:active` rule. The on-screen marker = the
**orange `StateMark`** pixel-square (`--scr-accent` `#ff9f43`), never the pink shell LED (F-05/F-09). Shell
`NavBand` keys stay **physical** (`0 4px 0`); **PROFILE active**. Source grammar: `mockups/profile/profile-states.html`
(the parent) + `mockups/find-add-friends/find-add-friends-states.html` (the freshest Burt-clean flat sibling).

## Hard rules (carried from the profile / social cluster)
- **Compose from the §1.5 catalog** — reuse the listed components; a genuinely-needed extra (the badge) is
  built and flagged at the gate.
- **Tokens + shell + fonts inherited verbatim** from Profile (Teal shell `#2bb6b0` · Midnight screen `#232045`;
  Chakra Petch on screen / Paytone One on plastic, F-08); Google Fonts via the `media="print"` onload pattern;
  built-in SVG only.
- **F-06 type scale is law on screen — 21/15/11/9** (display/emphasis/body/micro). Card plates are print and
  scale with the card (exempt).
- **HTML only — no PNG artifacts.** Verify each draft in headless Edge, READ the render, walk every panel,
  **delete every screenshot before the turn ends**.
- **Burt-clean gate:** after building each draft, run the `burt` skill, apply fixes, re-run until clean (or only
  deliberate documented deviations remain — incl. the badge-gold question) — *before* presenting.
- **Sample data (consistent across all three drafts):** **Maverick** = self · **Riko** = the friend (matching
  Compare/Friends). Totals — Maverick: **5 games added · 3 cards designed · 424 total adoptions · 9 field edits**.
  Games added (with reach): Marathon — IN 1,240 COLLECTIONS · Hollow Knight — 980 · Tunic — 410 · Hi-Fi Rush —
  360 · Pseudoregalia — 95. Cards designed (with adoptions): Marathon card — 312 ADOPTIONS · Destiny card — 88 ·
  Celeste card — 24. Field edits — 9 across 6 games (studios/publishers/dates). Badges (earned): **CATALOGUER**
  (5 games) · **ARTISAN** (100+ adoptions) · **FIRST FINDER** (first to add 3 games); in-progress **PROLIFIC**
  (5/25 games). **No level anywhere.** Friend (Riko): 2 games · 1 card · 47 adoptions. All counts
  **caption-marked illustrative**.
- **Scope / git:** create only under `docs/design/mockups/contributor-profile/`; read from `mockups/profile/`,
  `mockups/find-add-friends/`, `mockups/discover/` (the contributor hook); edit **only** SCREEN-STATUS row 4.9 +
  (at converge) append the one OQ line; **append-only** to open-questions. Personal account `Aiden-Molyneaux`,
  HTTPS, identity set — don't override; **commit immediately staging only own paths** (3 concurrent tracks are
  live — Compare/Onboarding/Welcome-Auth — don't get swept); `git pull --rebase` before every push; commit
  messages name the IDs.

## File map
`docs/design/mockups/contributor-profile/`
- `contributor-profile-brief.md` — this plan
- `contributor-draft-a-record.html` — **A · The Record (by type)**
- `contributor-draft-b-trophy.html` — **B · The Trophy Wall (by prestige)**
- `contributor-draft-c-impact.html` — **C · The Impact Dashboard (by reach)**
- `README.md` — the file map + flags + Burt outcome
- Converge target (later): `contributor-states.html` (full matrix incl. lifecycle)

## Process
1. Author this brief → commit (stage only own paths). Flip SCREEN-STATUS row 4.9 (⬜ → 🔶 in-pass) at first
   draft build.
2. Per draft (A, then B, then C): build → **run Burt** → iterate to clean → verify headless (delete shots) →
   README row → commit (`design: Contributor profile draft A/B/C — P1–P5 (contributor track); Burt clean`) →
   `pull --rebase` → push.
3. **Owner gate — STOP.** Summarize each model + how it organizes the record + the pick + the per-draft Burt
   outcome + the badge-gold question; the owner opens the HTML directly. **Do not converge** — that's the next
   pass after the owner picks (converge → `contributor-states.html` + design-spec formalization + the API
   page-audit / OQ to enumerate `GET /users/:id/contributions`).

---

## Owner gate ruling — B · The Trophy Wall, with a standing-bar rework (2026-06-26)
Owner picked **B · The Trophy Wall** + three changes, applied this pass to
[`contributor-draft-b-trophy.html`](contributor-draft-b-trophy.html):
- **Removed the contributor achievement badges** (CATALOGUER / ARTISAN / FIRST FINDER / PROLIFIC) entirely.
- **Added contributor percentile tags on the stat tiles** — small gold `PctPill`s on the contributor numbers,
  **exactly the Profile PROF-07 pattern** (`<span class="pct">` inside `.stat`): e.g. GAMES 5 · **TOP 25%** ·
  ADOPTIONS 424 · **TOP 10%** (CARDS untagged — tiles render cleanly without a chip). A contributor stat row
  (GAMES · CARDS · ADOPTIONS) sits above the signature-card showcase on P1/P3, and the tags ride P4's public
  totals. *(First take was a dedicated standing bar — owner redirected 2026-06-26 to the Profile-style
  tags-on-numbers treatment.)*
- **Dropped "field edits"** as a contributor field — removed the FIELD-EDITS footline (P1) + the EDITS totals
  tile (P4), everywhere.
The signature-card showcase, games-added list, more-cards, P2 hook, and lifecycle grammar are unchanged.
**Burt re-audited clean** — and the change **resolves the prior badge-gold flag**: percentile tiers are gold
`PctPill`s (catalog-blessed), so the non-gold-achievement-glyph ambiguity is gone.

**Spec ripple flagged — OQ-079:** dropping CAT-06 edits + achievement badges and adding a percentile standing
**diverges from CAT-07's must-host list**; the spec-owner must ripple product-spec CAT-07 + define the
percentile data model (metric · thresholds · honesty-gating · privacy, PROF-03/07). The
`GET /users/:id/contributions` payload enumeration stays owed at converge.

**Card/game navigation parity (owner, 2026-06-26):** the contributor's **cards and games are presented equally**
— both as navigable `crow` rows (`GameCard/thumb` + name + metric + `›` chevron → that card's / game's entry),
and the signature-card showcase gained a `›` too. "MORE CARDS" moved from a 2-up grid to rows matching GAMES
ADDED; the dead `.cgrid`/`.ccell`/`.adopt` CSS was pruned. Burt clean.

**Next:** **converge B → `contributor-states.html`** (full matrix incl. Offline/LoadError) + design-spec
formalization (the showcase / contrib-row / pct-tag components + the §2.x page) + the API page-audit (OQ-079 +
the payload). **Not done this pass.** Drafts A + C retained for history.
