# InGame — API Contract (DRAFT)

> The **frontend↔backend seam**: endpoints and payload shapes. This is a **first draft** — it will
> be refined alongside the design-spec, because screens reveal exactly what each call must return.
> Behavior lives in [`product-spec.md`](product-spec.md); shapes live here. Referenced by ID.

**Version:** 0.15 (draft) · **Last updated:** 2026-06-12 · **Owner:** Claude Code

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
| GET | `/me` | Current user: profile, privacy, favourite game/genre, gamertags, summary + clout stats (+ per-stat **percentile chips** when above the population threshold, PROF-07), member-since, now-playing (PROF-01/04/05) |
| PATCH | `/me` | `{ username?, bio?, favouriteGenreIds?, favouriteGameId?, privacy? }` — username changes cooldown-limited + screened (PROF-06, MOD-07); avatar changes flow through the avatar pipeline (PROF-08) |
| POST | `/me/avatar/draft` · `/me/avatar/publish` | Avatar design pipeline (PROF-08) — mirrors the card draft → publish-flatten flow (server-rendered square image); shapes to harden during design |
| GET | `/users/:id` | Friend-view showcase honoring privacy (PROF-03/05): device, top-5, now-playing, stats (+ percentiles, PROF-07), friend count/mutual, + Add/Compare affordances. **Blocked / suspended / deleted → one generic `NOT_FOUND`-style "unavailable"** (non-disclosure, MOD-09 / SOC-09 / AUTH-07) — never reveals which, nor who blocked whom |
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

## Collection (`COL-`)
| Method | Path | Notes |
|---|---|---|
| GET | `/me/collection` | Filter by genre/status; **sort by hours / owned-since / title / recently-added** + `order=asc\|desc` + manual order; `?q=` searches title/developer/publisher (COL-07/09); paginated |
| GET | `/users/:id/collection` | Friend-view, read-only, privacy-gated (COL-10) |
| POST | `/me/collection` | `{ gameId }` → collection entry |
| PATCH | `/me/collection/:entryId` | `{ status?, hours?, percentComplete?, ownedSince?, rating?, notes?, platformIds?, activeCardDesignId? }` (COL-02..06) |
| DELETE | `/me/collection/:entryId` | Remove from collection |
| GET | `/me/collection/:entryId/cards` | Cards available for this game to switch among: mine + adopted + (link to create) (COL-06) |

## Cards (`CARD-`)
| Method | Path | Notes |
|---|---|---|
| GET | `/games/:gameId/cards` | Published community cards for a game (gallery) |
| POST | `/cards` | `{ gameId, composition }` → **Draft** (vector composition JSON); `isPremium` + `compositionHash` derived (CARD-02/06/14) |
| PATCH | `/cards/:id` | Edit own **draft/private** design (autosave) — published cards are immutable (CARD-20) |
| GET | `/me/cards` | My designs across games: drafts · private · published (the drafts shelf, CARD-14) |
| POST | `/cards/:id/unpublish` | Delist own published card; existing adopters keep their grant (CARD-20) |
| DELETE | `/cards/:id` | Delete a draft/private (or never-adopted published) design; adopted → unpublish instead (CARD-14/20) |
| POST | `/cards/:id/publish` | Validate (min-complexity, dedup, premium-reconcile), **flatten to image + thumbnail**, set public (CARD-13/15/19) |
| POST | `/cards/:id/adopt` | Adopt for a game; charges currency if premium (ECON-03/04); increments adoption_count (CARD-05) |
| GET | `/cards/assets` | Vector/effect/finish/frame/font library; filter type/free/premium/owned; search (CARD-17) |
| GET | `/cards/:id/share-image` | **Share variant** of the flattened render — "made in InGame" mark + designer attribution composited server-side, CDN-cached; unavailable while moderation-hidden (CARD-21) |

## Device (`DEV-`)
| Method | Path | Notes |
|---|---|---|
| GET | `/me/device` · PATCH `/me/device` | `{ activeShellId?, screenThemeId?, stickerComposition? }` (DEV-01/02/04; **shells replace models + skins** — one handheld body, decision 0017) |

## Cosmetics & store & economy (`COSM-`, `ECON-`)
| Method | Path | Notes |
|---|---|---|
| GET | `/cosmetics` | Library (free + premium), filterable by type (COSM-01..03; types: `shell_sticker_pack` · `effect` · `finish` · `frame` · `font` · `device_shell` · `screen_theme` — decision 0017) |
| GET | `/me/entitlements` | What the caller owns (COSM-03) |
| POST | `/cosmetics/:id/acquire` | **Spend currency on a premium cosmetic** (the Store BUY + the editor reconcile, ECON-01/COSM-03); idempotent; 402-style `INSUFFICIENT_BALANCE` with `{ shortBy }` for the bridge → entitlement + ledger entry |
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
| GET/POST/PATCH/DELETE | `/me/lists` (+ `/:id/items`) | Lists incl. Top-5 (capped) (SOC-04) |
| POST | `/recommendations` | `{ toUserId, gameId, note }` → recipient's WTP (SOC-05) |
| GET | `/me/feed` | Low-noise, **aggregated** friend activity (SOC-06) |
| POST | `/me/invites` | Create a share link / QR invite token (SOC-07) |
| GET | `/invites/:token` | Resolve an invite → sender summary + prefilled-request affordance (SOC-10) |

*(Friend showcase + read-only collection are served by `/users/:id` and `/users/:id/collection`.)*

## What to Play (`WTP-`)
| Method | Path | Notes |
|---|---|---|
| GET | `/me/queue` | Ordered; each item flags owned vs unowned (WTP-01) |
| POST | `/me/queue` | `{ gameId, source }` add |
| PATCH | `/me/queue/reorder` | `{ orderedItemIds[] }` (WTP-01) |
| PATCH | `/me/queue/:id` | `{ currentlyPlaying? }` (WTP-03) |
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
