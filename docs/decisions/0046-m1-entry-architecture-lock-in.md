# 0046 — M1-entry architecture lock-in (gate G-A)

**Date:** 2026-06-29 · **Owner:** Aiden · **Scribe:** Claude Code
**IDs:** SYS-01/02/03/07, ACH-08, CARD-15 (references — no new behavior) · **Satisfies:** gate **G-A** (decision 0045)
**Status:** ✅ LOCKED — **owner signed off 2026-06-30** (gate G-A cleared). The engineer team is clear to scaffold M1 against this + `CONVENTIONS.md` (v2). Amending any lock (#1–#10) re-fires G-A (decision 0045 §governance). Next owner gate: **G-B** (the "floor is real" demo) at M1 exit.
**Bumps:** none (planning/architecture record; ratifies road-map §3)

## Why this exists
These are the road-map §3 "cheap now, expensive later" choices — painful to reverse once code stacks on
them. Gate G-A makes the owner sign them (and `CONVENTIONS.md`) **before** the monorepo is scaffolded, so
the foundation is deliberate, not discovered mid-build. Most of this ratifies road-map §3 + product-spec
§9 (the stack was accepted at decision 0027); a few points are sharpened for the engineer team.

## The decisions (ratify / correct each)
| # | Decision | Choice | ID / why |
|---|---|---|---|
| 1 | **Repo shape** | **Monorepo**, npm or pnpm workspaces: `apps/mobile` · `apps/api` · `packages/shared` (zod schemas + shared types). No Turborepo/Nx yet. | The `packages/shared` zod schemas make `api-contract.md` **executable** — one source for FE+BE payloads. Don't over-tool. |
| 2 | **Stack** | Expo/RN + Redux Toolkit + RTK Query + redux-persist + expo-router + Reanimated + expo-notifications + RevenueCat (client); Node/Express + TypeScript, layered, zod, PostgreSQL via Drizzle + migrations (server). | product-spec §9; confirmed well-chosen for a solo agent-driven build — keep. |
| 3 | **Env / config & secrets** | Env-only; `.env*` gitignored; secrets in the host's secret store; **gitleaks secret-scan required-green in CI**. Never a secret in repo or client bundle. | SYS-03 |
| 4 | **Ownership scoping** | A **scoped-query helper at the repository/service layer** — every read/write of user-owned data passes through it; **every mutating endpoint carries a standing SYS-07 cross-user authz test**. | SYS-01 (the prototype's original cross-user vuln) enforced by SYS-07 — the cross-cutting law |
| 5 | **Error handling** | One `AppError` hierarchy → Express error middleware → `api-contract` error codes; zod validation failure → `422` (decision 0043). Established in M2. | consistent client handling of the SYS-10 / error family |
| 6 | **Domain events** | An in-process **emit/outbox convention in Foundation** so **every mutation emits an event**; achievements (M7) **and** analytics (§7) consume them — no retrofit. A lint/test forbids a non-emitting mutation path (gate G-E). | ACH-08 |
| 7 | **Migrations** | Drizzle migrations **generated + committed + reviewed in the PR**; **expand-contract** for column changes; **destructive/irreversible = owner change-class** (road-map §5). | migration discipline |
| 8 | **Backup / restore** | Managed-Postgres **automated daily backups** (PITR if the tier offers it) + **one tested restore drill** (restore to a scratch DB, verify) **before real users** (gate G-F). | "can we recover," right-sized |
| 9 | **Environment separation** | **Distinct prod / staging / local DB instances** with distinct creds; every agent-runnable destructive path (migrate runner, seed-reset/truncate factories, drizzle push/reset) points **only at disposable DBs** by config (gate G-C). | the agent is the threat model — a stray `DATABASE_URL` is unrecoverable |
| 10 | **Render pipeline** | Composition JSON → **flatten to a CDN image via react-native-skia**; effect/finish as runtime overlays. The single hardest piece — **prototype early in M4** behind a budget cap (gate G-H). | CARD-15 |

## Out of scope here
No feature behavior (that's the specs). No tooling minutiae (lint config, CI YAML) — those are the
scaffold's job, governed by `CONVENTIONS.md`. This record is only the painful-to-reverse skeleton.

## Sign-off
**✅ Owner signed 2026-06-30 (Aiden).** This + `CONVENTIONS.md` (v2) are locked; gate G-A is cleared. The
engineer team scaffolds M1 against them, with gate G-B (the "floor is real" demo) at M1 exit. The 6 ship-blockers
(decision 0051) land in/before the scaffold commit. **Apple Developer enrollment (M1-P) starts in parallel now** —
it gates only G-B clause (d), not the scaffold.

## v2 — review-accepted amendments (decision 0051, 2026-06-30)
The 6-round M1 foundation review (LEDGER, 44 findings) amends the decisions above; **the G-A sign-off covers the amended set:**
- **#1 Repo:** pin **npm** workspaces (not pnpm — Metro/RN symlink friction, F11). Add a **global-table manifest** in `packages/shared` (catalog/cosmetics/achievements/genres) that rule-2's scoped-helper lint reads as its allowlist — unlisted table = user-owned = **fail-closed** (F32). Add the **F37 Minimum-M1 manifest** (the 7-item spine) + the **F29 living golden-path slice (one mutation, `PATCH /me bio`, stubbed actor) as an M1 deliverable** every endpoint clones.
- **#2 Stack:** auth tokens via **expo-secure-store**, never redux-persist; the persist allow-list **excludes the auth slice** + is **purged on logout / per-user namespaced / version-keyed** (F14/F20). **Refresh tokens server-stored + rotating with reuse-detection** (a reused rotated token revokes the family); MOD-09 suspend honored (F15). Name a **transactional-email transport** as the M2 auth dependency (F39). Native deps via **`expo install`**, never bare `npm i`; commit `.nvmrc`/`engines` at scaffold (F41).
- **#3/#5 Contract & errors:** split `packages/shared` into **request/input** schemas (rule-3 field-for-field) and **response/view** schemas owned by the **F06 privacy serializer** (the sanctioned divergence). `SERVER_ERROR` 500 → **generic body** (internals to Sentry); auth failures → neutral `AUTH_FAILED`; every user-supplied string **length-bounded** in the schema (F08/F23/F44).
- **#6 Domain events:** ship a **transactional outbox TABLE** (event row in the mutation's own tx) — **relay/consumer deferred to M7**; the emit **seam + a typed `DomainEventType` registry** are must-now; the rule-5 FAIL-PR **teeth defer to M7** (review-checklist now; pull to M3 if discipline slips). One **`@mutation` marker** that the authz / emit / **MOD-10 audit-row** lints all key off (F01/F24/F43).
- **#7 Migrations:** **re-keying** an ID referenced by a row/event/composition joins the destructive owner change-class; **expand-contract scoped to data-bearing DBs** (G-C onward) — plain migrations fine on disposable DBs (F25). + a CI check that the committed Drizzle journal matches `generate` output (F28).
- **#8 Backup:** **name the managed-PG provider + verify the automated schedule is ON** before G-C (distinct from G-F's drill) + a one-line RPO (F42).
- **#9 Env separation:** the destructive runner **fails closed on absence of a `DISPOSABLE_DB` sentinel (allowlist, not denylist)** — covers the CI-secret-injected-`DATABASE_URL` path; G-C verifies the guard FIRES (F03).
- **#10 Render:** the stored composition carries a **`schemaVersion`** from the first draft + a version-aware hash; asset/effect IDs append-only. Schema design stays deferred to M4/G-H (F21).
Full per-finding rationale + the must-now/fast-follow/defer map: `docs/planning/m1-architecture-review/LEDGER.md` + decision 0051.
