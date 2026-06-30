# 0051 — M1 foundation review: accepted changes (the 6-round adversarial review)

> **Numbering note:** filed as 0047 during the review, **renumbered 0047 → 0051** on commit — a
> parallel design track had concurrently claimed 0047 for the nameplate / Profile-Top-10 ruling
> (`0047-nameplate-ui-label-and-profile-top10.md`), which is more deeply woven into the spec graph
> (product-spec 0.39, api 0.39, design-spec, and the 0048→0050 chain). This record was less entangled,
> so it moved. 0048/0049/0050 are also that parallel track; 0051 was the next free slot.

**Date:** 2026-06-30 · **Owner:** Aiden · **Scribe:** Claude Code
**IDs:** none (process/architecture-hardening) · **Amends:** decisions 0045 (gates) · 0046 (architecture) · CONVENTIONS.md
**Source:** `docs/planning/m1-architecture-review/LEDGER.md` (6 rounds, 44 findings, steelman-vetted, converged)
**Bumps (this pass — G-A bundle + must-now):** 0046 → v2 · CONVENTIONS → v2 · 0045 → v2 · road-map 0.4 · testing-strategy 0.2 · product-spec 0.42→0.43 · api-contract 0.39→0.40
**Deferred ripple — ✅ DONE (rippled 2026-06-30, this commit):** product-spec §7 observability bullet + §9 email/token carve-out + SYS-02 Unicode-NFC + ECON-02 UTC-day (F18/F39/F44/F19) → product-spec 0.43; api-contract `SERVER_ERROR`-generic/auth-neutral serialization + the F06 read-shape serializer contract note → api-contract 0.40. (M5/M7/M4 deferred-milestone items below remain correctly deferred.)

## Verdict
The M1 foundation is **fundamentally sound** — the boring stack, the executable-zod monorepo, the
SYS-01/07 authz guard, RevenueCat, the deferred render spike, the front-loaded gate scheme, and the
staged-release plan all survived adversarial steelman as **KEEP**. The review made guards *sound* and
*sequenced* the work; it did **not** re-litigate a core choice and explicitly **rejected** over-correction
(no Turborepo/Nx, no blanket runtime validation, no broader spec-ID tagging, no per-PR dependency gates,
no new pre-scaffold gate, no HTML/SQLi sanitizer theater).

## Owner rulings (2026-06-30 walkthrough)
1. **Package manager = npm workspaces** (pnpm's strict symlinks fight Metro/RN; disk/speed wins are
   irrelevant at 12 hr/wk). **(F11)**
2. **The F29 golden-path slice is an M1 deliverable containing exactly ONE user-owned mutation**
   (`PATCH /me bio`, stubbed/seeded actor — not the full SIWA stack). **(F29)**
3. **Event/enforcement (owner deferred to recommendation, all adopted):** ship a **transactional outbox
   TABLE** (event row in the mutation's own tx), **defer the relay/consumer to M7** (F01/F24); the emit
   **seam is must-now** but the rule-5 **FAIL-PR teeth defer to M7** as a review-checklist (**pull the
   lint forward to M3 if discipline slips**); **split G-B** — clauses a/b/c clear at M1-exit on an
   emulator/Expo Go, clause **d** (physical iPhone) detaches to an M1-P-completion tripwire (F05).
4. **Implement all accepted changes into the docs** (this record + the ripples below).

## The 6 ship-blockers (must land at/before scaffold)
- **F06** — guard the **read** path: a relationship-matrix test over an explicit read-route inventory + a
  typed `toPublicShape`/`toFriendShape` serializer (incl. an anonymized-author shape for AUTH-07-deleted users).
- **F29** — one **living, CI-run golden-path slice** (M1 deliverable, one mutation) every endpoint clones + the gates demo against.
- **F30** — one **`defineRoute({method,path,mutates,authzTest})`** helper: route-inventory is *data*, `mutates` explicit, coverage counts only when a test hits the route as actor-B and asserts **4xx**.
- **F22** — a **self-guarding `fixtures/bad-pr-corpus`** (one bad fixture per `[LINT]` rule + meta-test) running every PR; merges G-B(c)'s evidence.
- **F03** — destructive DB runners **fail closed** on absence of a `DISPOSABLE_DB` sentinel (allowlist, not denylist; covers the CI-secret-injection path).
- **F21** — the card composition JSON carries a **`schemaVersion`** from the first persisted draft + a version-aware hash.

## Priority map (full detail + per-finding rationale in the LEDGER)
- **MUST-NOW (G-A bundle + the M1 scaffold):** the 6 ship-blockers · F04 key-taxonomy + bundle-grep · F32
  fail-closed global-table manifest (→ rule-2 allowlist) · F33 the `// ASSUMPTION(OQ)` third path · F37 the
  Minimum-M1 manifest (the 7-item spine) · F40 the 3 stale `testing-strategy.md` lines · F41 `expo install`
  rule + scaffold-time `.nvmrc`/`engines` · F43 the `@mutation` marker (authz/emit/**audit** lints share one
  seam) · F05 Windows/Docker pre-flight + **start Apple enrollment day-one** · F08/F10/F12/F44 doc-consistency
  (zod `400→422`, truth-precedence note, citation hygiene, §8/§9 anchors, rule-8 dev-deps, "Start here").
- **M2-FOUNDATION (land with the first real endpoints; gate at M2 exit):** F14 tokens in expo-secure-store ·
  F15 refresh-revocation model · F16 privilege-check + **transactional** MOD-10 audit row · F17 limiter-presence ·
  F20 persist purge/namespace/version · F23 request/response schema split · F24 outbox-table + event envelope ·
  F31 RTK `z.infer` binding · F36 **concurrent** economy/authz tests · F18 observability round-trip · F09 schema snapshot test.
- **FAST-FOLLOW (during M2, not gate-blocking):** rule-5 lint **teeth** (seam is must-now) · F39 email transport ·
  F28 Drizzle journal check · F35 lint hardening.
- **DEFER to owning milestone:** F13 IAP-IDOR (M5) · F16 privileged-ops (M7) · F07 deletion-ripple (**real gate
  M7-exit**, M8 re-verify) · F18 PII/Sentry label review (M8 G-O) · F38 restore-drill (before the M4 beta) ·
  CARD-15 composition schema design (M4 / G-H). These are **recorded, not lost** — they ripple into the spec
  at their milestone (designing them now is premature against still-converging designs).

## Ripple (this pass = the must-now + governing-doc changes)
- **0046 (architecture) → v2:** #1 pin npm + the F32 global-table-manifest + the F41 version-matrix rule; #2
  tokens→secure-store (F14) + persist carve-out (F20) + refresh-revocation model (F15) + email transport (F39);
  #3/#5 request/response zod split (F23); #6 transactional outbox-table, relay-deferred (F01/F24); #8
  name-provider + verify-backups-on (F42); #9 fail-closed runner = allowlist (F03); #10 `schemaVersion` (F21);
  + a pointer to the F37 Minimum-M1 manifest + the F29 slice as an M1 deliverable.
- **CONVENTIONS → v2:** rule-2 (manifest allowlist, F32) · rule-3 (req/resp split + length-bound + "server parse
  is the boundary", F23/F44) · rule-4 (`defineRoute` + 4xx-binding, F30) · rule-5 (outbox-table + presence/
  content split + `@mutation` marker + MOD-10 audit, teeth-deferred, F01/F43) · rule-6/8 (id-registry + dev-deps,
  F35/F44) · rule-7 (the `// ASSUMPTION(OQ)` third path + risk-domain STOP list, F33) · F04 key taxonomy · the
  F29 exemplar link + F22 bad-pr-corpus + F36 concurrency line + a "Start here" block.
- **0045 (gates) → v2:** G-B split a/b/c vs d (F05) + fold F22/F29/F30 into G-B (no new gate); G-D adds the
  read-break + 4xx-teeth (F06/F26→F30); G-E reframed to "single emit seam un-bypassable" + observability
  round-trip (F18) + MOD-10 audit atomicity (F16/F43); G-C fail-closed-verify + backup-provider (F03/F42);
  **G-K/G-L made async** (logged yes + safe-default-until-approved); F07 deletion-ripple real-gate → M7-exit;
  gate-scheme single-editor governance (F27).
- **road-map → 0.4:** §3 zod `400→422` + truth-precedence note + npm pin + **Apple-enrollment day-one**; §7
  observability anchor (F18); §8 M0–M8 cross-ref (F44); the Minimum-M1 manifest (F37); §9 stack membership (F44).
- **product-spec → 0.43 (done this commit):** §7 observability bullet (Sentry/pino/request-IDs/funnel, F18); §9
  email transport + token carve-out (F39/F44/F14/F20); SYS-02 Unicode-NFC on render/screen fields (F19); ECON-02
  UTC-day boundary (F44). *(Landed at 0.43, not 0.39 — parallel design tracks had advanced product-spec to 0.42.)*
- **api-contract → 0.40 (done this commit):** error serialization (`SERVER_ERROR` generic body, auth-neutral, F08); the
  read-shape privacy-serializer contract note (F06).
- **testing-strategy → 0.2:** the 3 verified stale lines (§7 six-check pipeline, §2 req/resp, §3 read-path) + F36 concurrency (F40).

## Not done here (correctly)
The deferred-milestone behavior (M5 IAP-IDOR, M7 privileged-ops, M4 CARD-15 schema) is **recorded in the
priority map + LEDGER**, to be specced at its milestone — per the review's own "don't design M4/M5/M7 detail
into M1" finding.
