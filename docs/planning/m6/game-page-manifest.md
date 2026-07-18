# W-D1 — The adaptive Game page build MANIFEST (three postures on one route)

> **Packet:** M6 Wave D (client · Opus). **Branch:** `m6`. **Scope:** `apps/mobile/**` only (a
> concurrent SERVER agent owns `apps/api/**` — disjoint; never touched here). Explicit-pathspec commits.
> **Design:** [`game-page-postures.md`](game-page-postures.md) (OWNER-NODDED — the 3-posture model + the
> 4 answers, Q4 RESHAPED) · walk2-notes ROUND-3 "WAVE D — OWNER NODDED".
> **Board:** [`game-page/game-page-states.html`](../../design/mockups/game-page/game-page-states.html)
> — M1 PLAY dual-face · M2 EDIT · M3 CARDS switcher · M4 gallery→adopt · M5 ABOUT · **M6 neutral/CATALOG**
> · **M7 FRIEND dual-face + compare** · **M8 upcoming/be-first (the CATALOG empty variant)**.
> **Spec:** CARD-22/23 · COL-01/02/03/04/05 · CAT-05/06/09/09c · SOC-11 · PROF-03 · DISC-01 · ECON-03/04.
> **Server seams (all LIVE):**
> - **OWN** posture — `GET /me/collection` (`useGetCollectionQuery`, find by `gameId`); today's live source.
> - **CATALOG / ABOUT facts** — `GET /catalog/games/:id` → `gameDetailSchema` (W-C5, `50fd467`): canonical
>   facts + genres + CAT-05 `contributor` + CAT-09 `collectionsCount`/`friendsHaveCount` + CAT-09c
>   `friendsWhoOwn` + the own-it `inCollection`. **No CLIENT endpoint exists yet — this packet adds it** (GAP-1).
> - **Community CARDS** — `GET /games/:id/cards` → `getGameGallery` (communityApi, LIVE, posture-independent).
> - **FRIEND** posture — `GET /users/:id/collection` → `getUserCollection` (find by `gameId`; the SOC-11
>   read: their flattened card + CARD-22 `equipped` readout + hours/status/ownedSince) + the inline
>   single-game compare composes client-side from MY `/me/collection` entry + theirs (Q1 — no compare
>   endpoint needed for the fragment; `GET /me/compare/:friendId` remains the door for the FULL compare).
> - **Adopt** — the M5 `AdoptCardSheet` targets a collection ENTRY (ECON-03/04). FRIEND adopts-their-card
>   via a gallery lookup (A4); **CATALOG does NOT adopt (Q4 reshape) — adoption routes through Add-Game.**

---

## 1 · THE POSTURE RESOLVER (one route `/game/[id]`, data + one param)

```
via      = useLocalSearchParams().via          // <friendUserId> | undefined
myEntry  = /me/collection.items.find(gameId)   // the OWN check + my copy for compare
detail   = GET /catalog/games/:id              // ABOUT fill (ALL postures) + CATALOG PLAY facts

posture =
  via  ? 'FRIEND'                               // came through a friend's shelf/compare/now-playing
  : myEntry ? 'OWN'                             // today's behaviour, unchanged
  : 'CATALOG'                                   // unowned, no friend context
```

- **Q2 — owned + friend context.** `via` present AND `myEntry` exists → **FRIEND wins** (you came to
  see THEIRS). A **"VIEW YOUR COPY"** tertiary swaps to OWN by re-navigating `/game/[id]` **without**
  `via` (`router.replace` to drop the param; the same route re-renders OWN — expo-router re-renders a
  dynamic route on param change, it does not remount, `game/[id].tsx:99`).
- **Upgrade-in-place.** Add-from-CATALOG → `addToCollection` invalidates `Collection` → `myEntry`
  resolves → the page re-renders **OWN** at the same URL (shareable / back-stackable). No route change.
- **F-16 / hook-lint — ALL hooks unconditional.** The resolver runs BEFORE the posture branch: every
  query fires each render, gated only by RTK `{ skip }`, never by an early return.
  `useGetUserCollectionQuery(via, { skip: !via })` · `useGetGameDetailQuery(id)` (fires all postures —
  ABOUT needs it everywhere) · `useGetGameGalleryQuery(id, { skip })` for the FRIEND adopt-their-card
  lookup. The current file already front-loads ~15 unconditional hooks before its L1/L2 returns
  (`game/[id].tsx:53-97`); the new reads join that block. **This is the single riskiest structural
  move — see ASSUMPTION AS-1.**

## 2 · Routes + files

| file | change |
|---|---|
| `app/game/[id].tsx` | **the packet** — posture resolver + FRIEND/CATALOG branches + ABOUT fill. Keep the OWN path byte-faithful. |
| `src/store/catalogRailsApi.ts` | **edited** — add `getGameDetail` (`GET /catalog/games/:id` → `gameDetailSchema`) to the existing catalog injectEndpoints slice (`useGetGameDetailQuery`). NOT api.ts (injectEndpoints convention; api.ts is also touched by no one here, but the slice keeps the pattern). |
| `src/components/game/FriendPlayTab.tsx` | **new** — the FRIEND PLAY body (absorbs the retiring route's content: their dual-face + gated stats + CARD-22 readout + card-artist + adopt-their-card + compare-with-mine + add-if-unowned). |
| `src/components/game/CatalogHeader.tsx` | **new** — the CATALOG neutral band (M6): NOT-IN-YOUR-COLLECTION + **ADD TO COLLECTION** (orange `/primary`) + UP NEXT + RECOMMEND, pinned above ABOUT. |
| `src/components/game/EquipReadout.tsx` · `AdoptCardSheet.tsx` · `CommunityGallery.tsx` | **reused as-is** (posture-independent). `EquipReadout` already carries the `equipped?` branch (P9). |
| `app/user/[id]/entry/[gameId].tsx` | **DELETED** (route retirement — §5). Its file-private `SingleGameCompare`/`StatRow`/`factsLine` migrate into `FriendPlayTab`. |
| `app/user/[id]/collection.tsx` · `app/user/[id].tsx` · `app/compare/[friendId].tsx` | **edited** — entry-point rewiring (§4). |
| tests | `src/game-posture-route.test.tsx` (new — resolver × posture matrix, under `src/` NOT `app/`) · delete `src/friend-entry-route.test.tsx` · fix the 3 route tests' expected push targets (§5). |

## 3 · STATE MATRIX — POSTURE × TAB

Legend: **OWED** (build now) · **PRE**(code-cite = already live, keep) · **EXPECTED**(cite = deferred,
proceed) · **ASSUMPTION** · **GAP**(server/later).

### 3.1 · OWN posture (`inCollection`, no `via`) — today's page, hold faithful
| Tab | Cell |
|---|---|
| **PLAY** | **PRE** `game/[id].tsx:283-318` — dual-face hero (live composition) · `PlayDossier` (per-row EDIT COL-02/03/05 + WTP-03 now-playing) · SWITCH CARD · SHARE. Unchanged. |
| **CARDS** | **PRE** `game/[id].tsx:320-337` — `CardSwitcher` (your cards, OQ-133 default-card-limited) + `CommunityGallery` → adopt (targets your entry, ECON-03). Unchanged. |
| **ABOUT** | **OWED** — replace the stub (`:338-351`) with the game-detail fill: canonical facts · genre chips · studio/publisher · CAT-05 contributor credit · CAT-09 `PresenceStats` (collections/friends-have/community-cards). **PRE** `FriendsWhoOwnSection` (`:501`, CAT-09c) stays. This is the W-C5 ABOUT client half — same fill serves FRIEND + CATALOG ABOUT. |

### 3.2 · FRIEND posture (`?via=<friendUserId>`) — M7 board; absorbs the retired route
| Tab | Cell |
|---|---|
| **PLAY** | **OWED** — THEIR dual-face read-only (M7): `EntryCard` on the friend card's flattened `imageUrl` (never composition, OQ-122) · gated stats back HOURS/STATUS/SINCE + "NOTES·RATING — PRIVATE" (COL-04/05 never serialize) · CARD-22 `EquipReadout equipped={card.equipped}` rendered ONLY when present · card-artist → `/contributor/[userId]`. **Primary = ADOPT their card** (A4 gallery lookup → `AdoptCardSheet`, when their card is published) · **COMPARE** door → `/compare/[friendId]` · the **inline single-game compare fragment** (Q1 — your card vs theirs, winner orange; % on your side only, decision 0026) when you own the game · **ADD TO COLLECTION** when you don't (`addToCollection`). Direct port from `app/user/[id]/entry/[gameId].tsx:119-201`. |
| **CARDS** | **OWED** — the **community gallery ONLY**, NO switcher (not your shelf): `CommunityGallery` browse + adopt. FRIEND adopt = the SAME ECON-03 sheet (adopting a friend's game's card creates YOUR entry+card via the AdoptCardSheet's own path); it is community-card acquisition, allowed from FRIEND. |
| **ABOUT** | **OWED** — identical to OWN's fill (shared game-detail read). friendsWhoOwn included. |
| header | **OWED** — the M7 title strip carries a friend tag (board: `RIKO'S` chip beside GAME) + the ⋯ overflow (report the game; NO remove — not your entry). |

### 3.3 · CATALOG posture (no entry, no `via`) — M6 neutral / M8 upcoming
| Tab | Cell |
|---|---|
| **PLAY** | **LOCKED** (M6 board `:823`, M8 `:973`) — the switcher's PLAY key wears a padlock; not a reachable tab until you own it. **Default tab = ABOUT.** |
| **CARDS** | **OWED** — `CommunityGallery` **browse only, NO adopt** (Q4 reshape: no adopting a card for a game you don't own — adoption goes THROUGH Add-Game). The gallery renders the faces + adoption counts; the adopt affordance is suppressed in CATALOG (a "add the game to adopt" bridge is Add-Game's job, W-C10). Empty gallery → the **be-first** doorway (M8 `:964`, §1.7) → DESIGN THE FIRST CARD (CAT-05). |
| **ABOUT** | **OWED** — the game-detail fill (same as OWN) + the **`CatalogHeader` neutral band pinned up top** (M6 `:795`): NOT-IN-YOUR-COLLECTION + **ADD TO COLLECTION** (orange `/primary`, non-acquisitive add) + UP NEXT (WTP) + RECOMMEND. So the key action never hides behind a tab. |
| **M8 upcoming sub-state** | **EXPECTED(later)** — DISC-01 not-out-yet (desaturated hero + UPCOMING badge/date) + NOTIFY ME (NOTIF-01) needs a `releaseDate`-in-future read + a notify write — **neither is served** (game-detail carries `releaseDate` but no "upcoming" affordance/notify endpoint). Render the be-first + UP NEXT honestly; the badge/NOTIFY ride M7 push. See GAP-3. |

## 4 · Entry-point rewiring (friend rows + compare + Add-Game inspect)

| site | today | rewire to |
|---|---|---|
| `app/user/[id]/collection.tsx:97` (`openEntry`) | `/user/${id}/entry/${gameId}` | `/game/${gameId}?via=${id}` |
| `app/user/[id].tsx:197` (`FriendNowPlaying` onOpen) | `/user/${data.id}/entry/${gameId}` | `/game/${gameId}?via=${data.id}` |
| `app/compare/[friendId].tsx:115` (`onOpenTheirs`) | `/user/${friendId}/entry/${gameId}` | `/game/${gameId}?via=${friendId}` |
| `app/compare/[friendId].tsx:114` (`onOpenYours`) | `/game/${gameId}` | **unchanged** (OWN) |
| **Add-Game inspect chevron (Q3)** — `app/add-game.tsx` `FocusedMeta` (`:281`, used by both search results `:175` and each `RailFan` `:266`) | ADD is the row action; NO inspect today | **add a chevron/INSPECT affordance** on the focused item's meta → `/game/${item.id}` (resolves CATALOG if `!inCollection`, OWN if owned). Mirrors the B7 shelf-chevron grammar. **Subtlety — SUBTLE-A:** Add-Game is a CardFan, not a row list, so the chevron attaches to `FocusedMeta`, not per-row. |
| Discover trend-through / feed / friendsWhoOwn / contributor cells (`discover.tsx`, `friends.tsx`, `profile.tsx`, `contributor/[id].tsx`) — all push `/game/${gameId}` today | `/game/${gameId}` | **no change needed** — they resolve OWN-else-CATALOG automatically once CATALOG posture exists. (Optional: a `FriendsWhoOwnSection` row `game/[id].tsx:518` could carry `?via=userId` since it's ABOUT that friend — deferred, cheap, not required.) |

## 5 · Route RETIREMENT — `/user/[id]/entry/[gameId]`

**Who links to it TODAY** (all rewired in §4): `user/[id]/collection.tsx:97` · `user/[id].tsx:197` ·
`compare/[friendId].tsx:115`. **Its content becomes the FRIEND posture PLAY tab** (`FriendPlayTab`).
Retirement steps:
1. Rewire the 3 call sites (§4) → `?via=`.
2. Migrate the route's file-private `SingleGameCompare` / `StatRow` / `factsLine` (`entry/[gameId].tsx:206-261`) + the ADOPT/ADD/compare logic into `FriendPlayTab`.
3. **Delete** `app/user/[id]/entry/[gameId].tsx` + its test `src/friend-entry-route.test.tsx`.
4. Fix the 3 route tests whose expected push target changes: `compare-route.test.tsx:94` · `friend-collection-route.test.tsx:107` · `user-route.test.tsx:196` (all `/user/…/entry/…` → `/game/…?via=…`).

## 6 · FRIEND read-only rules (the invariants)
- **Their PLAY is read-only** — no EDIT/LOG-HOURS/remove/now-playing on a friend's game; the overflow
  carries only REPORT (the game), never a mutation of their entry.
- **Flattened-only, never composition** (OQ-122/CARD-15) — the friend card renders as an image via
  `EntryCard` (`imageUrl`/`thumbUrl`); no live skia. `equipped` labels + `designer` only.
- **Privacy gate (PROF-03/COL-04/05)** — HOURS/STATUS/SINCE show; NOTES/RATING/PLATFORMS are physically
  absent from the shape (the F06 allowlist) → the "PRIVATE" line, never a leaked field.
- **compare-with-mine** = the inline single-game fragment (Q1), % on your side only (decision 0026);
  the full COMPARE door → `/compare/[friendId]`.
- **adopt-their-card** = A4 gallery lookup: find the card whose `id === friendItem.card.id` in
  `getGameGallery(gameId)`; found (published) → real `AdoptCardSheet` with the personalized price; not
  found (private/default/unpublished) → ADOPT absent, the add-to-collection path stands in.
- **CARDS = community gallery only** — no switcher (that's your shelf).

## 7 · CATALOG rules (Q4 reshape — the load-bearing one)
- **ABOUT + community CARDS + ADD TO COLLECTION.** PLAY locked; ABOUT default.
- **NO adopt in CATALOG** (owner Q4 RESHAPE, walk2-notes ROUND-3): you cannot adopt a card for a game
  you don't own. The CommunityGallery renders in browse-only mode (faces + counts, adopt suppressed).
  **Adoption for an unowned game routes through Add-Game** (the W-C10 community-cards step — a SEPARATE
  packet; this manifest only guarantees CATALOG does NOT offer adopt).
- **ADD TO COLLECTION** is the orange `/primary` non-acquisitive add (0069; NOT gold — no PX spent).
  On success the page upgrades in place to OWN (§1).
- **be-first** (empty gallery) survives — DESIGN THE FIRST CARD (gold/`add`, F-02 card-creating).

## 8 · ARCH callouts
- **A1 — one file, resolver-branched, hooks-first.** No new routes; `/game/[id]` fans by posture after
  a hooks block that runs identically for all three. The OWN path must stay behaviourally identical
  (the walk-signed M4/M5 surface) — treat it as a refactor-around, not a rewrite.
- **A2 — game-detail is the shared spine.** ABOUT fill is one component fed by `getGameDetail` across
  all three postures; CATALOG additionally uses it for the PLAY-block hero/facts (no collection entry
  to source them from). OWN keeps sourcing PLAY facts from its collection entry (already live) — do NOT
  re-plumb OWN's hero through game-detail (avoid a needless behaviour change / extra dependency on the
  hot path).
- **A3 — FRIEND composes client-side (unchanged from P9 A3/A4).** No dedicated single-entry endpoint;
  one `friendCollectionItem` (by gameId) + my `/me/collection` entry (compare) + the gallery (adopt
  lookup). The retirement moves this composition from a route to a tab — same data, same seams.
- **A4 — CATALOG suppresses adopt structurally, not cosmetically.** Pass a `canAdopt={posture!=='CATALOG'}`
  (or omit the `onInspect`/adopt wiring) into `CommunityGallery` so a CATALOG gallery has no adopt path
  at all — the sheet is never mountable there. Prevents a Q4 violation slipping in via the shared component.
- **A5 — ShellNav context.** `/game/[id]` keeps COLLECTION active for OWN/CATALOG (today's behaviour,
  `ShellNav.tsx`); a `?via=` FRIEND view is board-drawn with the **FRIENDS** pip active (M7 nav-band).
  Confirm ShellNav lights FRIENDS when `via` is present (mirrors the friend-view cluster rule) — see
  ASSUMPTION AS-4.

## 9 · ASSUMPTIONS (the trickiest — what the build must resolve)
- **AS-1 (STRUCTURAL, highest risk) — the unconditional-hooks refactor.** The OWN file returns early for
  L1/L2/!entry (`game/[id].tsx:116-143`) with ~15 hooks already above those returns. FRIEND + CATALOG
  add reads (getUserCollection/getGameDetail/getGameGallery) that MUST sit above ALL branch returns and
  fire (skip-gated) in every posture, or hook-lint/F-16 breaks and the render order desyncs across
  postures. **Recommended shape:** a thin `GamePage()` that resolves posture + runs every hook, then
  delegates the body to `<OwnBody>`/`<FriendPlayTab>`/`<CatalogBody>` — each a plain render fn (NO
  hooks of its own that vary by posture, or lift them up). The per-game reset effect (`:103-113`) must
  also clear `via`-derived state. Verify with a posture-switch test (OWN→VIEW-YOUR-COPY→OWN, CATALOG→add→OWN).
- **AS-2 — VIEW YOUR COPY mechanism (Q2).** Assumed `router.replace('/game/'+id)` (drop `via`) so the
  same screen re-renders OWN without a history push (you don't want a back-stack of via/no-via of the
  same game). If the owner wants the friend view kept on the stack, use `push` — flagged for the eye.
- **AS-3 — CATALOG default-tab + PLAY-lock.** Assumed: CATALOG opens on ABOUT with PLAY locked (M6/M8
  boards), NOT a bespoke "PLAY replaced by a CTA block" screen (the postures-doc table's looser wording).
  The board is the tie-breaker (truth-precedence): tabs stay PLAY/CARDS/ABOUT with PLAY padlocked and
  ADD pinned in ABOUT. Same lock applies to M8 upcoming.
- **AS-4 — nav pip for FRIEND.** Assumed a `?via=` game view lights the FRIENDS pip (M7 board) while
  OWN/CATALOG light COLLECTION. If ShellNav can't cheaply read the query param, degrade to COLLECTION-active
  (the screen still reads as "a game") — noted, low-stakes, matches the P9 AS-2 inert-pip precedent.
- **AS-5 — CATALOG gallery adopt-suppression is the Q4 guard.** Assumed `CommunityGallery` grows a
  browse-only mode (A4). If instead the gallery is left adopt-capable in CATALOG, that VIOLATES the
  owner's Q4 reshape — this is the one place a careless reuse breaks the ruling. Must be structural.
- **AS-6 — Add-Game inspect chevron placement (Q3/SUBTLE-A).** Assumed the chevron rides `FocusedMeta`
  (the focused card's meta line), not a per-card overlay, because Add-Game is a CardFan. If the owner
  expects an affordance on every fanned card, that's a CardFan change — flagged.

## 10 · GAPs (server / later)
- **GAP-1 (this packet closes the client half)** — `GET /catalog/games/:id` is LIVE server-side (W-C5
  `50fd467`) but has **no client endpoint**; add `getGameDetail` to `catalogRailsApi`. `gameDetailSchema`
  already exists in `@ingame/shared`. No server work.
- **GAP-2 (W-C10, separate packet)** — CATALOG cannot adopt; the "add-the-game-to-adopt" bridge is the
  Add-Game community-cards step (OQ-136 reopened). This manifest guarantees CATALOG has no adopt; it does
  NOT build the bridge.
- **GAP-3 (M8 upcoming, EXPECTED)** — DISC-01 not-out-yet badge + NOTIF-01 NOTIFY ME need an upcoming
  read + a notify write; neither is served. Render be-first + UP NEXT honestly; badge/NOTIFY ride M7 push.
- **GAP-4 (RECOMMEND, EXPECTED)** — the CATALOG band's RECOMMEND (and the M6 neutral RECOMMEND) needs
  `POST /recommendations` + the compose sheet (P4 server live; the compose UI is P8/OQ-075 client) —
  the shared compare GAP-1. Route to the friend's collection / quiet EXPECTED CTA; no fake write.

## 11 · BOOT (browser :8082, real taps — the runbook lessons)
`node scripts/dev-stack.mjs up` → `doctor` on friction. demo login. demo ↔ demo_curator2 are seed friends.
1. **OWN** — Collection → a game → confirm PLAY/CARDS/ABOUT all render; ABOUT now shows facts/genres/
   studio/contributor/counts (not the old stub). Regression-check the M4/M5 surface is untouched.
2. **CATALOG** — Add-Game → search a game you don't own → the INSPECT chevron → `/game/[id]` opens on
   ABOUT, PLAY padlocked, ADD TO COLLECTION pinned, CARDS gallery browse-only (NO adopt). Tap ADD →
   the page upgrades to OWN in place.
3. **FRIEND** — open demo_curator2's profile → VIEW COLLECTION → a game row → confirm the URL is
   `/game/[id]?via=<curator2>`, their read-only dual-face + gated stats + compare-with-mine + adopt-their-card
   render; CARDS = gallery only (no switcher); VIEW YOUR COPY swaps to OWN for a shared game. Also reach it
   via Compare (their card) and the friend's now-playing row.
4. **Retirement** — confirm `/user/[id]/entry/[gameId]` is gone and no surface 404s reaching a game.
Mobile jest: `npm -w @ingame/mobile test` (NEVER bare npx jest). Result → the wrap-up receipt.
