# R1-1 · Collection — FIX-ROUND receipt (post-first-article, 2026-07-04)

> **Builder:** Opus / Claude Code. **Round:** the owner's rulings on the R1-1 first-article packet
> ([`r1-1-first-article.md`](r1-1-first-article.md)). **Branch:** `m3` (uncommitted working tree, on
> top of the R1-1 commits `1524d7d`/`1497ab2`). **Verifier:** hands to the Fable lane (murr + parvati)
> — NOT self-certified.

## Owner rulings executed

| Ruling | What was done |
|--------|---------------|
| **1a — shelf/grid was a mix-up; revert** | **Decision [`0061`](../../decisions/0061-collection-shelf-showcase-restore.md)** written (supersedes 0057). Shelf = the **showcase** (Now-Playing hero + a stack where every entry gets the hero treatment: face + stat-line · title · catalog line; LOG HOURS hero-exclusive; ▶ NOW on the pinned). Grid = **2-up full faces** + the hero persisting. design-spec §2.1 reverted (0.51). |
| **1b — fix list** | List rebuilt as dense **strip rows**: `GameCard/thumb` + title (**inline ▶ NOW**) + *HRS · STATUS* + **chevron ›**, with the hero persisting above. |
| **1c — fix search dock** | In-place search now **morphs the tools bar** into a docked `SearchField` + **⊗ clear**, wrapped in `KeyboardLift` (rises over the keyboard, R0-2); a **RESULTS** header renders above the filtered list. (Was: field under the ScreenHead.) |
| **Process recalibration — blessed** | `m3r-build-task.md` §1 patched: **PRE-requires-evidence** (a `PRE` row needs a code cite / screenshot check or it's `UNVERIFIED`) + **adversarial predicate self-check** (walk every changed state predicate's full table). Binding from R1-2. |
| **TOP count — blessed as-is** | No change (reads "TOP 10" unconditionally, board `:1044`). |
| **RECENT — add it back** | `RECENT` chip added to `SORTS`. **Interim:** sorts by `ownedSince` DESC (no immutable `addedAt` exists); a distinct RECENT needs an api-contract field — **OQ-128** updated (partially resolved). |
| **OQ-129/130** | Left for the owner's batch triage (not this round). |

## Files touched

- `apps/mobile/app/(tabs)/collection.tsx` — shared `NowPlayingHero`; `ShelfView` (showcase stack),
  `GridView` (2-up faces + hero), `ListView` (strips + chevron + inline NOW + hero) rebuilt; search
  morph dock (`KeyboardLift` + `SearchField` + `ClearIcon`) + RESULTS header; `RECENT` in `SORTS` +
  the `filtered` memo; `statLine`/`catalogLine` helpers; styles.
- `docs/decisions/0061-collection-shelf-showcase-restore.md` (new) · `docs/design/design-spec.md`
  (§2.1 + version 0.51 + changelog) · `docs/planning/m3r-build-task.md` (§1 recalibration) ·
  `docs/planning/m3r/collection-manifest.md` (shelf/grid/list/search/sort rows → 0061 model) ·
  `docs/planning/m3r/r1-1-fixlist.md` (closed) · `docs/open-questions.md` (OQ-128 updated).

## Not touched / deferred (declared)
- Empty-state ghost/rail + dimmed tools on empty/loading (GAP-2), skeleton/load-error family (GAP-4),
  TOP `tv-sub` + TOP-bar Sort drop (M4 COL-13), OQ-127 (GameCard step), OQ-129/130 — all still open,
  none in this round.

## Checks (this round)
- `npm -w @ingame/mobile run typecheck` → clean (exit 0).
- `npm run lint:custom` → 8/8 rules pass, 0 errors/warnings. *(Repo-level `eslint .` fails only on the
  parallel session's untracked `scripts/dev-stack.mjs` — not this round's code.)*
- `npm -w @ingame/mobile run test -- --watchAll=false` → 3 suites / 6 tests pass.

## Hand-off
Not self-certified. The Fable verification lane re-runs **murr** (fix-round diff — attack the new
shelf/grid/list structure, the search-morph mount/unmount + `KeyboardLift` interaction with the
sheets, the RECENT sort branch) and **parvati** (fresh screenshots vs the 0061 manifest — the three
rebuilt modes, hero persistence, the morph dock). Loop until 0 open flags, then back to the owner.
