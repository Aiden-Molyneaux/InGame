# R5 — Layout, Chrome & Interaction Patterns

**Audit:** Design-Documentation Audit (see [`00-PLAN.md`](00-PLAN.md)) · **Run:** 2026-06-13 (live tree ~`d8c4205`) ·
**Mode:** report-only

## Method & scope
Structural sibling to R4. Read the design-spec §2 compositions (§2.1–§2.8, the authoritative per-page
chrome/scroll/overlay descriptions) and cross-tabulated the **header grammar**, **scroll/section
models**, **sheet vs drawer vs modal grammar**, and the **destructive-confirm** pattern against the
converged boards' actual implementations. The **Game page is excluded** — it's in heavy active rework
(SectionSwitch / dual-face), not converged.

## Verified consistent (most of the structural layer holds)
- **Header grammar is principled.** The 5 main tabs use `ScreenHead`; flows use `FlowHeader`
  (Add Game, Styler, Settings + its feature pages). The right-hand slot varies **by function** —
  `CountKeycap` (Collection, Add Game), `CurrencyCounter` (Store), settings-gear (Profile), nothing
  (Discover names its sub-page; Settings is a flow). Discover's "header names the active room" is an
  owner-ruled variant, not drift.
- **One overlay grammar, no rogue modals.** Every secondary surface is **bottom-anchored**, and the
  pulled-vs-summoned split is consistent and explicit:
  - **`.sheet`** = pulled-up, **has a grab handle** — Collection sort/filter, Store item sheets,
    Canvas, Add Game (`collection-states:186`, `canvas-states:166`, `add-game…:199`).
  - **`.drawer`** = summoned (from a ⋮/action), **no handle**, dismissed by CANCEL/scrim — Report,
    Add Game's option drawer, the Settings confirm (`report-states:203` + its note "no grab handle
    (summoned, not pulled)", `add-game…c3:338`).
  - The **scrim** is `.scrim` everywhere (`rgba(13,11,3x,.5–.6)`), and `FlowTakeover`/`breakout` tiers
    (decision 0014) are used as specified (Add Game/Styler/Settings takeovers; Canvas breakout).
- **Destructive-confirm is correctly drawer-grammar'd** — the delete-account confirm renders as a
  bottom drawer (`settings-states:130`), not a centered modal; the centered `ConfirmDialog` was
  deliberately retired into the one-drawer grammar (owner 2026-06-14).

All findings below are confined to the **destructive-confirm naming**, where that migration is
half-finished.

---

## Findings

### R5-F01 — Incomplete `ConfirmDialog → ConfirmSheet` rename in the converged Settings board · **Medium**
The owner converted the destructive confirm from a **centered `ConfirmDialog` (modal)** to a **bottom
`ConfirmSheet` (drawer)** on 2026-06-14, and design-spec §2.8/§1.5 already call it `ConfirmSheet`. The
**structure** was migrated correctly — but the board still carries the **old identity** in three ways:
- **CSS classes** unchanged: the container is `.cdialog`, the buttons `.cd-del`/`.cd-cancel`, and the
  scrim is **`.modal-scrim`** (`settings-states.html:127,130,141,142`) — while every *other* board's
  scrim is `.scrim`. ("cd" = ConfirmDialog; "modal-" = the retired centered grammar.)
- **A factually-wrong comment:** `settings-states.html:126` still reads
  `/* ConfirmDialog (centered destructive delete-account confirm) */` — it is no longer centered.
- **~5 stale "ConfirmDialog" labels/markers:** `:273` ("DELETE ACCOUNT `ConfirmDialog`"), `:428`,
  the HTML comment `:560`, the artboard-label `:562`, and the `data-screen-label` `:563` — even though
  `:262`/`:279`/`:599`/`:605` correctly say `ConfirmSheet`. The board contradicts itself.
- **Impact:** design-spec ↔ implementation naming drift on a key interaction component, plus an
  internally self-contradicting board (half "ConfirmSheet", half "ConfirmDialog/modal/centered"). It
  also feeds straight into the **owed `ConfirmSheet` unification with the game-page track (OQ-061**,
  design-spec §2.8) — the shared component should not inherit `.cdialog`/`.cd-*`/`.modal-scrim`.
- **Suggested fix — lane (b) design hygiene, fold into OQ-061:** finish the rename — classes
  `.cdialog`→`.confirm-sheet`, `.cd-*`→`.cs-*`, `.modal-scrim`→`.scrim`; fix the `:126` comment; and
  update the stale "ConfirmDialog"/labels to `ConfirmSheet`. Do it as part of the OQ-061 unification so
  Settings + Game page land on one shared `ConfirmSheet`.

### R5-F02 — "Sheet" names a *summoned drawer* in components but a *pulled sheet* in CSS · **Low**
The interaction grammar is consistent (pulled+handle vs summoned+no-handle), but the **word "Sheet"
straddles it**: the `*Sheet` component family — `ReportSheet`, `ConfirmSheet`, `ReconcileSheet`,
`OptionSheet` — are all the **summoned `.drawer`** pattern (no handle), whereas the **`.sheet`** CSS
class is the **pulled** overlay (with handle). So a reader can't tell from "ReportSheet" whether it's
pulled or summoned. It's largely acknowledged (design-spec writes "`ReportSheet/drawer`", and the
boards note "summoned, not pulled"), so this is a **clarity note**, not a grammar break.
- **Suggested fix — lane (b), optional:** when the overlay grammar is formalized, either rename the
  summoned components `*Drawer` (e.g. `ReportDrawer`/`ConfirmDrawer`) or add a one-line §1 note that
  `*Sheet` = the summoned-drawer family and `.sheet` = the pulled surface. No mockup change required.

---

## Context (not findings)
- **Game page** is mid-rework (SectionSwitch / dual-face, several commits in flight) — excluded from
  this pass; its destructive `ConfirmSheet` is part of the OQ-061 unification with Settings.

## Summary
**1 Medium · 1 Low.** The structural layer is in good shape: a **single, principled overlay grammar**
(bottom-anchored; pulled-`.sheet`-with-handle vs summoned-`.drawer`-no-handle; one `.scrim`; no rogue
centered modals), and a **functionally-driven header grammar** (`ScreenHead` tabs / `FlowHeader` flows,
right-slot by need). The one real issue (R5-F01) is that the Settings destructive-confirm's
`ConfirmDialog → ConfirmSheet` migration is **structurally done but namingly half-finished** — best
cleaned up inside the already-owed OQ-061 unification. R5-F02 is a naming-clarity footnote on the
otherwise-coherent sheet/drawer system.
