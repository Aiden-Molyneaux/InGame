# InGame — API Contract (DRAFT)

> The **frontend↔backend seam**: endpoints and payload shapes. This is a **first draft** — it will
> be refined alongside the design-spec, because screens reveal exactly what each call must return.
> Behavior lives in [`product-spec.md`](product-spec.md); shapes live here. Referenced by ID.

**Version:** 0.19 (draft) · **Last updated:** 2026-06-13 · **Owner:** Claude Code

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
| POST | `/auth/register` | `{ email, username, password, acceptedTerms }` → `{ user, accessToken, refreshToken }`; sends the verification email (AUTH-08/10) |
| POST | `/auth/login` | `{ email, password }` → `{ user, accessToken, refreshToken }`; a **suspended** account → `ACCOUNT_SUSPENDED` + `{ reason, until? }` (MOD-09) |
| POST | `/auth/apple` | `{ identityToken, nonce }` → `{ user, accessToken, refreshToken }`; first sign-in → `user.usernamePending = true`, completed via `PATCH /me { username }`; links to an existing account on verified-email match (AUTH-09) |
| POST | `/auth/refresh` | `{ refreshToken }` → `{ accessToken, refreshToken }`; suspension invalidates sessions → `ACCOUNT_SUSPENDED` (MOD-09) |
| POST | `/auth/logout` | `{ refreshToken }` → `{ ok: true }` |
| DELETE | `/me/account` | Delete account — data deletion/anonymization (AUTH-07) |
| POST | `/auth/password-reset/request` | `{ email }` → `{ ok: true }` |
| POST | `/auth/password-reset/confirm` | `{ token, password }` → `{ ok: true }` |
| POST | `/auth/verify-email/request` | Resend the verification email (AUTH-08) |
| POST | `/auth/verify-email/confirm` | `{ token }` → `{ ok: true }` (AUTH-08) |

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
| GET | `/catalog/games/:id` | Canonical entry + genres + contributor + card gallery + `collectionsCount`/`friendsHaveCount` (CAT-09) |
| POST | `/catalog/games/:id/edits` | Suggest field edit (CAT-06) |
| GET | `/genres` | Controlled genre list (CAT-04) |
| GET | `/users/:id/contributions` | Contributor profile data (CAT-07) |
| GET | `/catalog/upcoming` | Entries with `releaseDate` in the future (CAT-08) |
| GET | `/catalog/popular` | **Empty-state / onboarding suggestion rail** — the empty Collection's "POPULAR FIRST ADDS" + AUTH-06's add-a-few-games step: entries in the search-result shape incl. `collectionsCount`/`friendsHaveCount` (CAT-09). **Ranked by `collectionsCount`** (most-collected first), capped ~12, no paging (decision 0019) |

## Collection (`COL-`)
| Method | Path | Notes |
|---|---|---|
| GET | `/me/collection` | Filter by genre/status; **sort by hours / owned-since / title / recently-added** + `order=asc\|desc` + manual order; `?q=` searches title/developer/publisher (COL-07/09); paginated. Response `{ items, nextCursor, total, collectionTotal }` — **`total`** counts the current query, **`collectionTotal`** the whole shelf (the count keycap's "2 OF 48"). Items: `{ entryId, gameId, title, developer, publisher, releaseYear, genres, hours, status, ownedSince, nowPlaying, card { id, imageUrl, thumbUrl, isCustom, isPremium } }` — `nowPlaying` = the ▶ NOW tag (WTP-03); `card` always resolves (CARD-07/18) and `isCustom`/`isPremium` drive the ★ FOIL-style tags (CARD-06) |
| PATCH | `/me/collection/reorder` | `{ orderedEntryIds[] }` — saves **manual order** (COL-07), the MY-ORDER sort's ARRANGE write (OQ-031; long-press-drag); mirrors `/me/queue/reorder` |
| GET | `/users/:id/collection` | Friend-view, read-only, privacy-gated (COL-10): items mirror `/me/collection`'s shelf fields (title · catalog line · hours · status · **ownedSince** · card{ + `equipped`, CARD-22 } + the `nowPlaying` flag for their hero) **minus the personal-only fields** (platforms COL-04 · notes COL-05 · rating); supports **sort by hours / owned-since** (the friend-view storytelling sorts, SOC-11/COL-07) — still no search/count tools. The single-entry **friend card detail** (SOC-11) composes client-side from this item + canonical `/catalog/games/:id` + (for the opt-in compare) your own `/me/collection/:entryId`; **adopt** = `POST /cards/:id/adopt`. Owner blocked/suspended/deleted → the **same generic "unavailable" collapse** as `/users/:id` (MOD-09 / SOC-09 / AUTH-07 non-disclosure) |
| POST | `/me/collection` | `{ gameId }` → collection entry |
| PATCH | `/me/collection/:entryId` | `{ status?, hours?, percentComplete?, ownedSince?, rating?, notes?, platformIds?, activeCardDesignId? }` (COL-02..06) |
| DELETE | `/me/collection/:entryId` | Remove from collection |
| GET | `/me/collection/:entryId/cards` | Cards available for this game to switch among: mine + adopted + (link to create) (COL-06) |

## Cards (`CARD-`)
| Method | Path | Notes |
|---|---|---|
| GET | `/games/:gameId/cards` | Published community cards for a game (gallery); each card object carries a read-only **`equipped`** readout — `{ base?, effect?{ name, intensity }, finish?, frame?, nameplate?, font? }` — **display labels/ids, not the composition JSON** (CARD-22). This `equipped` summary **rides every card payload** (gallery · the switcher `/me/collection/:entryId/cards` · the collection-item `card` on `/me/collection` + `/users/:id/collection`) |
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
| GET | `/me/device` · PATCH `/me/device` | `{ activeShellId?, screenThemeId?, stickerComposition? }` (DEV-01/02/04; **shells replace models + skins** — one handheld body, decision 0017) |

## Cosmetics & store & economy (`COSM-`, `ECON-`)
| Method | Path | Notes |
|---|---|---|
| GET | `/cosmetics` | Library (free + premium), filterable by type (COSM-01..03; types: `shell_sticker_pack` · `effect` · `finish` · `frame` · `nameplate` · `font` · `device_shell` · `screen_theme` — decision 0017; **`nameplate` per the styler gate ruling 2026-06-12**, COSM-01 wording ripple = OQ-039's spec batch) |
| GET | `/me/entitlements` | What the caller owns (COSM-03) |
| POST | `/cosmetics/:id/acquire` | **Spend currency on a premium cosmetic** (the Store BUY, ECON-01/COSM-03); idempotent; 402-style `INSUFFICIENT_BALANCE` with `{ shortBy }` for the bridge → entitlement + ledger entry |
| POST | `/cosmetics/acquire-batch` | `{ cosmeticIds[] }` — the editor **ReconcileSheet's ACQUIRE ALL** (CARD-13): **atomic, all-or-nothing** spend of the summed price; already-owned ids are no-ops; `INSUFFICIENT_BALANCE` + `{ shortBy }` against the total (the in-context bridge); → entitlements + one `acquire` ledger entry per item (ECON-07) |
| GET | `/store` | Store front: currency packs (real money; each `{ productId, pixels, oneTime?, purchased? }` — the one-time Starter Pack rides `oneTime` + per-account eligibility, ECON-10) + premium cosmetics (priced in currency) + drops `{ id, name, endsAt, itemIds }` (ECON-01/08/10) |
| GET | `/me/wallet` | `{ balance, dailyBonus: { available, amount, nextResetAt } }` (ECON-02/07 — the Store's claim bar reads this) |
| GET | `/me/wallet/ledger` | Paginated transactions (ECON-07); `type` ∈ grant · daily_claim · pack_purchase · adoption · acquire · milestone · refund_reversal |
| POST | `/iap/validate` | `{ platform, receipt | rcUserId }` → grants currency/entitlement after server validation (ECON-06) |
| POST | `/me/daily-bonus` | **Claim the daily bonus from the Store screen** (ECON-02; idempotent per day; unclaimed days lapse — decision 0017) → `{ granted, balance, nextResetAt }` |
| POST | `/iap/webhook` | RevenueCat server notifications: purchase grants + **refund reversals** → wallet/ledger (ECON-06/09); server-to-server, signature-verified |

## Social (`SOC-`)
| Method | Path | Notes |
|---|---|---|
| GET | `/me/friends` · `/me/friends/requests` | Friends + pending (SOC-01) |
| POST | `/friends/requests` | `{ toUserId }` send request |
| POST | `/friends/requests/:id/accept` · `/decline` | Respond; decline is silent, re-request cooldown-limited (SOC-08) |
| DELETE | `/friends/requests/:id` | Cancel an outgoing request (SOC-08) |
| DELETE | `/me/friends/:userId` | Unfriend (silent, SOC-08) |
| GET/POST/DELETE | `/me/blocks` (+ `/:userId`) | Blocked-users list / block `{ userId }` / unblock (SOC-09) |
| GET | `/users/search?username=` | Find people by username (SOC-07) |
| GET | `/me/compare/:friendId` | Per-game + total hours, total-games comparison + leaderboard slice (SOC-03) |
| GET/POST/PATCH/DELETE | `/me/lists` (+ `/:id/items`) | Lists incl. Top-5 (capped) (SOC-04); **Top-5 swap / re-rank** = `PATCH /me/lists/:id { orderedGameIds[] }` (the Profile edit-mode ARRANGE gesture) |
| POST | `/recommendations` | `{ toUserId, gameId, note }` → recipient's WTP (SOC-05) |
| GET | `/me/feed` | Low-noise, **aggregated** friend activity (SOC-06) |
| POST | `/me/invites` | Create a share link / QR invite token (SOC-07) — the **self-Profile SHARE** chip (PROF-05's "Share profile"). *Friend-profile SHARE has no backing (deep links parked §10) → OQ-052* |
| GET | `/invites/:token` | Resolve an invite → sender summary + prefilled-request affordance (SOC-10) |

*(Friend showcase + read-only collection are served by `/users/:id` and `/users/:id/collection`.)*

## What to Play (`WTP-`)
| Method | Path | Notes |
|---|---|---|
| GET | `/me/queue` | Ordered; each item flags owned vs unowned (WTP-01) |
| POST | `/me/queue` | `{ gameId, source }` add |
| PATCH | `/me/queue/reorder` | `{ orderedItemIds[] }` (WTP-01) |
| PUT | `/me/now-playing` | `{ gameId \| null }` — set/clear the single **Now-Playing pin** (WTP-03), settable from Up Next **or** a collection entry (the Collection hero + SET-NOW-PLAYING nudge); read back via `/me.nowPlaying` + the collection items' `nowPlaying` flag. *(Replaces `PATCH /me/queue/:id { currentlyPlaying }` — one pin, one write path.)* |
| DELETE | `/me/queue/:id` | Remove |

## Discovery (`DISC-`)
| Method | Path | Notes |
|---|---|---|
| GET | `/discover/browse?genreId=&studio=` | Browse (DISC-02) |
| GET | `/discover/trending-cards` | Featured/trending cards (DISC-04) |
| GET | `/discover/search?q=` | Games-only catalog search (DISC-03); people-search is `/users/search` (SOC-07) |

## Notifications (`NOTIF-`)
| Method | Path | Notes |
|---|---|---|
| POST | `/me/push-tokens` · DELETE `/:token` | Register/unregister Expo push token |
| GET/PATCH | `/me/notification-prefs` | Per-type prefs (NOTIF-02) |

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

## Achievements (`ACH-`)
| Method | Path | Notes |
|---|---|---|
| GET | `/achievements` | Visible achievement definitions + progress hints; easter eggs hidden or shown as a locked "???" per design (OQ-005) (ACH-03) |
| GET | `/me/achievements` | Caller's unlocks + progress (ACH-02/05) |
| GET | `/users/:id/achievements` | A user's showcased achievements, honoring privacy (ACH-05, PROF-03) |

*(Unlocks happen server-side via the event engine — there is no client "unlock" call.)*

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
