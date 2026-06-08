# InGame — API Contract (DRAFT)

> The **frontend↔backend seam**: endpoints and payload shapes. This is a **first draft** — it will
> be refined alongside the design-spec, because screens reveal exactly what each call must return.
> Behavior lives in [`product-spec.md`](product-spec.md); shapes live here. Referenced by ID.

**Version:** 0.4 (draft) · **Last updated:** 2026-06-08 · **Owner:** Claude Code

---

## Conventions

- **Base URL:** environment-configured (SYS-03). All paths below are relative to `/api`.
- **Auth:** `Authorization: Bearer <accessToken>`. Access token short-lived; `POST /auth/refresh`
  exchanges a refresh token for a new pair (AUTH-02).
- **Ownership:** every authenticated endpoint is scoped to the caller (SYS-01); the server never
  trusts an `id` in a body to identify the actor.
- **Validation:** all bodies validated server-side (SYS-02); invalid → `422`.
- **Errors:** `{ error: { code: string, message: string } }`. Codes are stable strings
  (`AUTH_FAILED`, `NOT_FOUND`, `VALIDATION_ERROR`, `FORBIDDEN`, `RATE_LIMITED`, `SERVER_ERROR`).
- **Lists:** cursor pagination → `{ items: [...], nextCursor: string | null }`.
- **IDs:** UUIDs (string). **Timestamps:** ISO-8601 UTC strings.

---

## Auth (`AUTH-`)
| Method | Path | Body → Response |
|---|---|---|
| POST | `/auth/register` | `{ email, username, password }` → `{ user, accessToken, refreshToken }` |
| POST | `/auth/login` | `{ email, password }` → `{ user, accessToken, refreshToken }` |
| POST | `/auth/apple` | `{ identityToken, nonce }` → `{ user, accessToken, refreshToken }` |
| POST | `/auth/refresh` | `{ refreshToken }` → `{ accessToken, refreshToken }` |
| POST | `/auth/logout` | `{ refreshToken }` → `{ ok: true }` |
| POST | `/auth/password-reset/request` | `{ email }` → `{ ok: true }` |
| POST | `/auth/password-reset/confirm` | `{ token, password }` → `{ ok: true }` |

## Profile (`PROF-`)
| Method | Path | Notes |
|---|---|---|
| GET | `/me` | Current user: profile, privacy, favourite game/genre, gamertags, summary + clout stats, member-since, now-playing (PROF-01/04/05) |
| PATCH | `/me` | `{ username?, avatar?, bio?, favouriteGenreIds?, favouriteGameId?, privacy? }` |
| GET | `/users/:id` | Friend-view showcase honoring privacy (PROF-03/05): device, top-5, now-playing, stats, friend count/mutual, + Add/Compare affordances |
| GET | `/me/gamertags` · POST · PATCH `/:id` · DELETE `/:id` | Gamertag CRUD (PROF-02) |

## Catalog & contribution (`CAT-`)
| Method | Path | Notes |
|---|---|---|
| GET | `/catalog/search?q=` | Title search (CAT-01); returns matches + dedup candidates (CAT-03) |
| POST | `/catalog/games` | `{ name, genreIds[], studio?, publisher?, releaseDate? }` → created entry, `createdBy = caller` (CAT-02/05); 409 + suggestions on dedup hit |
| GET | `/catalog/games/:id` | Canonical entry + genres + contributor + card gallery |
| POST | `/catalog/games/:id/edits` | Suggest field edit (CAT-06) |
| GET | `/genres` | Controlled genre list (CAT-04) |
| GET | `/users/:id/contributions` | Contributor profile data (CAT-07) |
| GET | `/catalog/upcoming` | Entries with `releaseDate` in the future (CAT-08) |

## Collection (`COL-`)
| Method | Path | Notes |
|---|---|---|
| GET | `/me/collection` | Filter/sort by genre/status/hours/recent + `order=asc\|desc` + manual order; `?q=` searches title/developer/publisher (COL-07/09); paginated |
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
| PATCH | `/cards/:id` | Edit own draft/design (autosave) |
| POST | `/cards/:id/publish` | Validate (min-complexity, dedup, premium-reconcile), **flatten to image + thumbnail**, set public (CARD-13/15/19) |
| POST | `/cards/:id/adopt` | Adopt for a game; charges currency if premium (ECON-03/04); increments adoption_count (CARD-05) |
| GET | `/cards/assets` | Vector/effect/finish/frame/font library; filter type/free/premium/owned; search (CARD-17) |

## Device (`DEV-`)
| Method | Path | Notes |
|---|---|---|
| GET | `/me/device` · PATCH `/me/device` | `{ activeModelId?, shellColour?, stickerComposition? }` (DEV-01/02) |

## Cosmetics & store & economy (`COSM-`, `ECON-`)
| Method | Path | Notes |
|---|---|---|
| GET | `/cosmetics` | Library (free + premium), filterable by type (COSM-01..03) |
| GET | `/me/entitlements` | What the caller owns (COSM-03) |
| GET | `/store` | Store front: currency packs (real money) + premium effect/asset packs (priced in currency) + drops (ECON-01/08) |
| GET | `/me/wallet` | `{ balance }` (ECON-07) |
| GET | `/me/wallet/ledger` | Paginated transactions (ECON-07) |
| POST | `/iap/validate` | `{ platform, receipt | rcUserId }` → grants currency/entitlement after server validation (ECON-06) |
| POST | `/me/daily-bonus` | Claim login bonus (ECON-02; idempotent per period) |

## Social (`SOC-`)
| Method | Path | Notes |
|---|---|---|
| GET | `/me/friends` · `/me/friends/requests` | Friends + pending (SOC-01) |
| POST | `/friends/requests` | `{ toUserId }` send request |
| POST | `/friends/requests/:id/accept` · `/decline` | Respond |
| DELETE | `/me/friends/:userId` | Unfriend |
| GET | `/users/search?username=` | Find people by username (SOC-07) |
| GET | `/me/compare/:friendId` | Per-game + total hours comparison + leaderboard slice (SOC-03) |
| GET/POST/PATCH/DELETE | `/me/lists` (+ `/:id/items`) | Lists incl. Top-5 (capped) (SOC-04) |
| POST | `/recommendations` | `{ toUserId, gameId, note }` → recipient's WTP (SOC-05) |
| GET | `/me/feed` | Low-noise, **aggregated** friend activity (SOC-06) |
| POST | `/me/invites` | Create a share link / QR invite token (SOC-07) |

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
| POST | `/reports` | `{ targetType, targetId, reason }` incl. "duplicate" (MOD-01) |
| GET | `/admin/reports` · POST `/admin/reports/:id/resolve` | Reports queue; hide/restore (MOD-02/03) — role-gated (SYS-08) |
| GET | `/admin/edit-suggestions` · POST `/admin/edit-suggestions/:id/{approve\|reject}` | Edit-suggestion review (MOD-06) |
| POST | `/admin/games/:dupId/merge` | `{ canonicalId }` → re-point collections/cards, soft-delete the dup (3-day restore) (MOD-05) |
| POST | `/admin/games/:id/restore` | Restore a soft-deleted game within the window (MOD-05) |

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
