# SCREEN STATUS — the page dashboard

> **What this is:** the always-current map of every app surface — design state, queue position,
> mockup version, **the implements-from file** (what the frontend build will compose from), whether
> its states board exists, whether **design-spec has formalized that board**, and whether the
> **api-contract covers the functionality shown on that page**. Updated **at the end of every draft pass** (both design
> sessions); the owner reads UP NEXT first. Row order = the IA in
> [`ui-design-requirements.md`](ui-design-requirements.md) Part 2. Mockup files live in
> **per-page subfolders** under [`mockups/`](mockups/) (file map: its README); the catalog
> stays at the mockups root.

**Last updated:** 2026-06-13 (spec owner — **triage batch landed** (decision 0019): product-spec **0.19** · api-contract **0.18** · design-req **0.14**; OQ-008 (cap 30) · OQ-048 (intensity) · OQ-049 (save-private) · OQ-051 (popular rank) · OQ-052 (friend-share cut) all resolved · SectionChips catalog sample corrected to pressed+pip)

## Up next (the queue)
1. **Card editor · Canvas posture** (0014 stage 3 — the breakout; resolves OQ-007; the OQ-040 reveal ritual; receives the composition from the converged Styler).
2. *Coverage-driven after that* (design-process): **Discover** (surfaces the segmented control) and **Settings** (rows · toggles · destructive confirm) are the named gap-closers; **Device editor** carries the OQ-045 debt. *(Inbox for next triage: OQ-038 offline-cache-scope · the OQ-002/009/010/011 economy+content tuning set.)*

## Legend
**State:** ✅ converged · 🔶 in pass / partial · 🔜 queued (#n) · ⬜ not started ·
**Implements from:** the exact mockup file(s) the frontend build composes from — filled at converge (normally the states board); — until one exists ·
**States board:** the §1.8/§1.6 state-matrix mockup exists ·
**Design-spec:** ✅ design-spec (Part-2 composition + §1.5 components) deliberately synced to this page's converged board · ⬜ formalization owed · — nothing to formalize yet ·
**API:** ✅ contract deliberately synced to this page's functionality · 🔶 endpoints drafted, not yet page-audited · ⬜ not mapped

| § | Screen | State | Mockup (version) | Implements from | States board | Design-spec | API | Notes / next |
|---|---|---|---|---|---|---|---|---|
| 3.1 | Collection (home) | ✅ converged | `h2-underlay-v2` + `collection-states.html` (per 0011–0013) | `collection/collection-states.html` + `collection/h2-underlay-v2-c5-hybrid-ds-enforced.html` | ✅ (incl. friend-view, lifecycle, offline) | ✅ (§2.1; synced 0.8/0013) | ✅ (page-audited, 0.17) | 0.17 audit: list totals + item shape · `/me/collection/reorder` · the now-playing pin · `/catalog/popular` (ranked by collections-count — OQ-051 resolved, 0019) |
| 3.2 | Discover | 🔜 queued (#4) | — | — | — | — | 🔶 | First surface for the segmented control |
| 3.3 | Friends | ⬜ | — | — | — | — | 🔶 | Feed-first landing (SOC-06) |
| 3.4 | Store (incl. 4.11/4.12) | ✅ converged | `store-states.html` (5 rulings + 0017) | `store/store-states.html` | ✅ (incl. lifecycle, writes-gated offline) | ✅ (§2.3; 0.10) | ✅ | OQ-045 sticker preview → Device editor pass |
| 3.5 | Profile | ✅ converged | `profile-states.html` (per 0011–0013) | `profile/profile-states.html` (+ the h2-underlay board's Profile artboard) | ✅ (edit, friend-view, privacy, terminal, offline) | ✅ (§2.2; synced 0.8/0013) | ✅ (page-audited, 0.17) | 0.17 audit: `/me` + `/users/:id` enumerated field-level (cooldown · device payload · limited card · `relationship`); friend-view SHARE chip cut (OQ-052 resolved, 0019) |
| 4.1 | Add Game (flow) | ✅ converged | `add-game/add-game-states.html` (c6 + P9–P10 + PIXELS + `ReportSheet/drawer`) | `add-game/add-game-states.html` | ✅ (P1–P10 + P3b/P7b; lifecycle + writes-gated offline) | ✅ (§2.4; 0.12 + catalog v0.4) | ✅ (0016 + MOD-01 ripples) | — |
| 4.2 | Game page (adaptive) | ⬜ | — (`CardDetail` slice exists in Add Game c5) | — | — | — | 🔶 (CAT-09 fields landed) | Owned-state fold-in; card gallery |
| 4.3 | Card editor — Styler | ✅ converged | `styler/styler-states.html` (carousel; gate ruling 2026-06-12 — **+NAMEPLATE, overlay cut**) | `styler/styler-states.html` | ✅ (skeleton · load-error · offline draft-safe, writes gated) | ✅ (§2.5; 0.13 + catalog v0.4) | ✅ (**0.16 styler sync**: card-bases + surprise · save-private · acquire-batch · `nameplate` enums; OQ-050 resolved) | **OQ-039 ruled** (decision 0018: COSM-01 +nameplate · TITLE→font+ink · Nameplates aisle); OQ-048 (intensity) + OQ-049 (save-private) resolved (0019) |
| 4.3 | Card editor — Canvas | 🔶 in pass | canvas drafts A/B/C in progress (canvas track) | — | — | — | 🔶 | Breakout (OQ-007 = the divergence axis); OQ-040 full ritual; element cap 30 (OQ-008 ruling) |
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
| 4.16 | Report (modal) | ✅ pattern ruled | `report-sheet/report-sheet-drafts.html` (**A `/drawer` won**; B/C history) + normalized in `add-game-states.html` P3b | `report-sheet/report-sheet-drafts.html` (**A** `/drawer`) + `add-game/add-game-states.html` P3b (the normalized form) | — (rides each host screen's board) | ✅ (`ReportSheet` in §1.5, 0.12 + catalog v0.4) | ✅ (MOD-01 `details`, 0.14) | Entry + **user contexts drawn** (block handoff incl., SOC-09); per-surface integration rides each screen's pass |

## How to update (the protocol)
At the end of **every draft pass**: update your screen's row (state · mockup version · states board ·
at converge: fill **Implements from** with the board's path · **re-judge the Design-spec column
against the converged board** and the **API column against what the page actually shows**), refresh
UP NEXT, bump the date, and surface the changed rows to the owner in the wrap-up. The Design-spec and
API columns are the tripwires — a converged board's formalization batch is owed before its Design-spec
reads ✅, and functionality drawn on a page must reach the contract (or the inbox) before its API
reads ✅.
