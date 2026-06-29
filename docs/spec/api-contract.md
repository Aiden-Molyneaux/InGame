# InGame — API Contract (DRAFT)

> The **frontend↔backend seam**: endpoints and payload shapes. This is a **first draft** — it will
> be refined alongside the design-spec, because screens reveal exactly what each call must return.
> Behavior lives in [`product-spec.md`](product-spec.md); shapes live here. Referenced by ID.

**Version:** 0.34 (draft) · **Last updated:** 2026-06-28 · **Owner:** Claude Code

---

## Conventions

- **Base URL:** environment-configured (SYS-03). All paths below are relative to `/api`.
- **Auth:** `Authorization: Bearer <accessToken>`. Access token short-lived; `POST /auth/refresh`
  exchanges a refresh token for a new pair (AUTH-02).
- **Ownership:** every authenticated endpoint is scoped to the caller (SYS-01); the server never
  trusts an `id` in a body to identify the actor.
- **Validation:** all bodies validated server-side (SYS-02); invalid → `422`.
- **Errors:** `{ error: { code: string, message: string } }`. Codes are stable strings
  (`AUTH_FAILED`, `NOT_FOUND`, `VALIDATION_ERROR`, `FORBIDDEN`, `RATE_LIMITED`, `SERVER_ERROR`, `ACCOUNT_SUSPENDED`).
- **Lists:** cursor pagination → `{ items: [...], nextCursor: string | null }`.
- **IDs:** UUIDs (string). **Timestamps:** ISO-8601 UTC strings.

---

## Auth (`AUTH-`)
| Method | Path | Body → Response |
|---|---|---|
| POST | `/auth/register` | `{ email, username, password, acceptedTerms }` → `{ user, accessToken, refreshToken }`; sends the verification email (AUTH-08/10). Rejections → **`VALIDATION_ERROR`** with field-targeted detail: duplicate email/username, **screened username** (MOD-07), or **weak password** (< 8 chars, AUTH-01) |
| POST | `/auth/login` | `{ email, password }` → `{ user, accessToken, refreshToken }`; a **suspended** account → `ACCOUNT_SUSPENDED` + `{ reason, until? }` (MOD-09) |
| POST | `/auth/apple` | `{ identityToken, nonce }` → `{ user, accessToken, refreshToken }`; first sign-in → `user.usernamePending = true`, completed via `PATCH /me { username }`; links to an existing account on verified-email match (AUTH-09) |
| POST | `/auth/refresh` | `{ refreshToken }` → `{ accessToken, refreshToken }`; suspension invalidates sessions → `ACCOUNT_SUSPENDED` (MOD-09) |
| POST | `/auth/logout` | `{ refreshToken }` → `{ ok: true }` |
| DELETE | `/me/account` | Delete account — data deletion/anonymization (AUTH-07) |
| POST | `/auth/password-reset/request` | `{ email }` → `{ ok: true }` |
| POST | `/auth/password-reset/confirm` | `{ token, password }` → `{ ok: true }`; a **used / expired / invalid token** → **`VALIDATION_ERROR`** (`reason: "invalid_token"`) — single-use + ~1-hour (AUTH-04); the client shows the expired-link terminal → re-request. A weak new password → `VALIDATION_ERROR` (< 8 chars) |
| POST | `/auth/verify-email/request` | Resend the verification email (AUTH-08) |
| POST | `/auth/verify-email/confirm` | `{ token }` → `{ ok: true }` (AUTH-08) |
| GET | `/auth/username-available?u=` | `{ available, reason? }` — **public pre-check** (pre-auth): screened (MOD-07) + uniqueness; **advisory** (authoritative at register / `PATCH /me`); rate-limited (**AUTH-11**) |

## Public stats (`SYS-12`)
| Method | Path | Notes |
|---|---|---|
| GET | `/stats/public` | **Unauthenticated.** `{ totalGames, totalHoursLogged }` — system-wide aggregates for the logged-out Welcome landing (**SYS-12**); **cached / periodically recomputed** (not live COUNT/SUM), rate-limited; **omitted** below a display threshold or when unavailable |

## Profile (`PROF-`)
| Method | Path | Notes |
|---|---|---|
| GET | `/me` | Current user — **the Profile self-view renders from this one call**: identity `{ username, avatarUrl }` (**`avatarUrl: null` ⇒ the default monogram**, PROF-08), `bio`, `memberSince`, favourite genres, privacy, gamertags (PROF-01/02/03); **`usernameNextChangeAt`** — the edit-mode cooldown microcopy ("NEXT CHANGE OK NOW · 1/30 DAYS", PROF-06); **`stats { games, hours, completionPct, cardsDesigned, adoptionsReceived, friends }`**, each with an optional **`percentile`** (threshold-gated, PROF-07); **`favouriteGame`** + **`nowPlaying`** each expanded `{ gameId, entryId?, title, hours, card }` (PROF-01/04/05, WTP-03; `card` = the owner's selected render, CARD-07/18); **`top5: [{ rank, gameId, title, card }]`** (SOC-04); teaser counts **`achievements { unlocked, total }`** (ACH-02) · **`contributionsCount`** (CAT-07) |
| PATCH | `/me` | `{ username?, bio?, favouriteGenreIds?, favouriteGameId?, privacy? }` — username changes cooldown-limited + screened (PROF-06, MOD-07); avatar changes flow through the avatar pipeline (PROF-08) |
| POST | `/me/avatar/draft` · `/me/avatar/publish` | Avatar design pipeline (PROF-08) — mirrors the card draft → publish-flatten flow (server-rendered square image); shapes to harden during design |
| GET | `/users/:id` | **Two privacy-gated shapes** (PROF-03). **Friend / full** (PROF-05): identity (username, avatarUrl, memberSince, bio, favourite genres, **gamertags** — PROF-02), **`device { shellId, screenThemeId, stickerComposition }`** (the THEIR-DEVICE row + the "view in their device" chrome toggle, DEV-02/04 / decision 0012), stats + percentiles (PROF-07), top5, now-playing (+ hours), **`friendsCount` + `mutualFriendsCount`**, achievements teaser (ACH-05). **Non-friend / limited**: `{ username, avatarUrl, memberSince, mutualFriendsCount }` — nothing else leaks. Both carry **`relationship`** (`none · outgoing · incoming · friend`) driving the ADD FRIEND / FRIEND-tag chrome (SOC-01/08). **Blocked / suspended / deleted → one generic `NOT_FOUND`-style "unavailable"** (non-disclosure, MOD-09 / SOC-09 / AUTH-07) — never reveals which, nor who blocked whom |
| GET | `/me/gamertags` · POST · PATCH `/:id` · DELETE `/:id` | Gamertag CRUD (PROF-02) |

## Catalog & contribution (`CAT-`)
| Method | Path | Notes |
|---|---|---|
| GET | `/catalog/search?q=` | Title search (CAT-01); returns matches + dedup candidates (CAT-03); each result carries `collectionsCount` + `friendsHaveCount` (CAT-09) |
| POST | `/catalog/games` | `{ name, genreIds[], studio?, publisher?, releaseDate? }` → created entry, `createdBy = caller` (CAT-02/05); 409 + suggestions on dedup hit |
| GET | `/catalog/games/:id` | Canonical entry + genres + contributor + card gallery + `collectionsCount`/`friendsHaveCount` (CAT-09) + **`friendsWhoOwn[{ userId, username, avatarRef, hours? }]`** — the **named friends-who-own list** (Game page; **PROF-03-gated**: only friends who expose hours carry `hours`, blocked are absent, SOC-09; count alone if none visible) (CAT-09c, decision 0036) |
| POST | `/catalog/games/:id/edits` | Suggest field edit (CAT-06) |
| GET | `/genres` | Controlled genre list (CAT-04) |
| GET | `/users/:id/contributions` | **Contributor profile (CAT-07), two privacy-gated shapes (PROF-03).** **Friend/full:** `{ user { id, username, avatarUrl, memberSince }, stats { gamesAdded, cardsDesigned, totalAdoptions, totalReached }, standing { byAdoptions?, byGames?, byReach? } \| null` (**CAT-10** — each `{ percentile }` computed vs the **contributor cohort**, PROF-07-threshold-gated, `null` below floor)`, signatureCard { cardId, gameId, gameTitle, adoptionCount, card } \| null` (most-adopted, CARD-05)`, topCards[{ cardId, gameId, gameTitle, adoptionCount, card }]` (top-N by adoption)`, topGames[{ gameId, title, collectionsCount }]` (top-N by reach, CAT-09) }`. **Non-friend/limited (PROF-03):** `stats` + `standing` only (the honest aggregates); `signatureCard`/`topCards`/`topGames` omitted. Empty contributor → zeroed `stats`, `null` standing/signature, empty lists. Blocked/suspended/deleted → the generic unavailable (MOD-09) |
| GET | `/users/:id/contributions/cards?cursor=` | **VIEW ALL cards** (CAT-07) — the full cards-designed list, sorted by adoption: `{ items[{ cardId, gameId, gameTitle, adoptionCount, card }], nextCursor? }`. Privacy-gated (PROF-03 — limited/non-friend → 403/empty) |
| GET | `/users/:id/contributions/games?cursor=` | **VIEW ALL games** (CAT-07) — the full games-added list, sorted by collections-reach: `{ items[{ gameId, title, collectionsCount }], nextCursor? }` (CAT-09). Privacy-gated (PROF-03) |
| GET | `/catalog/upcoming` | Entries with `releaseDate` in the future (CAT-08); each carries **`notifyOnRelease`** (the caller's `NotifyToggle` state, DISC-01) |
| POST · DELETE | `/catalog/games/:id/notify` | **Subscribe / unsubscribe** to a release notification for an **upcoming** game — the Discover `NotifyToggle` (DISC-01 → NOTIF-01). Idempotent; reflected by `/catalog/upcoming`'s `notifyOnRelease`. The dispatched push obeys the **`release`** pref (NOTIF-02). *(OQ-053)* |
| GET | `/catalog/popular` | **Empty-state / onboarding suggestion rail** — the empty Collection's "POPULAR FIRST ADDS" + AUTH-06's add-a-few-games step: entries in the search-result shape incl. `collectionsCount`/`friendsHaveCount` (CAT-09). **Ranked by `collectionsCount`** (most-collected first), capped ~12, no paging (decision 0019) |
| GET | `/catalog/new-releases` | **Onboarding add-rail** — recently-**released** catalog entries (the onboarding O2 **NEW RELEASES** rail, CAT-11; sibling to `/catalog/popular`): search-result shape incl. `collectionsCount`/`friendsHaveCount` (CAT-09), **ordered by `releaseDate` desc** (released games only — `releaseDate` in the past, distinct from `/catalog/upcoming`), capped ~12, no paging |
| GET | `/catalog/friends-active` | **Add Game / onboarding add-rail** — catalog entries **the caller's friends own that the caller doesn't** (the **FRIENDS ARE PLAYING** rail, CAT-12; sibling to `/catalog/popular`): search-result shape, **ranked by `friendsHaveCount` desc** (PROF-03; blocked severed, SOC-09), capped ~12, no paging (decision 0036) |

## Collection (`COL-`)
| Method | Path | Notes |
|---|---|---|
| GET | `/me/collection` | Filter by genre/status; **sort by hours / owned-since / title / recently-added** + `order=asc\|desc` + manual order; `?q=` searches title/developer/publisher (COL-07/09); paginated. Response `{ items, nextCursor, total, collectionTotal }` — **`total`** counts the current query, **`collectionTotal`** the whole shelf (the count keycap's "2 OF 48"). Items: `{ entryId, gameId, title, developer, publisher, releaseYear, genres, hours, percentComplete, status, ownedSince, nowPlaying, card { id, imageUrl, thumbUrl, isCustom, isPremium } }` — `nowPlaying` = the ▶ NOW tag (WTP-03); `card` always resolves (CARD-07/18) and `isCustom`/`isPremium` drive the ★ FOIL-style tags (CARD-06); **`percentComplete`** + the card's rider **`designer`** (see Cards) feed the **COL-12** peek-flip stats back (CARD-01) |
| PATCH | `/me/collection/reorder` | `{ orderedEntryIds[] }` — saves **manual order** (COL-07), the MY-ORDER sort's ARRANGE write (OQ-031; long-press-drag); mirrors `/me/queue/reorder` |
| GET | `/users/:id/collection` | Friend-view, read-only, privacy-gated (COL-10): items mirror `/me/collection`'s shelf fields (title · catalog line · hours · status · **ownedSince** · card{ + `equipped` + `designer`, CARD-22/CARD-01 } + the `nowPlaying` flag for their hero) **minus the personal-only fields** (platforms COL-04 · notes COL-05 · rating). *(The **COL-12** friend peek-flip back renders this friend-visible subset only — hours · status · ownedSince + `designer`; %complete/notes/rating stay owner-only.)* **Full browse parity (COL-11):** accepts the same query params as `/me/collection` — `?q=` (title/developer/publisher search, COL-09) · the full **`sort`** enum + `order=asc\|desc` · genre/status **filter** (COL-07) — **over the friend-visible field set only** (no rating/notes sort); returns `{ items, nextCursor, total, collectionTotal }`. **No write params** (no `reorder`/manual-order — owner-only). The single-entry **friend card detail** (SOC-11) composes client-side from this item + canonical `/catalog/games/:id` + (for the opt-in compare) your own `/me/collection/:entryId`; **adopt** = `POST /cards/:id/adopt`. Owner blocked/suspended/deleted → the **same generic "unavailable" collapse** as `/users/:id` (MOD-09 / SOC-09 / AUTH-07 non-disclosure) |
| POST | `/me/collection` | `{ gameId }` → collection entry |
| PATCH | `/me/collection/:entryId` | `{ status?, hours?, percentComplete?, ownedSince?, rating?, notes?, platformIds?, activeCardDesignId? }` (COL-02..06) |
| DELETE | `/me/collection/:entryId` | Remove from collection |
| GET | `/me/collection/:entryId/cards` | Cards available for this game to switch among: mine + adopted + (link to create) (COL-06) |

## Cards (`CARD-`)
| Method | Path | Notes |
|---|---|---|
| GET | `/games/:gameId/cards` | Published community cards for a game (gallery); each card object carries a read-only **`equipped`** readout — `{ base?, effect?{ name, intensity }, finish?, frame?, nameplate?, font? }` — **display labels/ids, not the composition JSON** (CARD-22). This `equipped` summary **— and the card's `designer { userId, username }` attribution (CARD-01/04, the card-back "CARD ARTIST" provenance; COL-12) —** **rides every card payload** (gallery · the switcher `/me/collection/:entryId/cards` · the collection-item `card` on `/me/collection` + `/users/:id/collection`) |
| POST | `/cards` | `{ gameId, composition }` → **Draft** (vector composition JSON); `isPremium` + `compositionHash` derived (CARD-02/06/14) |
| PATCH | `/cards/:id` | Edit own **draft/private** design (autosave) — published cards are immutable (CARD-20) |
| GET | `/me/cards` | My designs across games: drafts · private · published (the drafts shelf, CARD-14) |
| POST | `/cards/:id/unpublish` | Delist own published card; existing adopters keep their grant (CARD-20) |
| DELETE | `/cards/:id` | Delete a draft/private (or never-adopted published) design; adopted → unpublish instead (CARD-14/20) |
| POST | `/cards/:id/publish` | Validate (min-complexity, dedup, premium-reconcile), **flatten to image + thumbnail**, set public (CARD-13/15/19) |
| POST | `/cards/:id/save-private` | Finalize a draft as a **private** card (CARD-04): premium-reconcile gate (CARD-13) + **flatten** (CARD-15), never listed in galleries. The Styler's SAVE PRIVATE; its **KEEP** = this + `PATCH /me/collection/:entryId { activeCardDesignId }` (COL-06) |
| POST | `/cards/:id/adopt` | Adopt for a game; charges currency if premium (ECON-03/04); increments adoption_count (CARD-05). The Styler's received-base (adopt-then-edit) charge rides the keep-reconcile via this call |
| GET | `/games/:gameId/card-bases` | **Start-from sources** for the editor's `BaseRail` (CARD-16; system-supplied, never community-dependent): `{ default, templates: [{ id, name, composition, previewUrl }], kits: [{ id, name, composition, cosmeticIds[], previewUrl }] }` — `default` = the CARD-18 placeholder face; kits bundle free-baseline closed attributes (COSM-02). *(Resolves OQ-050)* |
| POST | `/games/:gameId/card-bases/surprise` | **"Surprise me"** — deals a fresh server-composed start from the free baseline (CARD-16) → `{ composition }`; non-idempotent by design (each call = a new deal) |
| GET | `/cards/assets` | Vector/effect/finish/frame/**nameplate**/font library; filter type/free/premium/owned; search (CARD-17; nameplate per the styler gate ruling 2026-06-12 — COSM-01 wording ripple rides OQ-039's spec batch) |
| GET | `/cards/:id/share-image` | **Share variant** of the flattened render — "made in InGame" mark + designer attribution composited server-side, CDN-cached; unavailable while moderation-hidden (CARD-21) |

## Device (`DEV-`)
| Method | Path | Notes |
|---|---|---|
| GET | `/me/device` · PATCH `/me/device` | `{ activeShellId?, screenThemeId?, stickerComposition? }` (DEV-01/02/04; **shells replace models + skins** — one handheld body, decision 0017). **`stickerComposition`** = `{ version, stickers: [ { id, assetId, zone ∈ "forehead"\|"chin", x, y, scale, rotation } ] }` — `x,y` **normalized [0,1] within the named plastic zone**, `scale` clamped, `rotation` in degrees (decision 0030, OQ-062). **Server-validated:** `zone` in the allowed set + the transformed sticker bounds stay inside the zone rect (DEV-03/F-04 nav-no-go); all referenced ids must be **owned** (premium previews are client-side until acquired — see acquire-batch, OQ-065). |
| GET | `/me/device/looks` | List the caller's saved **looks** (DEV-05): `[ { id, activeShellId, screenThemeId, stickerComposition, createdAt } ]` — a look is a snapshot of the three device facets; **no name** (identified by shell·theme); the **ON NOW** look is computed client-side (facets == current `/me/device`) (decision 0030, OQ-064) |
| POST | `/me/device/looks` | **SAVE CURRENT** — snapshot the live combo into a new look; **cap-enforced** (~12, `LOOK_CAP_REACHED`-style if full) → the new look (DEV-05) |
| DELETE | `/me/device/looks/:id` | Remove a saved look (DEV-05). *Applying* a look = the client `PATCH /me/device` with the snapshot's three facets — **no dedicated apply endpoint**; premium KEEP rides the existing `POST /cosmetics/acquire-batch` (ECON-07) |

## Cosmetics & store & economy (`COSM-`, `ECON-`)
| Method | Path | Notes |
|---|---|---|
| GET | `/cosmetics` | Library (free + premium), filterable by type (COSM-01..03; types: `shell_sticker_pack` · `effect` · `finish` · `frame` · `nameplate` · `font` · `device_shell` · `screen_theme` — decision 0017; **`nameplate` per the styler gate ruling 2026-06-12**, COSM-01 wording ripple = OQ-039's spec batch) |
| GET | `/me/entitlements` | What the caller owns (COSM-03) |
| POST | `/cosmetics/:id/acquire` | **Spend currency on a premium cosmetic** (the Store BUY, ECON-01/COSM-03); idempotent; 402-style `INSUFFICIENT_BALANCE` with `{ shortBy }` for the bridge → entitlement + ledger entry |
| POST | `/cosmetics/acquire-batch` | `{ cosmeticIds[] }` — the editor **ReconcileSheet's ACQUIRE ALL** (CARD-13): **atomic, all-or-nothing** spend of the summed price; already-owned ids are no-ops; `INSUFFICIENT_BALANCE` + `{ shortBy }` against the total (the in-context bridge); → entitlements + one `acquire` ledger entry per item (ECON-07) |
| GET | `/store` | Store front: currency packs (real money; each `{ productId, pixels, oneTime?, purchased? }` — the one-time Starter Pack rides `oneTime` + per-account eligibility, ECON-10) + premium cosmetics (priced in currency) + drops `{ id, name, endsAt, itemIds }` (ECON-01/08/10) |
| GET | `/me/wallet` | `{ balance, dailyBonus: { available, amount, nextResetAt } }` (ECON-02/07 — the Store's claim bar reads this) |
| GET | `/me/wallet/ledger` | Paginated transactions (ECON-07); `type` ∈ grant · daily_claim · pack_purchase · adoption · acquire · milestone · refund_reversal · **admin_adjustment** (the ECON-11 operator credit/debit — shown to the user as a plain adjustment, reason optional/sanitized) |
| POST | `/iap/validate` | `{ platform, receipt | rcUserId }` → grants currency/entitlement after server validation (ECON-06) |
| POST | `/me/daily-bonus` | **Claim the daily bonus from the Store screen** (ECON-02; idempotent per day; unclaimed days lapse — decision 0017) → `{ granted, balance, nextResetAt }` |
| POST | `/iap/webhook` | RevenueCat server notifications: purchase grants + **refund reversals** → wallet/ledger (ECON-06/09); server-to-server, signature-verified |

*(**Operator economy adjustments (ECON-11) are not consumer endpoints** (decision 0035): IAP refunds/disputes are platform/RevenueCat-owned (we only react via `/iap/webhook`); our **Pixel/entitlement adjustments are out-of-band, audited service-layer operations** — protected internal route / runbook, never a public path — each writing one `admin_adjustment` ledger row + one MOD-10 audit row. The operator UI is the external tool, §10/OQ-080.)*

## Social (`SOC-`)
| Method | Path | Notes |
|---|---|---|
| GET | `/me/friends` · `/me/friends/requests` | Friends + pending (SOC-01) |
| POST | `/friends/requests` | `{ toUserId }` send request |
| POST | `/friends/requests/:id/accept` · `/decline` | Respond; decline is silent, re-request cooldown-limited (SOC-08) |
| DELETE | `/friends/requests/:id` | Cancel an outgoing request (SOC-08) |
| DELETE | `/me/friends/:userId` | Unfriend (silent, SOC-08) |
| GET/POST/DELETE | `/me/blocks` (+ `/:userId`) | Blocked-users list / block `{ userId }` / unblock (SOC-09) |
| GET | `/users/search?username=` | Find people by **exact username** (SOC-07; no contacts-matching). Item: `{ userId, username, avatarRef, relationship ∈ none·outgoing·incoming·friends·blocked·cooldown, cooldownUntil? }` — `relationship` drives the PersonRow action; `blocked` users are mutually-invisible (won't surface in results), the enum value exists for the shared component (OQ-072) |
| GET | `/me/compare/:friendId` | Compare your collection against a friend's (SOC-03), **privacy-gated** (PROF-03). Response: `{ friend: { userId, username, avatarRef }, totals: { yourHours, theirHours, yourGames, theirGames, leader ∈ you·them·tie }, games: [{ gameId, title, yourCard, theirCard, yourHours, theirHours, leader }], leaderboard: [{ rank, user: { userId, username, avatarRef }, hours, games, isMe }] }` — `games` = the **shared** set (the collection intersection); `yourCard`/`theirCard` are the displayed card objects (CARD-07/22) backing the **card-vs-card** matchup; `totals` feeds the face-off, `leaderboard` the friend-cohort rank (`isMe` flags your row). **Privacy (PROF-03):** if the friend hides hours, every `theirHours` (+ the hours `totals` + the hours `leaderboard`) is **omitted** and the games axis still compares; if they hide their collection, `games`/`theirGames` are omitted; a block → unavailable (SOC-09, like `/users/:id`). **Read-only, non-commerce** (no PIXELS — comparing creates no card); **completion % out** (hours + games only). Composes from both collections, no new write |
| GET/POST/PATCH/DELETE | `/me/lists` (+ `/:id/items`) | Lists incl. Top-5 (**capped at 5**) (SOC-04). **GET `/me/lists`** → `[{ id, kind ∈ top5, items: [{ gameId, rank (1..5), card: { …CARD-07/COL-06 displayed card } }] (ordered by rank) }]` (Top-5 only in v2; general lists parked §10). **POST `/me/lists/:id/items` `{ gameId }`** add a member (appended; rejects `LIST_FULL` past 5) · **DELETE `/me/lists/:id/items/:gameId`** remove. **Top-5 re-rank** = `PATCH /me/lists/:id { orderedGameIds[] }` (the dedicated §4.7 editor's ARRANGE gesture, COL-07; **OQ-083 ruled dedicated** — a standalone editor reached from the Profile, not an inline Profile edit-mode). Cap-of-5 + uniqueness enforced server-side; items render as the owner's **selected** card |
| POST | `/recommendations` | `{ toUserId, gameId, note }` → lands in the recipient's **recommendations feed** (the Discover **FROM FRIENDS** section), **not auto-queued** — they add it from the feed (SOC-05) |
| GET · DELETE | `/me/recommendations` (+ `/:recId`) | The friend-recs feed for the Discover section (SOC-05): `{ recId, game: { id, title, card }, fromUser: { userId, username }, note, createdAt }`; `DELETE` dismisses one. Adding to Up Next → `POST /me/queue { gameId, source: 'friend_rec', fromRecId }` |
| GET | `/me/feed` | Low-noise, **aggregated** friend activity (SOC-06). Item: `{ feedItemId, actor: { userId, username, avatarRef }, type ∈ added_games·beat_game·completed_game·published_card·unlocked_achievement, aggregateCount, objects: [{ gameId?, title?, card?, achievementId?, label? }] (capped sample — ≤3 for the row peek), occurredAt, windowStart/windowEnd }`, cursor-paginated; **import-flood suppression + trivia exclusion enforced server-side** (OQ-071) |
| POST | `/me/invites` | Create a share link / QR invite token (SOC-07) — the **self-Profile SHARE** chip (PROF-05's "Share profile"). *Friend-profile SHARE has no backing (deep links parked §10) → OQ-052* |
| GET | `/invites/:token` | Resolve an invite (SOC-10) → `{ token, sender: { userId, username, avatarRef }, relationship (so an already-friend/pending link resolves to the right action, not a duplicate ADD), prefilledRequest: { toUserId } }`; lands on the sender's Profile (friend-view) with a one-tap request; no app → store listing (§10). **QR image rendered client-side from the `POST /me/invites` token** (OQ-073) |

*(Friend showcase + read-only collection are served by `/users/:id` and `/users/:id/collection`.)*

## What to Play (`WTP-`)
| Method | Path | Notes |
|---|---|---|
| GET | `/me/queue` | Ordered queue (WTP-01). Items: `{ itemId, gameId, title, card, owned, source, recommendedBy?, note? }` — **`owned`** drives the IN-COLLECTION vs **WISHLIST** tag (unowned = COL-02 Wishlist); **`source`** ∈ `collection · discovery · friend_rec` (the add origin, WTP-02); **`recommendedBy`** (`{ userId, username }`) + **`note`** present when `source = friend_rec` (the "REC'D BY @x" tag + note, SOC-05); `card` always resolves (CARD-07/18). *(OQ-054)* |
| POST | `/me/queue` | `{ gameId, source, fromRecId? }` add — **`source`** ∈ `collection · discovery · friend_rec`; self-adds use `collection`/`discovery`, a friend rec uses `friend_rec` + the `fromRecId` from `/me/recommendations` (carries its `recommendedBy` + `note` onto the queue item) |
| PATCH | `/me/queue/reorder` | `{ orderedItemIds[] }` (WTP-01) |
| PUT | `/me/now-playing` | `{ gameId \| null }` — set/clear the single **Now-Playing pin** (WTP-03), settable from Up Next **or** a collection entry (the Collection hero + SET-NOW-PLAYING nudge); read back via `/me.nowPlaying` + the collection items' `nowPlaying` flag. *(Replaces `PATCH /me/queue/:id { currentlyPlaying }` — one pin, one write path.)* |
| DELETE | `/me/queue/:id` | Remove |

## Discovery (`DISC-`)
| Method | Path | Notes |
|---|---|---|
| GET | `/discover/browse?genreId=&studio=` | Browse by genre/studio (DISC-02). *Not surfaced on the Discover landing for now (owner ruling, **OQ-057**); the endpoint stays — reached via the **Game page 4.2** tappable genre/studio* |
| GET | `/discover/trending-cards` | Featured/trending community cards (DISC-04), ranked by adoption. Items: `{ rank, card, game: { id, title }, designer: { userId, username }, adoptionCount }` — drives `RankChip`(/first) + the card + the DESIGNED-BY credit (CAT-05) + `AdoptCount` (CARD-05). **Non-commerce** — counts, never prices. *(OQ-055)* |
| GET | `/discover/search?q=` | Games-only catalog search (DISC-03); people-search is `/users/search` (SOC-07) |

## Notifications (`NOTIF-`)
| Method | Path | Notes |
|---|---|---|
| POST | `/me/push-tokens` · DELETE `/:token` | Register/unregister Expo push token |
| GET/PATCH | `/me/notification-prefs` | Per-type prefs (NOTIF-02) — types incl. **`release`** (the upcoming-game notify-me, DISC-01/NOTIF-01), friend requests, recommendations, adoptions |

*(No notifications-list endpoint — NOTIF-03 has no center; events surface in their contextual screens.)*

## Moderation & admin (`MOD-`)
| Method | Path | Notes |
|---|---|---|
| POST | `/reports` | `{ targetType: card\|game\|user, targetId, reason, details? }` incl. "duplicate"; `details` **required** when the reason demands specifics (e.g. `incorrect_info`) — moderator-facing only (MOD-01) |
| GET | `/admin/reports` · POST `/admin/reports/:id/resolve` | Reports queue; hide/restore (MOD-02/03) — role-gated (SYS-08) |
| GET | `/admin/edit-suggestions` · POST `/admin/edit-suggestions/:id/{approve\|reject}` | Edit-suggestion review (MOD-06) |
| POST | `/admin/games/:dupId/merge` | `{ canonicalId }` → re-point collections/cards, soft-delete the dup (3-day restore) (MOD-05) |
| POST | `/admin/games/:id/restore` | Restore a soft-deleted game within the window (MOD-05) |
| POST | `/admin/users/:id/suspend` · POST `/admin/users/:id/unsuspend` | `{ until?, reason }` suspend (temp/indefinite) / lift; invalidates the user's sessions; role-gated (SYS-08) (MOD-09) |

*(**No role/tier grant/revoke endpoint — intentional, not an omission** (decisions 0033/0034): admin roles/tiers are assigned **out-of-band** (the external operator tool — P5, product-spec §10). Role is exposed **read-only**, asymmetrically (PROF-09 — tier is private): **`/me`** returns **`role ∈ user|admin`** + **`adminTier ∈ 1..4`** (self-view shows your tier); **`/users/:id`** returns only a generic **`staff: true`** (the public trust badge — **tier not disclosed**). The §4.4 console reuses the existing `/admin/*` reads/writes (it covers tiers I/II = P1+P2); tier III/IV economy/config/governance is the external tool. Admin actions are **server-logged** for audit, MOD-04.)*

## Achievements (`ACH-`)
| Method | Path | Notes |
|---|---|---|
| GET | `/achievements` | Visible achievement definitions + progress hints; easter eggs hidden or shown as a locked "???" per design (OQ-005) (ACH-03) |
| GET | `/me/achievements` | Caller's unlocks + progress (ACH-02/05) |
| GET | `/users/:id/achievements` | A user's showcased achievements, honoring privacy (ACH-05, PROF-03) |

*(Unlocks happen server-side via the event engine — there is no client "unlock" call.)*

## Feedback & support (`SYS-`)
| Method | Path | Notes |
|---|---|---|
| POST | `/feedback` | `{ type: feedback\|suggestion\|bug, message, appVersion?, platform? }` → `{ id }` — the Settings feedback/bug surface (SYS-11). **Support/moderator-facing only**, never rendered to other users → **outside MOD-07 screening** (like the report `details`). **Rate-limited** (SYS-05) |
| POST | `/feedback/:id/logs` | **Bug-only** — attach the opt-in **InGame diagnostic-log bundle** (SYS-11; consent-gated client-side). **Payload shape is TBD (OQ-060)** — the contract reserves the endpoint; v2 stores the body as an **opaque bundle** in access-controlled object storage, linked as the submission's `log_ref`. *(May become a presigned-upload handshake once the log format is defined)* |

*(Help/Contact, SYS-09, is a mailto/support-form — no endpoint.)*

---

## Changelog
| Date | Version | Change |
|---|---|---|
| 2026-06-07 | 0.1 | Initial draft seam derived from product-spec v0.1. Shapes to be hardened during design. |
| 2026-06-07 | 0.2 | Added Achievements endpoints (ACH-). |
| 2026-06-08 | 0.3 | Reconciliation: publisher field; collection search + friend-view collection; favourite game + showcase fields on profile; single-currency store; username people-search; QR invites; games-only discover search; removed notifications-center endpoint. |
| 2026-06-08 | 0.4 | Card pipeline (draft/publish-flatten/assets, removed upload-sign); collection `ownedSince` rename; admin endpoints (reports resolve, edit-suggestion review, dedup-merge/restore). |
| 2026-06-08 | 0.5 | Account deletion; compare adds total-games. |
| 2026-06-08 | 0.6 | Consistency: collection sort enumeration (owned-since/title) now matches COL-07. |
| 2026-06-10 | 0.7 | Gap-review ripple (decision 0010): terms acceptance + email-verification endpoints; SIWA `usernamePending` + linking; cancel-request + blocks; invite resolve; my-cards / unpublish / delete; IAP webhook (refund reversals); report `targetType` gains `user`; username-change note. (AUTH-08/09/10, PROF-06, SOC-08/09/10, CARD-20, ECON-09, MOD-01) |
| 2026-06-10 | 0.8 | Percentile chips on `/me` + `/users/:id` stats payloads, threshold-gated (PROF-07). |
| 2026-06-10 | 0.9 | Device config gains `screenThemeId` (DEV-04). |
| 2026-06-11 | 0.10 | Avatar pipeline (PROF-08): `avatar` leaves `PATCH /me`; draft/publish endpoints mirror the card flatten flow. |
| 2026-06-11 | 0.11 | Account suspension (MOD-09): admin suspend/unsuspend; `ACCOUNT_SUSPENDED` code on auth login/refresh; `/users/:id` collapses blocked/suspended/deleted into one generic unavailable (non-disclosure). |
| 2026-06-11 | 0.12 | Engagement-moments ripple (decision 0015): `GET /cards/:id/share-image` — watermarked share variant of the flattened render (CARD-21). |
| 2026-06-12 | 0.13 | CAT-09 ripple (decision 0016): `collectionsCount` + `friendsHaveCount` on catalog search results + the game payload. |
| 2026-06-12 | 0.14 | MOD-01 ripple: `details?` on `POST /reports`, required for reasons needing specifics (`incorrect_info`). |
| 2026-06-12 | 0.15 | Store-economy ripple (decision 0017): **+`POST /cosmetics/:id/acquire`** (the spend-currency purchase call — Store BUY + editor reconcile; was missing entirely) · `/me/wallet` gains `dailyBonus { available, amount, nextResetAt }` · `/me/daily-bonus` = the Store-claimed daily (lapses) · `/store` pack shapes incl. the one-time Starter Pack (`oneTime/purchased`, ECON-10) + drop shape · ledger `type` enum · `/me/device` → `activeShellId` · `/cosmetics` type enum (shell_sticker_pack · device_shell). |
| 2026-06-12 | 0.16 | **Styler sync** (the converged board's page audit, styler track): **+`GET /games/:gameId/card-bases`** + **`POST /games/:gameId/card-bases/surprise`** — the `BaseRail` start-from sources + the auto-design deal (CARD-16/18, COSM-02; **resolves OQ-050**) · **+`POST /cards/:id/save-private`** — the missing draft→private finalize (reconcile gate + flatten, CARD-04/13/15; KEEP = save-private + the COL-06 `activeCardDesignId` patch) · **+`POST /cosmetics/acquire-batch`** — the ReconcileSheet's atomic ACQUIRE ALL (CARD-13, ECON-01/07; `shortBy` against the total) · `/cosmetics` + `/cards/assets` type enums gain **`nameplate`** (the styler gate ruling 2026-06-12; COSM-01 wording ripple stays with OQ-039's spec batch) · adopt note: the received-base charge rides the keep-reconcile (ECON-03). |
| 2026-06-12 | 0.17 | **Collection + Profile page-audit** (the two converged boards, SCREEN-STATUS 3.1/3.5 → API ✅): `/me/collection` response gains `total`/`collectionTotal` + a full **item enumeration** (catalog line, hours/status/ownedSince, `nowPlaying` flag, `card { isCustom, isPremium }` — COL-02..07/09, CARD-06/07/18, WTP-03) · **+`PATCH /me/collection/reorder`** — the MY-ORDER/ARRANGE write (COL-07, OQ-031) · **+`PUT /me/now-playing`** — the one pin write-path, settable from Up Next or a collection entry (WTP-03; replaces the queue-item `currentlyPlaying` patch) · `/users/:id/collection` — friend field subset + the MOD-09 "unavailable" collapse extended to it · **+`GET /catalog/popular`** — the empty-state/onboarding suggestion rail (AUTH-06, CAT-09; ranking rule → **OQ-051**) · `/me` enumerated field-level (stats six-pack + percentiles, `usernameNextChangeAt` PROF-06, favouriteGame/nowPlaying/top5 expansions, achievements + contributions teasers, nullable-avatar monogram PROF-08) · `/users/:id` — **friend/full vs non-friend/limited** shapes + `relationship` + `device { shellId, screenThemeId, stickerComposition }` + gamertags (PROF-02/03/05, DEV-02/04, decision 0012) · `/me/lists` Top-5 re-rank shape (SOC-04) · `/me/invites` = the self-Profile SHARE (PROF-05/SOC-07; friend-profile SHARE → **OQ-052**). |
| 2026-06-13 | 0.18 | Triage ripple (decision 0019): `/catalog/popular` **ranking rule set** — by `collectionsCount`, capped ~12, no paging (OQ-051). *(OQ-008 cap=30 · OQ-048 effect-only intensity · OQ-049 save-private surfaces are product-spec-only — covered by the cap-config, the opaque composition JSON, and the existing `/me/cards` + switcher endpoints; OQ-052 = the friend-view chip cut, design-req.)* |
| 2026-06-13 | 0.19 | **Friend card-detail + compare** (decision 0020): `/users/:id/collection` items add **`ownedSince`** + support **hours/owned-since sort** (SOC-11); every card payload gains a read-only **`equipped`** readout (CARD-22); the friend single-entry detail + opt-in compare **compose client-side** from existing reads (+ `/me/collection/:entryId`); adopt stays `POST /cards/:id/adopt`. | SOC-11, CARD-22 |
| 2026-06-13 | 0.20 | **Friend-view browse parity** (decision 0021, COL-11): `/users/:id/collection` accepts the full `/me/collection` query set — `?q=` search (COL-09) · full `sort` enum + `order` · genre/status filter (COL-07) — over the friend-visible field set only, + `total`/`collectionTotal`; no write/reorder params. Supersedes 0.19's hours/owned-since-only note. | COL-11 |
| 2026-06-13 | 0.21 | **Discover §3.2 page-audit (discover track):** the converged board reconciled to the contract — **`GET /me/queue` item shape enumerated** (`owned · source · recommendedBy · note` — the WISHLIST / REC'D-BY tags, **OQ-054**) + `POST /me/queue` source enum + `fromRecId`; **`GET /discover/trending-cards` shape** (`rank · card · game · designer · adoptionCount`, DISC-04/CARD-05/CAT-05, **OQ-055**); **upcoming notify-me** added — `POST·DELETE /catalog/games/:id/notify` + `notifyOnRelease` on `/catalog/upcoming` + the `release` `notification-prefs` type (DISC-01 → NOTIF-01/02, **OQ-053**); **friend-recs feed** — `GET·DELETE /me/recommendations` (the Discover FROM-FRIENDS section) + `POST /recommendations` lands in the **feed, not auto-queued** (SOC-05; gap surfaced by the audit); **`/discover/browse` parked** from the Discover landing (DISC-02 reached via Game page 4.2, **OQ-057**). No product-spec behavior change (SOC-05's "→ WTP" = the WTP/Discover surface). | WTP-01/02 · DISC-01/02/03/04 · CAT-08 · SOC-05 · NOTIF-01/02 |
| 2026-06-13 | 0.22 | **Feedback & bug reporting** (decision 0022): **+`POST /feedback`** (type feedback/suggestion/bug + message; support-facing, outside MOD-07; rate-limited SYS-05) + **`POST /feedback/:id/logs`** — the opt-in diagnostic-log attach for bug reports (**opaque bundle, shape TBD → OQ-060**; access-controlled object storage, `log_ref`). | SYS-11 |
| 2026-06-23 | 0.23 | **Friends §3.3 + Find/Add §4.8 page-audit (friends + find-add tracks):** the converged boards reconciled to the contract — **`GET /me/feed` item shape enumerated** (the actor+type **aggregated** SOC-06 item + capped object peek + aggregation window; flood-suppression/trivia-exclusion server-side, **OQ-071**); **`GET /users/search` PersonRow shape** + the **`relationship` enum** (none·outgoing·incoming·friends·blocked·cooldown) that drives every person surface (**OQ-072**); **`GET /invites/:token` resolve shape** (sender summary + relationship + prefilled request) + **QR rendered client-side from the token** (**OQ-073**). No product-spec behavior change (SOC-06/07/08/10 specify the behavior; these are payload shapes). The SOC-05 **recommend-compose** surface stays a **design** gap (OQ-075) — `POST /recommendations` already exists. | SOC-01/06/07/08/10 |
| 2026-06-24 | 0.24 | **Collection peek-flip ripple** (decision 0026, COL-12): the **collection-item `card` object gains `designer { userId, username }`** (the CARD-01 back's "CARD ART DESIGNED BY" provenance) — added to the "rides every card payload" rider so it lands on `/me/collection` · `/users/:id/collection` · the switcher · the gallery (alongside `equipped`, CARD-22); **`/me/collection` items gain `percentComplete`** (the own back's COMPLETE %; the friend payload omits it — the friend back shows hours/status/ownedSince + designer only, privacy gate). Closes the latent gap where the Game-page card-back (§4.2) printed a designer with no backing field. | COL-12, CARD-01 |
| 2026-06-24 | 0.25 | **Compare Hours §4.6 page-audit (compare track):** the converged board reconciled to the contract — **`GET /me/compare/:friendId` payload shape enumerated**: `{ friend, totals { yourHours, theirHours, yourGames, theirGames, leader }, games[{ gameId, title, yourCard, theirCard, yourHours, theirHours, leader }] (shared intersection; the cards back the **card-vs-card** matchup, CARD-07/22), leaderboard[{ rank, user, hours, games, isMe }] }` (**OQ-074**); **privacy-gated (PROF-03)** — a hidden axis is **omitted** (hours hidden → `theirHours`/hours-`totals`/`leaderboard` dropped, games still compare; collection hidden → `games`/`theirGames` dropped), block → unavailable (SOC-09). Read-only, non-commerce; completion % out (hours+games only). No product-spec behavior change (SOC-03 specifies the comparison; this is the payload shape). | SOC-03 · PROF-03 |
| 2026-06-25 | 0.26 | **Welcome & Auth §4.13 + Onboarding §4.14 page-audit** (decision 0029): **+`GET /auth/username-available?u=`** — public screened username pre-check (advisory; AUTH-11, MOD-07, SYS-05) backing the live create-account availability beat; **+`GET /stats/public`** — unauthenticated system-wide aggregates (`totalGames` + `totalHoursLogged`; SYS-12) backing the games-forward Welcome landing (cached/rate-limited). No other contract change (sign-in / SIWA / reset / onboarding flows already exist). | AUTH-11, SYS-12 |
| 2026-06-27 | 0.28 | **Contributor profile §4.9 page-audit** (decision 0032, resolves OQ-079): **`GET /users/:id/contributions` enumerated** — friend/full vs non-friend/limited shapes (PROF-03): `stats { gamesAdded, cardsDesigned, totalAdoptions, totalReached }` + `standing` (**CAT-10** — per-stat percentile vs the **contributor cohort**, threshold-gated, nullable) + `signatureCard` + `topCards`/`topGames` (top-N); **+`GET /users/:id/contributions/cards`** and **+`/games`** — the cursor-paginated **VIEW ALL** full lists (sorted by adoption / reach). No new write paths (a pride/read surface). | CAT-07, CAT-10, CAT-09, CARD-05 |
| 2026-06-27 | 0.27 | **Device editor §4.5 page-audit** (decision 0030): **`stickerComposition` shape pinned** on `PATCH /me/device` — `{ version, stickers[{ id, assetId, zone ∈ forehead\|chin, x, y, scale, rotation }] }`, zone-normalized coords, **server-validated** zones/bounds (DEV-03/F-04) + owned-ids-only (OQ-062/065); **+saved looks** (DEV-05, OQ-064) — `GET /me/device/looks` (list snapshots) · `POST /me/device/looks` (SAVE CURRENT, cap ~12) · `DELETE /me/device/looks/:id`; **apply = the existing `PATCH /me/device`**, **premium KEEP = the existing `POST /cosmetics/acquire-batch`** (no new endpoints for either). Closes OQ-045/062/063/064/065/076. | DEV-01/03/05, COSM-03, ECON-07 |
| 2026-06-27 | 0.29 | **Moderator role lifecycle** (decision 0033): an explicit note that **role grant/revoke is intentionally endpoint-less** (out-of-band — product-spec §10 parked tool); **`role ∈ user\|moderator\|admin` exposed read-only** on `/me` + `/users/:id` to drive the **PROF-09** Profile badge; moderator actions server-logged for audit (MOD-04). No new endpoints (the §4.4 console reuses the existing `/admin/*` reads/writes). | SYS-08, PROF-09, MOD-04 |
| 2026-06-27 | 0.31 | **Economy/support tooling** (decision 0035): ledger `type` enum gains **`admin_adjustment`** (the ECON-11 operator credit/debit, shown on the user's own ledger); a note that **operator economy adjustments are out-of-band audited service-layer ops, not consumer endpoints** (IAP refunds platform/RevenueCat-owned via `/iap/webhook`; ours = Pixel/entitlement adjust → `admin_adjustment` ledger + MOD-10 audit). No new consumer endpoints. | ECON-11, ECON-07, MOD-10 |
| 2026-06-27 | 0.30 | **Admin tier model** (decision 0034, supersedes 0.29's role note): role exposed **asymmetrically** (PROF-09 — tier private) — **`/me`** returns **`role ∈ user\|admin` + `adminTier ∈ 1..4`** (moderator dropped); **`/users/:id`** returns only a generic **`staff: true`** (public trust badge, tier not disclosed). Grant/revoke still endpoint-less (out-of-band, external tool P5/§10). No new endpoints (console = tiers I/II via existing `/admin/*`; III/IV economy/config/governance = the external tool). | SYS-08, PROF-09, MOD-04 |
| 2026-06-27 | 0.32 | **Welcome & Auth reset/register error responses** (engineer-completeness pass on §4.13): **`/auth/password-reset/confirm`** now documents the **used/expired/invalid-token** rejection → `VALIDATION_ERROR` (`reason: "invalid_token"`; single-use + ~1-hour per AUTH-04) backing the **W8c** expired-link terminal; **`/auth/register`** spells out the rejection codes (`VALIDATION_ERROR`: duplicate email/username · screened username MOD-07 · weak password < 8 chars) backing the **W4** validation beats. No new endpoints — error-shape detail on existing rows. | AUTH-04, AUTH-01, MOD-07 |
 | 2026-06-27 | 0.33 | **Onboarding new-releases rail** (decision 0029 follow-up; product-spec CAT-11): **+`GET /catalog/new-releases`** — recently-released catalog entries (releaseDate desc, released-only, capped ~12) backing the onboarding O2 **NEW RELEASES** add-rail, sibling to `/catalog/popular`. No other change. | CAT-11, AUTH-06 |
 | 2026-06-28 | 0.34 | **Lists / Top-5 (§4.7) page-audit** (converge; resolves OQ-083 + OQ-084): **`/me/lists` enumerated** — GET → `[{ id, kind: top5, items: [{ gameId, rank 1..5, card }] }]` (capped, ordered); membership **`POST /:id/items { gameId }`** (rejects `LIST_FULL`) / **`DELETE /:id/items/:gameId`**; re-rank `PATCH /:id { orderedGameIds[] }`. **OQ-083 ruled dedicated** — the re-rank is the **dedicated §4.7 editor's** ARRANGE gesture (standalone screen reached from the Profile), reworded off "Profile edit-mode". Cap-of-5 server-enforced. No new rows. | SOC-04, CARD-07, COL-06 |
