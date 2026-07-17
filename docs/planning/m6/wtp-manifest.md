# P10 — What-to-Play + Top-10 curation surfaces manifest

> **Packet:** M6 P10 (client · Opus). **Branch:** `m6`. **Scope:** `apps/mobile/**` + `docs/planning/m6/**` only.
> **Boards:** `collection/collection-states.html` (the "View mode · TOP" stage — self read · self ARRANGE +
> CardPicker · friend read-only) · `discover/discover-states.html` (Two rooms: UP NEXT ↔ DISCOVER) ·
> `profile/profile-states.html` (Top-3 set-pieces + VIEW TOP 10 + the three doors) · `add-game` (the CAT-12 rail).
> **Spec:** WTP-01/02/03 · SOC-04/05 · COL-13 · CAT-11/12 · DISC-01/04 · PROF-05. **Decisions:** 0049 · 0050 · 0076 §0.8.
>
> **Server seams consumed (curl-verified live this run, API :4000):**
> - `GET/POST /me/queue` · `PATCH /me/queue/reorder` · `DELETE /me/queue/:itemId` — **LIVE** (P5, `fa10de0`). `owned` flag,
>   `source` enum (`collection·discovery·friend_rec`), `recommendedBy`+`note` on friend_rec rows. cap 50 → `LIST_FULL`.
> - `GET /me/lists` (wire id = `'top10'`; items carry `gameId·rank·card`, **NO title**) · `POST /me/lists/top10/items {gameId}` ·
>   `DELETE /me/lists/top10/items/:gameId` · `PATCH /me/lists/top10 {orderedGameIds[]}` — **LIVE**. cap 10 → `LIST_FULL`; membership needs collection ownership → 422 `not_in_collection`.
> - `GET/DELETE /me/recommendations` — **LIVE** (P4). `PUT /me/now-playing` — **LIVE** (M3, `setNowPlaying` in api.ts).
> - `GET /discover/trending-cards` — **LIVE** (M5 P3); counts, no prices; block-filtered.
> - `GET /catalog/upcoming` — **404 NOT LIVE** (never registered; only `friends-who-own` on the catalog router).
> - `GET /catalog/friends-active` (CAT-12) — **404 NOT LIVE**.

## The two NOT-LIVE catalog endpoints (curl proof)
Both `/catalog/upcoming` and `/catalog/friends-active` return **HTTP 404** live (`apps/api/src/routes/catalog-routes.ts` registers only
`/genres · /catalog/search · /catalog/popular · /catalog/games/:id/friends-who-own · POST /catalog/games`). Per the packet ruling
their rails render **honest EXPECTED-empty with the manifest cite — never faked**. The client slices are written + wired to the drawn
contract path so the surface is complete the moment the server route lands (a swap, no rebuild).

## Routes + files
- `app/(tabs)/discover.tsx` — **NEW** the Discover screen (§0.8 slice): UP NEXT room (full) ↔ DISCOVER room (browse slice), `SectionSwitch/pair` bottom-docked toggle.
- `app/(tabs)/_layout.tsx` — **edited**: register the `discover` tab (state-preserving, like collection/profile/friends).
- `src/components/ShellNav.tsx` — **edited**: DISCOVER goes LIVE (the 5th nav key; `§2.7` "Discover keycap active") — added to `ROUTES` + an `onDiscover` pathname predicate. **The Discover REACH answer (see ARCH A1).**
- `app/(tabs)/collection.tsx` — **edited**: `TopView` placeholder (hours-sorted) **RETIRED** → the curated COL-13 TOP view (read + ARRANGE + CardPicker); the trailing tools-bar button swaps ADD→ARRANGE in TOP.
- `app/(tabs)/profile.tsx` — **edited (additive)**: Top-3 set-pieces read from `me.top10` (was hours-derived); Top-3 tap → TOP view **focused** on that game (was → Game page); VIEW TOP 10 unchanged (already → TOP).
- `app/user/[id]/collection.tsx` — **edited (additive)**: friend TOP view-mode goes LIVE (reads the friend's inline `top10` off `getUser`); the EXPECTED(P5) `topNote` retired.
- `app/user/[id].tsx` — **edited (additive)**: friend Top-3 set-pieces + VIEW TOP 10 door (from the now-widened `friendProfile.top10`); makes the friend TOP reachable (decision 0050 §C). STATS/device/achievements stay EXPECTED (not served on the friend shape).
- `app/add-game.tsx` — **edited (additive)**: the CAT-12 FRIENDS-ARE-PLAYING rail (EXPECTED-empty; endpoint 404).
- `src/store/queueApi.ts` — **NEW** injectEndpoints: `getQueue·addQueueItem·reorderQueue·deleteQueueItem` (zod at the seam; never api.ts).
- `src/store/listsApi.ts` — **NEW** injectEndpoints: `getLists·addListItem·removeListItem·rerankList`.
- `src/store/recommendationApi.ts` — **edited (additive)**: `getRecommendations` + `dismissRecommendation` added beside the existing `createRecommendation`.
- `src/store/communityApi.ts` — **edited (additive)**: `getTrendingCards` gains a zod `transformResponse` at the seam (was untyped-raw).
- `src/components/wtp/` — **NEW**: `QueueRow` · `RecRow` · `ReleaseRow` · `TrendRow` (AdoptCount) · `NowPlayingPin` · `SegFoot` (the bottom SectionSwitch dock).
- `src/components/collection/TopCurated.tsx` — **NEW**: the COL-13 TOP view-mode (SlotFrame/RankSlot read + ARRANGE) + `CardPicker` sheet + the friend read-only variant.
- `src/components/wtp/reorder.ts` — **NEW**: the pure `reorder(ids, from, to)` + `moveWithinCap` helpers (unit-tested; the drag gesture stands on them).
- `src/components/wtp/DragRankList.tsx` — **NEW**: a fixed-row-height PanResponder drag list (the shared reorder gesture for queue + TOP arrange).

## ARCH callouts
- **A1 — the Discover REACH (the packet's open question).** The `NavBand` **already draws a DISCOVER keycap** (`ShellNav` `ORDER`), but it was inert (not in `ROUTES`). Both the discover board AND design-spec §2.7 draw **"Discover keycap active = pressed + PipLight"** on every Discover artboard — so the intended reach is the **DISCOVER nav keycap itself going live**, making it the 5th routable tab (peer of COLLECTION/PROFILE/FRIENDS; STORE stays the top-level commerce door). Wired: `discover` added to `ROUTES` + `_layout` Tabs + an `onDiscover` predicate. No board-drawn Collection/Add-Game entry is needed — the nav key IS the entry (this resolves the "if the nav has no DISCOVER key" branch: the key exists, so it's the reach). The in-room UP NEXT ↔ DISCOVER switch is the `SegmentedKeycap/pair` bottom dock, NOT a route.
- **A2 — `/me/lists` items have NO title; the TOP view joins titles from the collection cache.** By schema design (`listItemViewSchema` omits title — "the Collection TOP view already has the game title in context"). `TopCurated` builds a `gameId → CollectionItem` map from the already-loaded `/me/collection` (self) or the friend collection payload (friend) and resolves title/hours/status per rank row. A top10 game momentarily absent from the collection cache (a race) degrades to the card's own context, never crashes.
- **A3 — CardPicker sources YOUR collection, so the 422 `not_in_collection` cannot happen through it.** The picker lists only owned games (the `/me/collection` shelf minus already-seated); adding one is always in-collection. The 422 is still handled defensively (surfaced as a quiet error) but is unreachable by construction — noted so a reviewer doesn't look for a UI path to it. The reachable refusal is cap-10 `LIST_FULL`, which renders the seats-full state.
- **A4 — one shared drag implementation, fixed-row-height.** `DragRankList` uses a fixed row height so the drag translation → index shift is pure arithmetic (no async row-measuring) — deterministic, and the index math is the unit-tested `reorder()` helper. It backs BOTH the queue reorder (a vertical list, board-faithful) and the TOP ARRANGE mode. **TOP-arrange divergence (flagged):** the board draws TOP-arrange as the same 3-up grid with grips; I render TOP-arrange as a **vertical rank list** (grip + rank + card + title) — the clearest, most accessible drag affordance and a 1:1 map to `orderedGameIds`. TOP **read** stays board-faithful (hero + 3-up grid). This is a deliberate presentation simplification (CLAUDE.md rule 2) → **owed-for-parvati** (owner may want the grid-drag back).
- **A5 — accept-a-rec threads through the queue, then re-reads both lists.** `RecRow` "+ QUEUE" → `POST /me/queue {source:'friend_rec', fromRecId: recId}` (the server verifies the rec belongs to the actor + matches the game). Success invalidates `Queue` AND `Recommendations` (the server may drop the consumed rec; invalidating both keeps the UI honest either way). Dismiss → `DELETE /me/recommendations/:recId` (invalidates `Recommendations`).
- **A6 — now-playing pin hand-off (WTP-03).** The UP NEXT room's Now-Playing pin renders `/me/collection`'s `nowPlaying` entry (single) + LOG HOURS (reuses the collection's log-hours mutation path); a queue row's overflow → "PIN AS NOW PLAYING" → `PUT /me/now-playing` (the existing `setNowPlaying`). The queue itself is `/me/queue`; now-playing is the collection pin, so pinning invalidates Collection+Me (and the pin re-renders from the fresh `/me/collection`).

## Browser BOOT check
**NOT RUN — the :8082 browser lane is RESERVED this run (a parvati pass needs it).** Verification is jest + curl of every seam consumed (all six live seams curl-confirmed; the two catalog endpoints curl-confirmed 404). The visual walk of every surface below is recorded **owed-for-parvati**.

## STATE-BY-STATE

### 1 · Collection TOP view — self curated (COL-13; `collection.tsx` + `TopCurated.tsx`)
| State | Board (collection-states TOP stage) | Status | Notes |
|---|---|---|---|
| TOP read — populated | "TOP view — your curated Top-10 (read)" | **OWED** | `tv-sub` caption + #1 headliner `RankSlot` (hero card + YOUR #1 / title / hours·status meta) over the 2–10 `/cell` grid with rank chips. Reads `GET /me/lists` top10; titles/hours joined from the collection cache (A2). #1 marker = `scr.accent` orange, never gold (C6/F-02). |
| TOP read — empty | decision 0050 "Empty = ghost seats + a nudge" | **OWED** | headliner ghost + ghost seats + a "Rank your favourites — tap ARRANGE" nudge. |
| ARRANGE — drag rerank | "TOP view — ARRANGE (drag-rerank)" | **OWED** | ARRANGE toggles edit mode; `DragRankList` re-rank → `PATCH /me/lists/top10 {orderedGameIds}`. DONE bar ("N / 10 SEATED" + DONE). **Divergence A4** (list not grid) → owed-for-parvati. |
| ARRANGE — CardPicker add | "+ seat → CardPicker" | **OWED** | a `+ ADD` ghost seat → `CardPicker` sheet (search your collection · ✓ toggle add/remove) → `POST/DELETE /me/lists/top10/items`. Cap-10 → `LIST_FULL` refusal. Sources your collection (A3). |
| cap-10 LIST_FULL | §0.7 code | **OWED** | at 10 seated the picker's add is refused → the "Top 10 is full — remove one first" state; the `+` seats are absent (all 10 filled). |
| ARRANGE — remove | picker ✓ toggle-off | **OWED** | tapping a seated card in the picker (✓) → `DELETE …/items/:gameId`. |
| nav in / out | board caption | **OWED** | in = the tools `view` keycap cycles …→TOP, or Profile VIEW TOP 10 / Top-3 tap; out = cycle the view keycap off TOP. |
| loading / error | §1.6 | **OWED** | list query loading → spinner; error → the collection's existing SIGNAL LOST. |

### 2 · Collection TOP view — friend read-only (`user/[id]/collection.tsx`)
| State | Board | Status | Notes |
|---|---|---|---|
| friend TOP read | "TOP view — a friend's (read-only)" | **OWED** (was EXPECTED(P5)) | reads `getUser(id).top10` (`friendTopTenEntry[]`, flattened cards). Header "COLLECTION — {NAME}", `tv-bar` "READ-ONLY · {NAME}'S CURATED TOP 10". #1 headliner + 2–10 grid. NO ARRANGE / picker / DONE. |
| friend TOP focused | decision 0050 §C card-tap target | **OWED** | reachable via `?view=top&focus=gameId`; the focused rank row gets a brief accent highlight. |
| friend TOP empty | (friend has no top10) | **OWED** | quiet "{NAME} hasn't curated a Top 10 yet." |

### 3 · Profile three doors (`profile.tsx`; decision 0050)
| State | Board (profile Top-3 set-pieces) | Status | Notes |
|---|---|---|---|
| Top-3 set-pieces | "TOP 3" 3-up cards + RankChip | **OWED** (was hours-derived placeholder) | render the top-3 ranks of `me.top10` (EntryCard `/cell` + `RankChip`). Empty top10 → the "Your curated Top 3 lands here — rank them in your Collection" nudge (no longer silently hours-derives). |
| VIEW TOP 10 door | "View top 10" link | **PRE** (already wired) | → `setCollectionView('top')` + push collection. Unchanged. |
| Top-3 card tap | decision 0050 §C | **OWED** (was → Game page) | → TOP view **focused** on that game (`setCollectionView('top')` + push `collection?focus=gameId`). |

### 4 · Discover — UP NEXT room (`discover.tsx`; WTP-01/02/03)
| State | Board (discover P1/P2/P3) | Status | Notes |
|---|---|---|---|
| Now-Playing pin | P1 `nowpin` | **OWED** | the single `/me/collection` nowPlaying entry: card + NOW PLAYING tag + title + hours·status + LOG HOURS (reuses the update-entry hours mutation). Unset → a quiet "Pin a Now Playing from your Collection." |
| queue list | P1 `qrow` list "QUEUE · N — DRAG TO REORDER" | **OWED** | `QueueRow`s from `GET /me/queue`: grip + rank + card thumb + title + sub (hours·status or REC'D BY @user + note) + right tag (IN COLLECTION `owned:true` · ★ WISHLIST `owned:false`). |
| drag reorder | P2 drag + drop-line | **OWED** | ARRANGE-style: `DragRankList` → `PATCH /me/queue/reorder {orderedItemIds}`. DONE returns to read. |
| add from collection | P1/P3 `+ ADD FROM COLLECTION` | **OWED** | a `CardPicker`-style sheet over your `/me/collection` → `POST /me/queue {gameId, source:'collection'}`. |
| remove | (row action) | **OWED** | a row overflow → REMOVE → `DELETE /me/queue/:itemId`. |
| FROM-FRIENDS recs | P4 `rec-row` FROM FRIENDS | **OWED** | `RecRow`s from `GET /me/recommendations`: thumb + REC'D BY @user + note + `+ QUEUE`. Accept → `POST /me/queue {source:'friend_rec', fromRecId}` (A5); dismiss → `DELETE /me/recommendations/:recId`. Rendered in the UP NEXT room (the recs feed lives beside the queue). |
| now-playing hand-off | design-spec §2.7 (PUT /me/now-playing) | **OWED** | a queue row overflow → "PIN AS NOW PLAYING" → `setNowPlaying` (A6). |
| cap-50 LIST_FULL | §0.7 | **OWED** | queue add refused past 50 → the "Your queue is full (50)" state. |
| empty (first-run) | P3 `invite` | **OWED** | dashed stepped ghost card + QUEUE'S EMPTY + ADD FROM COLLECTION. |

### 5 · Discover — DISCOVER room (browse slice)
| State | Board (discover P4) | Status | Notes |
|---|---|---|---|
| UPCOMING rail | P4 `rail` `rel` ReleaseRow + NotifyToggle | **EXPECTED (endpoint 404)** | `ReleaseRow` component built; the rail renders an honest "Upcoming releases arrive soon" EXPECTED-empty with the `/catalog/upcoming` cite. **NO notify-me toggle** (M7, §0.8 — NotifyToggle inert without push; not rendered). |
| FROM FRIENDS recs | P4 `rec-row` | **OWED** | same `RecRow`s as room 4 (the recs also surface in the DISCOVER room per the board's P4 landing). Accept/dismiss identical. |
| TRENDING CARDS | P4 `trend` rows | **OWED** | `TrendRow`s from `GET /discover/trending-cards`: rank chip (#1 accent) + flattened card thumb + title + "BY @designer" + `AdoptCount` (▲ N). Tap → the game page (`/game/:id`) / CardDetail. NON-COMMERCE (counts, no prices, no PIXELS). |
| trending empty / thin | P7 cold-start | **OWED** | thin catalog → a quiet "Trending is still warming up." |
| search (DISC-03) | P6 | **EXPECTED (M7)** | the header magnifier + games search defers with the M7 discovery batch (§0.8) — absent, not disabled. |
| loading / error / offline | P8/P9/P10 | **OWED** | Skeleton / SIGNAL LOST + RETRY / offline read-from-cache (writes gated). |

### 6 · CAT-12 FRIENDS-ARE-PLAYING rail (`add-game.tsx`)
| State | Board (add-game rails row grammar) | Status | Notes |
|---|---|---|---|
| rail present | add-game CAT-12 rail | **EXPECTED (endpoint 404)** | `/catalog/friends-active` 404s live → the rail renders an honest EXPECTED-empty note with the cite (ranked-by-`friendsHaveCount` when the route lands). **Not faked.** |

## Tests (jest; `apps/mobile/src/**`)
- `wtp-reorder.test.ts` — the pure `reorder()` / cap helpers (move up/down/edges, no-op, cap enforcement).
- `top-curated.test.tsx` — TOP read (rank rows + #1 headliner from lists+collection join) · empty (ghost) · ARRANGE toggle · CardPicker add/remove · cap-10 LIST_FULL state.
- `discover-route.test.tsx` — UP NEXT (queue rows + owned/WISHLIST tags + now-playing pin) · rec accept threading (source:friend_rec + fromRecId) · rec dismiss · queue LIST_FULL · room toggle · DISCOVER (trending rail render) · UPCOMING EXPECTED-empty.
- `profile-doors.test.tsx` — Top-3 from me.top10 · Top-3 tap → TOP focus route · VIEW TOP 10 route · empty top10 nudge.
- `add-game-cat12.test.tsx` — the CAT-12 rail EXPECTED-empty render.
- (route tests live under `src/`, never `app/` — the P12/P13 expo-router-bundle lesson.)

## Receipt hooks
Baseline mobile jest: **60 suites / 436 tests** (per packet brief). Exact deltas in the final report. `/health` untouched (no doc-graph change beyond this manifest + the receipt). Owed-for-parvati: every OWED row above walked on device; the TOP-arrange list-vs-grid divergence (A4); the drag feel (queue + TOP).
