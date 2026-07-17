# P13 — Contributor-profile screen · build manifest

> **Surface:** `app/contributor/[id].tsx` (E8a — the designer-tap destination, CAT-07).
> **Board:** `docs/design/mockups/contributor-profile/contributor-states.html`
> (P1 self · P2 self-empty · P2b self-partial · P3 friend · P3b friend-empty · P4 privacy-limited ·
> V1/V2 VIEW ALL · L1 Skeleton · L2 Signal-Lost · L3 Offline).
> **Contract:** `GET /users/:id/contributions` (api-contract §Catalog, 0.69) · shared
> `contributionsResponseSchema` (`packages/shared/src/schemas/response/profile.ts`).
> **CLIENT-ONLY** — no `apps/api/**` edits (concurrent server agent owns it tonight). Base endpoint is
> LIVE since M5 P3; the two VIEW-ALL cursor sub-routes are DRAWN-ONLY (contract-only, unimplemented).

Status legend: **OWED** (build it) · **PRE** (exists in code — cite) · **EXPECTED(cite)** (deferred to
a later milestone, render honestly / stub) · **ASSUMPTION** (a call I made, recorded) · **GAP** (a
board/contract mismatch to flag).

---

## ARCH callouts

- **A1 — one route, three views.** The base screen + V1 (VIEW ALL cards) + V2 (VIEW ALL games) share
  ONE payload (`topCards`/`topGames` from the base endpoint). VIEW ALL is a **local view-state toggle**
  (`view: 'root' | 'cards' | 'games'`), NOT a nested route — the cursor sub-routes aren't live, so there
  is nothing extra to fetch. Back-seam from V1/V2 → `root`; from `root` → `router.back()`. **ASSUMPTION:**
  view state over sub-routes (avoids a second fetch of data the base already returned; URL-addressability
  of VIEW ALL is not needed — the taps are internal). When the cursor sub-routes land, V1/V2 graduate to
  paginated routes.
- **A2 — self vs friend discriminator.** `isSelf = me?.id === id` (from `useGetMeQuery`, already cached
  app-wide). Drives the P2/P2b **gold create-hooks** (ADD A GAME / DESIGN A CARD) vs the P3b **quiet**
  friend-empty (no hooks — you can't create for someone else).
- **A3 — limited vs full discriminator.** The non-friend/limited shape OMITS `signatureCard`/`topCards`/
  `topGames` (server `users-service.ts:125` returns `base` = `{user, stats, standing}`). So
  `isLimited = data.topCards === undefined` → render the P4 lock-well. An EMPTY friend/self shape carries
  `topCards: []` (present, empty) + `signatureCard: null` — distinguishable from limited.
- **A4 — standing/CAT-10 is server-null at M6.** `users-service.ts:120` emits `standing: null`
  unconditionally (cohort ranking rides M7). The shared schema currently types `standing: z.null()`.
  **Widen** it to `contributorStandingSchema.nullable()` (additive — `null` still parses; server literal
  `null` still assignable, no server break) so `PctPill` renders WHEN the payload eventually carries
  percentiles, and renders NOTHING today (honest). See PctPill below.
- **A5 — every card face flattened.** Contributor cards are `{ id, name, imageUrl, thumbUrl, isPremium }`
  — flattened-only, NEVER composition (OQ-122/CARD-15). Rendered through **`EntryCard`** with
  `card={{ imageUrl: thumbUrl ?? imageUrl }}` (F-20 — never hand-render an imageUrl fallback).

---

## PctPill (new component — `src/components/PctPill.tsx`)

**OWED.** The board's gold `.pct` chip (`TOP 25%`). CAT-10, threshold/privacy-gated. No PctPill exists
today (grep confirmed). Build a boxless gold chip `TOP {percentile}%`; render ONLY when the payload
carries a percentile (below-threshold / null standing = no chip — the StatTile design rule, "the chip is
enhancement"). Gold is **board-sanctioned** here (F-02 prestige/standing carve-out). Map: GAMES tile →
`standing.byGames`, ADOPTIONS tile → `standing.byAdoptions`, REACHED tile → `standing.byReach`; CARDS tile
→ never a chip (no standing metric for a raw count; matches board P1 where CARDS has no chip).
**EXPECTED(M7 CAT-10):** at M6 `standing` is null → **no chips render on any state** (the board shows them
illustratively). Recorded so parvati reads the absence as expected, not a miss.

---

## State-by-state (from the board)

### P1 — Self · populated
- **Back-seam** `‹ RETURN TO PROFILE` → `router.back()`. **PRE** `TertiaryLink chevron="leading-back"`.
- **IdentityBlock** (name · avatar · CONTRIBUTOR-SINCE sub · bio · genre gtags). **PRE**
  `src/components/IdentityBlock.tsx`. **ASSUMPTION:** the board's `CONTRIBUTOR SINCE '24 · INDIE FINDER`
  sub is decorative (the "INDIE FINDER" tagline has no field in the contract) — I render `MEMBER SINCE …`
  from `user.memberSince` via IdentityBlock's built-in sub; the tagline is dropped (**GAP** — no field).
  bio/gamertags are NOT in the contributions `user` shape (only `{id,username,avatarUrl,memberSince}`), so
  the identity block on this screen shows **name+avatar+since only** — no bio/gtags. **GAP flagged:** the
  board draws bio + genre chips; the CAT-07 payload doesn't carry them. Flag for parvati.
- **STATS** — 4 boxless tiles: GAMES(`gamesAdded`) · CARDS(`cardsDesigned`) · ADOPTIONS(`totalAdoptions`)
  · REACHED(`totalReached`), each in a `.stat` panel cell. **PRE** `StatTile` + the profile.tsx panel-cell
  pattern. PctPill per A4/PctPill above.
- **SIGNATURE CARD** hero — `hero-size` EntryCard (flattened) + `MOST ADOPTED` eyebrow + gameTitle +
  `{adoptionCount} ADOPTIONS` + **VIEW CARD** (`ScreenButton/secondary`). VIEW CARD → `/game/{gameId}`.
  **PRE** EntryCard, ScreenButton. **EXPECTED(later — community CardDetail-by-id route):** there is no
  standalone community CardDetail route; VIEW CARD + card taps route to `/game/{gameId}` (CARD-23 NAVIGATE
  — the not-owned Game page shows its graceful "NOT IN YOUR COLLECTION", already built).
- **CARDS DESIGNED** — `/cell` grid of `topCards`, each an EntryCard(cell) + `RankChip` (rank by
  adoption) → `/game/{gameId}`. **PRE** EntryCard, RankChip. `VIEW ALL ›` `TertiaryLink` → `view='cards'`.
  **ASSUMPTION:** RankChip (first=gold, rest=accent-outline) stands in for the board's cream `.rank`
  non-first marker — RankChip is the ratified component; minor tone diff (parvati 🎨 if it matters).
- **GAMES ADDED** — title rows (`crow`): title + `IN {collectionsCount} COLLECTIONS` + chevron →
  `/game/{gameId}`. `VIEW ALL ›` → `view='games'`. **GAP:** the board draws a card **thumb** per game row,
  but `contributorGame` = `{gameId,title,collectionsCount}` — **no card field**. Rows render **without a
  thumbnail** (title + reach + chevron only). Flagged — the contract omits a game render for topGames.

### P2 — Self · empty (new-user cold-start hook)
- Identity + zeroed STATS + the **hook**: `NOTHING HERE YET` + gold **ADD A GAME** + **DESIGN A CARD**.
  **PRE** `EmptyState` (the primitive; gold tone = DESIGN A CARD, neutral = ADD A GAME). **ASSUMPTION:**
  I compose a small two-button hook (EmptyState carries one action) — render EmptyState-style headline +
  two `ScreenButton`s (`add` gold for DESIGN A CARD, `primary` for ADD A GAME). ADD A GAME → `/add-game`;
  DESIGN A CARD → `/styler` **GAP:** the Styler route needs a `gameId` (`/styler/{gameId}`) — there is no
  gameless "design a card" entry (you design a card FOR a game). So DESIGN A CARD from an empty
  contributor has no target game. **ASSUMPTION:** DESIGN A CARD here routes to `/add-game` too (add a game
  first, then design) — honestly, both cold-start doors begin at catalog entry. Recorded; the gold
  DESIGN-A-CARD affordance is preserved visually, the destination is the pragmatic one.
- Gate: only when `isSelf`.

### P2b — Self · partial (games, no cards yet)
- Identity + STATS (below-threshold → **no chips**, matches A4) + **CARDS DESIGNED** section shows
  `SectionEmpty variant="contributor-hook"` (gold DESIGN-A-CARD nudge) + **GAMES ADDED** populated rows.
  **PRE** `SectionEmpty`. Section-level empties: `isSelf && cardsDesigned === 0 && gamesAdded > 0`. The
  inverse (cards, no games) is handled symmetrically (GAMES ADDED → a quiet section note; no gold, since
  ADD-A-GAME isn't the acquisitive/authorship voice the way DESIGN-A-CARD is — **ASSUMPTION**).

### P3 — Friend-view (read-only)
- Same layout as P1, `‹ RETURN TO {NAME}`. No edit/management chrome; no gold beyond PctPill + RankChip
  first. **PRE** everything P1 uses. Gate: `!isSelf && !isLimited && (has content)`.

### P3b — Friend-view · empty (no contributions)
- Identity + zeroed STATS + a **quiet** `NOTHING HERE YET` (no buttons — you can't create for them).
  **PRE** `EmptyState` with NO action (still an inviting-but-quiet frame). Gate: `!isSelf && !isLimited &&
  gamesAdded===0 && cardsDesigned===0`.

### P4 — Privacy-limited (non-friend, PROF-03)
- Identity (name+avatar+since only — limited `user` shape) + STATS persist (honest aggregates + PctPill)
  + a **lock-well**: `FRIENDS-ONLY DETAIL` + copy + **＋ ADD FRIEND** (orange `action-alt`, NOT gold).
  **OWED** — a small lock-well composed from `StateFrame`-family styling OR an inline panel; I compose an
  inline lock panel (dashed border, lock glyph, ADD FRIEND). Gate: `isLimited` (`topCards === undefined`)
  && `!isSelf`.
- **GAP — ADD FRIEND has no mutation.** No friend-request client mutation exists (grep: nothing in
  `src/store`); the server P1 friend endpoints are concurrent tonight and the P8 client flow isn't built.
  **ASSUMPTION:** ADD FRIEND → `router.back()` (return toward their main profile, where the friend action
  lives/will live at P9) — an honest, non-fake action rather than a dead button. Flag: the true
  send-request wiring is P8/P1. Recorded as the accepted M6-ordering gap.

### V1 / V2 — VIEW ALL (local views)
- **V1 cards:** head `CARDS DESIGNED`, `‹ CONTRIBUTIONS` back → `root`; a `listsum` line
  (`All {n} cards {name} has designed · {totalAdoptions} adoptions in all`) + the full `/cell` grid over
  `topCards`, each `{adoptionCount} ADOPTIONS` → `/game/{gameId}`.
- **V2 games:** head `GAMES ADDED`, `listsum` (`All {n} games … · in {totalReached} collections in all`) +
  the rows over `topGames`.
- **EXPECTED(P2 server tail):** the cursor sub-routes (`…/cards?cursor=` · `…/games?cursor=`) are NOT
  live — VIEW ALL renders over the **base top-N payload**. When `stats.cardsDesigned > topCards.length`
  (or the games equivalent), a quiet terminal footer note ("Showing the top {n} — the full list arrives
  soon") stands in for the kit's terminal state, marked EXPECTED. No fetch-more.

### L1 — Loading (Skeleton)
- **PRE** `Skeleton` kit + the game/[id].tsx GameSkeleton pattern — a local skeleton in the screen frame
  (identity bars + stat tiles + hero + a card row), solid fills. Trigger `isLoading`.

### L2 — Signal Lost (LoadError + RETRY)
- **PRE** `LoadError` (orange RETRY = `refetch`). Trigger `isError && !data && status !== 404`.

### L3 — Offline (cached, read-only)
- **EXPECTED(SYS-10 substrate).** No app-wide connectivity signal / NetInfo wiring exists (grep: only the
  `Offline` kit component + the device `OfflineStrip`; no `useOffline`/NetInfo). RTK-Query can't
  distinguish offline-with-cache from a server error without it — the sibling screens (game/[id].tsx et al)
  defer L3 the same way. L1 + L2 cover the observable states; L3 offline-strip-over-cache rides the SYS-10
  connectivity substrate (not yet built). Recorded so parvati reads L3's absence as expected.

### (correctness) MOD-09 Unavailable — not a board artboard, but a contract state
- The endpoint collapses blocked/suspended/deleted → a generic `NOT_FOUND` (contract). **PRE**
  `Unavailable` kit (terminal, GO BACK, no retry). Trigger `isError && status === 404` → `Unavailable`
  (distinct from L2's retryable network error). Recorded as a correctness measure beyond the drawn board.

---

## The app-wide designer-tap sweep (E8a — scope C)

Every designer/contributor attribution tap routes to `/contributor/{userId}`. Live render sites found:

1. **`src/components/game/CommunityGallery.tsx:84`** — the gallery cell credit `BY {designer.username}`.
   **OWED:** the designer NAME becomes a Pressable → `onViewDesigner(designer.userId)`, threaded from
   `game/[id].tsx` (`(uid) => router.push('/contributor/'+uid)`). Cell-body tap still opens the adopt
   sheet (unchanged). `byViewer` "BY YOU" → routes to self.
2. **`src/components/game/AdoptCardSheet.tsx:132`** — the inspect/adopt sheet `DESIGNED BY {name}` credit.
   **OWED:** currently the credit tap = block. Rebind the **name** → `onViewContributor(userId)` (threaded
   from `game/[id].tsx`, closes the sheet then routes); **block stays on the ⋯ overflow** (still reachable,
   just no longer the credit tap). This is the "CardDetail" of the mission list (the community card INSPECT
   IS the AdoptCardSheet).
3. **`add-game` contributor line** — **GAP / not a live site.** The client renders no contributor
   attribution in add-game today (only `ADDED TO YOUR SHELF`); the search-result `contributor:{userId,
   username}` field is unrendered. Nothing to wire. When an ADDED-BY line lands it routes here. Recorded.
4. **`CardSwitcher.tsx:99` adopted-row designer** — **deliberate skip.** The switcher row's primary
   gesture is EQUIP; the designer is a small sub-label. Routing a designer tap would fight the equip tap.
   Not in the mission's named list; left alone. Recorded.

`CardDetailSheet` (the owner's own equipped card on the Game page) has **no cross-user designer** — it's
your own card — so there is no attribution to wire there.

---

## Data layer — `src/store/contributorApi.ts` (NEW — never edits api.ts)

`injectEndpoints` on the base `api` (the communityApi precedent), new tag `Contributions`:
- `getContributions: build.query<ContributionsResponse, string>` → `GET /users/${id}/contributions`,
  `transformResponse` parses `contributionsResponseSchema`, `providesTags [{type:'Contributions', id}]`.

Shared change (NOT apps/api): widen `standing` in `profile.ts` to `contributorStandingSchema.nullable()`
(A4). Additive + server-safe.

---

## BOOT check
_(filled after build + `dev-stack up` + :8082 web verification)_

- [ ] navigate to a contributor via a gallery `BY {designer}` tap
- [ ] self view via own id (direct nav — self has no contributions link on Profile yet; see below)
- [ ] states observed / screenshots

**Self-reachability note:** the self-Profile (`(tabs)/profile.tsx`) has **no VIEW CONTRIBUTIONS link**
today (the Profile EDIT/tools row is M7). Self contributor is reachable by direct route / the gallery
"BY YOU" tap. Adding a Profile contributions entry is Profile-tools scope (M7), not P13 — left untouched.
