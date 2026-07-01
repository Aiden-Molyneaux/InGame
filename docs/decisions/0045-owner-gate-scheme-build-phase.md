# 0045 — Owner-gate scheme for the build phase (extends the road-map's 7 gates)

**Date:** 2026-06-29 · **Owner:** Aiden · **Scribe:** Claude Code
**IDs:** none (governance) · **Extends:** road-to-market.md §11 (the existing 7 owner decision-gates) + §5 (the spine + 3 change-classes)
**Bumps:** road-to-market.md 0.3

## Context
The owner (solo, ~12 hr/wk, first time directing a project this size) wanted **more owner oversight at
dynamic key points — especially while the M1/M2 groundwork is laid**, because every later milestone
stacks on it. An 8-lens analysis proposed candidate gates; an adversarial pass right-sized them
(cutting ~6 as redundant-with-the-CI-spine or owner-can't-judge, adding 4 uncovered risks). The owner
ratified the **right-sized set**: roughly doubles oversight (7 → ~11 new must-have touchpoints) but is
**front-loaded and tapering**, not a per-PR tax. The binding constraint is review throughput, so the
design rule is: pay once at the floor, inherit the confidence; keep steady-state to cheap per-event
tripwires.

## The ratified additional gates (on top of the existing 7)

**M1 — groundwork**
- **G-A · Architecture + CONVENTIONS lock-in** *(M1 entry · heavy · one-time)* — owner signs the §3
  architecture record **and** `CONVENTIONS.md` (the rulebook every agent PR is held to) **before** the
  monorepo scaffold is committed. (Formalized as decision 0046.)
- **G-B · "The floor is real" demo** *(M1 exit · one batched sitting)* — (a) a risk-domain test is made
  to go **RED on purpose** (green-means-something); (b) a planted-secret / failing-authz PR is **refused**
  by branch protection + the six CI checks; (c) `CONVENTIONS.md` has **lint teeth** (a raw-DB-query /
  un-zod'd-body / untagged-test PR fails CI, not just review); (d) the Expo loop runs on the owner's
  iPhone (the existing M1 check). *Credibility anchor — every later automated gate is worthless if
  "green" can be hollow.* — **✅ PASSED 2026-06-30** (b live on PR #1; a/c/d owner-sat; d via Expo Go,
  standalone build trails M1-P). See decision 0052 (M1 exit ratification).

**M1-P — provisioning**
- **G-C · Live-infra cutover + environment-separation** *(heavy · one-time)* — prod/staging/local are
  **distinct DB instances**; every agent-runnable destructive path (migrate / seed-reset / drizzle push)
  points **only at disposable DBs** by config; secrets only in the host store (gitleaks green); billing
  under the owner's account, spend matches §3. *The agent is the threat model — a stray `DATABASE_URL`
  truncates real data with no migration-review firing.*

**M2 — the foundation floor (ONE batched session, mostly demos/receipts)**
- **G-D · Authz "break-it" demo** *(+ light re-fire M3/M5)* — watch 2 mutation-tests go RED when SYS-01
  scoping is removed; authz-test count == mutating-endpoint count. (Complements existing gate 3, which
  reviews the model; this proves the net has holes.)
- **G-E · Un-retrofittable lock-in** — append-only `admin_audit_log` · ACH-08 emission completeness ·
  server-enforced role/tier ladder (decisions 0034/0035). *Impossible to backfill.*
- **G-F · Recoverability proof** — one **executed** restore drill + a migration roll-forward/back (the §3
  "one tested restore drill before real users" line; also primes change-class #4).
- **G-G · Auth fidelity + abuse-lever checklist** *(appended to existing gate 3 · light)* — refresh-rotation
  rejects the old token; AUTH-04 reset single-use; AUTH-11 neutral responses real; SYS-05 limiter returns
  429 under burst (the rate-limit *values* are owner-signed, like SYS-04).

**M4 — customization**
- **G-H · CARD-15 render-spike budget cap** *(M4 entry · heavy)* — a hard time/token ceiling **before** the
  open-ended composition→flatten spike (the roadmap's named hardest piece). Distinct from existing gate 5
  (taste), which fires after.

**M5 — economy/IAP (ONE "economy goes live" sitting)**
- **G-I · Economy concurrency + intent** — the double-spend **demonstrated** against real Postgres, and the
  owner confirms the agent encoded the **right** invariants from ambiguous prose (ECON-03/06/07/09).
- **G-J · IAP-live check** *(folds refund-reversal dry-run + RevenueCat trust-boundary)* — real-path sandbox
  refund hits the negative-floor/no-clawback rule; webhook signature + product/entitlement mappings verified.

**Always-on (per-event, cheap — surfaces that ride NO PR)**
- **G-K · SYS-04 / SYS-05 value sign-off** — owner approves the actual economy + rate-limit **numbers**
  before they take effect (tunable without a release, so they ride no merge-gate at all).
- **G-L · ECON-11 operator-adjustment authorization** — per-op yes on any manual Pixel grant/clawback
  (mints/destroys real money, no UI; decision 0035 runbook).
- **G-M · New-dependency glance** *(milestone exit · light)* — catches the typo-squatted/unmaintained
  package that `npm audit`/SCA structurally can't.

**M8 — launch**
- **G-N · AUTH-07 deletion-ripple** *(dry-run M5, real M8)* — destructive **feature** code, not a migration,
  so the migration change-class never fires on it; confirm hard-delete vs anonymize-and-keep (no orphaned
  adopters, no retained PII).
- **G-O · App Privacy / data-safety label review** *(M8 · pairs with existing gate 7)* — the legally-binding
  declaration checked against the actual ACH-08 analytics events + SYS-11 bundle contents.

## Cadence
1. **Milestone-exit gates** (the majority) — batched into ONE owner sitting per milestone; the M2 batch
   (G-D/E/F/G) pins onto the existing gate-3 window so it's one session, not five.
2. **Always-on tripwires** — G-K, G-L, G-M fire per-event for the life of the app (the no-PR surfaces).
3. **Per-PR** — deliberately none added; per-PR stays agent-owned + CI-enforced (the spine) + the 3
   existing change-classes. Protecting per-PR throughput is the whole point.

## Deliberately NOT added (cut as redundant/theater)
A standalone "authz-coverage tripwire" (that *is* the CI spine — it's a one-time mechanism check folded
into G-B); the "is the zod schema field-for-field" check (a CI snapshot test owns it; an owner can't
eyeball a transposed field); standalone secret-hygiene + storage-bucket checks (automated assertions, not
sittings); a separate recurring-service tripwire (folded into the per-milestone budget yes).

## Burden shape (honest)
~Two-thirds of the new load is one-time in the M1/M2 groundwork window — cheap to review, un-retrofittable
if missed. M2 is the heaviest sitting (G-D/E/F/G + gate 3) — mitigated by batching into one session of
mostly "watch one demo / confirm one receipt." After M2 the load drops sharply (M3 = two light glances,
M6 = none new); steady-state is the three per-event tripwires plus the two already-hard milestones (M4
render budget, M5 economy) the roadmap already flags as where owner attention belongs.

## Ripple
- **road-to-market.md §11** extended with a "Additional owner gates (decision 0045)" register; version 0.3.
- **Gate G-A** is formalized next as **decision 0046** (the M1-entry architecture + CONVENTIONS.md record)
  and is the immediate next owner sign-off before any scaffold.
- The **M1 scaffolding task** handed to the engineer team is structured around G-A (entry) and G-B (exit).

## v2 — review-accepted amendments (decision 0051, 2026-06-30)
- **G-B split (F05):** clauses **(a) red-on-purpose · (b) refused-bad-PR · (c) lint-teeth** fire at M1-exit **unconditionally** (emulator / Expo Go satisfies "the loop runs"); clause **(d) physical-iPhone** detaches to a tripwire **fired when M1-P Apple enrollment completes** — the multi-week identity clock can't block M1 exit. G-B's evidence = the F22 `bad-pr-corpus`; **F22/F29/F30 fold INTO G-B** (no new pre-scaffold gate).
- **G-D (F06/F26→F30):** add a **read-path break** (removing a privacy predicate turns a read test red) + assert authz tests carry **4xx teeth**, not mere existence; re-fire light at M3/M5 (+ M6/M7 when new route-families land).
- **G-E (F01/F16/F18/F43):** reframe from unprovable "emission completeness" → the provable **"the single emit seam is the only mutation path, un-bypassable"**; confirm the MOD-10 audit row writes **transactionally** with privileged mutations; + a one-line **observability round-trip** (thrown error → Sentry; a funnel event → the dash).
- **G-C (F03/F42):** verify the **fail-closed `DISPOSABLE_DB` guard FIRES** (point a runner at a prod-shaped URL, watch it abort) + the managed-PG **provider named & automated backups verified ON**.
- **G-K / G-L → ASYNC:** a logged owner "yes" with a **safe default-until-approved**, so a value/economy tweak never stalls a release on owner throughput.
- **G-F (F38):** restore-drill execution re-timed to **M3-exit / M1-P-complete** (before the M4 beta), off the morale-critical M2 sitting; the migration roll-forward/back demo stays at M2.
- **F07 deletion-ripple:** the **real** gate → **M7-exit** (first point the full graph exists); M8 re-verifies.
- **Governance (F27):** **0045 is the single editor-of-record** for the gate scheme (road-map §11 + CONVENTIONS refs become pointers); the gate docs join the `/health` doc-graph; amending an architecture lock-in (0046 #1–#10) re-fires G-A.
Full rationale: `docs/planning/m1-architecture-review/LEDGER.md` + decision 0051.
