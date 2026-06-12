# SCREEN STATUS — the page dashboard

> **What this is:** the always-current map of every app surface — design state, queue position,
> mockup version, whether its states board exists, and whether the **api-contract covers the
> functionality shown on that page**. Updated **at the end of every draft pass** (both design
> sessions); the owner reads UP NEXT first. Row order = the IA in
> [`ui-design-requirements.md`](ui-design-requirements.md) Part 2.

**Last updated:** 2026-06-12 (store track — after the 0017 spec batch)

## Up next (the queue)
1. **Add Game — converge** (draft C v5 awaiting owner review → converged board: P9–P10 + the ◈→PIXELS swap).
2. **Card editor · Styler posture** (0014 stage 2 — **3 drafts at the owner gate**: A carousel · B drawer rack · C workbench; OQ-039 exhibit drawn; converge → `styler-states.html`).
3. **Card editor · Canvas posture** (0014 stage 3 — the breakout; resolves OQ-007; the OQ-040 reveal ritual).
4. *Coverage-driven after that* (design-process): **Discover** (surfaces the segmented control) and **Settings** (rows · toggles · destructive confirm) are the named gap-closers; **Device editor** carries the OQ-045 debt.

## Legend
**State:** ✅ converged · 🔶 in pass / partial · 🔜 queued (#n) · ⬜ not started ·
**States board:** the §1.8/§1.6 state-matrix mockup exists ·
**API:** ✅ contract deliberately synced to this page's functionality · 🔶 endpoints drafted, not yet page-audited · ⬜ not mapped

| § | Screen | State | Mockup (version) | States board | API | Notes / next |
|---|---|---|---|---|---|---|
| 3.1 | Collection (home) | ✅ converged | `h2-underlay-v2` + `collection-states.html` (per 0011–0013) | ✅ (incl. friend-view, lifecycle, offline) | 🔶 | — |
| 3.2 | Discover | 🔜 queued (#4) | — | — | 🔶 | First surface for the segmented control |
| 3.3 | Friends | ⬜ | — | — | 🔶 | Feed-first landing (SOC-06) |
| 3.4 | Store (incl. 4.11/4.12) | ✅ converged | `store-states.html` (5 rulings + 0017) | ✅ (incl. lifecycle, writes-gated offline) | ✅ | OQ-045 sticker preview → Device editor pass |
| 3.5 | Profile | ✅ converged | `profile-states.html` (per 0011–0013) | ✅ (edit, friend-view, privacy, terminal, offline) | 🔶 | — |
| 4.1 | Add Game (flow) | 🔶 in pass | `add-game-draft-c5-cardled.html` (v5, awaiting review) | ⬜ (deferred to converge: P9–P10) | ✅ (0016 + MOD-01 ripples) | Converge = queue #1; swap ◈→PIXELS |
| 4.2 | Game page (adaptive) | ⬜ | — (`CardDetail` slice exists in Add Game c5) | — | 🔶 (CAT-09 fields landed) | Owned-state fold-in; card gallery |
| 4.3 | Card editor — Styler | 🔶 in pass | `styler-draft-{a,b,c}` (carousel · drawer rack · workbench) — **at owner gate** | ⬜ (lifecycle → converge) | 🔶 | OQ-039 exhibited (reco: adopt nameplate, defer overlay); +OQ-048/049; acquire/reconcile rides 0017's `POST /cosmetics/:id/acquire` |
| 4.3 | Card editor — Canvas | 🔜 queued (#3) | — | — | 🔶 | Breakout (OQ-007); OQ-040 reveal ritual |
| 4.4 | Admin / Moderator console | ⬜ | — | — | 🔶 | Mod-only (MOD-04) |
| 4.5 | Device editor | ⬜ | — | — | 🔶 | Owes OQ-045; shells per 0017 |
| 4.6 | Compare Hours | ⬜ | — | — | 🔶 | — |
| 4.7 | Lists / Top-5 editor | ⬜ | — | — | 🔶 | — |
| 4.8 | Find / Add Friends | ⬜ | — | — | 🔶 | Invite-link landing (SOC-10) |
| 4.9 | Contributor profile | ⬜ | — | — | 🔶 | — |
| 4.10 | Achievements | ⬜ | — | — | 🔶 | OQ-005 egg presentation owed |
| 4.11 | Store item detail / purchase | ✅ (folded into 3.4) | `store-states.html` P2/P2b/P3/P4/P5 | ✅ | ✅ | Sheet grammar; hold-to-buy |
| 4.12 | Wallet | ✅ (folded into 3.4) | `store-states.html` P8 | ✅ (incl. ECON-09 negative) | ✅ | — |
| 4.13 | Welcome & Auth | ⬜ | — | — | 🔶 | Logged-out root (AUTH) |
| 4.14 | Onboarding | ⬜ | — | — | 🔶 | NOTIF-04 pre-prompt close |
| 4.15 | Settings | 🔜 queued (#5) | — | — | 🔶 | Rows · toggles · destructive confirm |
| 4.16 | Report (modal) | 🔶 partial | report drawer designed in Add Game c3–c5 (card target) | — | ✅ (MOD-01 `details`, 0.14) | User/catalog-entry targets + block handoff undesigned |

## How to update (the protocol)
At the end of **every draft pass**: update your screen's row (state · mockup version · states board ·
**re-judge the API column against what the page actually shows**), refresh UP NEXT, bump the date,
and surface the changed rows to the owner in the wrap-up. The API column is the tripwire — if a pass
added functionality the contract lacks, fix the contract (or log the OQ) **before** marking ✅.
