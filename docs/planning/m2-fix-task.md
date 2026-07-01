# M2 Fix-Task — close the lead-audit punch-list (paste into OpenCode)

> **Small fix pass, not a build.** The M2 lead-audit (Claude Code) **cleared the security bar** — the auth
> core and SYS-01 cross-user read-path are genuinely sound (F15 reuse-detection cascades, neutral auth,
> allowlist shapes + real actor-B 404 tests, atomic MOD-10 audit). Verdict was **needs-fix** for one hard
> blocker (red CI) + two guard gaps. Fix these on the **`m2` branch (PR #5)** and get the full six-check
> spine **green**. You are in **OpenCode**: PR-for-everything cadence (branch/CI/self-merge), `node
> scripts/health-check.mjs` not `/health`, no skills/slash-commands. **Commit/push only when the owner asks.**

## Fixes, in priority order

**1. 🔴 CI is RED — the merge blocker (do first).** Gitleaks trips on 4 **test-fixture** `JWT_SIGNING_SECRET`
literals: `apps/api/src/auth/principal.test.ts:25`, `apps/api/test/integration/auth-slice.test.ts:46`,
`profile-slice.test.ts:49`, `users-slice.test.ts:54`. Extend `.gitleaks.toml`'s allowlist to cover the
`*.test.ts` fixtures (a `paths` rule like `\.test\.ts$`, or a regex allowlist for the constant). **Then the
bigger point:** the CI job is a single sequential run with **no `if: always()`**, so that gitleaks halt meant
**SCA, Build, Export web bundle, and the F04 client-bundle secret-grep never ran on SDK-54 at all.** After
the allowlist fix, **re-run the full six-check spine on the `m2` head SHA and confirm Build + Export + the
F04 bundle-grep actually execute and pass.** (Recommended: add `if: always()` or split the checks so a
mid-pipeline failure can't silently skip — and mask — the rest.)

**2. 🟠 Tighten the `SYS-01-AUTH-LOOKUP` marker to reads-only.** In `tools/lint/rules/rule-02-scoping.mjs`,
the `hasAuthLookup` exemption currently suppresses the scope violation for `.from(` / `.update(` / `.delete(`
— all three verbs — but its contract is "pre-auth **lookups** only." A crafted fixture confirms an
**unscoped `update(users)`** behind the marker passes with 0 violations. **No live hole** (every shipped auth
write is `asActor`/`ownedBy`-scoped), but close the gap: exempt **only `.from(` (select)**; keep failing
**closed** on a marked `.update(`/`.delete(`. Add/extend the bad-pr-corpus fixture so a marked write **fails**
the lint. *(The separate question — is the auth-layer confinement a file-allowlist or a name/path pattern? —
is an **owner gate-3 decision (OQ-115)**; leave that as-is for now, just do the reads-only tightening.)*

**3. 🟠 Close the login timing oracle.** In `apps/api/src/services/auth-service.ts`, `login` throws
immediately for unknown/deleted/no-password accounts **without** running argon2, but runs the deliberately-
slow `argon2Hasher.verify` for a real account with a wrong password — a timing tell distinguishing "account
exists" from "not found" (the body/message are already neutral; only timing isn't). Run a **constant-time
dummy argon2 verify** against a fixed fake hash on the not-found/no-password branch so every login path
incurs the same work.

**4. 🟡 Pin argon2id params.** In `apps/api/src/auth/password.ts`, pin the argon2id **variant + memory/time/
parallelism** explicitly rather than relying on the `@node-rs/argon2` default (so a future library default
change can't silently weaken hashing).

**5. Receipt honesty (for your next report-back).** The prior receipt claimed "green (backend) / bundle-grep
(0 leaks)" — but CI was **red** and those checks never ran. **Do not claim a check green until it is actually
green on the head SHA.** Also: the funnel round-trip test lives in `apps/api/src/observability/funnel.test.ts`
(not `foundation-slice.test.ts`) — correct that in the receipt.

**6. 🟢 (nit, optional) `asActor` type.** Tighten the `asActor` parameter from `string|undefined|null` to a
non-optional `string` for compile-time enforcement (the runtime fail-closed throw is already sound).

## Explicitly still deferred — do NOT build
Real SIWA (server verifier + native button — Apple enrollment), real Sentry DSN / email transport
(owner-provisioned), the restore-drill, and **AUTH-07 account deletion (stays M7)**. The stub Apple verifier
correctly rejects real JWTs — keep it that way.

## Report back
End with: (1) what you changed (files + which fix), (2) a **link to the GREEN full-spine CI run** on the m2
head with Build + Export + F04 bundle-grep confirmed *run and passed* on SDK-54, and (3) confirmation the
AUTH-LOOKUP lint now **fails closed on a marked `.update`/`.delete`** (cite the fixture that proves it).
