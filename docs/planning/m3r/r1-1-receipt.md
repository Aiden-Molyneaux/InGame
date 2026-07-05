# R1-1 · Collection — fix ledger (receipt)

> **Builder:** Opus / Claude Code (this repo). **Surface:** R1-1 Collection (M3-R first article).
> **Manifest:** [`collection-manifest.md`](collection-manifest.md). **Branch:** `m3` (uncommitted, working tree).
> **Files touched:** `apps/mobile/app/(tabs)/collection.tsx` · `apps/mobile/src/components/ScreenButton.tsx` ·
> `apps/mobile/src/components/ToolButton.tsx` (+ this receipt, the manifest, and two OQs in `docs/open-questions.md`).
> **Not touched (deliberately):** `PulledSheet`/`KeyboardLift` (R0, murr-SOUND — built on, not reworked), `GameCard`, add-game screen logic.

## Fix ledger — one row per R1-1 item

| Note | Manifest line(s) | Files:lines changed | Self-verified how | Deviations/notes |
|------|------------------|---------------------|-------------------|------------------|
| **S3-d** view chip → "TOP 10" | drawer §3 row 3 | `collection.tsx:45` (`VIEW_LABEL`), `:432` (drawer VIEW uses it) | Render: drawer VIEW row shows **SHELF · GRID · LIST · TOP 10** | Only the drawer VIEW chip carries text now; the tools-bar view keycap is icon-only (S3-n) so "TOP 10" lives in the drawer, matching board `:588` |
| **S3-f** Status "All" | drawer §7 (STATUS·ALL) | `collection.tsx:456` | Render: STATUS row leads with **ALL** selected (accent border); tapping PLAYING deselected ALL & filtered to 3 | ALL = empty set; press clears the set (board `:601`) |
| **S3-g** Genre "All" | drawer §8 (GENRE·ALL) | `collection.tsx:471` | Render: GENRE row leads with **ALL** selected | Same grammar as S3-f (board `:611`) |
| **S3-h** remove standalone ASC/DESC; fold direction in | drawer §4/§5 | `collection.tsx:438–451` (SORT section rewritten; the old `label={sortAsc?'ASC ↑':'DESC ↓'}` chip deleted) | Render: no standalone ASC/DESC chip; active **MY ORDER ↓** re-tapped → **MY ORDER ↑** | Board `:598` "tap the active sort to flip" — re-tap flips, tapping an inactive one selects it |
| **S3-i** Sort tool indicates asc/desc | shelf/grid/list tools row 13 | `collection.tsx:61–70` (`SortIcon` direction emphasis), `:237` (tool wiring) | Render: Sort keycap = up/down arrows; a sort active emphasizes the chosen direction + shows StateMark pip | Icon-only direction cue (arrow emphasis) — the text-free form of the board's "↑" (see DIV-1) |
| **S3-k** Filter pip when active | tools row 14 | `collection.tsx:244` (`active` prop → `StateMark`), `ToolButton.tsx:36` | Render: after selecting PLAYING, the funnel keycap shows the **orange notched pip** (StateMark) | StateMark (scr.accent orange), NOT pink PipLight — F-05 satisfied; overrides board's "ALL" text (DIV-1) |
| **S3-n** tools icon-only, board icons | tools rows 12–15 | `collection.tsx:47–118` (`SearchIcon`/`SortIcon`/`FilterIcon`/`ViewIcon`), `:225–255` (wiring); `ToolButton.tsx:1–48` (icon-only re-shape) | Render: 4 keycaps show only the board SVG glyphs, no text labels; view keycap wears the current mode's glyph (shelf→grid→list→top) + pip when ≠ shelf | SVGs lifted verbatim from `collection-states.html:813–816`; navy stroke/fill set per-element (RN has no descendant CSS) |
| **S3-o** ADD larger | tools row 16 | `collection.tsx:257` (`style={styles.addBtn}`), `:578` (`addBtn`), `:112–118` (`PlusIcon` @15px) | Render: gold ADD is visibly the largest control in the bar (taller + wider than the 32×30 keycaps) | Token-driven padding (`space.lg`/`space.xxl`); "+" is now the board SVG icon, not a literal "+ " prefix |
| **S3-p** ADD F-02 TL+BR step | tools row 16 + empty row 4 | `ScreenButton.tsx:31–41` (`steppedAddPath` + `ADD_STEP_UNIT`), `:61–91` (`add` variant draws the SVG polygon), `collection.tsx:257`/`:386` | Render: the gold ADD shows the notched TL + BR corners (square TR/BL) — the GameCard signature | RN has no clip-path → the gold face is an SVG `Path` polygon (mockup `.btn.add` clip, `:172`); intrinsic to the `add` variant per decision 0041 §2 (see ripple note below) |
| **S3-j** count copy (§0.3) | head count (all states) | `collection.tsx:191–201` (`filterActive`/`total`/`games()`/`countLabel`), `:205` (ScreenHead) | Render: unfiltered **"13 GAMES"**; PLAYING-filtered **"3 OF 13 GAMES"**; singular via `games()`; absent when total 0 | Refines board "N OF M" per §0.3 LOCKED; count hidden on the empty shelf (board `:491`) |
| **S3-m** Log-Hours pre-fill (§0.4) | log-hours row 2 | `collection.tsx:499–506` (`useEffect` seeds `value = String(item.hours)` on open) | Render: opened Elden Ring LOG HOURS → field `value="11"` (the current hours, not a placeholder) | Save-as-is keeps it; the existing empty-guard makes **clearing** the error path (§0.4). Not saved during the walk (no DB mutation) |

## Declared gaps (below the bar or not fully done — declared, never silent)

- **GAP-1 (DIV-2):** In TOP view the board swaps the gold ADD for an orange **ARRANGE** button (`collection-states.html:1069`). ARRANGE is `EXPECTED(M4·COL-13)`, so the build keeps the gold ADD in all four modes for now. Intentional; manifest DIV-2.
- **GAP-2 (empty state):** The built `EmptyShelf` is simpler than the board — no ghost-card silhouette, no **POPULAR FIRST ADDS** rail, different eyebrow/title copy (board `:493–509`). None of these are R1-1 items; the ADD *step* (S3-p) is the only R1-1 fix that lands here. Pre-existing; left as-is.
- **GAP-3 (now-playing-unset nudge):** The board draws a "SET YOUR NOW PLAYING" nudge (§3.1); the per-game set-now-playing picker is deferred to the M4 Game page (§0.5/S3-a) and hidden on Profile (§0.8/S5-b). Verify at parvati that the Collection nudge, when it renders, is display-only (not an inert dead-end tap). Not an R1-1 item.
- **GAP-4 (lifecycle family):** Loading renders a centered `ActivityIndicator` (not the board's shelf-silhouette `Skeleton`, `:1847`); load-error renders text-only "SIGNAL LOST" (not the board's dashed error-card + GO BACK, `:1901–1906`). The §5.6 lifecycle family is a shared-component pass, not an R1-1 item. Pre-existing; left as-is.
- **Positive ripple, declared:** the F-02 step is intrinsic to the `ScreenButton/add` variant (decision 0041 §2 — "make the step intrinsic to `.btn.add`, retire the per-callsite gate"), so add-game's two `variant="add"` buttons (`add-game.tsx:188`, `:396`) also gain the step + accept the optional `icon`. This is the correct single-source implementation, not a drive-by — but it does change two buttons on the R1-2 surface. Flagged so the verifier isn't surprised; those buttons pass no `icon`, so their labels are unchanged.

## Filed OQs

- **OQ-127** [presentation] — the GameCard F-02 TL+BR pixel-step isn't rendered in the RN app (GameCard draws a square face; StateMark's notch is a no-op `borderTopLeftRadius:0`). R1-1 gave the ADD button a real SVG step; the same is owed to GameCard + placeholders + StateMark (decision 0041 says intrinsic). Likely one shared stepped-path helper. Out of R1-1 scope; flagged for an M4-entry DS-fidelity pass.
- **OQ-128** [behavior] — the Collection sort drawer is missing the board's **RECENT** sort (`collection-states.html:592–596`); the build's `SORTS` has MY ORDER · HOURS · OWNED SINCE · A–Z only. Confirm whether RECENT is wanted and which field (`addedAt`?) it sorts. Out of R1-1 scope.

## Check outputs (verbatim tails)

**`npm -w @ingame/mobile run typecheck`:**
```
> @ingame/mobile@0.0.0 typecheck
> tsc --noEmit
```
(exit 0 — no diagnostics.)

**`npm run lint`** (eslint + custom rule harness):
```
  ✓ rule-01-layering — Layering — no raw DB access outside the repository layer
  ✓ rule-02-scoping — SYS-01 scoping — user-owned access must use the scoped helper (fail-closed allowlist)
  ✓ rule-03-zod — zod validation — raw req.body must be validated via a @ingame/shared schema
  ✓ rule-04-authz — authz inventory-diff — every mutating/cross-principal route has a 4xx actor-B authz test
  ✓ rule-05-events — events — every @mutation emits a domain event (seam; teeth deferred to M7)
  ✓ rule-06-spec-ids — spec-ID tags — risk-domain tests carry a registered stable spec ID
  ✓ rule-08-deps — dependency surfacer — every runtime/dev dependency carries a written justification
  ✓ rule-f03-destructive-guard — F03 — destructive DB runners must call assertDisposableDb (fail-closed)

custom lint: 0 error(s), 0 warning(s) (rule-5 teeth deferred to M7 — checklist only).
```
(eslint produced no output = clean; no new runtime dependency — `react-native-svg@15.12.1` was already a mobile dep, used by `NavKeycap`.)

**`npm -w @ingame/mobile run test -- --watchAll=false`:**
```
PASS src/store/prefsSlice.test.ts (5.164 s)
PASS src/components/GameCard.test.tsx (6.4 s)
PASS src/components/SectionSwitch.test.tsx (6.995 s)

Test Suites: 3 passed, 3 total
Tests:       6 passed, 6 total
Snapshots:   0 total
Time:        11.54 s
```

**Web-loop render walk (Expo web @ 390×844, isolated :4001 API against `local_ingame`, reads-only, demo shelf):**
verified live and screenshotted — tools icon-only + board glyphs (S3-n); Filter orange pip on active (S3-k);
Sort direction fold + re-tap flip MY ORDER ↓→↑ (S3-h/i); drawer VIEW "TOP 10" (S3-d); STATUS/GENRE "ALL" (S3-f/g);
count "13 GAMES" → "3 OF 13 GAMES" (S3-j); ADD larger + TL/BR step (S3-o/p); LOG HOURS field pre-filled value="11" (S3-m);
view keycap cycles shelf/grid/list/top glyph + pip; TOP #1 marker orange not gold (C6/F-02). Console: **0 errors**;
warnings are pre-existing RN-web platform deprecations (pointerEvents/shadow/useNativeDriver), none from the new SVG code.
**Cleanup done** (CLAUDE.md): `.env.local` deleted, :4001 node killed by PID, Metro stopped; owner's :4000/:8081/:5432 untouched.

## STOP — handing back

All R1-1 Task-2 items done + self-verified; manifest + receipt filed; changes uncommitted in the working tree.
Per the brief: **STOP.** The verifier runs murr (diff) · parvati (fresh agent, vs this manifest) · a manifest spot-audit; findings come back as a fix list. No §0 locked decision was "fixed"; no auth/economy/destructive-data surface was touched.
