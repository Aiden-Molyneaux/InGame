# 0052 — M1 exit: scaffold ratified · G-B passed · branch-protection deviation · M2-entry carryover

**Date:** 2026-06-30 · **Owner:** Aiden · **Scribe:** Claude Code (lead review)
**IDs:** none (governance / milestone) · **Amends:** decision 0045 (gate scheme — records G-B passed) · references 0046 (architecture, LOCKED) + 0051 (foundation review / ship-blockers)
**Source:** the M1 scaffold (built in OpenCode, PR [#1](https://github.com/Aiden-Molyneaux/InGame/pull/1) → squash `2b5b5a7`) + the OpenCode report-back receipt + a 5-cluster adversarial **lead audit** (Claude Code, 2026-06-30).

## 1. M1 exit — RATIFIED
The M1 monorepo scaffold is **merged and ratified**. PR #1 was owner-authorized squash-merged to `main`
as `2b5b5a7` (parent `df7c20d`); the G-B plant/revert demo nets to zero. A 5-cluster adversarial lead
audit (CI/branch-protection · ship-blockers · lints/corpus · authz/tests · governance/scope) returned
**`ratify-with-follow-ups` — 35 findings, 0 blockers, 0 refuted claims.**

**Verified against ground truth (not the receipt's word):**
- CI is real — the six-check spine + web-export + F04 bundle-grep ran and passed on the GitHub Linux
  runner for the merged SHA; integration on a genuine Testcontainers Postgres.
- The gate has teeth — PR #1's planted CONVENTIONS rule-1 violation went **red at the custom lint**; only
  the reverted-green head could merge.
- Ship-blockers **F03/F06/F21/F22/F29/F30** all verified in code (F03 fails closed on a prod DB; F06
  serializers allowlist-only + relationship-matrix test + AUTH-07 anonymization; F22 corpus 1:1 and
  self-guarding; F29 genuinely layered over a real migration with the shared `.strict()` schema).
- SYS-01 sound (non-optional `actorId`, owner predicate always AND-ed); governance clean (no
  source-of-truth doc hand-patched, personal identity throughout, no secrets, no invented STOP-domain
  behavior).

## 2. G-B — PASSED (2026-06-30)
All four clauses of the "floor is real" demo (decision 0045) are satisfied:
- **(b) refused bad-PR** — demonstrated **live** on PR #1 (planted rule-1 violation → CI red at Lint →
  merge blocked; reverted → green).
- **(a) red-on-purpose · (c) lint-teeth · (d) device loop** — **owner-sat 2026-06-30.**
- **Note on (d):** satisfied via the **Expo Go** managed loop on the owner's iPhone (no Apple enrollment
  required). The **standalone / custom-dev-client iPhone build still trails M1-P** (Apple Developer
  enrollment in flight) — that path unlocks the first native module outside Expo Go (M4/M5), and does not
  gate M1 exit.

## 3. Branch-protection deviation — DOCUMENTED (intentional, not drift)
`main` branch protection sets **`required_approving_review_count = 0`**, a conscious deviation from
`CONVENTIONS.md` / decision 0046's "required review" and the `ci.yml` header.
- **Why:** the repo has a **single collaborator**; GitHub forbids self-approval, so `count = 1` would
  **deadlock every solo PR**.
- **Backstop (proven by PR #1):** required `ci` status check · **strict / up-to-date** · **`enforce_admins`
  on** (owner cannot bypass) · **linear history** · no force-push · no deletions · PR required. A bad merge
  is still structurally blocked — the *automated* half of the gate is intact; the *human review* half is
  the owner's own read + this lead-review lane.
- **Revisit:** restore `required_approving_review_count ≥ 1` the moment a **second collaborator** joins.

## 4. M2-entry carryover (the checklist so nothing slips)
Fold these into the M2-entry sitting **before / as the first real endpoints land**:
- **OQ-111** — re-sync `docs/design/component-map.md` to current design-spec §1.5 (v0.41 → v0.49) + lock
  the 🔶 Achievements (4.10) / Admin (4.4) names, **before any client-UI coding**.
- **OQ-112** — pin the PROF-03 privacy enum tokens (`friends` / `public`) into `api-contract.md` (the F06
  serializers exist + are tested; the wire enum isn't pinned, and M2 client binds to it).
- **OQ-113** — tighten the SCA gate from `--audit-level=critical` toward **`high`** (ride the Expo-SDK /
  vitest-4 major bumps that clear the residual build-chain highs; the one real runtime high, `drizzle-orm`,
  is already fixed). The M1 narrowing is defensible but must not silently persist past M1.
- **Real cross-user authz test** — add an actor-B-hits-actor-A **4xx** test the moment the **first
  target-id route** (friends / admin / `/users/:id`) lands. Today the SYS-07 predicate rests on a single
  side-effect test because no route accepts a target user id — the guarantee is **provisional until M2**.
  This is exactly what gate **G-D** ("authz break-it") is for.
- **M2-foundation deferrals (from 0051, land with the first real endpoints):** F14/F15/F20 (token-at-rest /
  refresh-rotation / persist purge), F16 + MOD-10 audit row, F17 limiter wiring, F31 RTK `z.infer` binding,
  F09 schema snapshot, F18 Sentry/pino observability round-trip, F28 Drizzle journal CI check. (Outbox
  relay + rule-5 lint teeth stay M7.)

## Ripple
- **Decision 0045** — G-B marked ✅ passed 2026-06-30 (pointer to this record).
- No source-of-truth doc changes here (this is governance/milestone). The OQ-111/112/113 triage and the
  M2-foundation spec work happen at **M2 entry**, per the change protocol.
