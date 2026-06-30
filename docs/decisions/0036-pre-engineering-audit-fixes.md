# 0036 — Pre-engineering audit fixes

**Date:** 2026-06-28 · **Owner:** Aiden · **Scribe:** Claude Code
**IDs:** CARD-05, CAT-09, CAT-12, DISC-02, SOC-05 · **Closes:** OQ-057, OQ-075, OQ-086 · **Bumps:** product-spec 0.34 · api 0.34 · ui-design-req 0.22 · design-spec 0.37

## Context
A two-way audit (functionality↔UI) before code found small gaps on otherwise-converged screens.

## Rulings
1. **CARD-05 creator dashboard = aggregate + reveal-surfaced** (OQ-086). Per-card clout in the editor is invalid — CARD-20 immutability means an edited card is a fresh 0-adoption draft. Show **total adoptions · clout · next-milestone** at the KeepBeat / PrintRitual reveal, never persistent in the working canvas.
2. **CAT-09 +(c) friends-who-own LIST** — the Game page expands friends-have-count to a named list + hours (PROF-03-gated). `/catalog/games/:id` → `friendsWhoOwn[]`.
3. **+CAT-12 friends-active rail** — "FRIENDS ARE PLAYING" add-rail (Add Game/onboarding); `GET /catalog/friends-active`.
4. **DISC-02 surfaced on Discover** — reverses OQ-057; BROWSE BY section; `/discover/browse` unchanged.
5. **SOC-05 recommend-compose = RecommendSheet** (OQ-075) — summoned drawer, two entry contexts (friend→game-picker · game→friend-picker) → `POST /recommendations`.
6. **Cuts:** Profile friend-view SHARE chip + Up-Next queue-SHARE (no spec/endpoint; decision 0019 self-only).
7. **Store Nameplates aisle** drawn (COSM-01 type was unbuyable).

## Owed (artboard detailing + Burt, follow pass)
RecommendSheet states board · Discover BROWSE BY section · editor clout strip · Game-page friends list · Store nameplate detail sheet.
