# P9 — Friend-view surfaces manifest (friend profile · friend collection · SOC-11 entry detail · game-page friendsWhoOwn)

> **Packet:** M6 P9 (client · Opus). **Branch:** `m6`. **Scope:** `apps/mobile/**` only.
> **Boards:** `profile/profile-states.html` (friend artboards) · `collection/collection-states.html`
> (friend read-only COL-10/11 + friend TOP) · `game-page/game-page-states.html` (M5 ABOUT friends-who-own
> + M7 friend-view). **Spec:** SOC-02/11 · COL-10/11 · PROF-03/05 · MOD-09 · CARD-22 · CAT-09c.
> **Server seams (LIVE, P1+P2 — 19e8e81/5906560/bad9a63):** `GET /users/:id` (friend/full vs
> non-friend/limited vs 404-unavailable) · `GET /users/:id/collection` (COL-10) · `POST /friends/requests`
> (live ADD FRIEND + the 409 family) · `GET /catalog/games/:id/friends-who-own` (CAT-09c) ·
> `POST /me/blocks` (block, live) · `POST /reports` (P7-pending — 404s live). Compare has its own manifest.

## Routes + files (all new)
- `app/user/[id].tsx` — friend/other-user **Profile** (friend-view mode of the Profile).
- `app/user/[id]/collection.tsx` — friend **Collection** (read-only, COL-10/11).
- `app/user/[id]/entry/[gameId].tsx` — **SOC-11 entry detail** (the game-page M7 friend artboard as a screen).
- `src/store/friendApi.ts` — `getUser` · `getUserCollection` · `getFriendsWhoOwn` · `createFriendRequest` (injectEndpoints; never api.ts).
- `src/components/social/RelationshipAction.tsx` — the ADD FRIEND / REQUESTED / FRIEND / incoming chip + the live write + 409-family handling.
- `src/components/game/EquipReadout.tsx` — **extended** with an `equipped?: EquippedReadout` branch (CARD-22 cross-user, pre-computed labels).
- `app/game/[id].tsx` — **edited**: the ABOUT tab now renders the CAT-09c friends-who-own named list (rows → `/user/[id]`).
- `src/components/ShellNav.tsx` — **edited**: `/user/` + `/compare/` are FRIENDS-context (nav pip on FRIENDS, board grammar).
- Tests: `src/user-route.test.tsx` · `src/friend-collection-route.test.tsx` · `src/friend-entry-route.test.tsx` (route tests live under `src/`, NOT `app/` — a test file under app/ breaks the expo-router bundle; the P12/P13 lesson).

## ARCH callouts
- **A1 — `/users/:id` is a UNION shape, discriminated at the seam.** The server serializer emits `FriendProfile` (friend/full) OR `PublicProfile` (non-friend/limited); a blocked/suspended/deleted/unknown target is a generic `404` (MOD-09, byte-identical). `friendApi.getUser` parses `z.union([friendProfileSchema, publicProfileSchema])` (friend tried first — it is the superset, so a `.strict()` public parse would reject the friend shape's extra keys) and the screen discriminates on `'friendsCount' in data`. No composition ever crosses (standing).
- **A2 — friend Collection does NOT literally reuse collection.tsx's inline ShelfView/GridView/ListView.** Those are file-private to `collection.tsx`, bound to the OWNER `CollectionItem` shape, and their peek-flip back (FlipCard) renders owner-only notes/rating — which the friend shape (`FriendCollectionItem`) physically lacks (COL-04/05 never serialize). Reuse is at the **vocabulary** level: the same `EntryCard` (F-20) card face, the same tools-bar browse chrome (search/sort/filter/view), the same section grammar — but a thin **read-only** parallel that cannot render a private field (there is none on the shape) and carries **no write affordances** (no Add, no Arrange, no per-entry edit). This is the correct call: the shapes differ and the private flip-back must never render cross-user. Forking the owner views into shared components would be a large refactor of unrelated code (collab-rule 3) for no read-only gain.
- **A3 — the SOC-11 entry detail composes client-side.** The contract has no dedicated single-entry path; the friend's game view = ONE `friendCollectionItem` (found in the `/users/:id/collection` payload by `gameId`) + the caller's OWN entry for the same game (from `/me/collection`, for the single-game compare fragment) + the game gallery (`/games/:gameId/cards`, to resolve the adopt-able gallery-shaped card by id). No new endpoint.
- **A4 — ADOPT-from-friend re-points the M5 `AdoptCardSheet` via a gallery lookup.** The sheet takes a `GalleryCardView` (priceForYou + components + adoptionCount). A friend's `FriendCollectionCard` carries only the flattened image + designer + equipped labels — NOT the price/components. So the entry-detail container fetches `useGetGameGalleryQuery(gameId)` and finds the card whose `id === friendCard.id`. **Found** (the card is published) → the real `AdoptCardSheet` with the personalized price. **Not found** (their card is a private/default design, or unpublished) → ADOPT is absent; the "add-to-my-collection" path (when unowned) stands in. This is the noted shape adaptation.

## STATE-BY-STATE

### 1 · Friend/other-user Profile (`app/user/[id].tsx`)
| State | Board | Status | Notes |
|---|---|---|---|
| Loading (skeleton) | profile L (skeleton) | **OWED** | `Skeleton` kit in identity→stats→doors shapes. |
| Friend/full (identity) | profile "Friend view — default" | **OWED** | IdentityBlock (avatar/name/bio/gamertags/staff) + "N FRIENDS · M MUTUAL" sub-line (friendsCount + mutualFriendsCount — REAL from the shape). |
| Relationship action | board FRIEND tag / limited ADD FRIEND | **OWED** | `RelationshipAction` off `relationship`: `none`→**ADD FRIEND** (live `POST /friends/requests`); `outgoing`→**REQUESTED** (disabled); `incoming`→an "wants to be friends — respond in Friends" hint (accept rides P8's inbox — see EXPECTED); `friend`→the **FRIEND** tag. 0069 orange `/primary` (non-acquisitive, no gold). |
| 409 family | §0.7 codes | **OWED** | `SELF_TARGET` (guarded — you can't reach your own /user/ profile as a friend action; still mapped) · `ALREADY_FRIENDS` (→ refetch, shows FRIEND) · `REQUEST_PENDING` (→ REQUESTED) · `REQUEST_COOLDOWN {cooldownUntil}` → the disabled-ADD **cooldown microcopy** ("You can send another request after {date}"). |
| VIEW COLLECTION door | board tools `VIEW COLLECTION` | **OWED** | friend-only → `/user/[id]/collection`. Absent on the limited shape. |
| COMPARE action | board tools `COMPARE` | **OWED** | friend-only → `/compare/[id]`. Absent on the limited shape. |
| staff badge | board `STAFF` roletag | **OWED** | generic STAFF via IdentityBlock `staff` (PROF-09 — tier never disclosed). |
| stats (games/hours/completion/cards/adoptions) | board STATS 6-tile | **EXPECTED(P5/P6)** | `/users/:id` does NOT yet serve the stat block / percentiles (P5 pending). Rendered as a single quiet "Their full stats, top games, device & achievements arrive with the rest of the profile read" note — NOT faked. Only friendsCount/mutualFriendsCount (which ARE served) render, in the identity sub-line. |
| Top-3 / VIEW TOP 10 | board TOP 3 | **EXPECTED(P5)** | top10 not served → absent w/ the consolidated cite. |
| achievements teaser | board ACHIEVEMENTS row | **EXPECTED(P6)** | not served → absent. |
| device row + "view in theirs" | board THEIR DEVICE + toggle (decision 0012) | **EXPECTED(P5/P6)** | `/users/:id` device payload not served → absent; the chrome-toggle can't re-theme without it. |
| privacy-limited (non-friend) | profile "Privacy-limited" | **OWED** | identity (avatar/name/member-since/mutuals) + a FRIENDS-ONLY lock-well + **ADD FRIEND** (the one action) + Report/Block in ⋯. No VIEW COLLECTION / COMPARE. |
| unavailable (blocked/suspended/deleted/unknown) | profile "unavailable" | **OWED** | the ONE generic `Unavailable` (MOD-09) on a `404`. No RETRY. |
| your-own-block "UNBLOCK" | profile "unavailable — your own block" | **GAP/EXPECTED** | the server collapses blocked to the SAME generic 404 (MOD-09 non-disclosure) — the client cannot distinguish "you blocked them" from "suspended" from `/users/:id` alone. The UNBLOCK affordance lives in **Settings → Blocked** (P12, built). Cross-referencing `/me/blocks` to special-case this one state is deferred (noted). |
| report / block entry | board ⋯ overflow (MOD-01 / SOC-09) | **OWED** | the ⋯ overflow → `ReportSheet` (target `user`) with the block-alongside. **This is the P12-EXPECTED user-report entry point, now wired.** Report submit is live-pending P7 (404s → the honest offline/error outcome). Block is a live write. |
| L1/L2 load error / offline | §1.6 | **OWED** | `LoadError` (retryable) vs `Unavailable` (404 terminal). |

### 2 · Friend Collection (`app/user/[id]/collection.tsx`, COL-10/11)
| State | Board | Status | Notes |
|---|---|---|---|
| Header + return | "COLLECTION — {NAME}" + ‹ RETURN TO PROFILE | **OWED** | self-labelled header; back → the profile. |
| shelf / grid / list views | friend default (grid) + sorted (list) | **OWED** | read-only over `/users/:id/collection`; `EntryCard` faces (F-20). Their Now-Playing hero (no LOG HOURS). |
| browse tools (search/sort/filter/view) | "browse tools (COL-11)" | **OWED** | full read-only parity: client-side query over the loaded friend items (the same D2 pattern as the owner shelf) — search · sort (A–Z/hours/owned-since) · filter (status/genre) · view-cycle. |
| NO Arrange / Add / per-entry edit | board caption | **OWED** | write tools stay owner-only (absent, not disabled). |
| entry tap → SOC-11 detail | board card-tap | **OWED** | a card/row tap → `/user/[id]/entry/[gameId]`. |
| friend TOP read-only | collection "TOP view — a friend's (read-only)" | **EXPECTED(P5)** | the friend top10 list is not served (P5) → the TOP view shows a quiet "their Top 10 arrives with the profile read" note. Hours-sorted is NOT a substitute (that would fake a curation). |
| empty | (COL-10 empty) | **OWED** | quiet "{NAME} hasn't added any games yet." |
| unavailable / offline | collection "unavailable" / "offline" | **OWED** | `404` → `Unavailable`; offline → cache (read-only, nothing to gate). |

### 3 · SOC-11 entry detail (`app/user/[id]/entry/[gameId].tsx`)
| State | Board (game-page M7) | Status | Notes |
|---|---|---|---|
| header + return | "GAME — {NAME}'S" | **OWED** | back → the friend collection. |
| their card face (flattened) | M7 dual-face left | **OWED** | `EntryCard` on the friend card's `imageUrl` (flattened, never composition). |
| gated stats readout | M7 stats back | **OWED** | HOURS · STATUS · SINCE (friend-visible); "NOTES · RATING — PRIVATE" line (COL-04/05 never serialize). |
| equipped readout | M7 `.equip` chips | **OWED** | `EquipReadout equipped={card.equipped}` (CARD-22 labels) — **rendered only when present** (absent/`{}` → quiet no-readout, never a crash). |
| card-artist attribution | M7 `CARD ARTIST` | **OWED** | `card.designer.username` when the card is custom; tap → `/contributor/[userId]` (app-wide designer-tap convention). |
| ADOPT their card | M7 primary ADOPT | **OWED (adaptation A4)** | gallery-lookup → `AdoptCardSheet` when the card is published; else absent. |
| add-to-my-collection (unowned) | M7 don't-own variant | **OWED** | when I don't own the game → an ADD-TO-COLLECTION door (reuses `addToCollection`). |
| compare-with-mine (single-game) | M7 `.compare` fragment | **OWED** | when I own the game → the side-by-side (your card · hours vs · their card, winner orange) built from my `/me/collection` entry + theirs. |
| privacy note | M7 `.privacy-note` | **OWED** | "Their notes & platforms stay private — only hours · status · since show." |
| unavailable / not-in-their-collection | — | **OWED** | game not in their shelf, or a `404` → `Unavailable`. |

### 5 · Game-page friendsWhoOwn (`app/game/[id].tsx` ABOUT tab, CAT-09c)
| State | Board (game-page M5 ABOUT) | Status | Notes |
|---|---|---|---|
| friends-who-own list | "FRIENDS WHO OWN IT — N" strip | **OWED** | `GET /catalog/games/:id/friends-who-own` → rows (avatar · name · hours when exposed) → tap `/user/[userId]`. |
| empty (no friends own it) | — | **OWED** | quiet "None of your friends own this yet." |
| catalog facts / presence / suggest-edit | M5 ABOUT rest | **EXPECTED(later)** | the aggregate game-detail read (facts/chips/PresenceStats/suggest-edit) is not built (needs the game-detail endpoint) — the existing ABOUT placeholder note stays for those; only friendsWhoOwn goes live now. |

## ASSUMPTIONS
- **AS-1** — the friend-profile STATS block: since `/users/:id` serves no stat payload at M6, the 6-tile board block is rendered as a single consolidated EXPECTED note rather than 6 empty tiles or faked zeros. Cheaper to read, honest, and self-corrects when P5 widens the shape.
- **AS-2** — `/user/[id]` + `/compare/[friendId]` render the **FRIENDS** nav pip active (per the compare + friend boards). FRIENDS is not yet a routable tab (P8) so the keycap stays inert; the pip lights to place the screen in its cluster. Collection/Profile/Store keys still navigate.
- **AS-3** — the SOC-11 single-game compare fragment uses `percentComplete` from MY entry only (the friend shape omits theirs, decision 0026) — the "DONE" axis shows "— " on their side, matching the M7 board (`68% vs —`).
- **AS-4** — the friend-collection TOP view is a **view-mode stub** (EXPECTED P5), not the hours-sorted placeholder the owner TOP once used — faking a curation cross-user would misrepresent their choices.

## GAPs (server / later)
- **GAP-1 (P5)** — `/users/:id` friend/full shape does not yet carry stats/percentiles/top10/device/now-playing/achievements-teaser. Friend profile renders those EXPECTED. Where: `apps/api` users serializer + `friendProfileSchema`.
- **GAP-2 (P6)** — achievements teaser + showcase (ACH-05) not served → EXPECTED on the profile.
- **GAP-3 (P8)** — the `incoming` relationship's ACCEPT lives in the Friends-tab requests inbox (P8). The friend profile only shows an incoming-hint, not an accept button (the transition target `requestId` isn't on `/users/:id`). Where: P8 `app/(tabs)` friends + `RequestRow`.
- **GAP-4 (decision 0012)** — "view in their device" chrome toggle needs the friend device payload (not served, GAP-1) → EXPECTED on both profile + collection.
- **GAP-5 (MOD-09)** — the "you blocked them → UNBLOCK" profile variant can't be distinguished from the generic unavailable via `/users/:id` alone; the unblock affordance is in Settings→Blocked (P12). Optional future: cross-ref `/me/blocks`.

## BOOT (browser :8082, real taps — the runbook lessons)
- demo ↔ demo_curator2 are FRIENDS in the seed. Reach `/user/{curator2 id}` (wired via the game-page friends-who-own row, or a direct nav), walk profile → VIEW COLLECTION → an entry detail → COMPARE. Confirm live shapes render. Results in the receipt.
