# Card-volume load harness — findings (M6, UNCOMMITTED working note)

**What / why.** Measure how InGame scales when one user's collection holds **50 / 200 / 1000 / 2000**
custom cards — the owner's top pre-beta stress concern. This run is **local**, against a **disposable**
Postgres (`local_volload`) + a **parallel API on :4001** (the shared dev DB `local_ingame` / :4000 was
never touched). The same harness re-aims at staging later (see "Re-aim at staging").

**Harness files (uncommitted):**
- `apps/api/scripts/vol-seed.ts` — the seed generator (real service-layer publish → real flatten).
- `apps/api/scripts/vol-measure.ts` — the HTTP measurement (base URL is an arg/env for staging re-aim).
- Scratch env / manifest / media live outside the repo (session scratchpad); nothing seeded into git.

**How it was run (reproduce):**
```
# disposable DB in the standing docker Postgres (local_ prefix → passes assertDisposableDb; separate DB)
docker exec ingame-dev-db psql -U ingame -d postgres -c "CREATE DATABASE local_volload;"
# vol.env: DATABASE_URL=…/local_volload · DISPOSABLE_DB=1 · PORT=4001 · MEDIA_DIR=<scratch>/media
#          ACCESS_TOKEN_TTL_SECONDS=86400 · BREACH_CHECK_ENABLED=false
cd apps/api
tsx --env-file=<scratch>/vol.env src/db/migrate.ts          # 25 migrations, 16 genres seeded
tsx --env-file=<scratch>/vol.env scripts/vol-seed.ts --tiers 50,200,1000,2000 --manifest <scratch>/vol-users.json
tsx --env-file=<scratch>/vol.env src/index.ts               # the :4001 API (serves the seeded PNGs from MEDIA_DIR)
tsx scripts/vol-measure.ts --base http://localhost:4001/api --manifest <scratch>/vol-users.json
```

---

## 1. Flatten throughput (the first datapoint — the seed IS the first flatten stress test)

Every seeded card is a **real** `createDraft → savePrivate → publishCard`, so `flattenComposition`
(`apps/api/src/render/flatten.ts`, via `publishCard` at `card-service.ts:571`) actually renders the
full + thumb PNGs to disk. Measured on this shared box **while the owner was walking the app on :4000**:

- **≈ 2.8–3.0 cards/sec** sustained (~**340–360 ms per published card**), steady across tiers.
- That includes: 1 skia flatten (full+thumb) + 2 storage `put`s + the create/save/publish DB writes +
  domain events + the equip PATCH. The flatten itself dominates.
- **Projection:** 2000 flattens ≈ **~12 min**; the full 50+200+1000+2000 = **3250 flattens ≈ ~19 min**.
- No degradation with catalog/collection size on the *publish* path — throughput is flat, i.e. **publish
  is O(1) per card**, not amplified by how many cards already exist. Good: the write path scales linearly.
- Contention note: the owner's live walk on the same CPU competes with the skia renders; on an idle box
  expect a somewhat higher rate. `2.8/s` is a **contended-box floor**, not a ceiling.

> Because 3250 real flattens is ~19 min, the seed runs **ascending by tier and interleaved**
> (add→publish→equip per game), so a mid-run stop leaves every smaller tier complete and every seeded
> entry consistent (carded). No image was ever faked.

---

## 2. Measurement table (against :4001, per tier)

<!-- MEASUREMENT-TABLE -->
**Filled 2026-08-15 (the post-R3/R5 re-run — new box, idle; `ingame-volload-db` :5434 disposable
container + :4001 API; all torn down):**

| tier | entries | coll_cold_ms | coll_warm_med_ms | coll_KB | bytes/entry | nextCursor | me_cold_ms | me_warm_med_ms | me_KB |
|---|---|---|---|---|---|---|---|---|---|
| 50 | 50 | 28.8 | 16.8 | 67.5 | 1383 | null | 18.8 | 14.1 | 0.5 |
| 200 | 200 | 28.3 | 42.1 | 270.5 | 1385 | null | 13.3 | 12.2 | 0.5 |
| 1000 | 1000 | 164.4 | 162.0 | 1354.8 | 1387 | null | 17.5 | 16.4 | 0.5 |
| 2000 | 2000 | 155.1 | 184.8 | 2711.0 | 1388 | null | 27.7 | 25.1 | 0.5 |

**Re-run findings vs the sections below:**
- **Cliff #3 (image caching) — CLOSED by the P6 wave:** `/media` now serves
  `Cache-Control: public, max-age=31536000` + ETag/Last-Modified (`MEDIA_STATIC_OPTIONS`,
  app.ts:54-59; `immutable` deliberately omitted so in-place rewrites revalidate) with `?v=` URL
  versioning. Measured live (5.6ms / 25.2KB thumb).
- **Cliff #2 (`/me/collection` unpaginated) — UNCHANGED, still the worst:** `nextCursor: null` at
  every tier, ~1.39KB/entry linear payload, cold 164ms @ N=1000. The server cursor/limit seam
  remains the fix (R3 client virtualization landed 2026-08-15 caps the CLIENT cost only).
- **`/me` equipped fan-out — architectural waste confirmed, no latency cliff at ≤2000** (13–28ms;
  single indexed read is cheap locally). Fix before cross-user surfaces compound it.
- **NEW — the CanvasKit flatten ceiling:** `render/flatten.ts` never `.delete()`s CanvasKit
  Surface/Image objects (renderOne :186-194, compositeShareImage :257-293); the WASM heap fills and
  the PROCESS hard-aborts (`RuntimeError: Aborted()` from canvaskit-wasm) at ~684–690 cumulative
  flattens — reproduced 4× at the same range. This is the API's own publish path: a long-lived
  production API has a ~680-publish crash fuse, and any in-process batch reflatten/backfill hits it
  in minutes. Flagged 2026-08-15 for a fix packet (explicit `.delete()` lifecycle or per-batch
  process recycling). **FIXED same day** — `8d20b66`+`227f327` (tracked-facade lifecycle; Murr
  SOUND; 1500-composition soak flat; see review-coverage).
- Flatten throughput 3.8–4.2 cards/s on the idle new box (the §4 ~2.8/s was laptop contention, not
  a code floor).

### Scaling shape of the read paths (what to read from the table)

- **`GET /me/collection` is UNPAGINATED.** `collection-service.ts:227` returns
  `{ items, nextCursor: null, total, collectionTotal }` — `nextCursor` is **always null**, there is
  **no page size, no cursor, no limit**. The whole shelf ships in one array. Payload is **linear in N**,
  and each owned-card entry carries the **full `composition` object** (`toCardRider` at
  `card-service.ts:92-103` emits `composition` on owner shapes), so bytes/entry is heavy (not just ids).
  Query *count* is roughly constant (~4-5 batched reads: entries+games, genres, owned designs, adopted
  designs) — the cliff is **payload size + client-side render**, not DB round-trips.
- **`GET /me` is amplified by card volume even though its payload is small.** `assembleSelfShape`
  (`profile-service.ts:104`) does **up to 3 full-collection scans**: `listOwnedEntries` for stats
  (`:111`), `equippedCardsByGameId` for the fav/now-playing pins (`:142`), and again inside
  `resolveTopTen` (`:88`). Crucially **`equippedCardsByGameId` (`collection-service.ts:152-161`) always
  runs `listEntriesWithGames(actorId)` — a FULL shelf read — regardless of how few game ids it was asked
  for.** So `/me` reads the entire collection 2–3× to return a stats six-pack + a couple of pins. Watch
  `me_cold_ms` climb with tier while `me_KB` stays ~flat — that gap **is** the amplification.

### The card-image path

- Published renders are served by an **unauthenticated `express.static` mount** at
  `/media/cards/<id>/{full,thumb}.png` (`app.ts:59-61`, `LocalDiskStorage.ts`). `express.static`
  defaults apply: **`Cache-Control: public, max-age=0`** + `ETag` + `Last-Modified` (see the sampled
  headers in the table). So conditional revalidation (304) works, but there is **no far-future /
  immutable caching** — every cold client pays a full GET. The renders are content-addressable
  (immutable once published), so this is a cheap CDN win later (the `// R2 + CDN before the M6 beta`
  intent is already noted at `app.ts:54`).
- **Image URLs implied per shelf render:** each custom card carries both `imageUrl` and `thumbUrl`.
  But the OWNER's own cards render **live via Skia** on the client (composition rides `/me/collection`;
  static analysis §3 below), so a **self-shelf render implies ~0 image GETs**. A **friend / gallery**
  view of the same N cards implies **N thumb GETs** (one unauthenticated `GET …/thumb.png` per card),
  with no far-future cache — that is the real image-path cliff, and it lands on the cross-user surfaces.

### Other unpaginated full-collection readers (grep result — same cliff, ranked)

All of these route through the same full-shelf reads and so **amplify with card volume**; not each
separately benchmarked (`/me/collection` is the worst by payload, `/me` the worst by hidden fan-out):
- `GET /users/:id` (public/friend profile) — `users-service.ts:145` runs the SAME `statsOf` over the
  target's full shelf; `:466` `listEntriesWithGames`. Cross-user → cannot lean on any caller cache.
- `GET /me/compare/:friendId` (SOC-03) — reads **both** users' shelves.
- `GET /me/queue` (`queue-service.ts:57`) and the Top-10 / lists (`list-service.ts:37,49`) — each does a
  full `listEntriesWithGames` to resolve a handful of equipped cards (the `equippedCardsByGameId` tax).

**Fix seam (server):** give `equippedCardsByGameId` a by-game-id WHERE instead of read-all-then-filter,
and add a real cursor/limit to `/me/collection` before a power user hits four figures.

---

## 3. Static client analysis (read-only; file:line receipts)

Underpinning fact: `GET /me/collection` is unpaginated (`packages/shared/src/schemas/response/collection.ts:74-85`;
client `app/(tabs)/collection.tsx:30` states the sort/filter/search drawer runs **client-side over the
whole loaded shelf**). So at 2000 the client holds and renders all 2000 with no paging escape hatch.

**Cliff ranking (worst first):**

1. **Virtualization — SEVERE.** The shelf is a plain **`ScrollView` + `.map()`**, no windowing.
   `collection.tsx:347` (ScrollView), rows mapped at `:562` (ShelfView), `:611` (GridView), `:636`
   (ListView). **No** `windowSize` / `initialNumToRender` / `maxToRenderPerBatch` / `removeClippedSubviews`
   anywhere. Each row is a `FlipCard` mounting **both** faces at once (`FlipCard.tsx:164` front, `:183-211`
   back), and the front `EntryCard` renders a **live Skia `<Canvas>`** per owned card
   (`CardFace.tsx:151-166`, `LazyComposedCard` at `:163`). Net: **N concurrent Skia/Metal canvases + N SVG
   backs, none recycled.** Fine at 50, heavy at 200, a memory/GPU cliff at 1000/2000. Secondary: the
   client-side filter/sort copies the whole array on every keystroke/toggle (`collection.tsx:263` `[...out].sort`,
   `:275` `[...out].reverse`) — O(N log N) allocation with all rows mounted.
2. **RTK Query cache + broad invalidation — HIGH.** One cache entry holds the **full N-item array**, and
   it re-runs **zod `collectionResponseSchema.parse` on every fetch** — O(N) validation
   (`store/api.ts:227-231`). The `'Collection'` tag is invalidated by everyday mutations, each forcing a
   **full unpaginated refetch + re-parse + re-render of all N**: `addToCollection` (`api.ts:235`),
   `updateEntry` = **Log Hours** (`api.ts:245`), `removeEntry` (`:249`), `setNowPlaying` (`:253`),
   `updateCard` autosave (`:275`), `savePrivateCard` (`:280`), `publishCard` (`:399`). No optimistic /
   `updateQueryData` patch. Logging hours on one game re-downloads the entire shelf. Compounds #1.
3. **Image fetching — MODERATE.** No `expo-image`, no `cachePolicy` / `recyclingKey` / `prefetch`, no
   cache-size/eviction config anywhere in `apps/mobile/src`. Flattened (adopted/cross-user) thumbs use a
   bare RN `<Image>` (`components/game/FlatCardImage.tsx:71`). Because nothing is windowed (#1), all
   mounted rows request their image at once — unbounded for adopted-card-heavy shelves.
4. **Skia preload — NOT a cliff.** `preloadComposedCard` is a one-time memoized module warmup
   (`CardFace.tsx:55-60`), wired once at `app/(tabs)/_layout.tsx:17-19`. Per-card cost is the `<Canvas>`
   instantiation (counted under #1), not the preload. Scales.
5. **redux-persist — NOT a cliff.** Only the tiny `prefs` slice is persisted (`store/index.ts:23-27`);
   `auth` and the RTK Query cache are **not** persisted. `PrefsState` (`store/prefsSlice.ts:23-39`) holds
   no collection data, no drafts. The full N-item RTK cache lives in memory only — never serialized to
   AsyncStorage. Scales.

The two structural cliffs to target: **§1 (unvirtualized N-canvas mount)** and **§2 (full-shelf refetch
on every mutation)** — and they reinforce each other (every Log-Hours/Publish invalidation re-runs the
whole unvirtualized render).

---

## 4. Re-aim at staging (post-G-C)

The harness is built to move with **one flag**:
- **Base URL** — `vol-measure.ts` reads `--base` / `VOL_API_BASE` (default `http://localhost:4001/api`).
  Point it at the staging API; nothing else in the measurement changes.
- **Real network** — cold/warm latencies gain real RTT + TLS; the *shape* (linear payload, `/me` fan-out)
  is unchanged, but absolute numbers will be dominated by network, so re-baseline there.
- **R2 vs API-served images** — on staging the `/media` static mount is replaced by R2 + CDN
  (`app.ts:54` intent). Re-check the image-path row: expect **far-future `Cache-Control` / immutable** and
  a CDN edge hit, which fixes the `max-age=0` finding here. The URL host changes (R2/CDN), not the count.
- **Seeding on staging** — `vol-seed.ts` writes through the service layer, so it works against any DB the
  API is pointed at; keep the `assertDisposableDb` guard satisfied (a `staging_`-named DB or
  `DISPOSABLE_DB=1`). Flatten throughput on staging hardware is the real number to capture — this local
  ~2.8/s is a contended-laptop floor.

## 5. Teardown / footprint

- Disposable DB `local_volload` dropped; scratch media dir deleted; :4001 API process killed.
- `local_ingame` / :4000 / :5432 / :8082 never touched. Docker Desktop + the `ingame-dev-db` container
  were (re)started to get a Postgres (both were down at session start); the container is left running
  (dev-stack convention), the disposable DB removed.
