# CONVENTIONS.md — the rules every change is held to

> The rulebook for the InGame build. **Every PR is reviewed against this**, and the rules marked
> **[LINT]** are mechanically enforced in CI (a PR that violates one fails the gate, not just review —
> verified once at gate G-B, M1 exit). Behavior lives in the specs (`docs/spec/`), screens in the
> design-spec; this governs *how code is written*, not what the app does. Owner-ratified via decision
> 0046 (gate G-A). Pairs with the road-map §5 spine.

## The non-negotiables

1. **Layered architecture.** `routes → controllers → services → repositories`. Controllers don't touch
   the DB; routes don't hold logic. **[LINT]** a raw DB query outside the repository layer fails CI.

2. **Every query is SYS-01-scoped.** All reads/writes of user-owned data go through the scoped-query
   helper (the actor's id is non-optional). No ad-hoc unscoped fetch of another user's row.
   **[LINT]** a repository method that bypasses the scoped helper fails CI.

3. **Every input is zod-validated** from `packages/shared`. No hand-rolled body parsing; invalid → `422`
   (decision 0043). The shared schema **is** the `api-contract` payload — it transcribes the contract
   field-for-field, never a paraphrase. **[LINT]** an un-validated request body fails CI.

4. **Every mutating endpoint has a standing SYS-07 cross-user authz test** (actor B hits actor A's
   resource → expects 403/404). **[LINT]** a mutating route with no paired authz test fails CI
   (route-inventory vs authz-test-inventory diff). This is the prototype's original-sin guard — it stays
   wired for the life of the app.

5. **Every mutation emits a domain event** (the ACH-08 emit/outbox convention). Achievements (M7) +
   analytics consume them; an un-emitted mutation is history you can't reconstruct. **[LINT]** a service
   mutation path with no emission fails CI.

6. **Every risk-domain test is spec-ID-tagged.** Grep a stable ID (`CARD-15`, `ECON-06`, `SYS-01`…) →
   spec + test + code all return. **[LINT]** an untagged test in a risk-domain dir fails CI.

7. **Behavior is never invented in code.** A needed rule/shape that isn't specced → file it to
   `docs/open-questions.md` and stop; never hand-patch behavior into code or a downstream doc
   (00-INDEX §4). If the FE↔BE seam changes, `api-contract.md` is updated in the same PR.

8. **No new runtime dependency without written justification** in the PR (why it's needed, why no
   stdlib/existing path suffices, provenance). SCA catches known CVEs; this catches the rest — a new
   manifest entry surfaces at milestone exit for a 30-second owner yes (gate G-M).

## Discipline

- **Test-first** for the §3 risk domains (authz SYS-01/07, auth AUTH-*, dedup CAT-03, economy
  ECON-03/06/07/09). Targeted test-after for UI as screens settle. No coverage-chasing, no trivial tests.
- **Error model:** one `AppError` hierarchy → Express error middleware → `api-contract` error codes.
- **Migrations:** Drizzle, generated + committed + **reviewed in the PR**; expand-contract for column
  changes. Tests + real-Postgres (Testcontainers) integration, not mocked repos.
- **Client (Expo) Hooks lint.** All mobile client code — the route files (`apps/mobile/app/**`) AND the
  shared components/render/theme (`apps/mobile/src/**`) — is hook-linted by a mobile-local flat config
  ([`apps/mobile/eslint.config.mjs`](apps/mobile/eslint.config.mjs)) with
  **`react-hooks/rules-of-hooks` as an ERROR** — the guard for the F-16 logout-crash class (a Hook
  called after an early return; commit `00d75f0`). All Hooks must run unconditionally, above every
  early return. `react-hooks/exhaustive-deps` runs as a **warning** (intentional value-driven deps are
  annotated with a reasoned `eslint-disable-next-line`). The config registers `@typescript-eslint` only
  so the `eslint-disable` comments in `src/` resolve (no tseslint rule is enabled — the surgical
  hooks-only scope stands). Wired into CI via root `lint` → `lint:mobile`; the root `eslint .` pass
  still ignores `apps/mobile/**` otherwise (the client keeps its own toolchain).
- **Per PR:** `/code-review` + `/security-review`; verify before claiming done.

## Definition of Done (every task)
Spec-ID referenced · tests for any risk-domain behavior · **SYS-07 authz test if the endpoint mutates** ·
zod validation on input · `api-contract` updated if the seam changed · domain event emitted on mutation ·
CI green · no new runtime dependency without written justification.

## The merge gate (the spine)
`main` is branch-protected: no direct pushes, linear history, **required green CI + required review**.
CI per PR: typecheck → lint → unit → integration (Testcontainers PG) → **gitleaks** → **SCA**. E2E nightly.

## Three changes that need OWNER approval (everything else = agent review + green CI)
1. **Destructive / irreversible migrations** (drop/rewrite data).
2. **Auth / SYS-01 authorization** changes.
3. **Economy / IAP / ledger** changes (ECON-*).

Plus the per-event owner gates that ride no PR: **SYS-04/SYS-05 value sign-off** (G-K) and **ECON-11
operator adjustments** (G-L). See decision 0045 for the full owner-gate register.

## v2 — review-accepted amendments (decision 0051, 2026-06-30)
The M1 foundation review hardens these rules so they're mechanically *sound*, not just stated. The rules-as-amended are authoritative:
- **Rule 2 (scoping):** the lint's allowlist == the **F32 global-table manifest** in `packages/shared`; an unlisted table is treated as user-owned and **fails closed**. A `// SYS-01-EXEMPT` annotation is valid only against a listed global table (else CI fails). The lint proves the helper was *called*, not that the right actor-id was passed — correctness is the SYS-07 4xx tests.
- **Rule 3 (zod):** split **request/input** schemas (this rule's field-for-field check applies) from **response/view** schemas (owned by the F06 privacy serializer — the *sanctioned* divergence). Every user-supplied string is **length-bounded + trimmed** in the schema. The **server-side parse is the security boundary** — never treat client-side validation as enforcement. The api-contract fidelity check is a CI **snapshot test** (build the one 0045 promised), not this presence-lint.
- **Rule 4 (authz):** routes register through one typed **`defineRoute({ method, path, mutates, authzTest })`** helper — the inventory is *data*, `mutates` is an explicit flag (a state-changing GET still trips). Coverage counts **only when a test hits the real route as actor-B and asserts 4xx** (a name-match satisfied by `expect(200)` does not count). Covers **read** endpoints returning another principal's data, not only mutations (F06/F30).
- **Rule 5 (events):** every mutation routes through one **`emitOnCommit`** seam writing to a **transactional outbox table** (event row in the mutation's own tx) + a typed append-only **`DomainEventType` registry** (unregistered type = compile error). The seam also writes the **MOD-10 audit row** for privileged writes, transactionally. The **FAIL-the-PR teeth are deferred to M7** (checklist until a consumer exists; pull to M3 if discipline slips). Relay/delivery infra is **not** built now (F01/F24/F43).
- **Rule 6/8:** rule-6 validates spec-ID tags against a **generated id-registry** (unknown ID fails) + enumerated risk-domain dirs; rule-8 widens to **"dependency (runtime *or dev*)"** with a lockfile-diff surfacer (a malicious dev tool runs in CI with FS+secret access) (F35/F44).
- **Rule 7 (no-invented-behavior):** add a **third path** — a trivial/reversible gap may be `// ASSUMPTION(OQ-xxx)`-tagged + filed + proceeded-on (surfaced at the G-M glance); but **auth/SYS-01, economy/IAP, and destructive-migration behavior are STOP-and-file, never assumed** (F33).
- **What "mutation" means (F43):** an explicit `@mutation` marker/wrapper is the single seam the authz-test, outbox-emit, and audit-row checks all key off — so a method like `claimDailyBonus`/`adoptCard` (no create/update/delete prefix) can't escape all three.
- **New M1 artifacts:** a `fixtures/bad-pr-corpus` (one deliberately-bad fixture per `[LINT]` rule + a meta-test that each lint rejects it — this IS the F22 self-test, G-B's evidence, and the new-agent example); the **F29 golden-path slice** as the worked exemplar; **concurrent** economy/authz integration tests (fire N parallel, assert one wins / all-but-one 4xx) + assert a real PG container started (F22/F29/F36).
- **Start here:** a cold agent reads CLAUDE.md → this file (rules + the F29 slice) → the DoD → decision 0045's gate register. Native deps via `expo install`, never bare `npm i` (F41).
Full rationale: `docs/planning/m1-architecture-review/LEDGER.md` + decision 0051.
