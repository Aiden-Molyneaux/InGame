# R1-1 · Collection — FIRST-ARTICLE PACKET (owner hard-stop review)

> **From the verification lane (Fable, 2026-07-03).** The Opus builder executed the R1-1 hand-off
> (manifest + S3 fixes, uncommitted on `m3`); this lane audited the manifest, checked §0, ran murr
> (diff) and parvati (fresh agent vs the manifest, own screenshots), fixed the mechanical findings,
> and routed the structural ones. You are judging **two things**: the screen, and whether the new
> pipeline catches what M3 missed. **R1-2 does not start until you rule on this packet.**

## The verdict line

| Gate | Result |
|------|--------|
| Manifest spot-audit | **PASS with corrections** — all 11 fix rows + EXPECTED/LOCKED markings accurate; **1 contract error** (shelf state followed the board artboard that LOCKED decision 0057 reversed) and **~6 false-PRE / missing-element issues** found and corrected in place (see the manifest's "Spot-audit corrections" block) |
| §0 no-regression | **PASS** — all 11 locks honored; the ScreenButton→add-game ripple is the declared, 0041-§2-correct one |
| murr (diff) | initial **NEEDS FIXES** (0 blocker · 1 major · 4 minor) → all 5 fixed by the lane → delta re-verify **SOUND**; his 2 follow-on minors fixed per his prescribed remedies (typecheck+tests green; not re-audited — trivial one-liners) |
| parvati (vs manifest) | **11 🚩 · 12 ✅ · 2 🎨** → 5 flags fixed by the lane and re-verified FIXED live; **6 flags open, all structural, all routed** to [`r1-1-fixlist.md`](r1-1-fixlist.md) — the honest state |
| Checks | typecheck ✓ · custom lint ✓ · 3 suites / 6 tests ✓ (repo `eslint .` currently fails on the **parallel session's** in-progress `scripts/dev-stack.mjs` — not R1-1 code, see §Environment) |
| All 11 R1-1 items (S3-d/f/g/h/i/j/k/m/n/o/p) | **verified working live** by parvati, both runs |

**Declared-vs-found delta (the process-health signal):** the builder declared 4 gaps + 1 ripple —
all honest, nothing declared was wrong. **Undeclared and found by this lane:** 1 regression inside
the builder's own diff (the Sort keycap's active predicate dropped `|| sortAsc` — one tap reordered
the shelf with zero indication; murr's major); 5 copy/content divergences parvati caught (stat-line
grammar, hero genre segment, LOG HOURS "+" icon, TOP count, STATUS chip order); and the manifest's
false-PRE cluster — 6 pre-existing structural divergences (grid size/hero, list grammar/chevron/NOW
placement, search dock) stamped "PRE = correct" without being checked against the build, plus the
0057 contradiction.

## What the lane changed (on top of the builder's diff)

- `collection.tsx` — sort-fold indication (`|| sortAsc` restored + fed to SortIcon) · search-pip on
  `q.trim()` · log-hours sheet re-keyed to `entryId` with a live-derived item + value-driven re-seed
  + vanish guard (kills the stale-pre-fill save-back race) · "N HRS" stat grammar (hero/list/TOP) ·
  hero catalog line gains the genre segment (board `:749`) · LOG HOURS "+" icon (accent-ink 11px) ·
  TOP count reads "TOP 10" (board `:1044`) · STATUS chips PLAYING-first (board `:601–608`).
- `ScreenButton.tsx` — square gold fallback fill for the stepped `add` face until onLayout lands
  (no more first-frame-invisible ADD).
- `ToolButton.tsx` — `hitSlop` 8/8/6/6 (32×30 cap → 44×46 effective; the bar's 12px gap absorbs it).
- Docs — manifest corrections (0057 re-base + VERIFY markers + missing board elements) ·
  [`r1-1-fixlist.md`](r1-1-fixlist.md) (3 structural items + 2 rider notes) · OQ-129 (sort direction
  carry-over) · OQ-130 (filtered-to-zero beat) · parvati's two report sections in
  `m3-review-notes.md`.

## What to look at ON THE DEVICE (Expo Go — the S3 items as do X → expect Y)

1. **Tools bar (S3-n/o/p):** look at the bar → four cream keycaps, icon-only (board glyphs), no
   text labels; the gold ADD is clearly the largest object and wears the TL+BR pixel-stepped
   corners (TR/BL square).
2. **Sort fold (S3-h/i):** tap the Sort keycap once → the shelf reverses AND the keycap lights the
   orange pip with the ↑ arrow emphasized; open the drawer → the active chip reads "MY ORDER ↑";
   re-tap the keycap → pip off, order restored. In the drawer, tap "HOURS" → selected with ↓;
   re-tap it → flips to ↑. There is **no standalone ASC/DESC chip**.
3. **Filter (S3-k/f/g):** drawer → STATUS leads with **ALL** (selected); tap PLAYING → ALL
   deselects, the funnel keycap wears the **orange notched pip** (not pink), count reads
   "N OF 13 GAMES" (S3-j); tap ALL → clears, pip off, count restores. Same grammar in GENRE.
4. **View chip copy (S3-d):** drawer VIEW row reads SHELF · GRID · LIST · **TOP 10**.
5. **Count copy (S3-j / §0.3):** unfiltered "13 GAMES"; filter to one result → "1 OF 13 GAMES";
   TOP view → "TOP 10".
6. **Log hours (S3-m / §0.4):** hero LOG HOURS (now with a "+" icon) → the field arrives
   **pre-filled with the current hours**; Save-as-is keeps it; **clear the field** → Save errors.
7. **R0 native probes (build-task §4 — they ride this same sitting):** drawer + log-hours sheets
   open from the **in-app screen bottom** (never the iPhone edge) · with the log-hours sheet lifted
   by the keyboard, tap its UPPER half — the sheet must NOT close · focus the add-game search and
   switch to the emoji keyboard — the dock tracks the new height · open in-place search (keyboard
   up) then tap Filter — watch for a transient bounce · Android: keyboard open/close — the shell
   compresses gracefully · nav keycaps: hard 4px drop edge idle, sunk 1px active.
8. **Rule on:** the 3 structural fixlist items (grid mode, list grammar, search dock — and whether
   post-0057 grid should stay distinct from shelf) · the TOP-count owner-call · OQ-127..130.

## Process verdict — did the pipeline catch what it should have BEFORE this lane?

**Partly. The fix lane worked; the PRE lane leaked.**

- **What worked:** manifest-first held for the 11 fix items — every one was built to its manifest
  line, cited, and passed both verifiers live. The builder's declared-gaps section was honest and
  complete *about what he knew he didn't do*. §0 discipline held (nothing locked was "fixed").
  builder≠verifier caught real things cold: a regression the builder's self-verify missed (the sort
  predicate — his own receipt claims S3-i verified, but the walk only exercised drawer-driven
  sorts, never the keycap-tap-from-default path), and five board-copy divergences his render walk
  read past.
- **What leaked to this lane:** (1) **PRE rows were extraction, not verification** — the builder
  walked the board but never checked "pre-existing, correct" claims against the running build; six
  structural divergences and a LOCKED-decision contradiction sailed through stamped PRE. That is
  the exact M3 failure mode (mockup-as-vibes) resurfacing one layer up. (2) The builder's
  self-verify walk covered the fix items but not their **interaction seams** (keycap-tap × default
  sort; whitespace query × pip).
- **Recalibration for R1-2..R1-5 (concrete):** the manifest template gains a rule — **a PRE status
  requires evidence** (a code cite or screenshot check against the build, not just a board cite);
  anything unchecked is marked `UNVERIFIED`, which parvati treats as a checklist row, not a pass.
  And the builder's self-check must include one adversarial pass over *changed state predicates*
  (murr's whole major was one boolean). With those two patches the pipeline as run — spot-audit →
  murr → parvati → route — caught everything else and is fit for R1-2.

## Environment flags (owner action may be needed)

- A **parallel session** (Owner+scribe, per the new uncommitted `docs/decisions/0060-standing-dev-stack.md`)
  is landing a standing dev stack: CLAUDE.md, launch.json, .gitignore, package.json ×2,
  `scripts/dev-stack.mjs`, `apps/api/.env.example` are modified/untracked and **left uncommitted and
  untouched by this lane** (parallel-session rule). Repo-level `eslint .` currently fails with 17
  `no-undef` errors in their `scripts/dev-stack.mjs` (the eslint config needs a node-env block for
  `scripts/`) — theirs to fix.
- **Possible standing-Metro casualty:** at her re-check setup (before this lane's caution reached
  her), parvati killed a pre-existing `expo start --web --port 8082` (pid 45616) she took for an
  orphan of her earlier run. If that was the standing stack's Metro, re-run its `up`.
- The owner's **:8081 Metro was found dead** earlier today (repeated "Premature close" crashes —
  not killed by any agent), and one "iOS Bundled" request hit parvati's first-run :8082 Metro while
  her `.env.local` existed — if the phone was that client, its Expo Go may hold a bundle pointing
  at localhost and needs re-pointing at a relaunched Metro.
- Both parvati runs finished with verified cleanup: no `.env.local`, her :4001/:8082 processes
  killed by PID (creation-times checked), owner's :4000/:5432 untouched.

## Paper trail

- Builder: [`collection-manifest.md`](collection-manifest.md) (with this lane's corrections) ·
  [`r1-1-receipt.md`](r1-1-receipt.md)
- Verifiers: parvati full + delta sections in
  [`m3-review-notes.md`](../m3-review-notes.md) · murr verdicts (initial + delta) live in the
  session transcript; findings and closures are itemized above
- Routing: [`r1-1-fixlist.md`](r1-1-fixlist.md) · OQ-127..130 in
  [`open-questions.md`](../../open-questions.md)
