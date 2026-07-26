# M6 walk-4 wave — orchestrator receipt & reviewer handoff

> **A living doc** — written 2026-07-26 while Batch 1 verify was in flight; updated at each landing
> (see §5 for what was true when). Audience: the owner + the **fresh Fable completeness reviewer**
> (its brief is §7). The work spec is [`walk4-acceptance-notes.md`](walk4-acceptance-notes.md); gate
> records live in [`review-coverage.md`](review-coverage.md); this doc is the session narrative that
> ties them together. Orchestrator model: fable-5. Owner directive 2026-07-26: **the remaining wave
> builds out autonomously while the owner is away** (limited phone access — owner-eye checks are
> deferred to their return).

## 1 · What this session did (one paragraph)

Executed the walk-4 feedback wave from the 7-packet ledger: P7 (admin-console proposal) and P2
(add-game exit-topology proposal) were design-thought and delivered to the owner — **P2 was NODDED
with all four open choices resolved** (§4), P7 sits. P6 (the progressive-degradation investigation)
delivered a 7-cause ranked findings doc — verdict **mostly dev-runtime** (the RTK dev middleware tax) —
and the owner approved the **R1+R2+R4+R7 fix cut** (§4). P1 (three owner-reproduced bugs) was built by
an opus lane, adversarially audited by Murr (fable), its one MAJOR + a same-class pre-existing hole
fixed, and is landing as Batch 1. Two environment events cost real time and are recorded honestly:
a silently-dying Murr agent (§6) and machine-wide CPU starvation from the owner's work VM (§6).

## 2 · Landed commits this session (all pushed to origin/m6)

| Commit | What |
|---|---|
| `ddb876f` | **P7 admin-console proposal** (`p7-admin-console-proposal.md`) — one console/two phases; pre-beta v1 = auth spine · Spotlight curation · read-only stats · reports/feedback viewer · Sentry link. OWNER SITTING — no build this wave. |
| `5780ac7` | **P2 add-game exit-topology proposal** (`p2-addgame-proposal.md`) — three-questions-once invariant. Subsequently **NODDED** (§4) → build queued (§8). |
| `98ff000` | **P6 perf investigation** (`perf-investigation.md`) + lint chore (unused `POLY` in walk-seed-rich.ts — pre-existing error from `a084016`, was blocking clean lint). |

## 3 · Batch 1 — the P1 bug fixes (uncommitted at time of writing; landing next)

**Files:** `apps/api/src/render/flatten.ts` · `apps/api/src/render/buildCard.ts` ·
`apps/mobile/src/render/buildCard.ts` · `apps/mobile/app/user/[id]/achievements.tsx` ·
`apps/mobile/app/achievements.tsx` · new `apps/api/src/render/{font-registry,marquee-track}.test.ts` ·
extended `apps/api/src/render/brass-ramp.test.ts` ·
`apps/mobile/src/{friend-achievements-route,achievements-route}.test.tsx`.
(`apps/mobile/app/sign-in.tsx` is ALSO modified in the tree — the owner's deliberate uncommitted
`__DEV__` demo-prefill. **Never commit it**; it reverts only when the owner ends the walking phase.)

- **P1-a (ultimate font wrong on server flatten).** Root cause was broader than the walk found:
  `getSkiaCtx()` never populated `builderCtx.typefaces`, so **all 7 non-default fonts** fell back to
  chakra-petch on every server render. Fix: exported `FONT_FILES` + `buildTypefaceRegistry()`
  mirroring the mobile registry one-for-one (weights + the `pacifico-ultimate` alias), built once in
  the memoized skia ctx. **Reflatten was RUN against the dev DB** (45/45 cards; 4 had wrong-font
  renders incl. the owner's exact Hollow Knight/pacifico-ultimate repro). `db:backup` taken FIRST:
  `local_ingame_2026-07-26T16-22-20.sql` in `~/ingame-db-backups/`. Nothing deleted.
- **P1-b (marquee ignores picker colour).** The marquee branch hardcoded `#6b5c28` in BOTH buildCard
  copies. Fix: `marqueeTrackColor(frame.color)` — registry gold `#e8c14a` maps to the legacy track
  **pinned exactly** (pixel-identity by construction; the legacy ratios are non-uniform), other
  colours derive a per-channel-dimmed track. **The clean fix was achieved — the owner's fix-vs-swap
  decision was never needed.** The live `MarqueeChase` light stays warm-gold/white by design (Murr
  minor — owner-eye deferred, §8).
- **P1-c (+bis).** Friend achievements route now threads `avatarConfig` + `memberSince` into
  `IdentityBlock` (conformed to the Contributions sibling). Murr found the **same defect on the SELF
  achievements page** (`app/achievements.tsx`) — conformed too (P1-c-bis).
- **Murr (fable, fresh-context) verdict: NEEDS-FIXES → fix round CLOSED.** The MAJOR:
  `marqueeTrackColor(undefined)` TypeError → publish/share **500** on a hand-crafted composition
  omitting `frame.color` (the schema is `.passthrough()`; the entitlement backstop deliberately skips
  colour-customizable designs). Fixed with a non-string guard in BOTH copies. Extending the same
  attack one function down found the **identical pre-existing W-5 hole in `brassPlateRamp`**
  (`nameplate.plate` omissible the same way) — guarded identically. Murr's full verdict + clean-probe
  list is recorded in review-coverage.md at landing.
- **Fix-round provenance (honesty note):** the four guard edits + P1-c-bis were implemented by the
  ORCHESTRATOR (verbatim per Murr's prescription + the same-class extension), not a separate builder —
  recorded here so the reviewer re-checks them specifically (§7). All other P1 code is the opus
  builder's, audited by Murr.

## 4 · Owner rulings recorded this session (decisions, not proposals)

1. **P2 proposal NODDED — build it**, with all four recommendations: OC-1 `resetKey` tail-keep ·
   OC-2 hard name-lock + tap-routes-back-to-search · OC-3 scroll-to + highlight pulse landing ·
   OC-4 the DESIGN path ends in the Collection.
2. **P6 fix cut: R1+R2+R4+R7** (dev-check scoping · optimistic patches + narrowed invalidation ·
   focus-gated motion loops · expo-image thumbs). **R3 (virtualization) + R5 (freezeOnBlur) DEFERRED**
   to the pre-beta perf wave, to be validated by a release-build soak.
3. **Font deps: declare** the `@expo-google-fonts/*` packages in `apps/api/package.json` (rule-08)
   as a post-Batch-1 chore.
4. **VM suspended** (the CPU-starvation fix, §6). 5. **Parvati** → rides the Fable reviewer (§7).

## 5 · Gate & test evidence (state at time of writing — the landing commit updates review-coverage with finals)

- **typecheck PASS · lint 0 errors** (full run at the pre-fix-round tree; the POLY chore cleared the
  only error) · **unit 314/314** (36 files, incl. the 11 new P1 tests).
- Post-fix-round: **api render units 7 files / 42 tests green** (marquee-track 6 · brass-ramp 6 ·
  font-registry 6 — the guard tests + the render-path attack test pass).
- **Mobile:** builder's counted run 830/831 (the 1 = the known P5-j contention flake, 11/11 in
  isolation); a later full run exited 0 (uncounted — a stderr-redirect mistake). **A final counted
  run is owed at landing** (it also covers the fix-round's 4 new jest tests).
- **Integration: GREEN — 539/539 tests, 27/27 files** (serial `--no-file-parallelism` run, 1315s,
  witnessed complete 2026-07-26 after the VM suspension). The two earlier parallel-mode attempts that
  failed 26/27 files were **hook-timeout storms from machine CPU starvation, not code** (§6) — the
  count matches the last recorded suite size exactly. The gate is satisfied on the CURRENT tree; if
  the reviewer's STEP-2 findings change any code, integration re-runs (parallel mode is fine now).
- **Parvati: DARK all session** — claude-in-chrome tools never appeared (subagents saw the same;
  the forbidden preview pane was not used). Handling → the reviewer (§7).

## 6 · Environment events & operational actions (disk/DB state — don't re-learn these the hard way)

- **A Murr agent died silently** (task vanished, 0-byte transcript, no notification). Recovery:
  verified the tree untouched, re-dispatched fresh — the second run produced the §3 verdict. Lesson:
  never queue behind subagent silence; ground-truth processes/tasks and restart.
- **CPU starvation:** `vmware-vmx` (the owner's work CAD VM, up since 07-24) held ~3 cores; the box
  sat at 100% → 26 parallel Testcontainers starts blew the 120s hook timeout; also the likely cause
  of the day's elevated flakiness (socket resets seen by the P6 probe). Owner suspended the VM
  2026-07-26. **A qa-runbook entry is owed at Batch-1 landing** (signature: mass hook-timeouts +
  healthy docker + one surviving suite ⇒ check machine load FIRST).
- **Dev DB:** the P1-a reflatten rewrote 45 card PNGs at their existing storage keys (backup first,
  §3). No rows deleted; walkseed/demo/ADawg untouched. Dev stack green throughout (`up`/`doctor`).
- `.env.dev` still runs `APPLE_VERIFIER=apple` (mock SIWA tokens 401 — flip to `stub` only if a flow
  needs mock sign-ins).

## 7 · The Fable reviewer's brief (dispatched after Batch 1 lands)

**Job 1 — completeness review.** Verify this receipt's claims against git reality (the landed
commits + the ledgers). The targeted re-check list, hardest first:
(a) the **marquee pixel-identity claim** — inspect `marqueeTrackColor` + `forceRegistryColors`
interplay and the marquee-track tests; hunt any base-marquee path reaching a non-registry colour;
(b) the **four orchestrator-implemented guards** (§3 provenance note) — correctness + api↔mobile
copy-parity; (c) **reflatten sanity** — spot-check a re-flattened card (the dev DB) renders per its
composition; (d) **IdentityBlock call-site sweep** — grep for any OTHER screen dropping
`avatarConfig`/`memberSince` (P1-c was found twice; assume a third); (e) **records honesty** —
review-coverage.md and the walk4 ledger dispositions must match what actually ran (claims never
outrun records); (f) confirm the deferred list (§8) lost nothing.
**Job 2 — the Parvati pass.** First `ToolSearch` for claude-in-chrome tools. If present: recipe =
`node scripts/dev-stack.mjs up` → `doctor` → `http://localhost:8082` → login `demo@ingame.app` /
`InGameDemo1!` → **3–4s settle per screen** → sweep: a friend's Achievements page (walkseed_avatar —
the forged monogram + MEMBER SINCE), the self Achievements page, a marquee-ultimate card render
(walkseed teal Stardew), and the re-flattened Hollow Knight shared image. **NEVER the Claude_Browser
preview pane; NEVER :8081.** If the tools are absent: record **PARVATI DARK — owed at owner's
return** in review-coverage (the precedent exists) and say so loudly in your report.

## 8 · The remaining wave queue (builds out autonomously; the owner is away)

| Order | Lane | Notes |
|---|---|---|
| next | **Batch 1 landing** | serial-integration green + counted mobile + final typecheck/lint → explicit-pathspec commit + push → review-coverage + ledger dispositions + the qa-runbook entry → reviewer dispatch |
| then | **Batch 2:** P3 (opus) ∥ P4 (opus) ∥ P5 (sonnet) | the ledger's §P3/§P4/§P5 items. P5 touches sign-in.tsx (#27 copy) — **preserve, never commit, the owner's prefill**; #26/#27 stay AUTH-11 enumeration-neutral; P5-j = the jest timeout bump. Combined Murr + verify at landing. |
| then | **Batch 3:** P2 build (opus) ∥ P6 fixes (opus/fable) | P2 per the nodded proposal §4 incl. ALL doc ripples (product-spec CAT-02/CAT-03/0.66-row · api-contract genre note · design-spec/SCREEN-STATUS P2-d · `/health` after). **⚠ P2 overlaps P4 on `AdoptCardSheet.tsx` + `cards.tsx` — P2 dispatches only after P4 lands.** P6 = R1+R2+R4+R7 only, with before/after receipts where measurable. |
| chore | api font-deps declaration (§4.3) | small lockfile commit |
| END | update THIS doc + the ledger dispositions; final wave receipt to the owner | |

**Deferred, recorded-not-claimed:** R3+R5 (pre-beta perf wave + release-build soak) · the MarqueeChase
bloom colour (Murr minor — owner-eye) · the black-track WYSIWYG note (owner-eye) · P7 (owner sitting) ·
Parvati if dark (owner return) · the sign-in prefill revert (owner's word ends the walking phase) ·
buildCard api↔mobile dedup + the font-roster triple-site mirror (the `@ingame/card-render` lift,
already-flagged debt) · sticker-packs ghost aisle (cosmetic design round).

## 9 · Standing-rules digest for successor agents

Push = personal account over HTTPS:
`GIT_TERMINAL_PROMPT=0 git push https://Aiden-Molyneaux:$(gh auth token -u Aiden-Molyneaux)@github.com/Aiden-Molyneaux/InGame.git m6:m6`
(bash). Explicit-pathspec commits; `Co-Authored-By: Claude` trailer. Builder ≠ verifier — Murr
(`C:\personal\shipwright\skills\murr`, fable) per code batch; never report green you didn't see;
record gates AT landing. Metro **:8081 is the owner's phone — never touch**; agents use :8082; never
create `apps/mobile/.env.local`. `db:backup` before ANY dev-DB touch; **never delete data**;
walkseed_* stays. Subagents: no sub-delegation, no fire-and-forget test runs (they die silently —
ground-truth + re-dispatch). Models: opus = user-facing builds; fable = hardest work + Murr; sonnet =
mechanical; never haiku.
