# R1-1 · Collection — structural fixlist ✅ CLOSED (built 2026-07-04)

> **STATUS UPDATE (2026-07-04):** the owner ruled on all three at the first-article review and the
> fix round was built the same day (Opus builder). **FIX-1/2/3 are DONE**; FIX-1 became **decision
> 0061** (shelf/grid reversal — the owner identified 0057 as a shelf/grid mix-up). Re-verification by
> the Fable lane (murr + parvati) follows. The original fixlist is preserved below for the record.
>
> - **FIX-1 → decision 0061:** shelf restored to the showcase (hero-treatment rows), grid = 2-up full
>   faces + persistent hero. Built in `collection.tsx` (shared `NowPlayingHero`).
> - **FIX-2:** list = strip rows (thumb) + chevron + inline ▶ NOW + persistent hero. Built.
> - **FIX-3:** in-place search morphs the tools bar into a docked field + ⊗ clear + RESULTS header,
>   lifted by `KeyboardLift`. Built.
> - Plus **RECENT sort** added (OQ-128, interim). Process-recalibration patch applied to
>   `m3r-build-task.md` §1 (PRE-requires-evidence + adversarial-predicate self-check).

---

> **From the verification lane (2026-07-03) — original fixlist, now closed.** Findings that were
> structural — a wrong interaction model or a missing element class — which the lane did **not** fix
> at the time per the hand-off boundaries.
> All were confirmed live by parvati (report: `docs/planning/m3-review-notes.md` §"R1-1 · Collection
> — parvati") and are **pre-existing M3 code**, not introduced by the R1-1 diff. None are R1-1 items;
> none touch a §0 lock. The owner sequences these (a follow-up builder round, or fold into M4 entry).
>
> Context: the mechanical findings (murr's 5 + parvati's R7–R11 copy/content flags) were fixed by
> the lane in-place and delta re-verified — they are NOT in this list.

| # | Finding | Manifest line | Authority | Severity |
|---|---------|---------------|-----------|----------|
| FIX-1 | **Grid view is off-spec:** renders `GameCard/cell` 96×134 in a wrap (~3-up) with **no Now-Playing hero above**. Owed: `GameCard/grid` 161×225 full faces, 2-up, hero persisting. | grid state rows 0–1 | board `:857–881` · design-spec §Collection view-modes ("compact grid — `GameCard/grid`, full faces"; "Now-Playing hero persists across the browse modes") | **HIGH** — a whole view mode diverges |
| FIX-2 | **List view is off-grammar:** rows use `GameCard/mini` 64×89 (owed: the thumb strip variant), no **chevron ›**, ▶ NOW worn on the card face (owed: inline, title-adjacent), and **no hero above**. | list state rows 0–3 + row 2 (NOW inline) | board `:939–994`, `:957`, `:949` · design-spec §Collection view-modes ("dense list — `Strip` rows: thumb + title + hours/status") | **HIGH** — the stats-scan mode diverges |
| FIX-3 | **In-place search dock:** the field renders UNDER the ScreenHead; the board's model is the tools bar **morphing into** the docked field (bottom), with the **⊗ clear** affordance and the **RESULTS — TITLE · DEVELOPER · PUBLISHER** section header. R0-2 KeyboardLift applies once re-docked. | search state rows 1–1b | board `:661`, `:689–695` (OQ-034 "the bar becomes the field") | **MEDIUM** — interaction model |

## Owner notes riding this list

- **R1-2 rider (murr debt, actualized):** Collection's `STATUSES` chip order is now board-correct
  (PLAYING first), but `add-game.tsx` duplicates the array backlog-first — the two chip rows now
  visibly disagree. Hoist a shared constant (or mirror the order) in the R1-2 add-game pass.
- **TOP count owner-call (murr):** the count keycap now reads "TOP 10" in TOP view unconditionally
  (board `:1044`); with filters active it masks the honest "k OF M", and with <10 games it captions
  a shorter list. Bless or refine at the first-article review.

- **Post-0057 shelf ≈ spec grid.** Decision 0057 made SHELF = hero + 2-up fluid faces; the spec'd
  GRID (hero + 2-up 161×225 full faces) is now visually near-identical. Before building FIX-1
  verbatim, worth an owner confirm that grid stays a distinct mode (or gets a density point, e.g.
  3-up cells — which is what the current build does, undocumented).
- **Not on this list (declared or later-milestone):** TOP `tv-sub` explainer + the board's TOP bar
  dropping the Sort chip (rides M4 COL-13 with the curated grid) · dimmed tools on empty/loading
  (GAP-2/4 family) · empty-state ghost/rail/copy (GAP-2) · skeleton/load-error family (GAP-4) ·
  OQ-127 (GameCard step) · OQ-128 (RECENT sort) · OQ-129 (sort direction carry-over) · OQ-130
  (filtered-to-zero beat).
