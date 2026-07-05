# 0059 — M3 closeout owner rulings (OQ-124/119/125/094 + G-K approval)

**Status:** LOCKED · **Date:** 2026-07-02 · **Author:** Claude Code (spec owner), from the owner's
M3 exit-audit rulings · **Rules:** the AUTH-01 credential policy, the AUTH-10 client acceptance gate,
the CAT-04 genre-list content, the G-K dedup/rate-limit lever values, and the OQ-094 rate-limit tiers
that the M3 build shipped as provisional/assumed defaults. Companion to 0058 (the M3 seam-pin record).

## Context
The M3 exit-audit surfaced the owner decisions the build left open (0058 §Consequences: OQ-125/126
open, the lever VALUES riding G-K; plus OQ-119/124 auth-lane items and OQ-094). The owner ruled them
in one sitting (2026-07-02); this record is the batch's "why". Auth + SYS-01-adjacent changes are an
owner change-class (0046 #7) — these were owner-directed and are implemented + tested.

## Decisions

1. **OQ-124 — credential policy (AUTH-01).** Ruled:
   - **Username** — `[A-Za-z0-9_]`, 3–20 chars, **display casing PRESERVED** (capitals welcome), but
     **uniqueness is case-INSENSITIVE** — `Aiden` and `aiden` collide. Implemented as a DB-**generated**
     `username_normalized = lower(username)` column + a unique index on it (migration **0004**), the
     race-safe mirror of the `games.normalized_name` pattern; `findByUsername` compares the folded key.
     Reverses the lowercase-only `^[a-z0-9_]+$` rule that silently 422'd `AidenBruh` on-device.
   - **Email** — case-folded + unique. **No plus-alias collapse** (`a+x@` ≠ merged) — it is
     provider-specific and can wrongly merge two distinct real users.
   - **Password** — **8–128 chars** (argon2 has no 72-byte bcrypt truncation, so 128 > that while still
     bounding KDF input), **no composition rules** (NIST-style), **breach-list check deferred to M5**.
   - **No separate display-name** in v2 — the username is the handle.
2. **OQ-119 — AUTH-10 client acceptance gate.** The register form now carries a real acceptance
   checkbox ("I'm 13 or older and agree to the Terms of Service and Privacy Policy") that **gates
   submit** (Create disabled until checked), replacing the hardcoded `acceptedTerms: true`. The ToS /
   Privacy links resolve to **in-app stub legal screens** (`app/legal/terms.tsx`, `privacy.tsx`) for
   now; the hosted final policy copy on a real domain is a release task (road-to-market §10).
3. **OQ-125 — CAT-04 genre list.** The seeded **16-genre** default (Action · Adventure · RPG · Shooter
   · Platformer · Puzzle · Strategy · Simulation · Sports · Racing · Fighting · Horror · Roguelike ·
   Metroidvania · Soulslike · Survival) is **owner-blessed** as the launch default (migration 0003;
   amendable anytime via SYS-08 config — genre rows are additive).
4. **G-K lever approval.** The 0058 §2 dedup levers are **approved as-is (2026-07-02)**: create
   warn-threshold **0.5** · **top-5** candidates · search-recall **0.3** · catalog-create **10/min**.
   They stop being provisional. SYS-04-tunable.
5. **OQ-094 — SYS-05 rate-limit tiers.** Two additions (both SYS-04-tunable, owner-approved):
   - Catalog-create gains a **per-day cap of 200/day** stacked on the 10/min burst (two mounted
     `rateLimit` middlewares, both must pass) — the burst alone couldn't stop all-day spam.
   - Collection writes (add · status/hours · reorder · delete · now-playing) were **UNLIMITED** (no
     limiter mounted); they now share a **`collection:write` 60/min** cap. 60/min never touches a real
     user (bounded further by catalog size + `unique(user×game)`); only a scripted client can exceed it.

## Consequences
- **product-spec 0.48** carries the AUTH-01 credential-policy changelog row; **migration 0004** adds
  `username_normalized`; the shared auth/profile schemas ripple (username charset, `PASSWORD_MAX` 128,
  `normalizeUsername`).
- **OQ-119, OQ-124, OQ-125, OQ-094 → resolved.** OQ-126 (aggregate marker) + OQ-122 (M4 scope model)
  stay open for M4 entry.
- Rate-limit values live in `apps/api/src/config/rate-limits.ts` (G-K/G-K-style owner sign-off).
- Test-first throughout: shared-schema unit tests, the case-insensitive-uniqueness + the two
  rate-limit burst integration tests all red→green.
