# social — build receipt (M6 §1 spike + P1–P7 + §4 · the server social fabric, overnight run 2026-07-16/17)

> **Status: BUILT (§1 spike · P1 · P2 · P3 · P4 · P5 · P6+P6c · P7+riders) · every packet test-first ·
> every diff Fable-reviewed (murr lanes) with fix-loops applied · the §4 independent privacy
> cross-audit RAN (scheduled, not remembered — the M5 lesson applied): 1 HIGH + 1 MED + 1 LOW found,
> ALL FIXED same-night, verdict flipped NO-GO → GO · suites at head: 235 unit · 444 integration ·
> 493 mobile (69 suites) · typecheck/lint clean → ⛔ STILL OWED: the owner sittings (G-D re-fire ·
> ACH intent/no-farm demo · §1-GO ratify) · P14 (rides the Google email) · P15/P16 (owner provisioning) ·
> the owner's first-article + device walks.** Built autonomously overnight per the owner's directive
> ("build everything you can without my input while I sleep", 2026-07-16); every deviation recorded.

## TL;DR
The whole M6 social fabric landed test-first behind decisions **0076** (the twelve entry rulings —
headline: the **`SYS-01-FRIEND-READ`** class, M6's fourth sanctioned cross-user read door) and
**0077** (the 18-def achievement starter set). The graph (requests/friendships with canonical-pair
invariants), the friend-view read fabric (profile/collection/compare/contributions with exact-allowlist
F06 shapes), invites on the pre-named **`AUTH-LOOKUP`** bearer class, the aggregated low-noise feed,
the WTP queue + curated Top-10 substrate, the **achievements engine** (7 data-driven criterion kinds,
idempotent no-farm unlocks, atomic badge+PX+entitlement rewards — **ECON-05's milestone half lands a
milestone early**), and the reports/breach-check hardening pair. The §4 audit then proved the fabric's
one real hole (an accept-vs-block race) and two non-disclosure oracles — all killed the same night.

## The packet chain (commit · builder · headline)
- **§1 spike** (`1358966`, Opus) — the friend-fabric thread proven end-to-end: `friend_requests`
  (migration 0013) · `friendScoped()` + the `// SYS-01-FRIEND-READ` marker + the statement-scoped
  `rule-02` class · request→accept→friend-shape · block-severance · the MOD-09 **byte-identical
  collapse** (blocked ≡ suspended ≡ deleted ≡ unknown) · strip-predicate → lint AND runtime RED
  (the G-D mechanism, demonstrated). **§1-GO recorded provisionally** — owner ratifies at the sitting.
- **P1** (`19e8e81` + `5906560`, Opus) — the full SOC-08 lifecycle (decline/cancel/unfriend/lists +
  the 7d cooldown + **mutual-pending auto-accept**) · one-bond-per-pair + pending-pair **canonical
  LEAST/GREATEST unique indexes** (F36 races proven on real PG) · `friends:request` 10/hr+30/day ·
  `GET /me/blocks` · `friend.added` **dual-credit payload** (both parties creditable off one event) ·
  the ACH-08 **emission-completeness audit** (all 7 consumer events verified) · the 0076 §0.12
  **worn-premium-shell reset** (migration 0015, entitled rows survive). *Fix-loop:* cancel now stamps
  the cooldown (SOC-08 verbatim — the builder's non-punitive reading was reverted to spec; the UX
  question is **OQ-147**).
- **P2** (`bad9a63`, Opus, heaviest review) — the friend-view read fabric: **OQ-146 landed**
  (migration 0016 — publish-time `equipped_labels` denormalization + backfill, 8/8 live cards; the
  CARD-22 readout now serves on gallery/adopted/friend-collection/compare with **composition never
  crossing users**) · `/users/:id/collection` (COL-10/11; notes/rating/platforms physically unselected)
  · `/me/compare/:friendId` (the 0.25 shape; the PROF-03 omission engine built + unit-tested — inert
  at M6, per-facet privacy is OQ-117-deferred) · `friendsWhoOwn` (a **focused route** — no game-detail
  aggregate endpoint exists) · the contributions VIEW-ALL cursors + the P13 board-gaps (bio, game
  thumbs) · the SOC-09 mutual-invisibility sweep + F06 exact-key-set field-diffs per shape pair.
- **P3** (`dc2b19d`, Opus) — invites on the **AUTH-LOOKUP** class (the 0073 pre-naming lands):
  `invite_tokens` (migration 0017, **hashed bearer** — 256-bit CSPRNG, SHA-256 stored, never the
  token) · TTL 7d · cap-5 create-invalidates-oldest under an advisory lock · multi-redeem ·
  INVITE_INVALID ≡ revoked ≡ unknown (byte-identical; blocked-sender resolve also indistinguishable)
  · `GET /users/search` (exact-match, the 6-state PersonRow relationship spine, blocked invisible
  both directions) · the full mint→resolve→request→accept thread proven.
- **P4** (`035fc27`, Opus) — SOC-05 recommendations (friend-only, partial-unique on non-dismissed,
  20/day, **notes unscreened at M6** — the accepted MOD-07 gap, recorded) + the SOC-06 **aggregated
  feed** over `domain_events` on the FRIEND-READ class: fixed 6h UTC buckets (immutable sort keys →
  cursor stability proven under concurrent inserts) · **flood suppression** (100-add burst → 1 item)
  · **trivia exclusion** by payload design (`entry_updated` widened to carry `status` only on status
  flips — its absence IS the exclusion signal) · block-invisibility free by construction.
- **P5** (`fa10de0`, Sonnet) — the WTP queue (cap 50 → LIST_FULL · friend_rec threading · owned/
  wishlist flag) + `/me/lists` top10 (cap 10 · re-rank · **membership requires collection ownership**
  per COL-13) + top10 inlined on `/me` + the friend shape. **Found + fixed a real deadlock** (concurrent
  full-permutation reorders → per-actor advisory lock); flagged the identical latent gap in the M3-era
  collection reorder → fixed by P7's rider.
- **P6 + P6c** (`1899183`, Opus) — the achievements engine: **7 criterion kinds** (count · distinct ·
  match/entity-target ACH-07 · window · participant/dual-credit · received/designer-credit ·
  aggregate-reach) evaluated by a **synchronous in-process post-commit hook** at the `@mutation`
  chokepoint (no polling daemon; at-most-once with self-healing counters — documented) ·
  **count-from-genesis** (history counts, unlocks fire only on live events — `earned:0` at seed
  proven live, then a real `catalog.game_created` unlocked A9 +2 PX on the wire) · atomic
  badge+PX+entitlement rewards (poison-test proven) · secret masking on every read · the **18-def
  0077 seed** (B7 dev-target = Celeste, production target = the owner's P16 nod; A14 slot empty) ·
  the §4 addendum: **the feed masks secret-tier labels** ("a secret achievement" — OQ-148's
  conservative default).
- **P7 + riders** (`f9900fe`, Sonnet) — reports **capture-only** (the 0.70-pinned MOD-01 reason enum;
  no target-existence lookup — the anti-oracle stance, commented; `report.filed` payload never carries
  details text) · **AUTH-01** HIBP k-anonymity at register + reset-confirm (fail-open, 2s timeout,
  `BREACH_CHECK_ENABLED` kill-switch; the whole test suite firewalled from the real endpoint) ·
  riders: `/catalog/upcoming` + `/catalog/friends-active` (CAT-12, FRIEND-READ) + the **COL-07
  reorder lock fix** (P5's finding, closed). *Archaeology:* `/catalog/new-releases` (CAT-11) was
  never built despite decision 0062 → **OQ-150**.

## §4 — the independent privacy cross-audit (RAN 2026-07-17 · isolated worktree · fresh context)
Adversarial on shape field-diffs · block bidirectionality · the non-disclosure collapse ·
enumeration oracles · the bearer surface · guard-launder attempts · F36 seams · config drift.
**Findings → all fixed in `78cb638` (P1's builder), re-verified by the orchestrator (23/23):**
1. **HIGH — the accept-vs-block race** (proven with a deterministic two-tx repro): an accepted bond
   could survive a concurrent block → the blocked party would keep seeing the blocker's feed/roster
   indefinitely (the friendScoped-only surfaces don't re-check blocks — severance is their safety).
   **Fix:** a canonical-pair advisory lock across all four pair-mutations + the severance reorder.
2. **MED — request-create was a suspension/deletion oracle** (201 vs the read surfaces' 404) →
   the collapse now gates it. **LOW —** the same on block-create → same fix.
3. **NOTEs:** the AUTH-LOOKUP filename-pattern confinement (defense-in-depth hardening note, receipt-
   recorded) · refusal-code inconsistency 403/409/404 across friend-read surfaces → **OQ-149** ·
   the secret-label feed leak → fixed pre-emptively in P6 (OQ-148).
**Everything else held:** the guard lint (35/35 incl. hostile fixtures) · composition never crosses
(hand-checked every FRIEND-READ select — the lint's composition guard is PUBLIC-READ-only, a known
hardening gap for M7) · serializer allowlists · invite entropy/hashing · search neutrality · **zero
config drift** vs 0076 §0.6/§0.7. **Verdict after fixes: GO.**

## The load-bearing decisions (the owner's eyes)
1. **The friend-read guard enforces at the DB, not in service `if`s** — `getUserProfile`'s full shape
   only exists when `friendScoped`'s INNER JOIN finds an accepted bond; stripping the predicate turns
   lint AND runtime tests RED. This is the M6 G-D re-fire's substance.
2. **Block-severance hard-deletes the friendship row — and that is correct** (SOC-09 severs an
   interpersonal edge; DISTINCT from the OQ-145 account-deletion status-flip posture — nodded at
   review, commented in code).
3. **Count-from-genesis** (P6): history counts toward achievement progress, unlocks fire only on live
   events. Beta users' existing collections count the moment they act. Display quirk → **OQ-151**.
4. **The feed's trivia exclusion is structural** — a stat-only edit emits no `status` in its payload,
   so it CANNOT map to a feed type. No filter list to drift.
5. **Cancel stamps the re-request cooldown** (spec-verbatim SOC-08; the builder's kinder reading was
   reverted — the code follows the spec, the question went to the inbox as **OQ-147**).
6. **The 49-PX starter set** (0077's "≈34" was a summary-math error, corrected in the decision record;
   the ratified per-item values stand — G-K glance queued).

## ⛔ Still owed (the honest remainder)
1. **The owner sittings:** §1-GO ratify · **the G-D re-fire watch** (friend-read class — the tests
   exist and bite; the 2-minute owner-watched strip is unsat) · the **ACH intent/no-farm demo** ·
   G-K nods (invites:resolve 30/min · the reason enum · the 49-PX set · rec-note 500).
2. **P14 (P2b + G-J + sandbox)** — still rides the Google email (provisioning-log #6/#7/#8; the
   M5 carry, re-recorded).
3. **P15 (G-C beta infra: R2/hosting/restore drill) + P16 (EAS/TestFlight lane)** — owner
   provisioning sittings, scheduled at the 0076 gate.
4. **OQ-150** (CAT-11 endpoint never built — M7-entry or an M6 tail) · **OQ-151** (over-target
   progress display — owner rules) · **OQ-147/148/149** (the night's inbox).
5. The **owner device walks** — the client half's receipt (`m6/surfaces-receipt.md`) carries the
   per-surface state; the consolidated parvati pass's verdicts live in `m6-review-notes.md`.
