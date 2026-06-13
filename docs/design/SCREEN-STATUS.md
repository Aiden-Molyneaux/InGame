# SCREEN STATUS — the page dashboard

> **What this is:** the always-current map of every app surface — design state, queue position,
> mockup version, **the implements-from file** (what the frontend build will compose from), whether
> its states board exists, whether **design-spec has formalized that board**, and whether the
> **api-contract covers the functionality shown on that page**. Updated **at the end of every draft pass** (both design
> sessions); the owner reads UP NEXT first. Row order = the IA in
> [`ui-design-requirements.md`](ui-design-requirements.md) Part 2. Mockup files live in
> **per-page subfolders** under [`mockups/`](mockups/) (file map: its README); the catalog
> stays at the mockups root.

**Last updated:** 2026-06-13 (**spec-owner — §4.2 Game page prepped (decision 0020)**: friend card-tap → the Game page **friend-view state** · their card + **equipped readout** (CARD-22) + per-game ctx · **opt-in compare** · **atomic adopt** (SOC-11); spec 0.20 / api 0.19 / design-req 0.15. · **Discover track — §3.2 Discover CONVERGED** (`discover-states.html`): owner picked **A "Two rooms"** + edits (bottom/smaller `SegmentedKeycap` · standard header · real games · Browse-By cut → OQ-057 · simplified Up Next + Discover); board ✅, **Design-spec ⬜** (SegmentedKeycap/QueueRow formalization owed), **API 🔶** (page-audit + OQ-053/054/055/057). Drafts a/b/c kept for history. Brief `plans/2026-06-13-discover-drafts-brief.md`. Prior: report track — **§4.16 Report converged + design-spec formalized** (`report-states.html`, A `/drawer`; 3 targets × full matrix; MOD-01/02 · SOC-09 · SYS-10): board ✅, API ✅ (page-audited), **Design-spec ✅ (formalized → 0.14: §1.5 lifecycle + `ReportConfirm` + §2.6)**. Prior: canvas track — Canvas converged (print shop · `canvas-states.html`), the 0014 editor arc complete, OQ-007 + OQ-040 resolved; spec-owner triage 0019.)

## Up next (the queue)
- **▶ NOW (owner): Game page (4.2)** is being picked up for design with the **decision-0020** brief — the two entry-context states: **owned** (tap your card; inline-edit stats + card flip/back) **+ friend-view** (tap a friend's card → their card · **equipped readout** CARD-22 · **opt-in compare** · **atomic adopt**, SOC-11). Implements-from: design-req §4.2 (api 0.19 / spec 0.20). *(Design-spec + API page-audit owed at converge.)*
0. **🎉 The 0014 editor arc is COMPLETE** — Add Game → Styler → Canvas all converged. OQ-007 (breakout) + OQ-040 (first-print ritual) resolved design-side in the Canvas board.
1. *Formalization batches owed (spec-owner):* the **Styler converge set** (design-spec §2.5 already landed 0.13 — the catalog component shells) + the **Canvas converge set** (design-spec §2.x + the editor's open-composition components: `CanvasStage` · `AssetShelf` · `ElementTray` · `LayerRack`/slips · `PrintRitual`); + the **Canvas API page-audit** (writes already in 0.16/0.18 — confirm no gap). *(Report converge set — **done 0.14**: §1.5 `ReportSheet` lifecycle + `ReportConfirm` + §2.6.)*
2. *Coverage-driven:* **Discover** ✅ **CONVERGED** (`discover-states.html` — A "Two rooms" + owner edits: bottom/smaller `SegmentedKeycap` · standard header · real games · Browse-By cut · simplified Up Next + Discover). **Settings** (rows · toggles · destructive confirm) is now the **next queued** coverage-closer; **Device editor** carries the OQ-045 debt. *(Inbox for next triage: **Discover OQ-053/054/055/057** · OQ-038 offline-cache-scope · the OQ-002/009/010/011 economy+content tuning set.)*

## Legend
**State:** ✅ converged · 🔶 in pass / partial · 🔜 queued (#n) · ⬜ not started ·
**Implements from:** the exact mockup file(s) the frontend build composes from — filled at converge (normally the states board); — until one exists ·
**States board:** the §1.8/§1.6 state-matrix mockup exists ·
**Design-spec:** ✅ design-spec (Part-2 composition + §1.5 components) deliberately synced to this page's converged board · ⬜ formalization owed · — nothing to formalize yet ·
**API:** ✅ contract deliberately synced to this page's functionality · 🔶 endpoints drafted, not yet page-audited · ⬜ not mapped

| § | Screen | State | Mockup (version) | Implements from | States board | Design-spec | API | Notes / next |
|---|---|---|---|---|---|---|---|---|
| 3.1 | Collection (home) | ✅ converged | `h2-underlay-v2` + `collection-states.html` (per 0011–0013) | `collection/collection-states.html` + `collection/h2-underlay-v2-c5-hybrid-ds-enforced.html` | ✅ (incl. friend-view, lifecycle, offline) | ✅ (§2.1; synced 0.8/0013) | ✅ (page-audited, 0.17) | 0.17 audit: list totals + item shape · `/me/collection/reorder` · the now-playing pin · `/catalog/popular` (ranked by collections-count — OQ-051 resolved, 0019) |
| 3.2 | Discover | ✅ converged | `discover-states.html` (Two rooms; gate ruling 2026-06-13 — **bottom/smaller toggle · standard header · real games · Browse-By cut · simplified pages**) | `discover/discover-states.html` | ✅ (Up Next + Discover; lifecycle: skeleton · Signal-Lost+RETRY · offline writes-gated) | ⬜ (formalization owed: §1.5 `SegmentedKeycap`/`QueueRow`/`ReleaseRow`/`AdoptCount` + §2.x Discover) | 🔶 (WTP + DISC-01/03/04 + CAT-08/09 drafted; **page-audit + OQ-053/054/055/057 owed**) | **A "Two rooms" won the gate** + owner edits; drafts a/b/c kept for history. **+ a card-fan-aesthetic sibling `discover-states-fan.html`** (the Add Game `CardFan` across Up Next/Upcoming/recs/Trending/search) — owner comparing the two aesthetics |
| 3.3 | Friends | ⬜ | — | — | — | — | 🔶 | Feed-first landing (SOC-06) |
| 3.4 | Store (incl. 4.11/4.12) | ✅ converged | `store-states.html` (5 rulings + 0017) | `store/store-states.html` | ✅ (incl. lifecycle, writes-gated offline) | ✅ (§2.3; 0.10) | ✅ | OQ-045 sticker preview → Device editor pass |
| 3.5 | Profile | ✅ converged | `profile-states.html` (per 0011–0013) | `profile/profile-states.html` (+ the h2-underlay board's Profile artboard) | ✅ (edit, friend-view, privacy, terminal, offline) | ✅ (§2.2; synced 0.8/0013) | ✅ (page-audited, 0.17) | 0.17 audit: `/me` + `/users/:id` enumerated field-level (cooldown · device payload · limited card · `relationship`); friend-view SHARE chip cut (OQ-052 resolved, 0019) |
| 4.1 | Add Game (flow) | ✅ converged | `add-game/add-game-states.html` (c6 + P9–P10 + PIXELS + `ReportSheet/drawer`) | `add-game/add-game-states.html` | ✅ (P1–P10 + P3b/P7b; lifecycle + writes-gated offline) | ✅ (§2.4; 0.12 + catalog v0.4) | ✅ (0016 + MOD-01 ripples) | — |
| 4.2 | Game page (adaptive) | 🔶 in pass | `game-page-draft-{a,b,c}` in progress (game-page track) | — | — | — | 🔶 (CAT-09 + 0020: friend `ownedSince`/sort + card `equipped`) | **GAME-PAGE track — 3 distinct drafts**: A "card-led scroll" · B "tabbed dossier" · C "pinned card + drawer depth". Renders the **entry-context states** (decision 0020 · SOC-11: neutral · owned inline-edit + **card flip** · friend-view + equipped readout CARD-22 + opt-in compare + atomic adopt), the **card switcher** (OQ-056 customizations view), the community gallery + adopt. Converge → `game-page-states.html` |
| 4.3 | Card editor — Styler | ✅ converged | `styler/styler-states.html` (carousel; gate ruling 2026-06-12 — **+NAMEPLATE, overlay cut**) | `styler/styler-states.html` | ✅ (skeleton · load-error · offline draft-safe, writes gated) | ✅ (§2.5; 0.13 + catalog v0.4) | ✅ (**0.16 styler sync**: card-bases + surprise · save-private · acquire-batch · `nameplate` enums; OQ-050 resolved) | **OQ-039 ruled** (decision 0018: COSM-01 +nameplate · TITLE→font+ink · Nameplates aisle); OQ-048 (intensity) + OQ-049 (save-private) resolved (0019) |
| 4.3 | Card editor — Canvas | ✅ converged | `canvas/canvas-states.html` (print shop; gate ruling 2026-06-13 — **C wins** + undo/redo relocated, proof size-ladder) | `canvas/canvas-states.html` | ✅ (skeleton · load-error · offline: editing+PROOF from cache, PRESS writes-gated) | ⬜ (formalization batch owed: §2.x + the open-composition set — `CanvasStage`/`AssetShelf`/`ElementTray`/`LayerRack`(slips)/`PrintRitual`) | 🔶 (writes exist in 0.16/0.18: draft · autosave · publish · save-private · acquire-batch · assets · share-image; **canvas page-audit owed**) | **OQ-007 + OQ-040 resolved design-side** (diegetic breakout · the first-print ritual); cap 30 (OQ-008) |
| 4.4 | Admin / Moderator console | ⬜ | — | — | — | — | 🔶 | Mod-only (MOD-04) |
| 4.5 | Device editor | ⬜ | — | — | — | — | 🔶 | Owes OQ-045; shells per 0017 |
| 4.6 | Compare Hours | ⬜ | — | — | — | — | 🔶 | — |
| 4.7 | Lists / Top-5 editor | ⬜ | — | — | — | — | 🔶 | — |
| 4.8 | Find / Add Friends | ⬜ | — | — | — | — | 🔶 | Invite-link landing (SOC-10) |
| 4.9 | Contributor profile | ⬜ | — | — | — | — | 🔶 | — |
| 4.10 | Achievements | ⬜ | — | — | — | — | 🔶 | OQ-005 egg presentation owed |
| 4.11 | Store item detail / purchase | ✅ (folded into 3.4) | `store-states.html` P2/P2b/P3/P4/P5 | `store/store-states.html` (P2–P5 + P1b/P2b) | ✅ | ✅ (§2.3) | ✅ | Sheet grammar; hold-to-buy |
| 4.12 | Wallet | ✅ (folded into 3.4) | `store-states.html` P8 | `store/store-states.html` (P8) | ✅ (incl. ECON-09 negative) | ✅ (§2.3) | ✅ | — |
| 4.13 | Welcome & Auth | ⬜ | — | — | — | — | 🔶 | Logged-out root (AUTH) |
| 4.14 | Onboarding | ⬜ | — | — | — | — | 🔶 | NOTIF-04 pre-prompt close |
| 4.15 | Settings | 🔜 queued (#5) | — | — | — | — | 🔶 | Rows · toggles · destructive confirm |
| 4.16 | Report (modal) | ✅ converged | `report-sheet/report-states.html` (converged board, A `/drawer`; `report-sheet-drafts.html` A/B/C + `add-game-states.html` P3b kept for history) | `report-sheet/report-states.html` | ✅ (3 targets × full lifecycle matrix) | ✅ (formalized 0.14 — §1.5 `ReportSheet` lifecycle + new `ReportConfirm` + new §2.6 Report; catalog v0.4 static, lifecycle swatches optional) | ✅ (page-audited — `POST /reports` {card\|game\|user + reason + `details`} incl. duplicate + `/me/blocks` SOC-09) | **Promoted to its own board** (9 devices): card · catalog (+duplicate) · user **+ Block** (SOC-09) across launch · picker · required-details (MOD-01, mod-only/outside MOD-07) · dormant-submit · **in-flight · filed-confirm (MOD-02 soft-hide, no thresholds) · post-block confirm · offline writes-gate (SYS-10) · error→Toast** (§1.8). All drawn affordances contract-backed (no OQ logged) |

## How to update (the protocol)
At the end of **every draft pass**: update your screen's row (state · mockup version · states board ·
at converge: fill **Implements from** with the board's path · **re-judge the Design-spec column
against the converged board** and the **API column against what the page actually shows**), refresh
UP NEXT, bump the date, and surface the changed rows to the owner in the wrap-up. The Design-spec and
API columns are the tripwires — a converged board's formalization batch is owed before its Design-spec
reads ✅, and functionality drawn on a page must reach the contract (or the inbox) before its API
reads ✅.
