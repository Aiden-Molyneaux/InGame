# Add Game — Stage 1 Draft-Iteration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> **Adaptation note:** this is a **design-iteration plan** (HTML artboards), not code. The TDD analog used throughout: *compose panels → render via headless Edge → check against the panel's acceptance list → commit*. "Code" steps specify exact panel composition **by catalog-component name + token**; artboards are too large to inline in full, so each step's spec is the contract.

**Goal:** Produce **3 genuinely distinct interaction-model drafts** of the Add Game flow (decision 0014 stage 1, design-req 4.1), put them through the owner gate, converge, and formalize into design-spec + catalog.

**Architecture:** Three standalone artboard files explore divergent flow models (paged wizard · single-surface disclosure · card-led/object-centric) sharing one panel/state contract and one new-component name-set; an owner review gate picks/mixes; a converged artboard completes the full state matrix; formalization updates design-spec (§2.4 + new §1.5 components) and the catalog HTML.

**Tech Stack:** Standalone HTML/CSS artboards (no external deps beyond Google Fonts), catalog v0.2 tokens (Teal shell + Midnight theme), built-in SVG art only, headless Edge for render verification, git per artboard.

---

## Required reading (executor context — read in this order)
1. `docs/design/design-spec.md` — tokens (§1.1–1.4), component catalog (§1.5), states family (§1.6), keyboard rule (§1.7).
2. `docs/design/ui-design-requirements.md` **§4.1 Add Game** (the musts) + §1.8 (errors) + §1.2/1.3 (device/nav model).
3. `docs/decisions/0014-add-game-design-arc.md` — the arc, the card-step junction contract, the **takeover** tier.
4. `docs/decisions/0015-engagement-moments.md` + OQ-040 — the stage-1 beats (shelf-slot, contributor first-credit).
5. `docs/design/mockups/collection-states.html` + `profile-states.html` — the established artboard format (panel grid, caption style, drawn keyboard, §1.8 panels) and the visual bar to match.
6. `docs/design/mockups/README.md` — the file-table convention you must extend.

## Token quick-reference (Midnight ★ / Teal ★ — full set in design-spec §1.1)
- Screen: `bg #232045` · `well #2c2950` · `tools #1a1733` · `accent #ff9f43`/ink `#2a1430` · `btn #ffb38a` · `head #f5f1e4` · `text #fff` · `dim #9b97c0` · `soft #c9c5e6` · `panel α-white .065` · `hairline α-white .08` · `grip #565178`
- Brand: `accent #ff3d77` · `gold #ffd23f` · `cream #f5f1e4` · `navy #1d2a4a` · `bezel #14122a` · `alert #e3414e`
- Shell (Teal): `plastic #2bb6b0` · `hi #3ec9c2` · `lo #1f9a94` · `silk #0d524e` · `ink #08433f` · `pipOff #117672`
- Type: Chakra Petch (screen) / Paytone One (plastic); scale **21/15/11/9**. Fonts link: copy the `<link>` block from `collection-states.html`.
- Geometry: on-screen chrome square; GameCard step 4/8 (3 mini · 2.5 thumb); ADD-style step 2/4; keycap edge `0 3px 0` (2px tools); card shadow `0 4px 7px rgba(0,0,0,.35)`.

## New-component name-set (LOCKED — all three drafts use these names; *form* is each draft's to explore)
- `FlowTakeover` — the tier-2 spatial pattern: the flow occupies the screen content; **the frame + NavBand stay** (decision 0014).
- `FlowHeader` — takeover chrome: back/✕, flow title (`type.display`), per-model context (step dots · breadcrumb · none).
- `TextField` — labeled single-line input (cream inset like `SearchField`, navy ink) + `/error` variant (alert hairline + `type.micro` message; §1.8 inline validation).
- `SelectField` — picker trigger (label + current value + chevron) opening an `OptionSheet`.
- `OptionSheet` — the pulled-up sheet (sort/filter-drawer family) for single/multi choice: genre multi-select (CAT-04 controlled list), status (the six COL-02 values), release-date (year-first scroller).
- `ResultRow` — catalog hit: representative card `GameCard/thumb` + title (`type.emphasis`) + year · studio (`type.body` dim) + **in-collection marker** (gold ✓ chip) + overflow (Report duplicate, MOD-01).
- `InlineBanner` — the fuzzy-dedup warning (CAT-03): "Did you mean **Elden Ring**?" + actions [VIEW MATCH] [CREATE ANYWAY] — accent hairline, never a toast (§1.8).
- `CardPicker` — the card-step junction (0014): adopt gallery (`GameCard/grid` + designer credit + `ECON-03` cost chip) · **STYLE IT** door (gold step keycap → stage-2 stub) · SKIP (`TertiaryLink` dim → CARD-18 default).

## Shared panel contract (the "state matrix" — what each draft renders)
Every draft renders panels **P1–P8**; lifecycle panels **P9–P10** are converged-pass-only (drafts defer them with a caption note, per the definition-of-done rule).

| # | Panel | Must show | Key IDs |
|---|---|---|---|
| P1 | Entry / suggestions | FlowTakeover entered from Collection ADD; search focus affordance; **empty-state suggestion rails** (recently-added · popular · friends') — never a blank box | 4.1, §1.7 |
| P2 | Searching (keyboard up) | **System keyboard drawn** (collection-states style), theme-matched, field riding above (OQ-035); live query "ELDEN…" | OQ-035 |
| P3 | Results | ≥3 `ResultRow`s incl. one **in-collection** marked; title-match only (CAT-01 — **no** `MatchTag`, that's COL-09 semantics) | CAT-01 |
| P4 | No results → create | "Be first to add it" handoff into the create form (Contributor hook) | 4.1, CAT-02 |
| P5 | Create entry + dedup | `TextField` name (prefilled from query) · `SelectField` genre(s)/studio/publisher/date · **`InlineBanner` dedup state visible** | CAT-02/03/04 |
| P6 | Status pick | All-status picker (Backlog · Playing · Beaten · Completed 100% · Dropped · Wishlist) via `OptionSheet` or the draft's native pattern | COL-01/02 |
| P7 | Card step | `CardPicker` both populations: gallery-with-cards **and** be-first variant; STYLE IT stub door; SKIP | 0014, CARD-18, ECON-03 |
| P8 | Added + continue | The **shelf-slot beat** (card visibly enters the shelf, briefly lit — OQ-040) · **ADD & CONTINUE** multi-add loop · **contributor first-credit variant** ("You brought this game to InGame", CAT-05) when P5 path was taken | OQ-040, 0015 |
| P9 | Lifecycle (converged only) | Loading `Skeleton` · `LoadError`+RETRY (search fail) | §1.8 |
| P10 | Offline (converged only) | `OfflineStrip` + **writes-gated** calm notice (adding needs connectivity, SYS-10) | SYS-10 |

**Per-panel acceptance (applies to every panel):** composed only from catalog v0.2 components + the locked name-set above (any extra net-new component is a plan deviation — stop and flag) · F-rules hold (F-01 cards never cropped; F-02 step/colour grammar — gold step = card-creating ADD/STYLE IT, orange step = non-card actions like RETRY; F-06 type scale; F-07 square chrome) · NavBand untouched and legible (F-04) · caption strip under each panel naming components used (the established mockup convention).

## File structure
- Create: `docs/design/mockups/add-game-draft-a-wizard.html`
- Create: `docs/design/mockups/add-game-draft-b-inline.html`
- Create: `docs/design/mockups/add-game-draft-c-cardled.html`
- Create (Task 6): `docs/design/mockups/add-game-states.html` (converged + full matrix)
- Modify: `docs/design/mockups/README.md` (one table row per file, as you go)
- Modify (Task 7): `docs/design/design-spec.md` (§1.5 components · new §2.4 · changelog v0.9) and `docs/design/mockups/InGame Design System Catalog.dc.html` (v0.3 — forms family + FlowTakeover + CardPicker)

---

### Task 1: Draft A — "Stepped wizard"
**Model:** the flow as discrete pages — SEARCH → DETAILS → CARD — with `FlowHeader` step dots ●●○ and explicit BACK/NEXT keycaps. Maximum legibility/convention (§1.1's "forms stay conventional" pole). One decision per screen; multi-add returns to step 1 with a "shelf count" tick.
**Files:** Create `docs/design/mockups/add-game-draft-a-wizard.html` · Modify `docs/design/mockups/README.md`

- [ ] **Step 1: Scaffold.** Copy the head block (fonts/meta/body bg `#efece6`) and artboard-grid CSS from `collection-states.html`; define the token set above as CSS vars; build one reusable device-frame wrapper (Teal shell, bezel, NavBand with Collection keycap active+pip) sized per the existing mockups (~390px screens).
- [ ] **Step 2: Compose P1–P3** (entry/suggestions · keyboard-up search · results) as wizard step 1. P2's keyboard: reuse collection-states' drawn-keyboard block, `keyboardAppearance` dark.
- [ ] **Step 3: Compose P4–P6** as wizard step 2 (DETAILS): create-form page with `InlineBanner` dedup panel variant + status via `OptionSheet` panel.
- [ ] **Step 4: Compose P7–P8** as wizard step 3 (CARD) + the added beat: `CardPicker` both variants; P8 shows the shelf-slot beat + ADD & CONTINUE + the first-credit variant.
- [ ] **Step 5: Verify render.** Run: `msedge --headless=new --screenshot=docs/design/mockups/_verify-a.png --window-size=1180,2600 "docs/design/mockups/add-game-draft-a-wizard.html"` → Read the png. Expected: all 8 panels render, no blank frames, captions present; walk each panel's acceptance list. Fix and re-render until clean; delete `_verify-a.png`.
- [ ] **Step 6: README + commit.** Add the README table row (file · model description · panel coverage · "draft — pre-gate"). Run: `git add docs/design/mockups/add-game-draft-a-wizard.html docs/design/mockups/README.md && git commit -m "design: Add Game draft A (stepped wizard) — P1-P8 (0014 stage 1)"`

### Task 2: Draft B — "One surface, progressive disclosure"
**Model:** a single anchored screen — the search field is permanent at top; results, the add form, and the card step **expand inline beneath the chosen game** (accordion rhythm; no page transitions). Optimized for fast repeat adds: the multi-add loop is just "field clears, focus returns." `FlowHeader` carries no steps — context lives in the disclosure state.
**Files:** Create `docs/design/mockups/add-game-draft-b-inline.html` · Modify `docs/design/mockups/README.md`
**Steps:** identical step structure to Task 1 (scaffold may be copied from Draft A's file — these stay standalone, duplication is the convention) with these model-specific differences:

- [ ] **Step 1: Scaffold** (copy from draft A; retitle).
- [ ] **Step 2: P1–P3** — one screen: field pinned top, suggestion rails beneath (P1); keyboard-up compresses rails (P2); results replace rails inline (P3).
- [ ] **Step 3: P4–P6** — "be first" expands the create form **inline under the query**; dedup `InlineBanner` pushes content, doesn't overlay; status = a chip-row disclosure (this draft's native alternative to `OptionSheet` — same name, sheet-less form).
- [ ] **Step 4: P7–P8** — `CardPicker` as an inline rail under the added game; P8: the row collapses into a "✓ on your shelf" strip (the shelf-slot beat in-place) + field refocus for the next add.
- [ ] **Step 5: Verify.** Same command, output `_verify-b.png`, same acceptance walk; delete after.
- [ ] **Step 6: README + commit:** `git add docs/design/mockups/add-game-draft-b-inline.html docs/design/mockups/README.md && git commit -m "design: Add Game draft B (single-surface disclosure) — P1-P8 (0014 stage 1)"`

### Task 3: Draft C — "Card-led"
**Model:** the card object is the protagonist from the first keystroke — results are a **fanned rail of full card faces** (F-01: full faces, never cropped), choosing one "picks the card up" (it enlarges to `GameCard/hero` and stays in hand), and details/status/styling attach *around the held card*; the add is framed as **filing the card into your shelf**. The most metaphor-forward take; P8's shelf-slot beat is this model's climax rather than a confirmation.
**Files:** Create `docs/design/mockups/add-game-draft-c-cardled.html` · Modify `docs/design/mockups/README.md`

- [ ] **Step 1: Scaffold** (copy; retitle).
- [ ] **Step 2: P1–P3** — P1: suggestion games as a card fan; P2: keyboard up, fan parts to keep cards visible above it; P3: result cards carry a small title/year/studio plate + in-collection ✓ (the ResultRow contract worn card-shaped — same name, card form).
- [ ] **Step 3: P4–P6** — "be first" materializes a **blank-plate card** that fills as you type the name (the form writes onto the object); dedup `InlineBanner` slides under the held card; status = stamps applied to the card (chip set, COL-02 ×6).
- [ ] **Step 4: P7–P8** — `CardPicker` as alternate faces fanned behind the held card (adopt = swap face; STYLE IT = gold step door; SKIP = keep default face); P8: the held card flies to its shelf slot (lit), counter ticks, ADD & CONTINUE deals the next blank.
- [ ] **Step 5: Verify.** Same command, `_verify-c.png`; acceptance walk **plus** an explicit F-01 sweep (this model is the crop-risk one); delete after.
- [ ] **Step 6: README + commit:** `git add docs/design/mockups/add-game-draft-c-cardled.html docs/design/mockups/README.md && git commit -m "design: Add Game draft C (card-led) — P1-P8 (0014 stage 1)"`

### Task 4: Owner gate (STOP — do not proceed past this without direction)
- [ ] **Step 1:** Render all three at full height (`_gate-a/b/c.png`, same command) and send the three screenshots to the owner with a one-paragraph model summary each.
- [ ] **Step 2:** Push the three draft commits: `git push origin main`.
- [ ] **Step 3:** Collect direction — pick one / mix (Phase-A precedent: the owner may splice models per flow segment). Record the ruling verbatim as a dated note appended to this plan file, and capture any new behavior asks into `docs/open-questions.md`.

### Task 5: Converged artboard — full matrix
**Files:** Create `docs/design/mockups/add-game-states.html` · Modify `docs/design/mockups/README.md`
- [ ] **Step 1:** Build the converged flow per the Task-4 ruling: P1–P8 in the chosen/mixed model, plus **P9 (Skeleton · LoadError+RETRY)** and **P10 (OfflineStrip + writes-gated notice, SYS-10)** — the full definition-of-done matrix (decision 0011).
- [ ] **Step 2:** Verify render (same command, `_verify-states.png`; every P1–P10 panel against its acceptance list; delete after).
- [ ] **Step 3:** README row ("Add Game states — converged, full matrix") + retitle the three draft rows "superseded by add-game-states.html (kept for history)". Commit: `git add docs/design/mockups/add-game-states.html docs/design/mockups/README.md && git commit -m "design: Add Game converged states — full P1-P10 matrix (0014 stage 1)"`

### Task 6: Formalize into design-spec + catalog
**Files:** Modify `docs/design/design-spec.md` · Modify `docs/design/mockups/InGame Design System Catalog.dc.html` · Modify `docs/open-questions.md` (only if Task 4/5 raised items)
- [ ] **Step 1:** design-spec → v0.9: move `TextField`/`SelectField`/`OptionSheet`/`ResultRow`/`InlineBanner`/`CardPicker`/`FlowTakeover`/`FlowHeader` from the §1.5 gaps line into the catalog proper (one line each: anatomy + tokens + variants, in their **converged** form); add **§2.4 Add Game** (composition by name + the P1–P10 state matrix table, each cell ✓); changelog row citing decision 0014 + this plan.
- [ ] **Step 2:** Catalog HTML → v0.3: add a **Forms & Flow** section rendering the new components (the same visual-sample convention as v0.2's States family) + bump the header version note.
- [ ] **Step 3:** Verify the catalog still renders (`msedge` screenshot, spot-check), then commit + push: `git add docs/design/design-spec.md "docs/design/mockups/InGame Design System Catalog.dc.html" docs/open-questions.md && git commit -m "design: design-spec v0.9 — Add Game (2.4) + forms/flow components named; catalog v0.3" && git push origin main`

---

## Self-review (run before declaring the plan done)
1. **Spec coverage:** every 4.1 must-host appears in a panel (search✓P1-3 · suggestions✓P1 · exists-path✓P6-7 · missing-path✓P4-5 · dedup✓P5 · card step✓P7 · multi-add✓P8 · report-duplicate✓P3 overflow); OQ-035✓P2; OQ-040 stage-1 beats✓P8; takeover tier✓FlowTakeover; CARD-18✓P7 SKIP.
2. **No placeholders:** every step names exact files, exact panels, exact commands.
3. **Name consistency:** the locked name-set is used identically in Tasks 1–3 specs and Task 6 formalization.
