# M3 Build Task — InGame: Catalog + Collection (the real shelf)

> **Paste-once brief for the engineering agent. Read it top-to-bottom before touching anything.**
> You are running in **OpenCode**, which does **not** auto-load `CLAUDE.md` and has **no** Claude-Code
> skills, slash-commands, or persistent memory. Where any process refers to `/health`, run
> **`node scripts/health-check.mjs`**. Where any cited doc names a slash-command — including
> `CONVENTIONS.md`'s per-PR `/code-review` + `/security-review` — satisfy the intent **manually**
> (review the diff for correctness and for security; verify before claiming done). Never invoke a
> "skill", a "slash command", or a "memory" store — none exist here.
> **⚠️ Preview your work — UI changes get looked at before they're reported done** (AGENTS.md): run
> Expo web at a phone viewport (~390×844), screenshot, compare against the mockup. The physical
> iPhone stays the native-fidelity gate.

## Mission (one paragraph)

Turn the seeded M2 shelf into a **real collection**. Build the **community catalog** — search →
create with **fuzzy dedup** (CAT-01..05: controlled genres, contributor credit; **CAT-03 dedup is
TEST-FIRST**, this milestone's named risk domain) — and **collection CRUD** (COL-01/02/03 add ·
status · hours, `PATCH /me/collection/reorder`, `PUT /me/now-playing` — WTP-03) behind
`GET /me/collection`, then re-wire the client so the scratch-seed **retires**: the shelf, the count
chip, LIST/TOP, and the profile stats all render **real data**. The tangible win: **search a game
(or create it, dedup-warned), add it to your shelf, log hours, and watch your real collection on
your phone.** You are building **strictly the scope in `docs/planning/m3-entry-plan.md` as amended
by the assumed defaults D1–D6 below**; invent no scope. **Commit/push/PR only when the owner asks.**

## Step 0 — Bootstrap reading (in order)

1. `AGENTS.md` — the harness entry + the PR-for-everything workflow + "see your own UI".
2. `docs/00-INDEX.md` — truth-precedence (§2, by concern), stable IDs, the §4 change protocol.
3. `CONVENTIONS.md` — the rulebook every PR is held to (rules 1–8 + 0051 amendments).
4. `docs/planning/m3-entry-plan.md` — the scope/sequence/gates this brief digests. Docs win on conflict.
5. `docs/planning/m2-build-task.md` — the F29 four-layer clone pattern + the receipt shape you mirror.
6. `docs/spec/product-spec.md` — **CAT-01..05/09**, **COL-01..09** (note COL-02's SIX statuses:
   Backlog · Playing · Beaten · Completed 100% · Dropped · Wishlist — the M2 seed's four were scratch),
   COL-10..13 (friend/flip/TOP — mostly deferred, see D1/D3), WTP-03, SYS-01/02/05, MOD-07.
7. `docs/spec/api-contract.md` (**0.45**) — Conventions + `/catalog/*` (search·create·popular) +
   `/me/collection` (the 0.17 item enumeration + `total`/`collectionTotal`) + reorder + now-playing +
   the `/me` stats/expansion fields. **Contract wins on shape.** Anything the boards show that the
   contract lacks → STOP-and-file an OQ, never improvise a shape.
8. `docs/spec/testing-strategy.md` — §3 risk domains (dedup!), §7 the six-check spine.
9. `docs/design/component-map.md` (v0.4) + design-spec §2.1 (Collection — note **decision 0057**:
   the SHELF = Now-Playing hero + 2-up card faces) + §4.3 add-game boards. You CONSUME these —
   never invent component names.
10. `docs/planning/m2-review-notes.md` — the live punch-list; your fast-follow batch (step 1) closes
    its open flags.

## The tangible win + exit bar

**EXIT BAR:** search → add-or-create (the dedup warn exercised) → the entry renders on the styled
shelf → status/hours logged → real `/me/collection` totals on Collection + Profile — tested,
CI-green, on the physical iPhone via Expo Go against local/scratch data; **G-D re-fired** over the
new target-id/mutating endpoints (authz-test count parity holds); the **restore-drill EXECUTION**
done at M3-exit (decision 0052 §4 — this is its deadline).

## Step 1 — the M2 fast-follow batch (small, do FIRST)

1. **OQ-118** — flip `tools/lint/rules/rule-02-scoping.mjs` from the 3-verb denylist to a
   **read-verb allowlist** (fail closed on any unrecognized query verb; `.onConflictDoUpdate`,
   `db.execute`/raw `sql` writes covered). Add misuse fixtures proving no bypass. **Guard-surface
   change → surface it explicitly in the receipt for owner/gate-3 eyes.**
2. **OQ-121** — the issuance serializer returns the pinned `GET /me` self-shape (api-contract 0.45 /
   decision 0056): register/login/apple `user` inlines gamertags — ONE serializer, no drift.
   **Auth-lane change-class: keep the diff minimal and named in the receipt (rides gate-3).**
3. **B1 (review-notes)** — `VALIDATION_ERROR` responses must carry the **field-targeted detail** the
   contract promises (0.32): pass through **sanitized** zod issue paths/messages — never echo raw
   input (SYS-02). Client: render per-field errors under their inputs (the W4 board grammar).
4. **OQ-120** — dev-only CORS allowlist on the API (localhost Metro origins; env-gated, OFF in
   production posture) so the Expo-web loop works without a proxy.
5. Wire the client's **W3 username pre-check** (`GET /auth/username-available`) onto the create
   form's username field (debounced, advisory).
   *(Do NOT touch the create-mode acceptedTerms question — **OQ-119 awaits the owner's ruling**;
   leave the form's behavior as-is and name it in the receipt.)*

## The TWO LANES

**Lane A — BACKEND (starts immediately).** Migrations (catalog entries + genres + collection
entries) → **CAT-03 dedup test-first** → catalog search/create/popular → collection reads → writes
(add/remove/status/hours/reorder/now-playing) → `/me` stats + `favouriteGame`/`nowPlaying`
expansions. Every net-new endpoint **clones F29** (defineRoute `{mutates, authzTest}` → controller →
service `@mutation` + SYS-01 scoping + `emitOnCommit` → scoped repo), shared-zod request schemas
(field-for-field from the contract, `.strict()`, bounded+trimmed), F06 serializers, F09 fidelity
snapshot. **The actor id is NEVER trusted from the body.** Catalog reads are global-listed (the
catalog is community data); **collection rows are user-owned — fail-closed scoping**, and the
authz-test count must equal the new target-id/mutating endpoint count (G-D).

**Lane B — CLIENT (after Lane A's collection reads exist).** Add-game flow (§4.3 boards: search →
CardFan results → add · create-with-dedup-warn beat) → **collection re-wired to `/me/collection`**
(delete `apps/mobile/src/data/seed.ts`; count/stats/LIST/TOP go real) → the **tools bar + sort/filter
drawer** (D2) → profile set-pieces (real stats · PINNED FAVOURITE (P2 unblocks) · Top-3 rank chips —
**Top-3 = `GameCard/cell` + 10px plate**, OQ-114 ruled) → **OQ-123** robust 401 → auto-sign-out
(failed refresh ⇒ F20 purge + F14 clear → `/sign-in`). Polish riders if cheap: sign-in wordmark →
cream/34 (W2r) · TOP #1 rank → orange StateMark, never gold (C6/F-02) · `/mini` cards drop the
in-face title per decision 0047 (C7).

## Assumed owner defaults (D1–D6) — ASSUMPTION-tagged, veto at the glance

- **D1 — COL-12 peek-flip rides M4** (the real CARD-01 back needs the card render). Shelf stays
  faces-only; tag `// ASSUMPTION(D1)` where relevant.
- **D2 — Drawer scope:** with D4 (unpaginated), the drawer executes **client-side** over the loaded
  collection — ship the full board grammar cheaply: in-place search (COL-09: title + dev/publisher)
  · sorts (hours · owned-since · A–Z, COL-07) · status filter · genre filter · the views. The
  **cycling view keycap** replaces the M2 SectionSwitch interim (the board's "no segmented
  switchers" grammar) + the gold **ADD** button docks in the tools bar.
- **D3 — TOP stays read-only at M3**, top10 = hours-derived placeholder; curation/ARRANGE + the real
  `/me` top10 store ride M4. The `/me` `top10` contract field stays unimplemented — name this in
  the receipt (contract-deviation-by-deferral).
- **D4 — `/me/collection` is unpaginated** (personal-scale) with honest `total`/`collectionTotal`;
  the count chip must never show a phantom total (the C4 class).
- **D5 — Dedup levers (G-K, safe-default-until-approved):** normalized-title similarity
  (case/punctuation-folded; pg_trgm via migration-enabled extension or a hand-rolled trigram — **no
  new npm dependency without the rule-8 justification + G-M**), warn-threshold ~0.5, top-5
  candidates. Values surface to the owner before they take effect.
- **D6 — Seed story:** the client seed file dies; a **server-side idempotent scratch-seed script**
  (dev-only, `assertDisposableDb`-guarded — F03) keeps the phone demo populated.

## Governance & STOP rules (obey throughout)

- **One spec editor.** A rule/shape that isn't specced → `docs/open-questions.md`, never improvised.
  **Auth, SYS-01 authorization, and destructive migrations are STOP-and-file, MANDATORY.**
- The `// ASSUMPTION(OQ-xxx | D-n)` path is for trivial, reversible gaps ONLY.
- Reference behavior by stable ID; IDs are append-only. Commit messages name the IDs touched.
- **PR-for-everything**: branch → green six-check CI → self-merge; never direct-to-main. New OQ or
  decision numbers: **list the existing ones first** (parallel tracks collide — OQ-124 and decision
  0057 are taken).
- Doc-graph touches → `node scripts/health-check.mjs`, clear red.
- Don't touch unrelated code; surface smells separately; simplest solution for simple problems.

## Definition of Done (M3)

**Backend**
- [ ] Migrations (catalog + genres + collection; roll-forward/back demo-able); no destructive step without an owner STOP.
- [ ] **CAT-03 dedup test-first** (red→green committed in that order; the refusal/warn shape tested at the boundary).
- [ ] `/catalog/search` · `POST /catalog` (dedup-warn wired) · `/catalog/popular` (CAT-09; OQ-051 ranking) — F29 clones, F09 snapshots.
- [ ] `GET /me/collection` (0.17 enumeration + honest totals) · add/remove/status/hours · reorder · now-playing — authz-test count == new target-id/mutating endpoint count (**G-D re-fire ready**).
- [ ] `/me` real `stats` + `favouriteGame`/`nowPlaying` expansions.
- [ ] Step-1 fast-follow batch landed (rule-02 allowlist · issuance self-shape · field-detail errors · dev CORS).
- [ ] Restore-drill EXECUTION done + written up (G-F/0052).
- [ ] CI six-check spine green; integration on real Testcontainers Postgres; no secrets anywhere.

**Client**
- [ ] Add-game flow (search → results → add · create + dedup-warn beat) per the §4.3 boards, canonical component names only.
- [ ] Collection + Profile fully off the seed (file deleted) — shelf (0057 grammar) · count chip · LIST · TOP(D3) · stats · PINNED FAVOURITE real.
- [ ] Tools bar + drawer per D2; W3 pre-check wired; per-field validation errors rendered.
- [ ] OQ-123 auto-sign-out; the full win runs on the physical iPhone via Expo Go.

## Report-back receipt (end every substantial pass with this)

1. **What was built** — files, stable IDs + fix numbers, which lane/sequence steps, docs chain-updated.
2. **What you assumed or decided** — every `// ASSUMPTION(...)` (confirm none touched a STOP domain)
   + how each D1–D6 default was applied.
3. **What's unsure / needs the owner** — OQs filed, STOP items hit, the OQ-119 status untouched,
   the D3 top10 contract deferral.
4. **Gate readiness** — the G-D re-fire demo (which test goes red), G-F migration + restore-drill
   evidence, G-M dependency diff (should be empty or justified), G-K dedup values awaiting yes/no,
   and the Expo Go device win standing.
