# 0056 — One self-shape serializer: the session `user` IS `GET /me` (api-contract 0.45)

**Status:** LOCKED · **Date:** 2026-07-01 · **Author:** Claude Code (spec owner), from the M2
backend's implemented+tested shapes · **Rules the contract half of:** OQ-121 · **Records the OQ-116 resolution** (done by the parallel spec-owner pass, api-contract 0.42)

## Context
The M2 backend implemented and tested FE↔BE shapes the contract had not yet pinned (OQ-116 filed
them rule-7: formalize before the M2 PR merges). The Parvati review also caught live drift between
two "self-shape" emitters (OQ-121): `POST /auth/login` returned `user.gamertags: []` while
`GET /me` inlined the real rows.

## Decision (api-contract **0.45**)
**The session `user` IS the `GET /me` self-shape** — register/login/apple return the same
serializer output `/me` does. One self-shape serializer; issuance-vs-`/me` drift is a bug class,
not a shape variant. (Auth-table note added under the `/auth/*` rows.)

**OQ-116's shape pins were resolved in parallel** by the main-branch spec-owner pass (0.42 —
`usernamePending`/`emailVerified`/`role`/`adminTier` on `/me`; gamertag CRUD bodies + controlled
platform list). Verified already pinned earlier, no edit needed: `ACCOUNT_SUSPENDED
{ reason, until? }` (0.11) · `VALIDATION_ERROR reason:"invalid_token"` (0.32).

## Consequences
- **OQ-116 → Resolved** (the parallel 0.42 + this record). 00-INDEX register synced (0.45).
- **OQ-121 stays open for its implementation half only:** the issuance path must join gamertags to
  emit the pinned shape — auth-lane (STOP-domain) code, scheduled with the **gate-3** seam review;
  the M3 entry plan carries it as prerequisite P-3.
