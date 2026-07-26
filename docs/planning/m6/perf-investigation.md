# P6 — the progressive-degradation investigation (walk-4 Big Note)

**Date:** 2026-07-26 · **Branch:** `m6` @ `a50153e` · **Mode: INVESTIGATION ONLY — zero code changes.**
**Symptom (owner, iPhone 17, EAS dev build):** after ~30 min of continuous use the app degrades from
≥60fps to sluggish (lower framerate, stutter, slower UI feel). **A reload restores full speed.**

**Method:** static hunt across `apps/mobile` (RTK cache config, invalidation graph, skia mount paths,
effect-cleanup discipline, router topology, Reanimated loops, image path) + node-side dynamic
measurements against the shared dev stack (payload census, zod parse cost at N, and a simulation of
the RTK dev-middleware tax curve). Browser automation was not reachable from this context (the only
available lane is the preview pane, which is off-limits), so no in-browser heap/longevity run was
taken — nothing below is faked; the gaps are listed in §5.

**TL;DR verdict:** the *progressive, reload-fixes-it* part of the symptom is **predominantly
dev-runtime**: Redux Toolkit's dev-only immutable/serializable state checks deep-scan the ENTIRE
store on EVERY dispatched action, and their cost grows with the accumulated RTK cache — measured
here growing from ~1.7 ms/action (collection alone) to ~230 ms/action (large cache) **in dev**, and
**~0 ms in production posture**. The app's real structural cliffs (full-shelf refetch-per-mutation ×
always-mounted subscriber fan-out × an unvirtualized N-canvas shelf) are what *feed* that tax and
are genuine production risks at larger shelf sizes — but at today's ~18-item shelves they should not
produce the owner's 30-minute decay in a release build. §4 has the honest split; a release-build (or
checks-disabled dev) soak test is the decisive experiment.

---

## 1. Ranked causes

### R1 — RTK dev-only state-invariant middleware × growing cache (the prime driver of THIS symptom)

- **Mechanism.** `configureStore` (`apps/mobile/src/store/index.ts:31-37`) keeps the default dev
  middleware: `immutableCheck` (untouched → ON in dev) and `serializableCheck` (configured, but only
  to ignore redux-persist action types — it still scans state). In dev (`__DEV__`), **both deep-walk
  the whole store state on every dispatched action** — and RTK Query dispatches a burst of actions
  per interaction (mutation pending/fulfilled + a pending/fulfilled pair per invalidated refetch +
  subscription bookkeeping). The store state is dominated by the RTK cache, which **grows through a
  session** (each visited surface adds per-arg entries: galleries per gameId, friend profiles,
  friend collections at 31 cards each in the rich seed, feeds, catalog searches; entries pinned by
  any still-mounted subscriber never expire, others only after the 60 s default
  `keepUnusedDataFor`). Bigger cache → slower every action → *everything* feels slower: dispatch
  runs on the JS thread between every tap and its response.
- **Receipt (measured, node v20 V8, real dev-API payloads; the curve is the finding — phone-Hermes
  absolutes are a further 2–6× worse):**

  | cached state | dev checks, ms/action | prod posture |
  |---|---|---|
  | collection N=18 only | 1.69 | ~0 |
  | full standing tab set, N=18 | 6.28 | ~0 |
  | standing set + collection N=200 | 29.01 | ~0 |
  | standing set + collection N=1000 | 124.99 | ~0 |
  | standing set + collection N=2000 | 230.16 | **0.00** |

  RTK itself flagged it during the run: “ImmutableStateInvariantMiddleware took 108–158 ms … It is
  disabled in production builds.” Those warnings are themselves emitted **per slow action** in the
  app too — see R6.
- **Symptom match:** exact. Progressive (cache accrues with use), global (every dispatch), and a
  reload empties the cache → instant full recovery. Dev-only.
- **Confidence:** HIGH that this is a major (likely the dominant) dev-build term. The simulation ran
  on V8, not on-device Hermes — §5 has the closing experiment.
- **Fix:** in `store/index.ts`, disable both checks or scope them off the api slice
  (`immutableCheck: { ignoredPaths: ['api'] }`, same for serializable — or simply
  `immutableCheck: false, serializableCheck: false`; they are dev-only, production is already
  unaffected). Keep the serializable ignore list if a scoped form is kept. **Effort S · risk LOW**
  (the checks exist to catch accidental state mutation/non-serializable values; losing them off the
  api slice is a small guard-rail trade — the app's own slices can stay checked).

### R2 — full-shelf refetch-per-mutation × always-mounted subscriber fan-out (REAL; the amplifier)

- **Mechanism.** The known load-harness cliff #2, now compounded by M6's topology. `getCollection`
  is unpaginated and re-parsed with zod per fetch (`store/api.ts:227-231`). The `'Collection'` tag
  is invalidated by everyday actions: `addToCollection` (:235), `updateEntry`/Log-Hours (:245),
  `removeEntry` (:249), `setNowPlaying` (:253), **`updateCard` — the ~1.2 s-debounced styler
  autosave** (:275), `savePrivateCard` (:280), `publishCard` (:399), and `adoptCard`
  (`communityApi.ts:65-77` — a 9-tag invalidation, the widest in the app). Each invalidation is ONE
  network refetch but **every subscribed screen re-renders on the new data**, and the subscribers
  are numerous and permanent: the Collection tab (`app/(tabs)/collection.tsx:147`), Profile
  (`profile.tsx:40`), Discover (`discover.tsx:51`) — tabs never unmount by design
  (`app/(tabs)/_layout.tsx:8`) — plus **every game page retained on the stack**
  (`app/game/[id].tsx:59`). Because the refetch re-parses into all-new object identities,
  `FlipCard`'s memo (`components/collection/FlipCard.tsx:54`) and `EntryCard`'s parse memo
  (`EntryCard.tsx:73`, keyed on rider identity) are defeated wholesale: **all N shelf rows re-render
  and every live skia canvas gets a new composition prop per mutation.** During a styler session
  this fires on every editing pause.
- **Receipts:** file:lines above; load-harness-notes §3 cliff #2 (measured payload linearity);
  probe: parse alone is 0.95 ms at N=18 → 4.5 ms at N=200 → 26.5 ms at N=1000 → 35 ms at N=2000
  (V8; Hermes multiplier applies), payload ~1 KB/card.
- **Symptom match:** partial on its own — it is per-mutation jank, not time-progressive. But it is
  the **action-burst generator that R1 taxes**, and its cost grows as the session accumulates
  subscribers (stacked game pages) and cache mass. In production at today's N=18 it is small; at
  N≥200 it becomes real user-visible jank per Log-Hours/autosave.
- **Confidence:** HIGH as the amplifier and as a production risk at scale; MEDIUM as an independent
  driver of the 30-min decay.
- **Fix (fix-wave):** optimistic `api.util.updateQueryData` patches for `updateEntry`,
  `setNowPlaying`, `removeEntry` (drop their `'Collection'` invalidation); narrow `updateCard`'s
  `'Collection'` invalidation to the equipped-card case; longer-term the server cursor/limit from
  the load-harness fix seam. **Effort M · risk MODERATE** (optimistic-patch drift vs server truth —
  keep invalidation as the fallback on error; the autosave dual-write ordering already has a
  murr-history, tread carefully).

### R3 — the unvirtualized N-canvas shelf in a never-unmounted tab (REAL; the fps floor)

- **Mechanism.** Load-harness cliff #1 verbatim, restated because M6 made the tab permanent: the
  shelf is `ScrollView` + `.map()` (`collection.tsx:352`, rows :571/:626), each row a `FlipCard`
  mounting BOTH faces — a live skia `<Canvas>` front per custom card (`CardFace.tsx:163`) and an
  SVG stats back (`FlipCard.tsx:183-212`) — with no windowing or recycling. Once the Collection tab
  is visited these N Metal canvases exist for the app's lifetime, joined by Profile's ~12 seat
  canvases and any stacked game-page heroes. This is a *constant* GPU/memory floor that scales with
  shelf size, not a progressive leak — but it sets how much headroom the progressive terms eat, and
  each R2 re-render redraws all of it.
- **Receipts:** file:lines above; load-harness §3.1.
- **Symptom match:** partial — explains the *low ceiling* and mutation-time stutter, not the decay
  slope or reload recovery (a reload remounts the same canvases).
- **Confidence:** HIGH on the mechanism; its share of the 30-min slope is LOW at N=18.
- **Fix:** FlashList/FlatList windowing + flattened-thumb rendering for off-hero shelf rows past a
  size threshold (the owner's own cards have `thumbUrl` once published; live canvases could be
  reserved for hero/detail). **Effort M–L · risk MODERATE** (flip animation + measure patterns are
  device-hardened; a windowing change re-opens that surface).

### R4 — infinite Reanimated motion loops on retained/blurred screens (REAL, plausibly progressive)

- **Mechanism.** Animated cosmetics run a `withRepeat(…, -1)` UI-thread loop per motion layer
  (`src/render/animated.tsx:41-49`). Mounting is opt-in per surface, but the opt-in surfaces are
  many and several live on screens that never unmount or that pile on the stack: the Collection
  hero (`collection.tsx:534`), Profile ×2 (`profile.tsx:262,333`), Discover's now-playing row
  (`wtp/rows.tsx:171`), the Store preview (`store.tsx:895`), each stacked game page's
  `DualFaceHero` (`DualFaceHero.tsx:59`), `CardDetailSheet` (:49). Nothing gates motion on focus:
  there is **no `freezeOnBlur`/`enableFreeze` anywhere** (grep: zero hits), so a blurred tab's or a
  stack-retained screen's loops keep ticking on the UI thread (react-native-screens detaches the
  views, but the shared-value loop + derived-value mappings still run per frame). Each retained
  animated screen adds a permanent per-frame cost. The owner's walk-4 session was exercising the
  marquee/script ULTIMATEs — i.e. motion-carrying compositions were in play.
- **Receipts:** file:lines above; `hasMotion` gate `animated.tsx:30-38`; cleanup itself is correct
  (`cancelAnimation` on unmount, :47) — the issue is *mounted-but-invisible*, not a leak.
- **Symptom match:** good for the stutter component; progressive to the extent screens accumulate.
  Real (not dev-only), though dev Reanimated adds overhead.
- **Confidence:** MEDIUM — whether a detached screen's skia redraw actually executes per tick could
  not be confirmed statically (§5).
- **Fix:** gate `animate` on `useIsFocused()` (or pause the loop when the surface is blurred).
  **Effort S · risk LOW.**

### R5 — expo-router screen retention (the multiplier for R2/R4)

- **Mechanism.** The root `Stack` (`app/_layout.tsx:48-59`) and the `Tabs` group
  (`app/(tabs)/_layout.tsx`) use defaults: no `freezeOnBlur`, no `unmountOnBlur`, no
  `detachInactiveScreens` tuning; the Tabs navigator is explicitly kept "to preserve each tab's
  state across switches". Push chains within a cluster (game → contributor → user → game →
  styler …, e.g. `CatalogGamePage.tsx:93-105`, `FriendGamePage.tsx:254-309`) retain every
  intermediate screen — each with live query subscriptions (pinning cache entries past the 60 s
  reaper and joining every invalidation re-render) and hero canvases/motion loops. Mitigation
  already present: the NavBand tab keys use `router.navigate` (`ShellNav.tsx:121-122`), which
  dedupes back to the existing route and pops the stack above it — so depth resets at every tab
  press rather than growing all session.
- **Symptom match:** contributes progressively *between* tab presses; bounded by navigation habits.
- **Confidence:** MEDIUM-HIGH as a multiplier, LOW as the primary driver.
- **Fix:** `freezeOnBlur: true` on the root Stack screenOptions (react-freeze stops re-render of
  retained screens — directly cuts R2's fan-out); consider `unmountOnBlur` for the heavy FlowTakeovers
  (styler/device). **Effort S · risk MODERATE** (freeze can mask focus-dependent effects; needs a
  walk of the flip/measure/autosave surfaces afterwards).

### R6 — dev LogBox/warning accumulation (dev-only, self-amplifying with R1)

- **Mechanism.** In dev builds every `console.warn`/`error` is retained by LogBox with component
  stacks. Once the cache is big enough that the RTK checks cross their 32 ms threshold, **the
  middleware emits a warning per slow action** (observed in the probe output) — so the degradation
  itself starts generating per-action string/stack work and an unbounded retained log array,
  compounding the slope. Any other recurring dev warning rides the same lane.
- **Symptom match:** progressive, dev-only, reload-clears. **Confidence:** MEDIUM (not observed
  on-device; inferred from the mechanism + probe warnings).
- **Fix:** falls out of R1's fix (no slow checks → no warnings). **Effort — (included in R1).**

### R7 — image path: `max-age=0` thumbs + bare RN `<Image>` (minor today, real at gallery scale)

- **Mechanism.** Flattened renders are served with `Cache-Control: public, max-age=0` + weak ETag
  (verified live against `/media/cards/<id>/thumb.png` on :4000), and cross-user surfaces draw them
  through a plain RN `<Image>` (`FlatCardImage.tsx:71`) — no `expo-image`, no cachePolicy/
  recyclingKey anywhere in `apps/mobile/src`. Every remount revalidates and re-decodes; unwindowed
  galleries request all thumbs at once. Immutable-once-published content earning zero far-future
  caching is pure waste; the `// R2 + CDN before the M6 beta` intent at `apps/api/src/app.ts:54`
  already owns the server half.
- **Symptom match:** weak for the 30-min slope (system caches bound the memory); real jank on
  cross-user browsing at scale. **Confidence:** HIGH on mechanism, LOW on symptom share.
- **Fix:** `expo-image` with a cache policy on `FlatCardImage` (S), far-future headers with the
  planned CDN move (already-scoped M6-beta work).

### Checked and CLEARED (the accumulation classes that are NOT leaking)

- **Timers/listeners discipline** — every `setTimeout`/`setInterval`/`addEventListener` audited has
  matching cleanup: the styler autosave + retry + 15 s tick (`app/styler/[gameId].tsx:381-401`), the
  device autosave with exit-flush (`app/device.tsx:155-171`), store tick (`app/store.tsx:108-113`),
  KeyboardLift (`KeyboardLift.tsx:66-75`), PulledSheet/collection BackHandler subs, Toast dwell
  (`Toast.tsx:62-66`), StickerBandLayer's bounded 30-frame rAF with `cancelAnimationFrame`
  (`StickerBandLayer.tsx:93-118`), hold-repeat timers (TransformDrawer/StickerSteppers/HoldFill).
- **redux-persist** — prefs slice only (`store/index.ts:23-27`); the RTK cache is never serialized.
- **PulledSheet** — returns `null` when closed (`PulledSheet.tsx:84`); sheets don't stack up.
- **Mutation cache entries** — hook-scoped, replaced per trigger; bounded.
- **Feed/ledger pagination** — component-state accumulation with reset-on-page-1 + dedupe
  (`feedApi.ts:12-22`); bounded by scroll depth, cleared on reload.
- **Skia module preload** — one-time memoized (`CardFace.tsx:55-62`).
- **Motion-layer unmount** — `cancelAnimation` in the loop hook's cleanup (`animated.tsx:47`).
- **CelebrationHost** — renders null when idle; the `/me/achievements` subscription is one entry.
- **No polling anywhere** (`pollingInterval` grep: zero) and no `keepUnusedDataFor` overrides
  (default 60 s reaper stands for unsubscribed entries).

---

## 2. Measurements taken (receipts for the numbers above)

Probe: a transient `tsx` script (run 2026-07-26 against the shared dev API :4000 as
`demo@ingame.app`, deleted after the run — zero repo footprint). Node v20.19.6 / V8 on the dev box;
**treat absolutes as a lower bound for phone-Hermes, the shapes/curves as the finding.**

- **Standing tab-set payloads (demo account, N=18 shelf):** `/me/collection` 17.7 KB ·
  `/me` 6.1 KB · `/me/achievements` 5.3 KB · `/me/feed` 11.9 KB · `/discover/trending-cards`
  8.9 KB · `/cosmetics` 4.8 KB · `/catalog/popular` 4.6 KB · `/me/queue` 3.4 KB · the rest <1 KB.
  ≈ 66 KB resident cache after simply visiting the four tabs — before any game pages, galleries, or
  friend shelves join it.
- **`collectionResponseSchema.parse` per refetch:** 0.95 ms @ N=18 → 2.1 @ 50 → 4.5 @ 200 →
  26.5 @ 1000 → 35.2 ms @ N=2000 (payload ~1 KB/card — 1.9 MB at 2000). This cost fires on EVERY
  `'Collection'` invalidation (R2's list), on the JS thread.
- **Dev-middleware tax:** the R1 table. Prod posture (checks off): 0.00 ms/action at every size.
- **Media headers (live):** `Cache-Control: public, max-age=0` + `ETag` + `Last-Modified` on
  `/media/cards/*/thumb.png` (R7).
- **Observation (not P6):** the shared :4000 API was found DOWN once mid-investigation and was
  restarted via `dev-stack.mjs up`; the probe also saw keep-alive resets (5 s server keep-alive
  timeout) on idle-then-reuse sockets. Logged for doctor-nick, not chased here.

## 3. How the terms compose into "30 minutes to sluggish, reload fixes it"

Session accrual (galleries, friend 31-card shelves, searches, feeds, stacked screens) grows the
cache → **R1's per-action tax climbs** (super-linear once payloads dominate) → every tap's action
burst (R2 makes bursts of ~6–20 actions common; the styler autosave makes them *per editing pause*)
stalls the JS thread for tens-to-hundreds of ms in dev → touch response and JS-driven animation
degrade app-wide, while R3's canvas floor + R4's background motion loops eat the UI-thread/GPU
headroom that would otherwise hide it. Reload: the RTK cache, LogBox array, nav stack, and retained
screens all reset → instant recovery. Every term matches the reload signature; only R1/R6 are
dev-exclusive.

## 4. The honest dev-vs-real split (the owner's direct question)

**Mostly dev — with real cliffs underneath.**

- **Dev-only, will NOT ship:** R1 (the checks are compiled out of production middleware) and R6
  (LogBox). On the evidence, these carry the bulk of the *progressive* slope at today's data sizes —
  the measured prod-posture cost of the same dispatch load is ~zero. Dev builds also pay the general
  overheads (dev-mode React invariants, Metro-served JS, Reanimated dev checks), which lower the
  starting ceiling but are constant, not progressive.
- **Real, ships, but sub-threshold at N=18:** R2 (a full-shelf refetch + re-parse + all-subscriber
  re-render per everyday mutation — at N=18 that's ~1 ms parse + a modest re-render; at N=200+ it is
  genuine per-tap jank), R3 (the N-canvas floor), R4 (background motion loops), R7 (image churn).
  These are the load-harness cliffs restated: they bound the app's scaling, and they deserve the fix
  wave regardless of the dev diagnosis.
- **What a release-build test proves:** a 30-minute TestFlight/release-configuration soak
  reproducing the owner's walk. If the decay vanishes → R1/R6 confirmed as the slope and the fix
  wave prioritizes them as dev-QoL + tackles R2/R3 as scaling work. If decay persists → R4/R5 (the
  real accumulation candidates) move to the top and get instrumented on-device. A cheaper 5-minute
  proxy: a dev build with the two checks disabled — if the slope flattens, R1 is proven without
  waiting on a build lane.

## 5. What could NOT be determined + the instrumentation to close it

1. **On-device confirmation of R1's dominance** — the tax curve was simulated on V8 with real
   payloads, not profiled on the iPhone. Close with: the checks-disabled dev build A/B (5 min), or
   Instruments' Time Profiler during minute-25 of a walk.
2. **Whether detached (blurred/stacked) screens' skia canvases actually redraw per motion tick**
   (R4's magnitude). Close with: a frame-counter log in `useLoopPhase`'s derived value while the
   surface is blurred, or Metal System Trace.
3. **Real cache-size trajectory over an owner-shaped 30-min session** (how big does `state.api`
   actually get?). Close with: a `__DEV__`-only interval logging
   `JSON.stringify(store.getState().api).length` + entry count each minute — 10 lines, removable.
4. **JS heap growth curve on-device** (rules out a genuine JS leak this static pass found no
   candidate for). Close with: Hermes sampling profiler / `performance.memory` polling in the dev
   client, or the web lane's DevTools heap timeline when a browser-automation lane is available.
5. **LogBox volume during the owner's session** (R6's share) — needs the device, one glance at the
   LogBox badge count at minute 25.

## 6. Proposed fix-wave order (post-owner review)

| # | Fix | Addresses | Effort | Risk |
|---|---|---|---|---|
| 1 | Disable/scope the dev immutable+serializable checks in `store/index.ts` | R1+R6 (the dev slope) | S | Low |
| 2 | `useIsFocused` gate on `animate` surfaces | R4 | S | Low |
| 3 | Optimistic `updateQueryData` for updateEntry/setNowPlaying/removeEntry; narrow `updateCard`'s Collection invalidation | R2 | M | Moderate |
| 4 | `freezeOnBlur` on the root Stack (after #3, re-walk flip/autosave surfaces) | R5→R2/R4 | S–M | Moderate |
| 5 | `expo-image` in FlatCardImage (+ the already-planned CDN/far-future headers) | R7 | S | Low |
| 6 | Shelf virtualization + flattened-thumb rows past a size threshold | R3 (pre-beta scaling, pairs with the load-harness server seam) | M–L | Moderate |

A release-build soak (§4) should land between #1–2 and #3+ — it decides how much of the remaining
budget is dev-QoL vs product work.
