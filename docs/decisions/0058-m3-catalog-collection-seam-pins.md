# 0058 — M3 catalog + collection seam pins (api-contract 0.47/0.48/0.49 · product-spec 0.46/0.47)

**Status:** LOCKED (seam record — the shapes are implemented + tested; the LEVER VALUES ride G-K and
the guard-surface marker rides gate-3) · **Date:** 2026-07-01 · **Author:** Claude Code (spec owner),
from the M3 build's implemented+tested shapes · **Rules:** the CAT-03 create semantics, the M3
collection posture (D2/D4), the D5 dedup levers, and the stats/expansion definitions the M3 brief's
assumed defaults (D1–D6) left to formalization. Companion to 0056 (the M2 seam-pin record).

## Context
The M3 build brief (cut on the owner's word, entry plan §6 taken as ASSUMPTION-tagged defaults
D1–D6) turned the seeded M2 shelf into the real catalog + collection. Transcribing the boards +
CAT/COL rows into `packages/shared` surfaced seam gaps the contract had not yet pinned. Per the
change protocol (00-INDEX §4) the spec owner pinned them in-build; this record is the batch's "why".

## Decisions

1. **CAT-03 create-time semantics (product-spec 0.46 · api-contract 0.47).** A suspected duplicate
   REFUSES the create with `409 DUPLICATE_SUSPECTED` + `error.suggestions[{ id, name, studio,
   releaseDate, similarity, exact }]` (best-first — the InlineBanner's candidates). The client may
   re-submit with **`dedupOverride: true`** (CAT-03 says *warn*, not block) — **except an
   exact-normalized-title match, which is never overridable** (it IS the entry). The DB's partial
   unique index on `normalized_name` (live rows) decides the F36 concurrent same-title race.
2. **D5 dedup levers (G-K — safe defaults until the owner's yes):** hand-rolled trigram similarity
   over normalized titles (no new dependency, rule 8; `packages/shared/src/catalog/dedup.ts`) ·
   create **warn-threshold 0.5** · **top-5 candidates** · **search-recall threshold 0.3** (search
   surfaces candidates more liberally than the create refusal — finding "Elden Ring" from
   "eldn rig" is CAT-01+CAT-03's point; over-inclusion in a list is harmless, over-refusing a
   create is not) · catalog-create rate limit **10/min** (SYS-05).
3. **The search-result item shape (0.47):** `+ inCollection` (the add-flow own-it ✓) and
   `+ contributor { userId, username }` (the CAT-05 credit CardDetail renders) — both board-drawn,
   previously unpinned. `GET /genres` → `{ items: [{ id, name }] }`.
4. **The COL-02 wire status enum (0.47):** `backlog | playing | beaten | completed | dropped |
   wishlist` (`completed` = "Completed 100%"; display casing is the client's).
5. **The M3 collection posture (0.48 — D2/D4):** `GET /me/collection` is **unpaginated**
   (`nextCursor` always null; personal-scale) and takes **no server query params** — the
   sort/filter/search drawer executes client-side over the loaded shelf; server-side params land
   with scale. `total`/`collectionTotal` stay honest (the C4 class).
6. **The pre-M4 `card` stub (0.48):** everywhere a `card` rider appears it resolves to the CARD-18
   default-face stub `{ id: 'default', imageUrl: null, thumbUrl: null, isCustom: false,
   isPremium: false }` — the client draws the placeholder face; the render pipeline is M4.
7. **PATCH `/me/collection/:entryId` body split (0.48):** M3 implements `{ status?, hours?,
   percentComplete?, ownedSince?, rating?, notes? }` (COL-02/03/05); **`platformIds?`** (COL-04)
   and **`activeCardDesignId?`** (COL-06) are deferred to M4 **with their substrates** (the
   platforms table · card_designs) — contract-deviation-by-deferral made explicit, not silent.
   Reorder must be a **full permutation** → `{ ok: true }`; duplicate add → `422
   already_in_collection`; now-playing/delete → `{ ok: true }`.
8. **PROF-04 completion rate (product-spec 0.47 · /me 0.49):** the share of **non-wishlist** entries
   with status **beaten | completed**, rounded; 0 with no eligible entries. `/me.stats` is real
   (games · hours · completionPct · friends); `cardsDesigned`/`adoptionsReceived` are **honest
   zeros** until M4/M5; percentile chips are **omitted** below the PROF-07 floor (absent, not fake).
   The expanded `favouriteGame`/`nowPlaying` = `{ gameId, entryId?, title, hours, card }` (P2
   unblocked); `top10` stays un-emitted (**D3** — the curated store rides M4). PATCH `/me`
   favourites now validate against the live catalog + controlled genre list (the M2-deferred
   existence checks; the users.favourite_game_id FK backs it).
9. **The rule-02 `// SYS-01-COMMUNITY-AGGREGATE` marker (OQ-126 — gate-3).** CAT-09a's anonymous
   collections-count is a spec-sanctioned cross-user AGGREGATE the F32 binary scope model cannot
   express. Interim third read-class ahead of OQ-122's M4-entry decision: the marker exempts a READ
   only when the lint window also contains an aggregate call (`count(`) — never row reads, never
   writes; misuse fixtures prove both guards.
10. **D6 seed story:** the client seed file dies; `apps/api/src/dev/seed-dev.ts` (idempotent,
    `assertDisposableDb`-guarded, exercises the REAL service layer) keeps the phone demo populated
    — `demo@ingame.app` / the coherent-12 shelf.

## Consequences
- api-contract **0.47/0.48/0.49** + product-spec **0.46/0.47** carry the changelog rows; the F09
  fidelity snapshot pins the request bodies (`POST /catalog/games`, the four collection writes).
- **OQ-125** (the genre LIST content) and **OQ-126** (the aggregate marker) remain open for the
  owner; the D1–D6 defaults stay veto-able at the M3 glance; the lever VALUES in (2) ride **G-K**.
- G-D re-fire surface: 6 new mutating/authz-tested routes (catalog create + collection
  add/update/remove/reorder/now-playing), each with a standing actor-B 4xx test.
