# M3-R · R1-2 hand-off — Add-game BUILD LANE (Opus session)

> **Paste-once brief for the BUILDER (Opus, Claude Code, this repo).** R1-2 · Add-game is the second
> surface of the M3-R remediation loop (`m3r-build-task.md` §3), running the pipeline R1-1 just
> shook down: **manifest → build → self-check → STOP** — then the owner switches the session to
> Fable, which runs murr + parvati cold. **You build; you do not verify yourself past the self-check;
> you do not start R1-3.** R1-1's lesson (binding recalibration, `m3r-build-task.md` §1): PRE claims
> need evidence, and changed predicates get a written state-table walk in your receipt.

## Inputs (fixed paths — verify they exist before starting)
- **The contract:** [`add-game-manifest.md`](add-game-manifest.md) — staged 2026-07-04. Its build-state
  rows are deliberately **`UNVERIFIED`** (light grep only). **Your Task 1** is upgrading every
  UNVERIFIED row to a code-cited `PRE` / `OWED` / `GAP` against the real `add-game.tsx` before you
  change anything — the manifest must be trustworthy before parvati enumerates from it.
- **The board:** `docs/design/mockups/add-game/add-game-states.html` (P1–P9, pass-4 restack:
  name-above-the-fan). The manifest cites lines; trust-but-verify them as you go.
- **The code:** `apps/mobile/app/add-game.tsx` (~451 lines). Committed history through HEAD is the
  R1-1-complete baseline; **everything you produce is the uncommitted R1-2 diff** (`git diff HEAD`).
- Authorities: `m3r-build-task.md` (§0 locks · §1 pipeline+recalibration · §3 R1-2 items) ·
  `docs/design/component-map.md` (**`CardFan` is a named, ACCURATE component — compose from it,
  don't invent a near-dupe**) · `CONVENTIONS.md` · CLAUDE.md.

## Task 2 — the R1-2 items (fix to the manifest line, not the vibe)

| Item | What | Board/authority |
|------|------|-----------------|
| **S4-a** | FlowHeader: **left-aligned title**; the ✕ → a labeled **"‹ RETURN TO COLLECTION"** text link | `.flow-head` + `.return-link` (`:755–756`, `:884–885`) |
| **S4-c (BIG)** | **The CardFan** — 3-up fan: center **fore** card + two **rotated neighbours**, **‹ ● ● ● ›** dots + **SWIPE** hint beneath. Replaces the current horizontal-ScrollView-of-cells (`add-game.tsx` SearchMode `:166–175`). Used by the P1 POPULAR rail AND the P2/P3 results | `.cfan`/`.fan-nav` (`:759–764`, `:890–896`) |
| **S4-f** | Fan-meta: **NAME first**, the meta block **above** the fan; line 2 = CAT-09 presence ("IN N COLLECTIONS · N FRIENDS HAVE IT" — fields permitting; check the catalog response schema) + CAT-05 credit if present | `.fan-meta` (`:888–889`) |
| **S4-g** | Interim tap = **FOCUS-ONLY (LOCKED §0.7)**: tapping a side card rotates it fore (auto-shows its meta); tapping the fore card does NOTHING until M4 swaps it to NAVIGATE (CARD-23). **Walk this predicate's state table in your receipt** | §0.7 |
| **S4-e** | The **count chip must not render** anywhere on this screen | board head (no `.count`) |
| **R0-follow** | **CREATE-mode keyboard:** the R0 pass removed a KAV that (non-functionally) wrapped `CreateForm`; nothing replaced it — on iOS a focused lower field (publisher/release-date) + the Create button sit under the keyboard. Give the form a real fix: `KeyboardLift` on the form tail, or `automaticallyAdjustKeyboardInsets` on its ScrollView. Native behavior — final proof is the R2 device pass; your self-check covers the web/no-crash path | murr R0 audit |
| Docked search | P1 draws the SearchField **docked at the screen bottom**, rising with the keyboard. **The reference implementation is the R1-1 collection search-morph** (`collection.tsx` `searchBar` + `KeyboardLift` + ⊗ `ClearIcon`) — same grammar, reuse the pattern | `:780–785` |

**Riders (small, in-scope while you're in the file):**
- The two `variant="add"` ScreenButtons picked up the intrinsic F-02 step in R1-1; if their labels
  still carry a literal `"+ "` prefix, swap to the `icon` prop (collection's `PlusIcon` grammar).
- **STATUSES duplication (murr debt, actualized):** `add-game.tsx` duplicates the status array
  backlog-first while collection is now board-ordered playing-first. Hoist ONE shared constant (e.g.
  into `@ingame/shared` or a client-side `src/constants`) or mirror the order — the two chip rows
  must stop disagreeing.

## Locks — do NOT "fix" (§0 + rulings)
- **§0.6 rails:** build **POPULAR only**. RECENTLY ADDED (CAT-11, M4) and FRIENDS ARE PLAYING
  (CAT-12, M6) are `EXPECTED` — listed in the manifest, not built (board draws all three; the
  manifest marks them).
- **§0.7** S4-g focus-only (above). P3b CardDetail/ReportSheet, P7/P7b community cards + CardPicker +
  CleanPeek → all `EXPECTED(M4)`.
- P9a/P9b lifecycle (Skeleton in fan shapes / SIGNAL LOST) — same shared-component family as
  collection GAP-4; declare, don't build, unless trivially cheap.
- Do not touch `collection.tsx`, the R1-1 components' internals (beyond consuming them), or ANY
  parallel-session file (`scripts/dev-stack.mjs`, CLAUDE.md, launch.json, package.json, .gitignore,
  `apps/api/.env.example`, decision 0060) — if they're still uncommitted, stage only your paths.

## Rules of the round (the recalibrated pipeline — binding)
1. **Manifest first** (Task 1 above): every `UNVERIFIED` row upgraded with a code cite before the
   first code change; new discoveries → new rows, divergences → declared `GAP`s, never silent.
2. **Compose from the component-map.** The CardFan is the one new build — check the map's §
   entry for its contract (fore/neighbour sizes, dots, SWIPE label) before writing it. A bespoke
   near-dupe of any catalog component is a review-reject.
3. **Adversarial predicate self-check:** every state predicate you add/change (fan focus index, the
   fore-tap no-op, dock/keyboard, dedup-banner visibility, create-submit guards) gets its full state
   table walked **in the receipt**.
4. **Self-check on the running app** before handing off. Web loop = the standing dev stack
   (decision 0060): `node scripts/dev-stack.mjs status` → `up`; **no `.env.local`, no :4001**; never
   touch the owner's **:8081** phone Metro or restart **:4000**; login `demo@ingame.app` /
   `InGameDemo1!`; reads-only where possible (adding a game mutates — if you must exercise the add
   path, use a throwaway catalog title and say so in the receipt).
5. **Checks green:** `npm -w @ingame/mobile run typecheck` · `npm run lint:custom` · `npm -w
   @ingame/mobile run test -- --watchAll=false`. (Repo-level `eslint .` may still fail on the
   parallel session's `scripts/dev-stack.mjs` — not yours; say so, don't fix it.)
6. **Capture, don't lose:** anything discovered out of scope → `docs/open-questions.md` (next free
   number — check the file; OQ-131 was the last as of this writing).

## Deliverables (all under `docs/planning/m3r/`)
1. The updated **`add-game-manifest.md`** — zero `UNVERIFIED` rows left.
2. **`r1-2-receipt.md`** — the fix ledger: one row per item (files:lines · how self-verified ·
   deviations), the **predicate state-table walks**, declared gaps (an undeclared miss found by the
   verifier is a process finding against this round), check outputs verbatim, and the web-loop
   cleanup statement.
3. Uncommitted working tree on `m3` (the Fable lane commits after verification).

## STOP
After the receipt is filed: **STOP.** No commit, no R1-3, no self-certification. The owner switches
the session to Fable; the verification lane (manifest spot-audit → murr on the diff → parvati vs the
manifest → findings routing) runs cold, exactly as R1-1 ran.
