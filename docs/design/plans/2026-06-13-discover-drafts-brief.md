# Discover (§3.2) — design-track kickoff: THREE drafts → gate → converge

Authored by the DISCOVER track (self-briefed from ui-design-req §3.2 + the api-contract Discovery +
What-to-Play sections + design-spec §1.1–1.6). Discover is the named **coverage-driven gap-closer**
queued next in `SCREEN-STATUS.md` (UP NEXT #4 — *"surfaces the segmented control"*); the standing
multi-draft rule applies (novel surface → 3 distinct treatments → gate → converge). This file is the
plan; the gate ruling gets appended verbatim at the bottom.

## The screen (the contract — ui-design-req §3.2)
Discover is a **TOP-LEVEL TAB** that **merges Up Next + discovery** under one segmented surface —
*"what should I play, and what's out there."* Personas: **Completionist · Casual returner**. It renders
**inside the device chrome** — `DeviceShell` + `NavBand` persist (DISCOVER keycap active = pressed +
`PipLight`), content scrolls within (this is a **tab**, not a `FlowTakeover`). Must host:

- A **segmented toggle `Up Next` ↔ `Discover`** — the system's **first segmented control** (design-spec
  §1.5 owes it: *"segmented control (Discover needs it)"*). New component, working name
  **`SegmentedKeycap`** (F-03 keycap kin — active segment = pressed + `PipLight`, per `NavKeycap`).
- **Up Next** (WTP-01/02/03): a ranked queue spanning **owned + unowned** games (unowned =
  **Wishlist**-status entries, COL-02 — *no separate wishlist screen*); **drag-to-reorder**; the single
  **Now Playing pin** (WTP-03); shareable; items added **from collection / discovery / a friend rec**
  (WTP-02 · SOC-05).
- **Discover**: **Upcoming** (future release dates — DISC-01 / CAT-08, with notify-me → NOTIF-01) ·
  **Browse by genre/studio** (DISC-02) · **Trending/featured community cards** (DISC-04 — the Curator
  showcase, adoption counts CARD-05) · **games-only search** (DISC-03; people-search lives in Social).
- **Community presence stats** on catalog entries (CAT-09): `collectionsCount` + `friendsHaveCount`,
  on discovery results + card detail.
- **Cold-start hook:** the community catalog starts thin — turn empty/sparse discovery into a
  **Contributor hook** (*"be the first to add this / design its card"* → Add Game, CAT-02; `RankChip`/first).

**HARD CONSTRAINT — no recommender.** v2 has **no algorithmic "recommended-for-you" engine** (explicitly
cut, DISC §). Discovery is **Upcoming / Browse / Trending / Search only** — do not invent a recommender.

## API shapes already drafted (🔶 — page-audit comes at converge)
`GET /me/queue` (owned/unowned flag) · `POST /me/queue {gameId, source}` · `PATCH /me/queue/reorder` ·
`PUT /me/now-playing {gameId|null}` · `DELETE /me/queue/:id` · `GET /catalog/upcoming` ·
`GET /discover/browse?genreId=&studio=` · `GET /discover/trending-cards` · `GET /discover/search?q=` ·
`GET /catalog/popular` (ranked by `collectionsCount`, capped ~12) · `POST /recommendations` (→ recipient WTP).
Search results carry `collectionsCount`/`friendsHaveCount` (CAT-09).

## The new component (the headline)
**`SegmentedKeycap`** — the owed segmented control. FORM is each draft's thesis (the canonical name +
form get ratified at the gate, folded into design-spec §1.5 at converge). Active segment = pressed +
`PipLight` (pink, per `NavKeycap`); sits **on-screen** (Chakra Petch), the screen-side echo of the nav
keycap — F-04 untouched (it never crowds the 5 plastic keycaps); F-09 honoured (pressed keycaps are the
named exception to "no sunken containers").

**Naming nuance (flagged at gate).** The tab nav-label and one segment are both *"Discover."* The tab is
locked by the IA (Part 2). Recommendation carried into the drafts: **tab stays `DISCOVER` (plastic,
Paytone One); segments read `UP NEXT` | `DISCOVER` (screen, Chakra Petch)** — the two surfaces +
two fonts disambiguate the echo ("the Discover tab, showing its Discover half"). Fallback if the echo
grates: the discovery segment → **`EXPLORE`**. (`BROWSE` is reserved — it's the DISC-02 sub-section, the
part not the whole.) Owner picks at the gate.

## The three models (genuinely distinct interaction models)
The distinctness axis: **how Up Next and Discover relate under the toggle, and how browse is navigated.**

- **A — "Two rooms"** (clarity / separation pole). The toggle is a **hard binary** — two purpose-built
  screens that share nothing but the control. **Up Next** = a focused ranked management list (Now Playing
  pinned, drag-reorder, source-tagged rows). **Discover** = a sectioned browse hub (Upcoming rail ·
  genre/studio chips · Trending peek · search). Switching = a **room-switch** (the whole content swaps).
  `SegmentedKeycap/pair` — two keycaps butted into a pill, hard seam, active pressed + pink pip; the plain,
  most-conventional segmented control (the §1.1 "legible navigation" reading).
  → `discover/discover-draft-a-rooms.html`

- **B — "One feed, lensed"** (continuity pole). Up Next and Discover are **facets of one continuous
  scroll**; the toggle is a **LENS, not a room** — `Up Next` narrows the feed to your queue, `Discover`
  widens the *same* feed to the catalog; the bands **blend** (queue → friend recs → upcoming → trending in
  one river). The lens changes emphasis, not content.
  `SegmentedKeycap/lens` — the two keycaps ride a connecting **focus track** (aperture motif) that fills
  toward the active side; active pressed + pip, *plus* the track signalling "one surface, two widths,"
  not two doors.
  → `discover/discover-draft-b-feed.html`

- **C — "Arcade aisles"** (metaphor pole — the C-line from the styler/canvas tracks). Diegetic / spatial.
  **Up Next** = a physical **cartridge load-queue** (cards as cartridges in a magazine you slide to
  reorder; Now Playing = the loaded slot). **Discover** = walking the **arcade floor** (an **Upcoming
  marquee** overhead · **genre aisles** as a corridor you step into · a **Trending cabinet**). The toggle
  is a **hardware lever** on the device.
  `SegmentedKeycap/lever` — a diegetic two-position selector worn as device hardware (notched track +
  sliding toggle cap); active position seated + pip; reads as pulling a mode lever. Still on-screen (F-04).
  → `discover/discover-draft-c-arcade.html`

Each draft uses the **same canonical segment labels** (`UP NEXT` | `DISCOVER`) so the comparison stays on
the interaction model, not relabeling — only the FORM of the control differs.

## Panel contract (each draft renders P1–P8; lifecycle deferred to converge WITH a caption note)
- **P1** — the segmented surface at rest (Up Next active, populated): the draft's `SegmentedKeycap` thesis.
- **P2** — **Up Next populated**: ranked owned + unowned queue · the **Now Playing pin** (WTP-03) ·
  drag-to-reorder affordance · a **Wishlist (unowned)** item shown distinctly (COL-02) · the **source tags**
  (from collection / discovery / **REC'D BY** a friend — WTP-02 / SOC-05).
- **P3** — **Discover landing**: the discovery hub — Upcoming + Browse entry + Trending + search affordance
  (the draft's thesis on organizing browse).
- **P4** — **Browse by genre/studio** (DISC-02): drill-down; results as `GameCard`s carrying CAT-09 presence.
- **P5** — **Games search active** (DISC-03): `SearchField/in-place` (bottom-docked posture); results via
  `ResultRow` + `MatchTag` (dev/publisher hit); in-collection ✓; report path. *(Search stays conventional —
  §1.1 — in all three, even the metaphor draft.)*
- **P6** — **Tap-through** `CardDetail`: hero card + CAT-09 presence rows + contributor credit + actions
  (**ADD TO COLLECTION** gold-step · **ADD TO UP NEXT**; routes → Game page 4.2 / Add Game). ⋮ → report.
- **P7** — **Cold-start**: the queue-empty state + sparse-catalog discovery as the **Contributor hook**
  (`EmptyState/inviting` · `RankChip`/first · CAT-02 — be-first-to-add / design-its-card → Add Game).
- **P8** — **Trending/featured cards** (DISC-04): the **Curator showcase** — community cards with
  `RankChip`s + **adoption counts** (CARD-05) + designer credit (CAT-05). Non-commerce (counts, not prices).

**Deferred to converge (caption it):** `Skeleton` · `LoadError` "Signal Lost" + RETRY · `Offline`
(SYS-10 — browse reads from cache, writes like add-to-queue / set-now-playing **gated**) · reduce-motion +
non-gesture (drag) notes.

## Hard rules (carried from the tracks)
- **Compose from the design-spec §1.5 catalog**; reuse locked names: `DeviceShell` · `NavBand`/`NavKeycap`
  (5 tabs; **Store keycap = gold, Collection = pink**, active = pressed + `PipLight`) · `ScreenHead` ·
  `GameCard/hero|grid|mini|thumb` (+`/custom`, `FoilTag`, `NowTag`, `RankChip`/first) · `Strip` · `ListRow` ·
  `SectionHeader` · `Well` · `SearchField/in-place` · `ResultRow` · `MatchTag` · `CardDetail` ·
  `EmptyState/inviting` · `KeycapButton/*` (ADD-to-collection = gold card-creating tier per F-02;
  RETRY / secondary = `/action-alt` / `/secondary`) · `TertiaryLink`. **Plus** the new `SegmentedKeycap`.
- **Any OTHER new component → build it and FLAG it at the gate, never silently.** Anticipated flags:
  **`QueueRow`** (the drag-to-reorder Up Next row: `Strip` + persistent drag grip + `RankChip` + the WTP
  source/status tag — `WISHLIST` / `REC'D BY` — there is no queue/reorder row in the catalog yet) ·
  **`ReleaseRow`** (the Upcoming row: `Strip` + a future-`DateChip` + **NOTIFY ME**, DISC-01/NOTIF-01) ·
  **`AdoptCount`** (the trending card's adoption-count readout, CARD-05) · C's diegetic
  **cartridge / aisle / cabinet** forms (metaphor skins of catalog components — named at converge only if C wins).
- **Tokens verbatim** (Teal shell + Midnight screen; `scr.accent`/`accentInk`, `brand.gold`/`cream`/
  `accent`/`alert`). **Standalone HTML artboards** (Claude Design exports lack local deps — self-contained).
  Google Fonts via `media="print" onload`; **hand-drawn / built-in SVG only** (no external icon libs). The
  **PIXELS mark / `ic-pix` is NOT used** — Discover is non-commerce (trending cards show **adoption counts,
  not prices**; the only acquire action is the gold ADD-to-collection, which is card-creating, not currency).
- **Sample data** (consistent across drafts; illustrative — OQ-002/011): a populated Up Next mixing
  **owned + one Wishlist/unowned + one friend-rec** item; a few **Upcoming** titles with future dates;
  **Trending** community cards with adoption counts; **genres/studios** for browse; AND a **sparse-catalog
  cold-start** scenario for the contributor hook. House titles where natural — **Destiny · Riko · Vanta ·
  Maverick** + plausible others (Solace; upcoming: Orbital · Hollowpoint · Nightreign).
- **HTML only — never commit PNGs.** Headless-Edge self-checks go to TEMP and are **deleted before the
  turn ends**.
- **Scope discipline:** behavior questions → **APPEND to `docs/open-questions.md` only**. Do NOT edit
  product-spec / api-contract / design-spec / catalog / other tracks' files, or any `SCREEN-STATUS` row
  other than **3.2 Discover**. Personal git identity (Aiden-Molyneaux; HTTPS; don't override);
  `git pull --rebase` before every push (parallel tracks active).

## File map
Folder: `docs/design/mockups/discover/` — drafts a/b/c as named above (README gets a row per draft).
**Converge target (LATER, after the owner picks):** `discover/discover-states.html` (full matrix incl. lifecycle).

## Process
1. Author this brief → commit/push. Flip `SCREEN-STATUS` §3.2 Discover **🔜 → 🔶** (in pass); adjust UP
   NEXT (Discover in pass; **Settings** becomes the next queued coverage-closer). Touch only the 3.2 row + UP NEXT.
2. Draft A → verify headless (delete shots) → README row → commit → push. Same for B, then C.
3. **Present at the owner gate (STOP):** each model's thesis (the interaction-model difference made
   explicit) · its `SegmentedKeycap` treatment · its cold-start/Contributor-hook handling · every judgment
   call · the labeling recommendation · flagged new components · any OQs logged. **Do NOT converge** — await
   the owner's pick + iteration notes.

---

## Owner gate ruling — 2026-06-13 (verbatim)

> "I think we're going to go with Two rooms, though I'd like you to bring the SegmentedKeycap to the
> bottom of the screen and make it a bit smaller. Give the screen a standard Header, indicating if the
> user is on the the Up Next or Discover page. Additionally, please go over the sample game entries and
> make them real games. The Browse By filter should be removed for now. Let's keep the Discovery page
> relatively simple - upcoming games (able to be browsed and added to), friend recommendationss, and
> trending games. The Up Next page should also be relatively simple, as you just control it by adding
> games from your collection."

**Decoded → applied to `discover-states.html` (converge):**
1. **Model: Draft A "Two rooms" wins** (hard-binary toggle). Drafts B (feed) + C (arcade) retire, kept for history.
2. **`SegmentedKeycap` → bottom-docked + smaller** — moves out of the header to a compact footer bar
   inside the screen (above the plastic NavBand), active segment still pressed + pink PipLight (F-03).
3. **Standard header** — a `ScreenHead` `h2` names the active page (**UP NEXT** / **DISCOVER**). *This
   reverses the draft's "no h2" proposal and **resolves the labeling nuance**: the header names the
   sub-page, the bottom toggle switches, the plastic keycap is the tab. `EXPLORE` fallback dropped.*
4. **Real games** — the sample roster is replaced with real titles (Elden Ring · Hades · Hollow Knight
   · Celeste · Stardew Valley · Outer Wilds · Disco Elysium; upcoming: GTA VI · Fable · The Witcher IV;
   FromSoftware search set). Values still illustrative (OQ-002/011).
5. **Browse-By removed** — the genre/studio chips + the P4 browse drill-down are **cut** (DISC-02
   parked for now; flag: DISC-02 is no longer surfaced on Discover → a behavior/scope note for the spec
   owner, logged OQ-057).
6. **Discover simplified** to three sections — **Upcoming** (browse + add + notify) · **Friend
   recommendations** (SOC-05, surfaced as a Discover section) · **Trending** (DISC-04). Games-only
   **search** (DISC-03) kept as a header action (it's a hard §3.2 requirement; cutting it would be a
   spec change — flagged, not cut).
7. **Up Next simplified** — Now-Playing pin + the ranked queue + a primary **ADD FROM COLLECTION**
   control. One unowned item retained (a friend-rec'd Wishlist entry) to honor WTP-01's owned+unowned
   span + SOC-05; flagged.

Converge target: `discover/discover-states.html` — A's two-rooms grammar + the seven changes, full
matrix incl. lifecycle (Skeleton · Signal-Lost+RETRY · Offline writes-gated, SYS-10).
