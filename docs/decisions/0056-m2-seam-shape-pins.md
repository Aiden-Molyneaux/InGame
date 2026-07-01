# 0056 — M2 seam-shape pins (api-contract 0.42): /me flags · gamertag bodies · one self-shape serializer

**Status:** LOCKED · **Date:** 2026-07-01 · **Author:** Claude Code (spec owner), from the M2
backend's implemented+tested shapes · **Resolves:** OQ-116 · **Rules the contract half of:** OQ-121

## Context
The M2 backend implemented and tested FE↔BE shapes the contract had not yet pinned (OQ-116 filed
them rule-7: formalize before the M2 PR merges). The Parvati review also caught live drift between
two "self-shape" emitters (OQ-121): `POST /auth/login` returned `user.gamertags: []` while
`GET /me` inlined the real rows.

## Decision (api-contract **0.42**)
1. **`GET /me` self-shape** gains **`usernamePending`** (AUTH-09) + **`emailVerified`** (AUTH-08).
   (`usernameNextChangeAt` + inline `gamertags` were already pinned — 0.17.)
2. **Gamertag CRUD bodies enumerated** (PROF-02): POST `{ platform, handle }` · PATCH `/:id`
   `{ platform?, handle? }` · DELETE → `{ ok: true }`; **`platform` ∈ the controlled list
   `pc | playstation | xbox | nintendo`**; `handle` trimmed + length-bounded (rule 3).
3. **The session `user` IS the `GET /me` self-shape** — register/login/apple return the same
   serializer output `/me` does. One self-shape serializer; issuance-vs-`/me` drift is a bug class,
   not a shape variant.
4. Verified **already pinned**, no edit needed: `ACCOUNT_SUSPENDED { reason, until? }` (0.11) ·
   `VALIDATION_ERROR reason:"invalid_token"` (0.32).

## Consequences
- **OQ-116 → Resolved** (this record + 0.42). 00-INDEX register synced.
- **OQ-121 stays open for its implementation half only:** the issuance path must join gamertags to
  emit the pinned shape — auth-lane (STOP-domain) code, scheduled with the **gate-3** seam review;
  the M3 entry plan carries it as prerequisite P-3.
