# M3-R · next-session hand-off (shell polish → R1-3 → R1-4)

> **Paste-once brief for the next session** continuing the M3-R fidelity remediation on branch `m3`.
> The owner reordered the remaining work (2026-07-04): **shell polish runs NEXT**, then R1-3, R1-4.

Read these first, in order: [`../../CLAUDE.md`](../../../CLAUDE.md) ·
[`m3r-build-task.md`](../m3r-build-task.md) (whole brief — §0 locks · §1 pipeline + the 2026-07-04
recalibration rules · §3 per-surface items + the ⤴ order-change note) · [`r1-2-handoff.md`](r1-2-handoff.md)
(builder-brief template) · [`r1-2-receipt.md`](r1-2-receipt.md) (how the last surface ran).

## MODEL PLAN
Stay on your current **non-Opus** model for BOTH build and verify this milestone — **Opus is reserved
for M4 verification** (owner directive). Builder≠verifier independence comes from the fresh-context
**murr/parvati SUBAGENTS**, not the main model: after you build, run the verification lane yourself
(murr on the diff + parvati on the running app) before committing.

## WHERE WE ARE (all committed + pushed on `m3`)
- **R1-1 Collection** — built + verified (murr SOUND, parvati 0 open flags). Shipped decision 0061
  (SHELF = showcase / GRID = 2-up faces, reverses 0057) + the in-place search-morph.
- **R1-2 Add-game** — built + verified. New `CardFan` (3-up fan). Then an OWNER REVIEW ITERATION
  landed (commits `236fecc` code + `6511324` docs): enlarged fore, `addedAt` commissioned end-to-end
  (OQ-128 resolved · api-contract 0.50 · collection integration slice green), STATUSES hoisted to
  `apps/mobile/src/constants/collection.ts`, NavBand live on `/add-game`, header/divider/meta/link tweaks.
- Manifests + receipts under `docs/planning/m3r/`; parvati verdict tables in
  [`../m3-review-notes.md`](../m3-review-notes.md).

## DECIDE WITH THE OWNER UP FRONT
**The R1-2 owner-iteration** (the `addedAt` backend change + the nav-routing change) was built AND
verified in ONE session — the independent murr/parvati pass was NOT re-run on it. Ask the owner: run
that pass now (murr on `git diff 372059b..HEAD`, parvati on the running app), or accept it as-is
(it's green on typecheck + unit + the collection integration slice)?

## TASK A (NEXT) — Shell polish (build-task R1-5, pulled forward)
The **cross-cutting** frame pass — do it now so every device review from here looks right. Items (see
[`m3-walkthrough-iteration-notes.md`](../m3-walkthrough-iteration-notes.md) for the S1 detail):
- **S1-a** top bar (top-band) up ~¼cm · **S1-b** nav band down ~¼cm · **S1-d** DISCOVER/PROFILE labels
  a couple px higher · **S6-b** thinner black border between the frame and the screen.
- **Where:** the root-mounted `DeviceShell.tsx` · `NavBand.tsx` · `NavKeycap.tsx` (component-map §5.1)
  — these frame EVERY screen, so there's no per-surface manifest. Build the four tweaks against the
  boards' frame depiction, self-check on a running screen, and have parvati spot-check the frame on
  the already-built **Collection + Add-game + sign-in** (not a full element enumeration — a frame
  spot-check). murr on the diff for any regression to the R0 keycap-depth work. Final judgment is the
  owner's device look at R2. (Completing this early empties the R1-5 slot.)

## TASK B — R1-3 · Welcome/Auth + Register + Legal (build-task §3, the S2 items)
S2-g (Create account → text link) · S2-h ("Forgot?" affordance, AUTH-04) · S2-i (SIWA placeholder on
Apple devices, AUTH-03 stub) · S2-j (password show/hide) · S2-a (submit disabled on empty/erroring
fields, not just the checkbox) · S2-c (availability copy: "not available" vs screened-only "not
allowed") · S2-e (field-error text up to the F-06 9px floor) · S2-f (errors clear as the user types) ·
S2-b (legal ‹ BACK under the title). Boards: `docs/design/mockups/welcome-auth/` + `legal/`. Built
screens: `apps/mobile/app/sign-in.tsx` + `apps/mobile/app/legal/`. **No manifest yet — Task 1 is to
EXTRACT `docs/planning/m3r/welcome-auth-manifest.md`** from the boards, grounded against the built
screens (a `PRE` row needs a code cite — recalibration rule), then build. *(S1-e Welcome hero content
is design-owed — not this build.)*

Then **R1-4 · Profile** (S5-a title band · S5-b hide SET-NOW-PLAYING §0.8), then **R2 device
re-acceptance** — M3 closes when the owner signs R2 on the physical iPhone.

## THE PIPELINE (run it exactly — it's why R1-1/R1-2 landed clean)
manifest → build → murr (diff) → parvati (running app, vs the manifest) → route findings →
commit/push. **Recalibration rules (m3r-build-task.md §1, binding):** (a) a manifest row reads `PRE`
only with a code cite or screenshot, else `UNVERIFIED` (parvati treats it as a checklist row); (b)
walk every changed state predicate through its full table in the receipt; (c) a browser **BOOT check
is mandatory** — hook-placement-vs-lifecycle-early-returns crashes ("rendered more hooks") slip past
murr + parvati's static/screenshot lanes.

## VERIFICATION-LANE MECHANICS
- **murr** = a fresh general-purpose agent executing `C:\personal\shipwright\skills\murr\SKILL.md`
  over the surface's diff, with named attack surfaces + the anti-rubber-stamp law.
- **parvati** = a fresh agent executing `.claude/skills/parvati/SKILL.md`; its step-1 enumeration IS
  the surface manifest; it captures its own Expo-web screenshots at ~390×844; verdict appended to
  `m3-review-notes.md`.

## ENVIRONMENT (deltas from CLAUDE.md's older web-loop recipe)
- **Standing dev stack** (decision 0060): one restart-safe API on :4000 (CORS for :8082) + Metro web
  on :8082 via `node scripts/dev-stack.mjs up`. **NO `.env.local`, NO parallel :4001** anymore.
- **Metro on Windows is UNSTABLE** (fix in flight) — it dies/orphans repeatedly. Reclaim only a
  PID-confirmed orphaned `expo … --port 8082`; **NEVER touch the owner's phone Metro on :8081** or
  restart :4000. If Metro won't stay up, capture what you can and mark the rest "not exercised —
  Metro instability."
- `scripts/dev-stack.mjs` is a parallel session's file — **leave it staged-out**; stage only your
  surface's paths. Push via the personal-token one-shot (memory "Push credential recovery"); docs +
  code in **separate commits**, IDs cited. Run `/health` after touching the doc graph.

## OPEN/DEFERRED (not the current tasks, but know they exist)
OQ-127 (GameCard F-02 step not rendered app-wide) · OQ-129 (per-key sort direction defaults) · OQ-130
(filtered-to-zero "no results" beat) · OQ-131 (confirm hero-yields-on-search reading) · add-game
polish (fan-nav dot count/window, square vs notched dots, status-beat copy).

**Start by reading the files above, then tell the owner:** whether to run the deferred R1-2-iteration
verification, and confirm Task A (shell polish) is first.
