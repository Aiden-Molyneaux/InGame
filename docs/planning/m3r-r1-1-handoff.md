# M3-R · R1-1 hand-off — Collection manifest + fidelity fixes (BUILD LANE)

> **Paste-once brief for the build agent (Opus, Claude Code, this repo).** You are the BUILDER in
> a builder≠verifier pipeline: you extract the manifest, apply the fixes, and self-check — then
> you STOP. The verification lane (murr code audit · parvati parity gate · manifest spot-audit ·
> the first-article packet for the owner) is run afterward by a separate verifier session — **do
> not run murr or parvati yourself, do not declare the surface "done," do not start any other
> surface.** Your deliverables are structured so the verifier can check them mechanically; follow
> the formats exactly.

**Context:** M1–M3 shipped at ~6/10 mockup fidelity because mockups were read as vibes and the
builder self-certified. R0 (frame/keyboard/keycap mechanics) is complete and murr-verified SOUND.
You are R1-1 — the first surface through the new loop, and the shakedown of the whole pipeline.

## Read first, in this order
1. [`m3r-build-task.md`](m3r-build-task.md) — **§0 (locked owner decisions — the do-NOT-fix list)**,
   §1 (the pipeline + manifest template), §3 R1-1 (your item list). §0 is law: "fixing" a locked
   item is the worst failure available to you.
2. The canonical board: `docs/design/mockups/collection/collection-states.html` — your source of
   truth for every visual fact. Open it in a browser AND read its source (the manifest cites line
   numbers).
3. [`m3-walkthrough-iteration-notes.md`](m3-walkthrough-iteration-notes.md) — Step 3 (the S3-*
   notes you implement) + the locked-decisions header.
4. `docs/design/component-map.md` — compose from these names only; a bespoke near-dupe of a
   catalog component is a rejection.
5. `CONVENTIONS.md` (the per-task DoD) + `CLAUDE.md` §"browser-verification loop" (the web-loop
   setup trap + mandatory cleanup — follow it exactly, especially the never-restart-:4000 rule).
6. The current code: `apps/mobile/app/(tabs)/collection.tsx` + `src/components/{ToolButton,
   ScreenButton,ScreenHead,PulledSheet,KeyboardLift}.tsx`. R0 already rewrote PulledSheet/
   KeyboardLift — build on them, do not rework them.

## Task 1 — the screen manifest (before touching any code)
Produce `docs/planning/m3r/collection-manifest.md` per the §1 template. Non-negotiables:
- **Every row cites its evidence**: `collection-states.html:<line>` (the CSS rule or markup that
  establishes the element/size/dock). A row without a citation is unverifiable and will be
  bounced.
- **Every drawn state gets a section** (shelf · grid · list · TOP · empty · loading · error ·
  offline · drawer-open · log-hours-open · peek-flip if drawn), even states you won't touch —
  mark them `EXPECTED(<milestone> · <cite>)` per §1 so parvati doesn't flag them (e.g. COL-12
  peek-flip → M4/D1; TOP curation write-path → M6).
- **Fold in the owner notes**: the §1 template's "Owner-notes fold-in" table maps every S3 item
  to the manifest line(s) it lands on. S3-c/S3-a/§0 items that are accepted-as-is get a row
  marked `LOCKED(§0.n)` so nobody "fixes" them later.
- Where the board and a locked decision conflict (e.g. the drawer's accepted orange buttons vs
  the board's drawn drawer), **the locked decision wins and the manifest says so on that row**.

## Task 2 — the fixes (the R1-1 item list, m3r-build-task §3)
S3-d (view chip → "TOP 10") · S3-f/g ("All" options in Status + Genre — note: "All" = clears that
filter set, selected when the set is empty) · S3-h (remove the standalone ASC/DESC chip; fold
direction into the Sort tool) · S3-i (Sort tool indicates asc/desc when a sort is active) ·
S3-k (Filter tool shows an orange pip when any filter is active — the pip is the on-screen
`StateMark` grammar, NOT a pink `PipLight`, F-05) · S3-n (tools icon-only, using the BOARD's
icons — extract the SVGs from `collection-states.html`'s tools bar, not invented glyphs) ·
S3-o (gold ADD larger, per the board's proportions) · S3-p (ADD gets the F-02 TL+BR pixel-step —
`theme.step`, decision 0041; check the theme module for an existing step/clip helper before
rolling one) · S3-j (count chip: `"N game(s)"` unfiltered · `"N of M games"` filtered,
singular-aware — the current `ScreenHead count` prop callsite) · S3-m (Log-Hours pre-fills the
current value as the VALUE, not the placeholder; Save-as-is keeps it; clearing errors).

Rules while fixing: fix to the manifest line, not the vibe · compose from the component-map ·
tokens only, no literals (F-06 type ladder 21/15/11/9 · radius never on-screen F-07 · gold =
acquisitive only F-02) · behavior questions → `docs/open-questions.md`, never invented · touch
ONLY what R1-1 names (no drive-by improvements — file them instead).

## Task 3 — self-check (builder-grade, not the gate)
1. `npm -w @ingame/mobile run typecheck` · `npm run lint` · `npm -w @ingame/mobile run test --
   --watchAll=false` — all green, output pasted into the receipt.
2. Web loop per CLAUDE.md (parallel :4001 API + `.env.local` if the owner's :4000 is up): render
   the Collection at ~390×844, walk YOUR OWN manifest row by row against the render, fix what
   you catch. Exercise: each view mode, the drawer (both "All" options, direction fold), the
   count chip filtered + unfiltered + singular, log-hours pre-fill, the ADD button geometry.
   **No browser tooling in your harness? You may NOT skip this step** — shell-drive headless
   Edge instead: `msedge --headless=new --window-size=390,844 --virtual-time-budget=15000
   --screenshot=<scratch>/collection-<state>.png http://localhost:8082` per state (drive
   login/state via a small CDP script if needed; screenshots go to a scratch dir, NEVER the
   repo, deleted after). Building without seeing your own render is the root cause this whole
   remediation exists to fix.
3. **Mandatory cleanup after** (CLAUDE.md): delete `.env.local`, kill the :4001 orphan by
   netstat PID, stop your Metro. Leave the owner's :4000/8081 untouched.

## Deliverables (fixed paths — the verifier consumes these)
1. `docs/planning/m3r/collection-manifest.md` — Task 1.
2. The code changes, **uncommitted** in the working tree (do not commit, do not branch).
3. `docs/planning/m3r/r1-1-receipt.md` — the fix ledger, EXACTLY this shape:
   ```
   | Note | Manifest line(s) | Files:lines changed | Self-verified how | Deviations/notes |
   ```
   one row per S3 item — plus three sections: **Declared gaps** (anything below the bar or not
   fully done — declared, never silent), **Filed OQs** (with numbers), **Check outputs**
   (typecheck/lint/test tails, verbatim).

## STOP conditions
- All Task-2 items done + receipt written → **STOP. Hand back.** The verifier runs murr, parvati
  (against your manifest), and a manifest spot-audit; findings come back to you as a fix list.
- A §0 locked decision seems wrong or two authorities conflict irreconcilably → **STOP and ask**
  (or file the OQ and skip that item with a Declared-gap row) — never resolve an owner-level
  conflict yourself.
- Anything auth/economy/destructive-data adjacent (shouldn't occur in R1-1) → STOP-and-file
  (CONVENTIONS rule 6).
