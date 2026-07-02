# M3 ENTRY PLAN — InGame · Catalog + Collection (DRAFT — awaiting owner ratification)

> **Status: DRAFT (2026-07-01, authored at M2 close-out).** Mirrors the ratified `m2-entry-plan.md`
> shape. **The build brief ([`m3-build-task.md`](m3-build-task.md)) was cut 2026-07-01 on the
> owner's word, with the §6 decisions taken as ASSUMPTION-tagged safe defaults (D1–D6 in the
> brief) — veto any at a glance.** Ratifying this plan formalizes them. Source anchors:
> road-to-market §M3 row · product-spec
> `CAT-01..05` / `COL-*` · testing-strategy §3 (dedup = a named risk domain) · decision 0052 §4
> (restore-drill re-timed to M3-exit) · the M2 review ledger (`m2-review-notes.md`).

## 1. M3 in one paragraph + the minimum vertical slice

M3 turns the seeded M2 shelf into a **real collection**: the **community catalog** (search → create
with **fuzzy dedup**, CAT-01..05, controlled genres, contributor credit) + **collection CRUD**
(add/remove, status + hours, COL-01..07/09) behind `GET /me/collection` — so the client's
scratch-seed retires and the shelf, count chip, LIST/TOP views, and profile stats all render **real
data**. **The tangible win: you can search a game (or create it, dedup-warned), add it to your
shelf, log hours, and watch your real collection on your phone.** Dedup (CAT-03) is **test-first**
— it is the milestone's named risk domain, the catalog's cross-user quality lever.

**EXIT BAR (draft):** search → add-or-create (dedup warn exercised) → the entry on the styled shelf
→ status/hours logged → real `/me/collection` totals on the Profile — tested, CI-green, on the
physical iPhone via Expo Go; **G-D re-fired** over the new target-id/mutating endpoints
(authz-test count parity holds); the **restore-drill EXECUTION** done at M3-exit (0052 §4).

## 2. Prerequisites (clear these BEFORE the build agent runs)

| # | Item | Owner | State |
|---|---|---|---|
| P-1 | **M2 gate batch cleared** — gate-3 · G-D · G-E · G-F · G-G · G-M (incl. `react-native-svg`) · G-K, one sitting | owner | ⏳ scheduled by owner |
| P-2 | **OQ-118** — flip `rule-02-scoping` to a read-verb **allowlist** (fail closed on unknown verbs) — the guardrail gap **widens exactly as M3 adds write surface**; explicitly "fast-follow before M3" | eng (small, lint-lane) | ⏳ |
| P-3 | **OQ-121 backend alignment** — issuance serializer returns the pinned `/me` self-shape (api-contract 0.45 / decision 0056); auth-lane code → rides **gate-3** | eng (auth lane) | ⏳ |
| P-4 | **OQ-120** — dev-only CORS allowlist (localhost Metro origins) so the Expo-web loop can call the API; three review sessions have had to proxy around it | eng (tiny) | ⏳ |
| P-5 | **OQ-119 ruling** — AUTH-10 acceptance row on the create form, or drop create mode until W2 builds | **owner** | ⏳ |
| P-6 | ~~OQ-114 ruling~~ — **RULED on main** (Top-3 = `/cell` + 10px plate; 0047 corrected) | owner | ✅ done |
| P-7 | **Component-map currency check** for the M3 client screens — add-game (§4.3 arc), game-page (§4.2), the collection sort/filter drawer + tools bar. Map v0.4 (OQ-111) predates no M3 board changes known — verify, re-sync only if drift found | spec owner | ⏳ |
| P-8 | **api-contract page-audit refresh** for `/catalog/*` + `/me/collection` rows (0.17 enumerated them; confirm they still match the converged boards before transcription into `packages/shared`) | spec owner | ⏳ |

## 3. Scope (draft — owner trims/ratifies)

**Backend lane (starts first, gated on nothing):**
- **Catalog:** entity + migrations (canonical entry per CAT-02 fields; controlled genre list CAT-04;
  contributor credit CAT-05) · `GET /catalog/search` (CAT-01, title match) · `POST /catalog`
  (create; **CAT-03 fuzzy-dedup warn — test-first**, the "did you mean *Elden Ring*?" response
  shape) · `GET /catalog/popular` (CAT-09 — the rail; ranking per OQ-051).
- **Collection:** entries + migrations (status ∈ playing/beaten/completed/backlog · hours ·
  owned-since · nowPlaying) · `GET /me/collection` (item enumeration + `total`/`collectionTotal`,
  api-contract 0.17) · add/remove/status/hours writes (COL-01/02/03) · `PATCH
  /me/collection/reorder` (COL-07/OQ-031) · `PUT /me/now-playing` (WTP-03) · `/users/:id/collection`
  friend subset + the MOD-09 unavailable collapse (COL-10/11 read-only parity — *if friends exist;
  friendship itself is a later milestone → the friend paths may stay dormant-but-shaped*).
- Every endpoint clones **F29** (defineRoute → controller → service `@mutation`+SYS-01+emitOnCommit
  → scoped repo), shared zod, F09 snapshot; **G-D parity: authz-test count == new target-id/mutating
  endpoint count.**
- `/me` grows real `stats { games, hours, … }` + the `favouriteGame`/`nowPlaying` expansions the
  contract already enumerates (unblocks the P2 PINNED FAVOURITE display).

**Client lane:**
- **Add-game flow** (§4.3 boards): search → CardFan results → add · create-with-dedup-warn beat.
- **Collection re-wired to `/me/collection`** — the seed retires; count/stats/LIST/TOP go real.
- **Tools bar build-out** per the boards: search chip · sort chip · filter (ALL) · the **cycling
  view keycap** (the board's "no segmented switchers" grammar replaces the M2 SectionSwitch
  interim) · the gold **ADD** button · the **sort/filter bottom drawer** (COL-07/09).
- **Profile:** real stats; PINNED FAVOURITE set-piece (P2); Top-3 rank chips + VIEW TOP 10 › door.
- **OQ-123** — robust 401 → auto-sign-out (session self-healing).
- Polish riders (cheap, non-blocking): sign-in wordmark cream/34 (W2r) · TOP #1 rank → orange (C6)
  · `/mini` plate drop per 0047 (C7).

**Explicitly OUT (draft):** card composition/art + editors (M4) · economy/IAP (M5) · friendships +
social surfaces (SOC-*, later — friend-view code paths stay shaped but dormant) · achievements ·
admin console (M7) · **COL-12 peek-flip?** → §6 owner call.

## 4. Build sequence (draft)

1. **Migrations first** (catalog + collection tables; roll-forward/back demo-able — G-F re-check).
   Any destructive migration = change-class #1, owner STOP-and-file.
2. **CAT-03 dedup, test-first** (the risk domain): the matcher + its refusal/warn shape, red→green
   before the create endpoint lands.
3. Catalog read/search → create (dedup wired) → popular rail.
4. Collection reads (`/me/collection`) → writes (add/status/hours/reorder/now-playing) — F29 clones,
   authz tests in the same PR as each endpoint.
5. `/me` stats/expansions widening.
6. Client: add-game flow → collection re-wire (seed retirement) → tools-bar/drawer → profile
   set-pieces → OQ-123.
7. **Restore-drill EXECUTION** at M3-exit (0052 §4) + the G-D re-fire demo.

## 5. The M3 gate batch (draft)

- **G-D re-fire** (M3 exit): the break-it demo over the NEW endpoints; count parity; a dedup-refusal
  test shown red-on-purpose.
- **G-F** (M3 exit): catalog/collection migration up/down + the **restore-drill execution** (the one
  0052 re-timed here — this is its deadline).
- **G-M** (M3 exit): dependency glance (fuzzy-match lib, if any — prefer none/hand-rolled trigram).
- **Owner device-feel pass** (road-to-market: "auto + agent + owner (device feel)") — Parvati runs
  per screen before it (decision 0054 cadence).
- **G-K** rides always-on (any new rate-limit values, e.g. catalog-create).

## 6. Open decisions for the owner (rule before/at ratification)

1. **COL-12 peek-flip timing** — the shelf's stats-on-the-back (decision 0057 leans on it): M3
   client scope, or M4 with the card-back render? (M4 gives it the real CARD-01 back; M3 could ship
   a plain stats back.)
2. **Sort/filter drawer depth at M3** — full board grammar (search/sorts/status+genre filters) vs
   sort+status only; COL-09's in-place search now or with the drawer.
3. **TOP arrange (COL-13 edit)** — drag-rerank + CardPicker in M3, or read-only TOP until M4?
4. **Pagination posture for `/me/collection`** — all-at-once (collections are small) vs paged; the
   count chip must never re-grow a phantom total (the C4 class).
5. **Dedup lever values** — match threshold + candidate count for the CAT-03 warn (G-K-style
   sign-off; safe-default until approved).
6. **Demo/seed story after retirement** — keep a dev-only seed script for scratch DBs (likely yes,
   server-side), so the phone demo doesn't depend on hand-adding games.

---
*Cut `m3-build-task.md` (the paste-once OpenCode brief) from this plan after ratification — same
digest pattern as M2: bootstrap reading list, lanes, STOP rules, DoD checklist, receipt shape.*
