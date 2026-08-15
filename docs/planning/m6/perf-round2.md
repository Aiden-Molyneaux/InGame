# Perf round 2 — the post-R3/R5 critical hunt (2026-08-08, investigation only)

Two fresh fable investigators over m6 @ `6ef180b` (client-runtime lens · server/network lens),
briefed to find what P6 did NOT cover. Zero code changes. P6 remains the prior art
([perf-investigation.md](perf-investigation.md)); the parked items (collection server pagination ·
/me fan-out · expo-image · flatten-thumb rows) were excluded by brief and none came back worse
than recorded.

## The PRE-BETA CUT (all effort-S, one packet + Murr — proposed as the next perf wave)

| # | Fix | Finding (receipt) | Win |
|---|---|---|---|
| P1 | **Module-level typeface cache** feeding `useCardSkiaCtx` | **C1 — the biggest new find:** every mounted card canvas loads + FreeType-parses ALL 7 title fonts itself (rn-skia `useTypeface` has no cache — verified in library source; `CardComposition.tsx:28-50`, 6 host call sites). 7 file reads + 7 parses per canvas mount, 100+ duplicate SkTypeface objects live at once; async load = the recurring face-flash on every windowed scroll-in (the warmup's claim to preload typefaces is false — `CardFace.tsx:51-60`) | scroll jank + flash cured on every skia surface; cheapens all future windowing |
| P2 | `app.use(compression())` | **S1:** no compression middleware (`app.ts:63-126`) — every JSON body ships raw; measured **5.9× gzip** (N=2000 collection 3.5MB→599KB @ 29.8ms CPU); RN fetch decompresses transparently both platforms | 4–6× off every payload incl. the known collection cliff |
| P3 | `keepAliveTimeout≈65s` + `headersTimeout≈66s` (3 lines, `index.ts:10`) | **S2:** Node's 5s default, measured live (idle socket FIN at ~6s) — the P6 keep-alive resets explained; a guaranteed LB-502 trap at the G-C hosting move | kills an observed intermittent-reset class |
| P4 | Detach achievements eval from mutation responses (`setImmediate`, at-most-once already accepted) + pass reconcile progress into the read loop | **S3:** `mutation.ts:84` awaits the full achievements pass before every mutating 200; predicate counters fetch the actor's FULL event history per hit (`achievement-repo.ts:146-152`, no LIMIT — every Log-Hours refetches all `entry_updated` ever); `/me/achievements` double-computes ~20-26 sequential queries (`achievement-service.ts:80,104`) | removes a with-history-growing serial DB tax from inside every user-perceived mutation |
| P5 | Cold-start prefetch: fire `getCollection` alongside the /me gate (`app/index.tsx:18-28`) | **C5:** the cold-start chain is fully serial (fonts → persist → SecureStore → **/me RTT → only then** collection/wallet/achievements) though the shelf read is independent | one full RTT off every launch TTI |
| P6 | `image.dispose()` in the client `flattenComposition` (`CardComposition.tsx:253-256`) | **C6:** the API flatten-leak's small client sibling — ProofPrint's SkImage never disposed | one-liner while the lesson is fresh |
| P7 | Migration: `domain_events` composite indexes `(actor_id, event_type, occurred_at)` + `(event_type, occurred_at DESC)` | **S5 (the index half):** append-only, never pruned, single-column indexes only (`schema.ts:439-440`); the feed scan sorts ALL matching events before LIMIT 5000 and re-runs per page (`feed-repo.ts:59-64`, `feed-service.ts:167,203-205`); grows **with time, not users** | cheap insurance on the two hot readers; retention policy → open-questions |

## NEXT WAVE (real, but not what 12 testers feel first — most pair with the pagination seam or G-C)

- **C2+C3 — the R3 recipe on the three missed surfaces:** the two collection picker sheets mount
  the WHOLE shelf as live canvases (`discover.tsx:349-365`, `TopCurated.tsx:343-357` — N=200 ⇒ 200
  Metal canvases per sheet-open, and the web ~16-context ceiling), and the FRIEND shelf is still
  ScrollView+.map over the unpaginated cross-user payload (`user/[id]/collection.tsx:229/247/260`
  — flat images, but N decoded bitmaps ≈ hundreds of MB at power-user N). One windowing packet.
- **C4 — FriendGamePage's 3-read fan-out** (`FriendGamePage.tsx:65-69`): full friend collection +
  profile + the UNBOUNDED gallery read used only to resolve one equipped card (per-caller pricing
  of ALL cards server-side). Design the fix WITH the pagination seam's api-contract change (a
  `?equippedFor=` lookup or resolving from the collection rider).
- **S4 — flatten worker-ization:** publish blocks the event loop ~250-350ms/card in-process
  (`card-service.ts:610`); fine solo-at-beta, real at 2 concurrent publishes or any live batch
  reflatten. `worker_threads` pool; the tracked-facade lifecycle must move with it (the ledgered
  root-wire debt re-arms — plan consciously).
- **S6 — trending reads the whole published table** (`card-repo.ts:584-607`, no LIMIT; ranks in
  JS; no status index). Mirror the gallery's SQL-side rank+LIMIT (same file :256-286) + a partial
  index on `status='published'`. At-scale-only.
- **S7 — reorder at scale:** per-entry UPDATE loop (`collection-repo.ts:315-320`) + the 100KB
  `express.json` ceiling 413s a ~2300-entry full permutation. Fold into the pagination packet.
- **P4 follow-through — the detached post-commit queue has no cap:** `pendingHooks`
  (`events/post-commit.ts`) queues without backpressure — the old awaited seam WAS the throttle —
  so at load, mutations can outpace evaluation (each queued pass re-reads the active defs + the
  actor's event history) and a SIGTERM drops every queued pass, not one tick. A bounded queue /
  drain-on-shutdown pairs naturally with the S4 worker-ization (one worker owns both).
- **Suspected, needs device/scale measurement:** styler drag JS-lane frame time at MAX_ELEMENTS on
  low-end Android · feed's serial per-friend shelf reads (time with walk-seed-rich) · catalog
  leading-wildcard ilike (pg_trgm when catalog ~10k) · decoded-image memory on 200-item friend
  shelves (closes whether windowing alone suffices).

## Checked and CLEAN (both lenses — don't re-hunt)
Auth per-request cost (JWT-only, zero DB reads outside /admin) · presence stamp off-path · wallet
materialized (no ledger summing) · gallery reads (SQL-side rank/limit — the pattern to copy) ·
zod server-side body-only · cross-user surfaces never mount live canvases (verified per call
site; OQ-138 store budget honored) · bundle/require graph lean (skia behind the one lazy gate) ·
timer/loop hygiene (only Skeleton + the braked motion layer) · RTK cache posture (R1 scoping
landed; 60s reaper; bounded refetchOnFocus) · R2 optimistic patches landed sound · Log-Hours
client chatter by-design (server half = the parked /me fan-out, not worse than recorded).
